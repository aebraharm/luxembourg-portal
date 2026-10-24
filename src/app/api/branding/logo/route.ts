import { NextResponse } from 'next/server';
import { getBranding, saveSetting } from '@/lib/settings';
import { verifyToken, AdminSessionPayload } from '@/lib/auth';
import { cookies } from 'next/headers';
import { logAudit } from '@/lib/audit';
import { saveAsset, deleteAsset } from '@/lib/storage';

export async function GET() {
  const branding = await getBranding();
  return NextResponse.json({
    logo_url: branding.logo_url,
    agency_name: branding.agency_name,
  });
}

export async function POST(request: Request) {
  const cookieStore = cookies();
  const adminToken = cookieStore.get('admin_session')?.value;

  if (!adminToken) {
    return NextResponse.json({ error: 'Unauthorized: Admin authentication required.' }, { status: 401 });
  }

  const session = verifyToken<AdminSessionPayload>(adminToken);
  if (!session) {
    return NextResponse.json({ error: 'Session expired.' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('logo') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided in form data.' }, { status: 400 });
    }

    // Validate mime type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file format. Please upload PNG, JPG, WEBP, or SVG.' }, { status: 400 });
    }

    // Limit file size to 3MB
    if (file.size > 3 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size exceeds 3MB limit.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save persistently to Netlify Blobs / Object Storage / Managed DB
    const assetId = await saveAsset({
      filename: file.name,
      mimeType: file.type,
      buffer,
      assetType: 'logo',
    });

    const logoUrl = `/api/uploads/${assetId}`;

    const branding = await getBranding();
    branding.logo_url = logoUrl;
    await saveSetting('branding', branding, 'branding');

    await logAudit({
      actorType: 'admin',
      actorId: session.adminId,
      actorEmail: session.email,
      action: 'UPLOAD_LOGO',
      details: { assetId, filename: file.name, size: file.size },
    });

    return NextResponse.json({ success: true, logo_url: logoUrl, assetId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to upload logo.' }, { status: 500 });
  }
}

export async function DELETE() {
  const cookieStore = cookies();
  const adminToken = cookieStore.get('admin_session')?.value;

  if (!adminToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const session = verifyToken<AdminSessionPayload>(adminToken);
  if (!session) {
    return NextResponse.json({ error: 'Session expired' }, { status: 401 });
  }

  const branding = await getBranding();
  if (branding.logo_url && branding.logo_url.startsWith('/api/uploads/')) {
    const assetId = branding.logo_url.replace('/api/uploads/', '');
    await deleteAsset(assetId);
  }

  branding.logo_url = null;
  await saveSetting('branding', branding, 'branding');

  await logAudit({
    actorType: 'admin',
    actorId: session.adminId,
    actorEmail: session.email,
    action: 'REMOVE_LOGO',
    details: {},
  });

  return NextResponse.json({ success: true, logo_url: null });
}
