import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, AdminSessionPayload } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { ClientRecord } from '@/lib/types';

export async function GET(request: Request) {
  const cookieStore = cookies();
  const token = cookieStore.get('admin_session')?.value;

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const session = verifyToken<AdminSessionPayload>(token);
  if (!session) {
    return NextResponse.json({ error: 'Session expired' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search');
  const status = searchParams.get('status');
  const activeOnly = searchParams.get('active');
  const exportFormat = searchParams.get('export');

  const db = getDb();
  let query = 'SELECT * FROM clients WHERE 1=1';
  const params: any[] = [];

  if (search) {
    query += ' AND (full_name LIKE ? OR email LIKE ? OR reference_number LIKE ? OR case_category LIKE ?)';
    const term = `%${search.trim()}%`;
    params.push(term, term, term, term);
  }

  if (status && status !== 'all') {
    query += ' AND payment_status = ?';
    params.push(status);
  }

  if (activeOnly === '1') {
    query += ' AND is_active = 1';
  } else if (activeOnly === '0') {
    query += ' AND is_active = 0';
  }

  query += ' ORDER BY created_at DESC';

  const clients = db.prepare(query).all(...params) as unknown as ClientRecord[];

  // Export handling
  if (exportFormat === 'csv') {
    const headers = ['ID', 'Full Name', 'Email', 'Reference Number', 'Case Category', 'Amount EUR', 'Payment Status', 'Active', 'Created At'];
    const rows = clients.map((c) => [
      c.id,
      `"${c.full_name.replace(/"/g, '""')}"`,
      c.email,
      c.reference_number,
      `"${c.case_category.replace(/"/g, '""')}"`,
      (c.amount_cents / 100).toFixed(2),
      c.payment_status,
      c.is_active === 1 ? 'Yes' : 'No',
      c.created_at,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="clients_export.csv"',
      },
    });
  }

  return NextResponse.json({ clients });
}

export async function POST(request: Request) {
  const cookieStore = cookies();
  const token = cookieStore.get('admin_session')?.value;

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const session = verifyToken<AdminSessionPayload>(token);
  if (!session) {
    return NextResponse.json({ error: 'Session expired' }, { status: 401 });
  }

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

    // Strict validations
    if (!fullName || !fullName.trim()) {
      return NextResponse.json({ error: "Client's full name is required." }, { status: 400 });
    }

    if (!email || !email.trim() || !email.includes('@')) {
      return NextResponse.json({ error: 'A valid email address is required.' }, { status: 400 });
    }

    // MANDATORY MANUAL REFERENCE NUMBER REQUIREMENT
    if (!referenceNumber || !referenceNumber.trim()) {
      return NextResponse.json(
        { error: 'Reference number is required. The administrator must manually assign each reference number.' },
        { status: 400 }
      );
    }

    const normEmail = email.trim().toLowerCase();
    const normRef = referenceNumber.trim().toUpperCase();

    // Minor unit integer conversion for EUR (cents)
    const amountNum = parseFloat(amountEur);
    if (isNaN(amountNum) || amountNum < 0) {
      return NextResponse.json({ error: 'Valid positive amount in EUR is required.' }, { status: 400 });
    }
    const amountCents = Math.round(amountNum * 100);

    const db = getDb();

    // Check uniqueness of reference number
    const existingRef = db.prepare('SELECT id FROM clients WHERE UPPER(reference_number) = ?').get(normRef);
    if (existingRef) {
      return NextResponse.json(
        { error: `The reference number "${normRef}" is already assigned to another client record.` },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    const insert = db.prepare(`
      INSERT INTO clients (
        full_name, email, reference_number, photo_url, case_category,
        case_details, amount_cents, payment_status, payment_instructions,
        admin_notes, is_active, can_client_edit_photo, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insert.run(
      fullName.trim(),
      normEmail,
      normRef,
      photoUrl || null,
      caseCategory || 'General Visa Processing',
      caseDetails || '',
      amountCents,
      paymentStatus || 'pending',
      paymentInstructions || '',
      adminNotes || '',
      isActive === false ? 0 : 1,
      canClientEditPhoto === false ? 0 : 1,
      now,
      now
    );

    const clientId = Number(result.lastInsertRowid);

    logAudit({
      actorType: 'admin',
      actorId: session.adminId,
      actorEmail: session.email,
      action: 'CREATE_CLIENT_RECORD',
      details: {
        clientId,
        fullName: fullName.trim(),
        email: normEmail,
        referenceNumber: normRef,
        amountCents,
      },
    });

    return NextResponse.json({ success: true, clientId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create client' }, { status: 500 });
  }
}
