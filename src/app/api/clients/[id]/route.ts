import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, AdminSessionPayload } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { ClientRecord, PaymentRecord } from '@/lib/types';

export async function GET(
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
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(clientId) as unknown as ClientRecord | undefined;
  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

  const payments = db.prepare('SELECT * FROM payments WHERE client_id = ? ORDER BY created_at DESC').all(clientId) as unknown as PaymentRecord[];

  return NextResponse.json({ client, payments });
}

export async function PUT(
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
    const body = await request.json();
    const {
      fullName,
      email,
      referenceNumber,
      caseCategory,
      caseDetails,
      amountEur,
      paymentStatus,
      paymentInstructions,
      adminNotes,
      isActive,
      canClientEditPhoto,
      photoUrl,
    } = body;

    const normEmail = email.trim().toLowerCase();
    const normRef = referenceNumber.trim().toUpperCase();

    const amountNum = parseFloat(amountEur);
    if (isNaN(amountNum) || amountNum < 0) {
      return NextResponse.json({ error: 'Valid positive amount in EUR is required.' }, { status: 400 });
    }
    const amountCents = Math.round(amountNum * 100);

    const db = getDb();

    // Check reference number uniqueness against other clients
    const clash = db
      .prepare('SELECT id FROM clients WHERE UPPER(reference_number) = ? AND id != ?')
      .get(normRef, clientId);
    if (clash) {
      return NextResponse.json(
        { error: `The reference number "${normRef}" is already assigned to another client.` },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    db.prepare(`
      UPDATE clients SET
        full_name = ?,
        email = ?,
        reference_number = ?,
        photo_url = ?,
        case_category = ?,
        case_details = ?,
        amount_cents = ?,
        payment_status = ?,
        payment_instructions = ?,
        admin_notes = ?,
        is_active = ?,
        can_client_edit_photo = ?,
        updated_at = ?
      WHERE id = ?
    `).run(
      fullName.trim(),
      normEmail,
      normRef,
      photoUrl !== undefined ? photoUrl : null,
      caseCategory,
      caseDetails || '',
      amountCents,
      paymentStatus,
      paymentInstructions || '',
      adminNotes || '',
      isActive ? 1 : 0,
      canClientEditPhoto ? 1 : 0,
      now,
      clientId
    );

    logAudit({
      actorType: 'admin',
      actorId: session.adminId,
      actorEmail: session.email,
      action: 'UPDATE_CLIENT_RECORD',
      details: {
        clientId,
        fullName: fullName.trim(),
        referenceNumber: normRef,
        amountCents,
        paymentStatus,
      },
    });

    return NextResponse.json({ success: true, clientId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update client' }, { status: 500 });
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
  const client = db.prepare('SELECT full_name, reference_number FROM clients WHERE id = ?').get(clientId) as { full_name: string; reference_number: string } | undefined;

  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  db.prepare('DELETE FROM clients WHERE id = ?').run(clientId);

  logAudit({
    actorType: 'admin',
    actorId: session.adminId,
    actorEmail: session.email,
    action: 'DELETE_CLIENT_RECORD',
    details: { clientId, clientName: client.full_name, referenceNumber: client.reference_number },
  });

  return NextResponse.json({ success: true, message: 'Client record deleted successfully.' });
}
