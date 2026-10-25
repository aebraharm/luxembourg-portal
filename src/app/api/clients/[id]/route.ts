import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, AdminSessionPayload } from '@/lib/auth';
import { queryOne, queryAll, execute, deriveInvoiceStatus } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { ClientRecord, InvoiceRecord, PaymentRecord } from '@/lib/types';

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

  const client = await queryOne<ClientRecord>(
    `SELECT c.*, r.name as region_name
     FROM clients c
     LEFT JOIN regions r ON c.region_id = r.id
     WHERE c.id = ?`,
    [clientId]
  );
  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

  const invoicesRows = await queryAll<InvoiceRecord>(
    'SELECT * FROM invoices WHERE client_id = ? ORDER BY created_at DESC',
    [clientId]
  );
  const invoices = invoicesRows.map((inv) => ({
    ...inv,
    effective_status: deriveInvoiceStatus(inv.status, inv.due_date),
  }));

  const payments = await queryAll<PaymentRecord>(
    'SELECT * FROM payments WHERE client_id = ? ORDER BY created_at DESC',
    [clientId]
  );

  return NextResponse.json({ client, invoices, payments });
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

  const existingClient = await queryOne<ClientRecord>('SELECT * FROM clients WHERE id = ?', [clientId]);
  if (!existingClient) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

  try {
    const body = await request.json();
    const {
      fullName,
      email,
      referenceNumber,
      regionId,
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

    // Check reference number uniqueness against other clients
    const clash = await queryOne(
      'SELECT id FROM clients WHERE UPPER(reference_number) = ? AND id != ?',
      [normRef, clientId]
    );
    if (clash) {
      return NextResponse.json(
        { error: `The reference number "${normRef}" is already assigned to another client.` },
        { status: 400 }
      );
    }

    // Validate region if provided
    let finalRegionId: number | null = existingClient.region_id || null;
    if (regionId !== undefined) {
      if (regionId === null || regionId === '' || regionId === 'none') {
        finalRegionId = null;
      } else {
        const parsedRegionId = parseInt(String(regionId), 10);
        if (!isNaN(parsedRegionId)) {
          const region = await queryOne('SELECT id FROM regions WHERE id = ?', [parsedRegionId]);
          if (!region) {
            return NextResponse.json({ error: 'Selected region does not exist.' }, { status: 400 });
          }
          finalRegionId = parsedRegionId;
        }
      }
    }

    // Optional amount update
    let finalAmountCents = existingClient.amount_cents;
    if (amountEur !== undefined && amountEur !== null && String(amountEur).trim() !== '') {
      const amountNum = parseFloat(String(amountEur));
      if (!isNaN(amountNum) && amountNum >= 0) {
        finalAmountCents = Math.round(amountNum * 100);
      }
    }

    const now = new Date().toISOString();

    await execute(
      `UPDATE clients SET
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
        region_id = ?,
        updated_at = ?
      WHERE id = ?`,
      [
        fullName.trim(),
        normEmail,
        normRef,
        photoUrl !== undefined ? photoUrl : existingClient.photo_url,
        caseCategory || existingClient.case_category,
        caseDetails !== undefined ? caseDetails : existingClient.case_details,
        finalAmountCents,
        paymentStatus || existingClient.payment_status,
        paymentInstructions !== undefined ? paymentInstructions : existingClient.payment_instructions,
        adminNotes !== undefined ? adminNotes : existingClient.admin_notes,
        isActive !== undefined ? (isActive ? 1 : 0) : existingClient.is_active,
        canClientEditPhoto !== undefined ? (canClientEditPhoto ? 1 : 0) : existingClient.can_client_edit_photo,
        finalRegionId,
        now,
        clientId,
      ]
    );

    await logAudit({
      actorType: 'admin',
      actorId: session.adminId,
      actorEmail: session.email,
      action: 'UPDATE_CLIENT_RECORD',
      details: {
        clientId,
        fullName: fullName.trim(),
        referenceNumber: normRef,
        previousRegionId: existingClient.region_id,
        newRegionId: finalRegionId,
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

  const client = await queryOne<ClientRecord>('SELECT * FROM clients WHERE id = ?', [clientId]);
  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

  await execute('DELETE FROM clients WHERE id = ?', [clientId]);

  await logAudit({
    actorType: 'admin',
    actorId: session.adminId,
    actorEmail: session.email,
    action: 'DELETE_CLIENT_RECORD',
    details: { clientId, fullName: client.full_name, referenceNumber: client.reference_number },
  });

  return NextResponse.json({ success: true });
}
