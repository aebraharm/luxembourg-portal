import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, ClientSessionPayload } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { ClientRecord } from '@/lib/types';

export async function GET() {
  const cookieStore = cookies();
  const token = cookieStore.get('client_session')?.value;

  if (!token) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const session = verifyToken<ClientSessionPayload>(token);
  if (!session) {
    return NextResponse.json({ authenticated: false, error: 'Session expired' }, { status: 401 });
  }

  const db = getDb();
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(session.clientId) as ClientRecord | undefined;

  if (!client || client.is_active !== 1) {
    return NextResponse.json({ authenticated: false, error: 'Client account inactive or removed' }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    client: {
      id: client.id,
      fullName: client.full_name,
      email: client.email,
      referenceNumber: client.reference_number,
      photoUrl: client.photo_url,
      caseCategory: client.case_category,
      caseDetails: client.case_details,
      amountCents: client.amount_cents,
      paymentStatus: client.payment_status,
      paymentInstructions: client.payment_instructions,
      canClientEditPhoto: client.can_client_edit_photo === 1,
      createdAt: client.created_at,
    },
  });
}
