import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, ClientSessionPayload } from '@/lib/auth';
import { queryAll } from '@/lib/db';
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

  const payments = await queryAll<PaymentRecord>(
    'SELECT * FROM payments WHERE client_id = ? ORDER BY created_at DESC',
    [session.clientId]
  );

  return NextResponse.json({ payments });
}
