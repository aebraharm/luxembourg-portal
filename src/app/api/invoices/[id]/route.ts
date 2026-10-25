import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  verifyToken,
  AdminSessionPayload,
  ClientSessionPayload,
} from '@/lib/auth';
import {
  queryOne,
  queryAll,
  execute,
  deriveInvoiceStatus,
  isValidStatusTransition,
  generateInvoiceNumber,
} from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { InvoiceRecord, InvoiceStatus, PaymentRecord } from '@/lib/types';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const invoiceId = parseInt(params.id, 10);
  if (isNaN(invoiceId)) {
    return NextResponse.json({ error: 'Invalid invoice ID' }, { status: 400 });
  }

  const cookieStore = cookies();
  const adminToken = cookieStore.get('admin_session')?.value;
  const clientToken = cookieStore.get('client_session')?.value;

  const adminSession = adminToken ? verifyToken<AdminSessionPayload>(adminToken) : null;
  const clientSession = clientToken ? verifyToken<ClientSessionPayload>(clientToken) : null;

  if (!adminSession && !clientSession) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const invoice = await queryOne<InvoiceRecord>(
    `SELECT
      inv.*,
      c.full_name as client_name,
      c.email as client_email,
      c.reference_number as client_reference,
      r.name as client_region
     FROM invoices inv
     LEFT JOIN clients c ON inv.client_id = c.id
     LEFT JOIN regions r ON c.region_id = r.id
     WHERE inv.id = ?`,
    [invoiceId]
  );

  if (!invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  }

  // Enforce client ownership
  if (clientSession && !adminSession) {
    if (invoice.client_id !== clientSession.clientId) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have access to this invoice.' },
        { status: 403 }
      );
    }
    // In client portal, hide internal admin notes
    delete (invoice as any).admin_notes;
  }

  const payments = await queryAll<PaymentRecord>(
    'SELECT * FROM payments WHERE invoice_id = ? ORDER BY created_at DESC',
    [invoiceId]
  );

  const effectiveStatus = deriveInvoiceStatus(invoice.status, invoice.due_date);

  return NextResponse.json({
    invoice: {
      ...invoice,
      effective_status: effectiveStatus,
    },
    payments,
  });
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const invoiceId = parseInt(params.id, 10);
  if (isNaN(invoiceId)) {
    return NextResponse.json({ error: 'Invalid invoice ID' }, { status: 400 });
  }

  const cookieStore = cookies();
  const token = cookieStore.get('admin_session')?.value;

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
  }

  const session = verifyToken<AdminSessionPayload>(token);
  if (!session) {
    return NextResponse.json({ error: 'Session expired' }, { status: 401 });
  }

  const existing = await queryOne<InvoiceRecord>('SELECT * FROM invoices WHERE id = ?', [invoiceId]);
  if (!existing) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  }

  try {
    const body = await request.json();
    const {
      reason,
      amountEur,
      dueDate,
      issueDate,
      status: requestedStatus,
      notes,
      adminNotes,
      cancellationReason,
      createReplacement,
    } = body;

    const currentStatus = existing.status;
    const now = new Date().toISOString();

    // SAFE EDITING RULE:
    // If invoice is already paid, prevent silent modification of amount or reverting to unpaid
    if (currentStatus === 'paid') {
      if (amountEur !== undefined) {
        const attemptedCents = Math.round(parseFloat(amountEur) * 100);
        if (attemptedCents !== existing.amount_cents) {
          return NextResponse.json(
            {
              error:
                'Safety Violation: Paid invoices cannot have their amount modified directly. If a correction is required, issue a credit or replacement invoice.',
            },
            { status: 400 }
          );
        }
      }
      if (requestedStatus && requestedStatus !== 'paid' && requestedStatus !== 'cancelled') {
        return NextResponse.json(
          {
            error:
              'Safety Violation: Confirmed paid invoices cannot be marked unpaid. Use a controlled cancellation or replacement workflow.',
          },
          { status: 400 }
        );
      }
    }

    // Status transition validation
    const newStatus: InvoiceStatus = requestedStatus || existing.status;
    if (requestedStatus && requestedStatus !== existing.status) {
      if (!isValidStatusTransition(existing.status, requestedStatus)) {
        return NextResponse.json(
          {
            error: `Invalid status transition from "${existing.status}" to "${requestedStatus}".`,
          },
          { status: 400 }
        );
      }
    }

    // Amount validation for unpaid invoices
    let finalAmountCents = existing.amount_cents;
    if (amountEur !== undefined && currentStatus !== 'paid') {
      const amountNum = parseFloat(amountEur);
      if (isNaN(amountNum) || amountNum <= 0) {
        return NextResponse.json(
          { error: 'Invoice amount must be a positive monetary value in EUR (€).' },
          { status: 400 }
        );
      }
      finalAmountCents = Math.round(amountNum * 100);
    }

    // Cancellation handling
    if (newStatus === 'cancelled' && existing.status !== 'cancelled') {
      const cancelNote = cancellationReason || adminNotes || 'Cancelled by administrator';
      await logAudit({
        actorType: 'admin',
        actorId: session.adminId,
        actorEmail: session.email,
        action: 'CANCEL_INVOICE',
        details: {
          invoiceId,
          invoiceNumber: existing.invoice_number,
          reason: cancelNote,
          previousStatus: existing.status,
        },
      });
    }

    // Optional replacement invoice creation workflow
    let replacementId: number | null = existing.replacement_invoice_id || null;
    if (createReplacement && newStatus === 'cancelled') {
      const replacementNumber = await generateInvoiceNumber();
      const replaceResult = await execute(
        `INSERT INTO invoices (
          client_id, invoice_number, reason, amount_cents, currency,
          issue_date, due_date, status, notes, admin_notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 'EUR', ?, ?, 'issued', ?, ?, ?, ?)`,
        [
          existing.client_id,
          replacementNumber,
          reason ? reason.trim() : existing.reason,
          finalAmountCents,
          new Date().toISOString().split('T')[0],
          dueDate || existing.due_date,
          notes ? notes.trim() : existing.notes,
          `Replacement invoice for cancelled ${existing.invoice_number}`,
          now,
          now,
        ]
      );
      replacementId = replaceResult.lastInsertRowid;

      await logAudit({
        actorType: 'admin',
        actorId: session.adminId,
        actorEmail: session.email,
        action: 'CREATE_REPLACEMENT_INVOICE',
        details: {
          originalInvoiceId: invoiceId,
          originalInvoiceNumber: existing.invoice_number,
          replacementInvoiceId: replacementId,
          replacementInvoiceNumber: replacementNumber,
        },
      });
    }

    await execute(
      `UPDATE invoices SET
        reason = ?,
        amount_cents = ?,
        issue_date = ?,
        due_date = ?,
        status = ?,
        notes = ?,
        admin_notes = ?,
        replacement_invoice_id = ?,
        updated_at = ?
       WHERE id = ?`,
      [
        reason !== undefined ? reason.trim() : existing.reason,
        finalAmountCents,
        issueDate || existing.issue_date,
        dueDate || existing.due_date,
        newStatus,
        notes !== undefined ? notes.trim() : existing.notes,
        adminNotes !== undefined ? adminNotes.trim() : existing.admin_notes,
        replacementId,
        now,
        invoiceId,
      ]
    );

    await logAudit({
      actorType: 'admin',
      actorId: session.adminId,
      actorEmail: session.email,
      action: 'UPDATE_INVOICE',
      details: {
        invoiceId,
        invoiceNumber: existing.invoice_number,
        previousStatus: existing.status,
        newStatus,
        previousAmountCents: existing.amount_cents,
        newAmountCents: finalAmountCents,
      },
    });

    return NextResponse.json({
      success: true,
      invoiceId,
      replacementInvoiceId: replacementId,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update invoice' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const invoiceId = parseInt(params.id, 10);
  if (isNaN(invoiceId)) {
    return NextResponse.json({ error: 'Invalid invoice ID' }, { status: 400 });
  }

  const cookieStore = cookies();
  const token = cookieStore.get('admin_session')?.value;

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const session = verifyToken<AdminSessionPayload>(token);
  if (!session) {
    return NextResponse.json({ error: 'Session expired' }, { status: 401 });
  }

  const invoice = await queryOne<InvoiceRecord>('SELECT * FROM invoices WHERE id = ?', [invoiceId]);
  if (!invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  }

  // Safety check: Cannot delete paid invoice or invoice with completed payments
  if (invoice.status === 'paid') {
    return NextResponse.json(
      { error: 'Cannot delete a paid invoice. To correct financial records, use the invoice cancellation workflow.' },
      { status: 400 }
    );
  }

  const completedPayments = await queryOne<{ c: number }>(
    "SELECT COUNT(*) as c FROM payments WHERE invoice_id = ? AND status = 'completed'",
    [invoiceId]
  );
  if (completedPayments && Number(completedPayments.c) > 0) {
    return NextResponse.json(
      { error: 'Cannot delete an invoice with verified completed payment remittances.' },
      { status: 400 }
    );
  }

  await execute('DELETE FROM invoices WHERE id = ?', [invoiceId]);

  await logAudit({
    actorType: 'admin',
    actorId: session.adminId,
    actorEmail: session.email,
    action: 'DELETE_INVOICE',
    details: {
      invoiceId,
      invoiceNumber: invoice.invoice_number,
      clientId: invoice.client_id,
    },
  });

  return NextResponse.json({ success: true });
}
