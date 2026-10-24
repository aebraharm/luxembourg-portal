import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { logAudit } from '@/lib/audit';
import { verifyToken, ClientSessionPayload } from '@/lib/auth';

export async function POST() {
  const cookieStore = cookies();
  const token = cookieStore.get('client_session')?.value;

  if (token) {
    const session = verifyToken<ClientSessionPayload>(token);
    if (session) {
      await logAudit({
        actorType: 'client',
        actorId: session.clientId,
        actorEmail: session.email,
        action: 'CLIENT_LOGOUT',
        details: { referenceNumber: session.referenceNumber },
      });
    }
  }

  const response = NextResponse.json({ success: true, message: 'Logged out successfully.' });
  response.cookies.delete('client_session');
  return response;
}
