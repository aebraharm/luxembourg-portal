import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, AdminSessionPayload, updateAdminPassword } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function POST(request: Request) {
  const cookieStore = cookies();
  const token = cookieStore.get('admin_session')?.value;

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const session = verifyToken<AdminSessionPayload>(token);
  if (!session) {
    return NextResponse.json({ error: 'Session expired' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { newPassword } = body;

    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json({ error: 'New password must be at least 8 characters in length.' }, { status: 400 });
    }

    const res = updateAdminPassword(session.adminId, newPassword);
    if (!res.success) {
      return NextResponse.json({ error: res.error || 'Password update failed' }, { status: 400 });
    }

    logAudit({
      actorType: 'admin',
      actorId: session.adminId,
      actorEmail: session.email,
      action: 'ADMIN_CHANGE_PASSWORD',
      details: {},
    });

    return NextResponse.json({ success: true, message: 'Password updated successfully.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Password update error' }, { status: 500 });
  }
}
