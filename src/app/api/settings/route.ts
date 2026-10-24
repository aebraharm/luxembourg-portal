import { NextResponse } from 'next/server';
import {
  getBranding,
  getTheme,
  getLoadingConfig,
  getHomepageConfig,
  getPaymentMethodConfig,
  getLegalConfig,
  saveSetting,
} from '@/lib/settings';
import { verifyToken, AdminSessionPayload } from '@/lib/auth';
import { cookies } from 'next/headers';
import { logAudit } from '@/lib/audit';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const section = searchParams.get('section');

  const branding = await getBranding();
  const theme = await getTheme();
  const loading = await getLoadingConfig();
  const homepage = await getHomepageConfig();
  const paymentMethods = await getPaymentMethodConfig();
  const legal = await getLegalConfig();

  if (section === 'branding') return NextResponse.json(branding);
  if (section === 'theme') return NextResponse.json(theme);
  if (section === 'loading') return NextResponse.json(loading);
  if (section === 'homepage') return NextResponse.json(homepage);
  if (section === 'payment_methods') return NextResponse.json(paymentMethods);
  if (section === 'legal') return NextResponse.json(legal);

  return NextResponse.json({
    branding,
    theme,
    loading,
    homepage,
    paymentMethods,
    legal,
  });
}

export async function PUT(request: Request) {
  const cookieStore = cookies();
  const adminToken = cookieStore.get('admin_session')?.value;

  if (!adminToken) {
    return NextResponse.json({ error: 'Unauthorized: Admin authentication required.' }, { status: 401 });
  }

  const session = verifyToken<AdminSessionPayload>(adminToken);
  if (!session) {
    return NextResponse.json({ error: 'Session expired or invalid.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { key, value, category } = body;

    if (!key || value === undefined) {
      return NextResponse.json({ error: 'Missing key or value in update payload.' }, { status: 400 });
    }

    await saveSetting(key, value, category || 'general');

    await logAudit({
      actorType: 'admin',
      actorId: session.adminId,
      actorEmail: session.email,
      action: 'UPDATE_SETTING',
      details: { key, category },
    });

    return NextResponse.json({ success: true, key });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to save settings.' }, { status: 500 });
  }
}
