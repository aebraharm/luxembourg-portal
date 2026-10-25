import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, AdminSessionPayload } from '@/lib/auth';
import { queryAll, queryOne, execute } from '@/lib/db';
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
  const regionId = searchParams.get('regionId');
  const activeOnly = searchParams.get('active');
  const exportFormat = searchParams.get('export');

  let query = `
    SELECT c.*, r.name as region_name
    FROM clients c
    LEFT JOIN regions r ON c.region_id = r.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (search) {
    query += ' AND (c.full_name LIKE ? OR c.email LIKE ? OR c.reference_number LIKE ? OR c.case_category LIKE ?)';
    const term = `%${search.trim()}%`;
    params.push(term, term, term, term);
  }

  if (status && status !== 'all') {
    query += ' AND c.payment_status = ?';
    params.push(status);
  }

  if (regionId && regionId !== 'all') {
    if (regionId === 'unassigned') {
      query += ' AND c.region_id IS NULL';
    } else {
      query += ' AND c.region_id = ?';
      params.push(parseInt(regionId, 10));
    }
  }

  if (activeOnly === '1') {
    query += ' AND c.is_active = 1';
  } else if (activeOnly === '0') {
    query += ' AND c.is_active = 0';
  }

  query += ' ORDER BY c.created_at DESC';

  const clients = await queryAll<ClientRecord>(query, params);

  // Export handling
  if (exportFormat === 'csv') {
    const headers = [
      'ID',
      'Full Name',
      'Email',
      'Reference Number',
      'Region',
      'Case Category',
      'Amount EUR',
      'Payment Status',
      'Active',
      'Created At',
    ];
    const rows = clients.map((c) => [
      c.id,
      `"${c.full_name.replace(/"/g, '""')}"`,
      c.email,
      c.reference_number,
      `"${(c.region_name || 'Unassigned').replace(/"/g, '""')}"`,
      `"${c.case_category.replace(/"/g, '""')}"`,
      ((c.amount_cents || 0) / 100).toFixed(2),
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

    // Check uniqueness of reference number
    const existingRef = await queryOne('SELECT id FROM clients WHERE UPPER(reference_number) = ?', [normRef]);
    if (existingRef) {
      return NextResponse.json(
        { error: `The reference number "${normRef}" is already assigned to another client record.` },
        { status: 400 }
      );
    }

    // Validate region if provided
    let finalRegionId: number | null = null;
    if (regionId !== undefined && regionId !== null && regionId !== '' && regionId !== 'none') {
      const parsedRegionId = parseInt(String(regionId), 10);
      if (!isNaN(parsedRegionId)) {
        const region = await queryOne('SELECT id, is_active FROM regions WHERE id = ?', [parsedRegionId]);
        if (!region) {
          return NextResponse.json({ error: 'Selected region does not exist.' }, { status: 400 });
        }
        finalRegionId = parsedRegionId;
      }
    }

    // Fee amount is OPTIONAL - client can be created without an invoice or fee
    let amountCents = 0;
    if (amountEur !== undefined && amountEur !== null && String(amountEur).trim() !== '') {
      const amountNum = parseFloat(String(amountEur));
      if (!isNaN(amountNum) && amountNum >= 0) {
        amountCents = Math.round(amountNum * 100);
      }
    }

    const now = new Date().toISOString();

    const result = await execute(
      `INSERT INTO clients (
        full_name, email, reference_number, photo_url, case_category,
        case_details, amount_cents, payment_status, payment_instructions,
        admin_notes, is_active, can_client_edit_photo, region_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
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
        finalRegionId,
        now,
        now,
      ]
    );

    const clientId = result.lastInsertRowid;

    await logAudit({
      actorType: 'admin',
      actorId: session.adminId,
      actorEmail: session.email,
      action: 'CREATE_CLIENT_RECORD',
      details: {
        clientId,
        fullName: fullName.trim(),
        email: normEmail,
        referenceNumber: normRef,
        regionId: finalRegionId,
        amountCents,
      },
    });

    return NextResponse.json({ success: true, clientId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create client' }, { status: 500 });
  }
}
