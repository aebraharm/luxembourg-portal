import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, AdminSessionPayload } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { AdministratorRecord } from '@/lib/types';

export async function GET() {
  const cookieStore = cookies();
  const token = cookieStore.get('admin_session')?.value;

  if (!token) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const session = verifyToken<AdminSessionPayload>(token);
  if (!session) {
    return NextResponse.json({ authenticated: false, error: 'Session expired' }, { status: 401 });
  }

  const db = getDb();
  const admin = db.prepare('SELECT id, email, full_name, role, must_change_password FROM administrators WHERE id = ?').get(session.adminId) as AdministratorRecord | undefined;

  if (!admin) {
    return NextResponse.json({ authenticated: false, error: 'Admin not found' }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    admin: {
      id: admin.id,
      email: admin.email,
      fullName: admin.full_name,
      role: admin.role,
      mustChangePassword: admin.must_change_password === 1,
    },
  });
}
