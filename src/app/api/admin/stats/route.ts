import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, AdminSessionPayload } from '@/lib/auth';
import { queryOne, queryAll } from '@/lib/db';

export async function GET() {
  const cookieStore = cookies();
  const token = cookieStore.get('admin_session')?.value;

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const session = verifyToken<AdminSessionPayload>(token);
  if (!session) {
    return NextResponse.json({ error: 'Session expired' }, { status: 401 });
  }

  // Real DB calculations
  const totalClientsRow = await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM clients');
  const activeClientsRow = await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM clients WHERE is_active = 1');

  const totalAssignedRow = await queryOne<{ total: number }>(
    'SELECT COALESCE(SUM(amount_cents), 0) as total FROM invoices'
  );

  const successfulPayments = await queryOne<{ count: number; total: number }>(
    "SELECT COUNT(*) as count, COALESCE(SUM(amount_cents), 0) as total FROM payments WHERE status = 'completed'"
  );

  const pendingPayments = await queryOne<{ count: number; total: number }>(
    "SELECT COUNT(*) as count, COALESCE(SUM(amount_cents), 0) as total FROM payments WHERE status IN ('pending', 'under_review')"
  );

  const failedPayments = await queryOne<{ count: number; total: number }>(
    "SELECT COUNT(*) as count, COALESCE(SUM(amount_cents), 0) as total FROM payments WHERE status = 'failed'"
  );

  const totalInvoicesRow = await queryOne<{ count: number; total: number }>(
    'SELECT COUNT(*) as count, COALESCE(SUM(amount_cents), 0) as total FROM invoices'
  );

  const paidInvoicesRow = await queryOne<{ count: number; total: number }>(
    "SELECT COUNT(*) as count, COALESCE(SUM(amount_cents), 0) as total FROM invoices WHERE status = 'paid'"
  );

  const totalRegionsRow = await queryOne<{ count: number }>(
    'SELECT COUNT(*) as count FROM regions WHERE is_active = 1'
  );

  const recentPayments = await queryAll(`
    SELECT p.*, c.full_name as client_name, c.email as client_email, inv.invoice_number
    FROM payments p
    LEFT JOIN clients c ON p.client_id = c.id
    LEFT JOIN invoices inv ON p.invoice_id = inv.id
    ORDER BY p.created_at DESC
    LIMIT 8
  `);

  return NextResponse.json({
    totalClients: totalClientsRow ? Number(totalClientsRow.count) : 0,
    activeClients: activeClientsRow ? Number(activeClientsRow.count) : 0,
    totalAssignedCents: totalAssignedRow ? Number(totalAssignedRow.total) : 0,
    successfulCount: successfulPayments ? Number(successfulPayments.count) : 0,
    successfulTotalCents: successfulPayments ? Number(successfulPayments.total) : 0,
    pendingCount: pendingPayments ? Number(pendingPayments.count) : 0,
    pendingTotalCents: pendingPayments ? Number(pendingPayments.total) : 0,
    failedCount: failedPayments ? Number(failedPayments.count) : 0,
    failedTotalCents: failedPayments ? Number(failedPayments.total) : 0,
    totalInvoicesCount: totalInvoicesRow ? Number(totalInvoicesRow.count) : 0,
    paidInvoicesCount: paidInvoicesRow ? Number(paidInvoicesRow.count) : 0,
    totalRegionsCount: totalRegionsRow ? Number(totalRegionsRow.count) : 0,
    recentPayments,
  });
}
