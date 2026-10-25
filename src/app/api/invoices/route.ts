import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, AdminSessionPayload } from '@/lib/auth';
import {
  queryAll,
  queryOne,
  execute,
  generateInvoiceNumber,
  deriveInvoiceStatus,
} from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { InvoiceRecord, InvoiceStatus } from '@/lib/types';

export async function GET(request: Request) {
  const cookieStore = cookies();
  const token = cookieStore.get('admin_session')?.value;

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
  }

  const session = verifyToken<AdminSessionPayload>(token);
  if (!session) {
    return NextResponse.json({ error: 'Session expired' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search');
  const status = searchParams.get('status');
  const clientId = searchParams.get('clientId');
  const issueDateFrom = searchParams.get('issueDateFrom');
  const issueDateTo = searchParams.get('issueDateTo');
  const dueDateFrom = searchParams.get('dueDateFrom');
  const dueDateTo = searchParams.get('dueDateTo');

  let query = `
    SELECT
      inv.*,
      c.full_name as client_name,
      c.email as client_email,
      c.reference_number as client_reference,
      r.name as client_region
    FROM invoices inv
    LEFT JOIN clients c ON inv.client_id = c.id
    LEFT JOIN regions r ON c.region_id = r.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (clientId) {
    query += ' AND inv.client_id = ?';
    params.push(parseInt(clientId, 10));
  }

  if (search) {
    const term = `%${search.trim()}%`;
    query += ` AND (
      inv.invoice_number LIKE ?
      OR inv.reason LIKE ?
      OR c.full_name LIKE ?
      OR c.email LIKE ?
      OR c.reference_number LIKE ?
    )`;
    params.push(term, term, term, term, term);
  }

  if (issueDateFrom) {
    query += ' AND inv.issue_date >= ?';
    params.push(issueDateFrom);
  }
  if (issueDateTo) {
    query += ' AND inv.issue_date <= ?';
    params.push(issueDateTo);
  }
  if (dueDateFrom) {
    query += ' AND inv.due_date >= ?';
    params.push(dueDateFrom);
  }
  if (dueDateTo) {
    query += ' AND inv.due_date <= ?';
    params.push(dueDateTo);
  }

  query += ' ORDER BY inv.created_at DESC';

  const rows = await queryAll<InvoiceRecord>(query, params);

  // Derive dynamic overdue status and filter if status filter was applied
  const invoices = rows.map((inv) => {
    const effStatus = deriveInvoiceStatus(inv.status, inv.due_date);
    return {
      ...inv,
      effective_status: effStatus,
    };
  });

  const filtered = status && status !== 'all'
    ? invoices.filter((inv) => inv.effective_status === status || inv.status === status)
    : invoices;

  return NextResponse.json({ invoices: filtered });
}

export async function POST(request: Request) {
  const cookieStore = cookies();
  const token = cookieStore.get('admin_session')?.value;

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
  }

  const session = verifyToken<AdminSessionPayload>(token);
  if (!session) {
    return NextResponse.json({ error: 'Session expired' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      clientId,
      invoiceNumber: customInvoiceNumber,
      reason,
      amountEur,
      issueDate,
      dueDate,
      status: requestedStatus,
      notes,
      adminNotes,
    } = body;

    // Validate client exists
    if (!clientId) {
      return NextResponse.json({ error: 'A client must be selected for this invoice.' }, { status: 400 });
    }
    const client = await queryOne('SELECT id, full_name, email, reference_number FROM clients WHERE id = ?', [clientId]);
    if (!client) {
      return NextResponse.json({ error: 'Selected client does not exist.' }, { status: 404 });
    }

    // Validate reason
    if (!reason || !reason.trim()) {
      return NextResponse.json({ error: 'Reason for payment is required.' }, { status: 400 });
    }

    // Validate amount (positive monetary integer cents)
    const amountNum = parseFloat(amountEur);
    if (isNaN(amountNum) || amountNum <= 0) {
      return NextResponse.json({ error: 'Invoice amount must be a positive monetary value in EUR (€).' }, { status: 400 });
    }
    const amountCents = Math.round(amountNum * 100);

    // Validate dates
    const today = new Date().toISOString().split('T')[0];
    const finalIssueDate = issueDate ? issueDate.trim() : today;
    let finalDueDate = dueDate ? dueDate.trim() : '';
    if (!finalDueDate) {
      const defaultDue = new Date();
      defaultDue.setDate(defaultDue.getDate() + 14);
      finalDueDate = defaultDue.toISOString().split('T')[0];
    }

    // Validate status
    const allowedStatuses: InvoiceStatus[] = ['draft', 'issued', 'unpaid'];
    const finalStatus: InvoiceStatus = allowedStatuses.includes(requestedStatus)
      ? requestedStatus
      : 'issued';

    // Unique invoice number
    let finalInvoiceNumber = customInvoiceNumber ? customInvoiceNumber.trim().toUpperCase() : '';
    if (finalInvoiceNumber) {
      const existing = await queryOne('SELECT id FROM invoices WHERE invoice_number = ?', [finalInvoiceNumber]);
      if (existing) {
        return NextResponse.json({ error: `Invoice number "${finalInvoiceNumber}" is already in use.` }, { status: 400 });
      }
    } else {
      finalInvoiceNumber = await generateInvoiceNumber();
    }

    const now = new Date().toISOString();
    const result = await execute(
      `INSERT INTO invoices (
        client_id, invoice_number, reason, amount_cents, currency,
        issue_date, due_date, status, notes, admin_notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'EUR', ?, ?, ?, ?, ?, ?, ?)`,
      [
        clientId,
        finalInvoiceNumber,
        reason.trim(),
        amountCents,
        finalIssueDate,
        finalDueDate,
        finalStatus,
        notes ? notes.trim() : '',
        adminNotes ? adminNotes.trim() : '',
        now,
        now,
      ]
    );

    const invoiceId = result.lastInsertRowid;

    await logAudit({
      actorType: 'admin',
      actorId: session.adminId,
      actorEmail: session.email,
      action: 'CREATE_INVOICE',
      details: {
        invoiceId,
        invoiceNumber: finalInvoiceNumber,
        clientId,
        amountCents,
        currency: 'EUR',
        reason: reason.trim(),
        status: finalStatus,
      },
    });

    return NextResponse.json({
      success: true,
      invoiceId,
      invoiceNumber: finalInvoiceNumber,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create invoice' }, { status: 500 });
  }
}
