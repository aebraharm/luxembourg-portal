import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, AdminSessionPayload } from '@/lib/auth';
import { execute, queryOne } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { saveAsset, deleteAsset } from '@/lib/storage';
import { ClientRecord } from '@/lib/types';

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
    const buffer = Buffer.from(bytes);

    const assetId = await saveAsset({
      filename: file.name,
      mimeType: file.type,
      buffer,
      assetType: 'client_photo',
    });

    const photoUrl = `/api/uploads/${assetId}`;
    const now = new Date().toISOString();
    await execute('UPDATE clients SET photo_url = ?, updated_at = ? WHERE id = ?', [photoUrl, now, clientId]);

    await logAudit({
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

  const client = await queryOne<ClientRecord>('SELECT photo_url FROM clients WHERE id = ?', [clientId]);
  if (client && client.photo_url && client.photo_url.startsWith('/api/uploads/')) {
    const assetId = client.photo_url.replace('/api/uploads/', '');
    await deleteAsset(assetId);
  }

  const now = new Date().toISOString();
  await execute('UPDATE clients SET photo_url = NULL, updated_at = ? WHERE id = ?', [now, clientId]);

  await logAudit({
    actorType: 'admin',
    actorId: session.adminId,
    actorEmail: session.email,
    action: 'ADMIN_REMOVE_CLIENT_PHOTO',
    details: { clientId },
  });

  return NextResponse.json({ success: true });
}
