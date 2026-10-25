import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, AdminSessionPayload } from '@/lib/auth';
import { queryAll, queryOne, execute } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { RegionRecord } from '@/lib/types';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const activeOnly = searchParams.get('active') === '1';

  let query = `
    SELECT r.*, COUNT(c.id) as client_count
    FROM regions r
    LEFT JOIN clients c ON c.region_id = r.id
  `;

  if (activeOnly) {
    query += ' WHERE r.is_active = 1';
  }

  query += ' GROUP BY r.id ORDER BY r.name ASC';

  const regions = await queryAll<RegionRecord>(query);
  return NextResponse.json({ regions });
}

export async function POST(request: Request) {
  const cookieStore = cookies();
  const token = cookieStore.get('admin_session')?.value;

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
  }

  const session = verifyToken<AdminSessionPayload>(token);
  if (!session) {
    return NextResponse.json({ error: 'Session expired' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, code, description, isActive } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Region display name is required.' }, { status: 400 });
    }

    const trimmedName = name.trim();
    const trimmedCode = code ? code.trim().toUpperCase() : null;

    // Check uniqueness
    const existing = await queryOne('SELECT id FROM regions WHERE LOWER(name) = LOWER(?)', [trimmedName]);
    if (existing) {
      return NextResponse.json(
        { error: `A region named "${trimmedName}" already exists.` },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const result = await execute(
      `INSERT INTO regions (name, code, description, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        trimmedName,
        trimmedCode,
        description ? description.trim() : '',
        isActive === false ? 0 : 1,
        now,
        now,
      ]
    );

    const regionId = result.lastInsertRowid;

    await logAudit({
      actorType: 'admin',
      actorId: session.adminId,
      actorEmail: session.email,
      action: 'CREATE_REGION',
      details: { regionId, name: trimmedName, code: trimmedCode },
    });

    return NextResponse.json({ success: true, regionId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create region' }, { status: 500 });
  }
}
