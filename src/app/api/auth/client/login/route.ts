import { NextResponse } from 'next/server';
import { authenticateClient, signPayload } from '@/lib/auth';
import { checkRateLimit, recordFailedLogin, clearRateLimit } from '@/lib/rateLimit';
import { logAudit } from '@/lib/audit';
import { getSecurityConfig } from '@/lib/settings';

export async function POST(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
    const body = await request.json();
    const { email, referenceNumber } = body;

    if (!email || !referenceNumber) {
      return NextResponse.json(
        { error: 'Both email address and payment reference number are required.' },
        { status: 400 }
      );
    }

    // Rate limit check
    const rateCheck = checkRateLimit(ip, email);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: `Too many unsuccessful authentication attempts. Access is locked for ${rateCheck.waitMinutes} minutes. Please contact support.`,
        },
        { status: 429 }
      );
    }

    const authResult = authenticateClient(email, referenceNumber);
    if (authResult.error || !authResult.client) {
      const failInfo = recordFailedLogin(ip, email);
      logAudit({
        actorType: 'client',
        actorId: null,
        actorEmail: email,
        action: 'CLIENT_LOGIN_FAILED',
        details: { referenceNumber, ip, blocked: failInfo.blocked },
        ipAddress: ip,
      });

      if (failInfo.blocked) {
        return NextResponse.json(
          {
            error: `Maximum login attempts exceeded. Account access temporarily locked for ${failInfo.waitMinutes} minutes.`,
          },
          { status: 429 }
        );
      }

      return NextResponse.json({ error: authResult.error || 'Invalid credentials.' }, { status: 401 });
    }

    // Success! Clear rate limit counter
    clearRateLimit(ip, email);

    const client = authResult.client;
    const secConfig = getSecurityConfig();
    const token = signPayload(
      {
        clientId: client.id,
        email: client.email,
        referenceNumber: client.reference_number,
      },
      secConfig.client_session_timeout_mins || 60
    );

    logAudit({
      actorType: 'client',
      actorId: client.id,
      actorEmail: client.email,
      action: 'CLIENT_LOGIN_SUCCESS',
      details: { referenceNumber: client.reference_number, ip },
      ipAddress: ip,
    });

    const response = NextResponse.json({
      success: true,
      client: {
        id: client.id,
        fullName: client.full_name,
        email: client.email,
        referenceNumber: client.reference_number,
        caseCategory: client.case_category,
        amountCents: client.amount_cents,
        paymentStatus: client.payment_status,
      },
    });

    // Set secure HTTP-only cookie
    response.cookies.set({
      name: 'client_session',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: (secConfig.client_session_timeout_mins || 60) * 60,
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Authentication failed.' }, { status: 500 });
  }
}
