import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, AdminSessionPayload } from '@/lib/auth';
import { getDb } from '@/lib/db';

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

  const db = getDb();

  // Real DB calculations
  const totalClients = (db.prepare('SELECT COUNT(*) as count FROM clients').get() as { count: number }).count;
  const activeClients = (db.prepare('SELECT COUNT(*) as count FROM clients WHERE is_active = 1').get() as { count: number }).count;

  const totalAssignedCents = (
    db.prepare('SELECT COALESCE(SUM(amount_cents), 0) as total FROM clients').get() as { total: number }
  ).total;

  const successfulPayments = db
    .prepare("SELECT COUNT(*) as count, COALESCE(SUM(amount_cents), 0) as total FROM payments WHERE status = 'completed'")
    .get() as { count: number; total: number };

  const pendingPayments = db
    .prepare("SELECT COUNT(*) as count, COALESCE(SUM(amount_cents), 0) as total FROM payments WHERE status IN ('pending', 'under_review')")
    .get() as { count: number; total: number };

  const failedPayments = db
    .prepare("SELECT COUNT(*) as count, COALESCE(SUM(amount_cents), 0) as total FROM payments WHERE status = 'failed'")
    .get() as { count: number; total: number };

  const recentPayments = db
    .prepare(`
      SELECT p.*, c.full_name as client_name, c.email as client_email
      FROM payments p
      LEFT JOIN clients c ON p.client_id = c.id
      ORDER BY p.created_at DESC
      LIMIT 8
    `)
    .all();

  return NextResponse.json({
    totalClients,
    activeClients,
    totalAssignedCents,
    successfulCount: successfulPayments.count,
    successfulTotalCents: successfulPayments.total,
    pendingCount: pendingPayments.count,
    pendingTotalCents: pendingPayments.total,
    failedCount: failedPayments.count,
    failedTotalCents: failedPayments.total,
    recentPayments,
  });
}
