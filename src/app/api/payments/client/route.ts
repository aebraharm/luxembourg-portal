import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, ClientSessionPayload } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { PaymentRecord } from '@/lib/types';

export async function GET() {
  const cookieStore = cookies();
  const token = cookieStore.get('client_session')?.value;

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const session = verifyToken<ClientSessionPayload>(token);
  if (!session) {
    return NextResponse.json({ error: 'Session expired' }, { status: 401 });
  }

  const db = getDb();
  const payments = db
    .prepare('SELECT * FROM payments WHERE client_id = ? ORDER BY created_at DESC')
    .all(session.clientId) as unknown as PaymentRecord[];

  return NextResponse.json({ payments });
}
