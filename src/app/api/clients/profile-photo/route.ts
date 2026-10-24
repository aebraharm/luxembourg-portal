import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, ClientSessionPayload } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { ClientRecord } from '@/lib/types';
import { logAudit } from '@/lib/audit';
import crypto from 'node:crypto';

export async function POST(request: Request) {
  const cookieStore = cookies();
  const token = cookieStore.get('client_session')?.value;

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const session = verifyToken<ClientSessionPayload>(token);
  if (!session) {
    return NextResponse.json({ error: 'Session expired' }, { status: 401 });
  }

  const db = getDb();
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(session.clientId) as ClientRecord | undefined;

  if (!client) {
    return NextResponse.json({ error: 'Client record not found' }, { status: 404 });
  }

  if (client.can_client_edit_photo !== 1) {
    return NextResponse.json({ error: 'Client photo editing is restricted by your case administrator.' }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('photo') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No image file provided' }, { status: 400 });
    }

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid photo format. Please upload JPG, PNG, or WEBP.' }, { status: 400 });
    }

    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'Photo size cannot exceed 2MB.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Data = buffer.toString('base64');
    const assetId = `client_photo_${session.clientId}_${crypto.randomBytes(6).toString('hex')}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO uploaded_assets (id, filename, mime_type, data_base64, asset_type, size_bytes, created_at)
      VALUES (?, ?, ?, ?, 'client_photo', ?, ?)
    `).run(assetId, file.name, file.type, base64Data, file.size, now);

    const photoUrl = `/api/uploads/${assetId}`;

    db.prepare(`
      UPDATE clients
      SET photo_url = ?, updated_at = ?
      WHERE id = ?
    `).run(photoUrl, now, session.clientId);

    logAudit({
      actorType: 'client',
      actorId: session.clientId,
      actorEmail: session.email,
      action: 'CLIENT_UPDATE_PHOTO',
      details: { assetId },
    });

    return NextResponse.json({ success: true, photoUrl });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update photo' }, { status: 500 });
  }
}

export async function DELETE() {
  const cookieStore = cookies();
  const token = cookieStore.get('client_session')?.value;

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const session = verifyToken<ClientSessionPayload>(token);
  if (!session) {
    return NextResponse.json({ error: 'Session expired' }, { status: 401 });
  }

  const db = getDb();
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(session.clientId) as ClientRecord | undefined;

  if (!client) {
    return NextResponse.json({ error: 'Client record not found' }, { status: 404 });
  }

  if (client.can_client_edit_photo !== 1) {
    return NextResponse.json({ error: 'Client photo editing is restricted by your case administrator.' }, { status: 403 });
  }

  const now = new Date().toISOString();
  db.prepare('UPDATE clients SET photo_url = NULL, updated_at = ? WHERE id = ?').run(now, session.clientId);

  logAudit({
    actorType: 'client',
    actorId: session.clientId,
    actorEmail: session.email,
    action: 'CLIENT_REMOVE_PHOTO',
    details: {},
  });

  return NextResponse.json({ success: true });
}
