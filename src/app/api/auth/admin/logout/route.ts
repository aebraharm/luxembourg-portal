import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, AdminSessionPayload } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function POST() {
  const cookieStore = cookies();
  const token = cookieStore.get('admin_session')?.value;

  if (token) {
    const session = verifyToken<AdminSessionPayload>(token);
    if (session) {
      logAudit({
        actorType: 'admin',
        actorId: session.adminId,
        actorEmail: session.email,
        action: 'ADMIN_LOGOUT',
        details: {},
      });
    }
  }

  const response = NextResponse.json({ success: true });
  response.cookies.delete('admin_session');
  return response;
}
