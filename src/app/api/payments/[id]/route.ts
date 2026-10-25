import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, ClientSessionPayload, AdminSessionPayload } from '@/lib/auth';
import { queryOne, execute } from '@/lib/db';
import { PaymentRecord } from '@/lib/types';
import { logAudit } from '@/lib/audit';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const paymentId = parseInt(params.id, 10);
  if (isNaN(paymentId)) {
    return NextResponse.json({ error: 'Invalid payment ID' }, { status: 400 });
  }

  const cookieStore = cookies();
  const clientToken = cookieStore.get('client_session')?.value;
  const adminToken = cookieStore.get('admin_session')?.value;

  const clientSession = clientToken ? verifyToken<ClientSessionPayload>(clientToken) : null;
  const adminSession = adminToken ? verifyToken<AdminSessionPayload>(adminToken) : null;

  if (!clientSession && !adminSession) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payment = await queryOne<PaymentRecord & { case_category?: string; invoice_number?: string }>(
    `SELECT
      p.*,
      c.full_name as client_name,
      c.email as client_email,
      c.case_category,
      inv.invoice_number as invoice_number
     FROM payments p
     LEFT JOIN clients c ON p.client_id = c.id
     LEFT JOIN invoices inv ON p.invoice_id = inv.id
     WHERE p.id = ?`,
    [paymentId]
  );

  if (!payment) {
    return NextResponse.json({ error: 'Payment record not found' }, { status: 404 });
  }

  // If client, ensure they own this payment
  if (clientSession && !adminSession) {
    if (payment.client_id !== clientSession.clientId) {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to view this payment' }, { status: 403 });
    }
  }

  return NextResponse.json({ payment });
}

// Admin reconcile payment
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const paymentId = parseInt(params.id, 10);
  if (isNaN(paymentId)) {
    return NextResponse.json({ error: 'Invalid payment ID' }, { status: 400 });
  }

  const cookieStore = cookies();
  const adminToken = cookieStore.get('admin_session')?.value;

  if (!adminToken) {
    return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
  }

  const adminSession = verifyToken<AdminSessionPayload>(adminToken);
  if (!adminSession) {
    return NextResponse.json({ error: 'Admin session expired' }, { status: 401 });
  }

  const payment = await queryOne<PaymentRecord>('SELECT * FROM payments WHERE id = ?', [paymentId]);
  if (!payment) {
    return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { status, adminNote, providerRef } = body;

    const validStatuses = ['pending', 'under_review', 'completed', 'failed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid payment status' }, { status: 400 });
    }

    const now = new Date().toISOString();

    // Update payment
    await execute(
      `UPDATE payments
       SET status = ?, provider_ref = ?, updated_at = ?
       WHERE id = ?`,
      [status, providerRef || payment.provider_ref, now, paymentId]
    );

    // Update client status
    await execute(
      `UPDATE clients
       SET payment_status = ?, updated_at = ?
       WHERE id = ?`,
      [status, now, payment.client_id]
    );

    // Update associated invoice status if present
    if (payment.invoice_id) {
      if (status === 'completed') {
        await execute(
          "UPDATE invoices SET status = 'paid', updated_at = ? WHERE id = ?",
          [now, payment.invoice_id]
        );
      } else if (status === 'failed' || status === 'cancelled') {
        // Revert invoice back to unpaid if it was payment_pending
        await execute(
          "UPDATE invoices SET status = 'unpaid', updated_at = ? WHERE id = ? AND status = 'payment_pending'",
          [now, payment.invoice_id]
        );
      }
    }

    await logAudit({
      actorType: 'admin',
      actorId: adminSession.adminId,
      actorEmail: adminSession.email,
      action: 'RECONCILE_PAYMENT',
      details: {
        paymentId,
        invoiceId: payment.invoice_id,
        previousStatus: payment.status,
        newStatus: status,
        adminNote: adminNote || '',
        clientId: payment.client_id,
        referenceNumber: payment.reference_number,
      },
    });

    return NextResponse.json({ success: true, paymentId, status });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to reconcile payment' }, { status: 500 });
  }
}
