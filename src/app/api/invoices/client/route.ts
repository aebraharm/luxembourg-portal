import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, ClientSessionPayload } from '@/lib/auth';
import { queryAll, deriveInvoiceStatus } from '@/lib/db';
import { InvoiceRecord } from '@/lib/types';

export async function GET() {
  const cookieStore = cookies();
  const token = cookieStore.get('client_session')?.value;

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized: Session missing' }, { status: 401 });
  }

  const session = verifyToken<ClientSessionPayload>(token);
  if (!session) {
    return NextResponse.json({ error: 'Session expired' }, { status: 401 });
  }

  // Fetch only non-draft invoices belonging to this authenticated client
  const rows = await queryAll<InvoiceRecord>(
    `SELECT
      id, client_id, invoice_number, reason, amount_cents, currency,
      issue_date, due_date, status, notes, replacement_invoice_id,
      created_at, updated_at
     FROM invoices
     WHERE client_id = ? AND status != 'draft'
     ORDER BY created_at DESC`,
    [session.clientId]
  );

  const invoices = rows.map((inv) => ({
    ...inv,
    effective_status: deriveInvoiceStatus(inv.status, inv.due_date),
  }));

  return NextResponse.json({ invoices });
}
