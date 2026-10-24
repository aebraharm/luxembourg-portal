import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getBranding, saveSetting } from '@/lib/settings';
import { verifyToken, AdminSessionPayload } from '@/lib/auth';
import { cookies } from 'next/headers';
import { logAudit } from '@/lib/audit';
import crypto from 'node:crypto';

export async function GET() {
  const branding = getBranding();
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
    const base64Data = buffer.toString('base64');
    const assetId = `logo_${crypto.randomBytes(8).toString('hex')}`;
    const now = new Date().toISOString();

    const db = getDb();
    db.prepare(`
      INSERT INTO uploaded_assets (id, filename, mime_type, data_base64, asset_type, size_bytes, created_at)
      VALUES (?, ?, ?, ?, 'logo', ?, ?)
    `).run(assetId, file.name, file.type, base64Data, file.size, now);

    const logoUrl = `/api/uploads/${assetId}`;

    const branding = getBranding();
    branding.logo_url = logoUrl;
    saveSetting('branding', branding, 'branding');

    logAudit({
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

export async function DELETE(request: Request) {
  const cookieStore = cookies();
  const adminToken = cookieStore.get('admin_session')?.value;

  if (!adminToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const session = verifyToken<AdminSessionPayload>(adminToken);
  if (!session) {
    return NextResponse.json({ error: 'Session expired' }, { status: 401 });
  }

  const branding = getBranding();
  branding.logo_url = null;
  saveSetting('branding', branding, 'branding');

  logAudit({
    actorType: 'admin',
    actorId: session.adminId,
    actorEmail: session.email,
    action: 'REMOVE_LOGO',
    details: {},
  });

  return NextResponse.json({ success: true, logo_url: null });
}
