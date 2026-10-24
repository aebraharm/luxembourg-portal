import { NextResponse } from 'next/server';
import { authenticateAdmin, signPayload } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { getSecurityConfig } from '@/lib/settings';

export async function POST(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    const authResult = authenticateAdmin(email, password);
    if (authResult.error || !authResult.admin) {
      logAudit({
        actorType: 'admin',
        actorId: null,
        actorEmail: email,
        action: 'ADMIN_LOGIN_FAILED',
        details: { ip },
        ipAddress: ip,
      });

      return NextResponse.json({ error: authResult.error || 'Invalid credentials' }, { status: 401 });
    }

    const admin = authResult.admin;
    const secConfig = getSecurityConfig();

    const token = signPayload(
      {
        adminId: admin.id,
        email: admin.email,
        role: admin.role,
        mustChangePassword: admin.must_change_password === 1,
      },
      secConfig.admin_session_timeout_mins || 120
    );

    logAudit({
      actorType: 'admin',
      actorId: admin.id,
      actorEmail: admin.email,
      action: 'ADMIN_LOGIN_SUCCESS',
      details: { ip },
      ipAddress: ip,
    });

    const response = NextResponse.json({
      success: true,
      admin: {
        id: admin.id,
        email: admin.email,
        fullName: admin.full_name,
        role: admin.role,
        mustChangePassword: admin.must_change_password === 1,
      },
    });

    response.cookies.set({
      name: 'admin_session',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: (secConfig.admin_session_timeout_mins || 120) * 60,
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Login error' }, { status: 500 });
  }
}
