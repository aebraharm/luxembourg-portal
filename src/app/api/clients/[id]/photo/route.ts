import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, AdminSessionPayload } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import crypto from 'node:crypto';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const clientId = parseInt(params.id, 10);
  if (isNaN(clientId)) return NextResponse.json({ error: 'Invalid client ID' }, { status: 400 });

  const cookieStore = cookies();
  const token = cookieStore.get('admin_session')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const session = verifyToken<AdminSessionPayload>(token);
  if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 });

  try {
    const formData = await request.formData();
    const file = formData.get('photo') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No photo provided' }, { status: 400 });
    }

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file format. Please upload JPG, PNG, or WEBP.' }, { status: 400 });
    }

    if (file.size > 3 * 1024 * 1024) {
      return NextResponse.json({ error: 'File exceeds 3MB limit.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const base64Data = Buffer.from(bytes).toString('base64');
    const assetId = `client_admin_${clientId}_${crypto.randomBytes(6).toString('hex')}`;
    const now = new Date().toISOString();

    const db = getDb();
    db.prepare(`
      INSERT INTO uploaded_assets (id, filename, mime_type, data_base64, asset_type, size_bytes, created_at)
      VALUES (?, ?, ?, ?, 'client_photo', ?, ?)
    `).run(assetId, file.name, file.type, base64Data, file.size, now);

    const photoUrl = `/api/uploads/${assetId}`;
    db.prepare('UPDATE clients SET photo_url = ?, updated_at = ? WHERE id = ?').run(photoUrl, now, clientId);

    logAudit({
      actorType: 'admin',
      actorId: session.adminId,
      actorEmail: session.email,
      action: 'ADMIN_UPLOAD_CLIENT_PHOTO',
      details: { clientId, assetId },
    });

    return NextResponse.json({ success: true, photoUrl });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to upload photo' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const clientId = parseInt(params.id, 10);
  if (isNaN(clientId)) return NextResponse.json({ error: 'Invalid client ID' }, { status: 400 });

  const cookieStore = cookies();
  const token = cookieStore.get('admin_session')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const session = verifyToken<AdminSessionPayload>(token);
  if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 });

  const db = getDb();
  const now = new Date().toISOString();
  db.prepare('UPDATE clients SET photo_url = NULL, updated_at = ? WHERE id = ?').run(now, clientId);

  logAudit({
    actorType: 'admin',
    actorId: session.adminId,
    actorEmail: session.email,
    action: 'ADMIN_REMOVE_CLIENT_PHOTO',
    details: { clientId },
  });

  return NextResponse.json({ success: true });
}
