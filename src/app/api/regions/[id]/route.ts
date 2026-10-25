import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, AdminSessionPayload } from '@/lib/auth';
import { queryOne, execute } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { RegionRecord } from '@/lib/types';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const regionId = parseInt(params.id, 10);
  if (isNaN(regionId)) return NextResponse.json({ error: 'Invalid region ID' }, { status: 400 });

  const region = await queryOne<RegionRecord>(
    `SELECT r.*, COUNT(c.id) as client_count
     FROM regions r
     LEFT JOIN clients c ON c.region_id = r.id
     WHERE r.id = ?
     GROUP BY r.id`,
    [regionId]
  );

  if (!region) return NextResponse.json({ error: 'Region not found' }, { status: 404 });

  return NextResponse.json({ region });
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const regionId = parseInt(params.id, 10);
  if (isNaN(regionId)) return NextResponse.json({ error: 'Invalid region ID' }, { status: 400 });

  const cookieStore = cookies();
  const token = cookieStore.get('admin_session')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const session = verifyToken<AdminSessionPayload>(token);
  if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 });

  const existing = await queryOne<RegionRecord>('SELECT * FROM regions WHERE id = ?', [regionId]);
  if (!existing) return NextResponse.json({ error: 'Region not found' }, { status: 404 });

  try {
    const body = await request.json();
    const { name, code, description, isActive } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Region name is required.' }, { status: 400 });
    }

    const trimmedName = name.trim();
    const trimmedCode = code ? code.trim().toUpperCase() : null;
    const newIsActive = isActive === false ? 0 : 1;

    // Check uniqueness against other regions
    const clash = await queryOne(
      'SELECT id FROM regions WHERE LOWER(name) = LOWER(?) AND id != ?',
      [trimmedName, regionId]
    );
    if (clash) {
      return NextResponse.json({ error: `Region name "${trimmedName}" is already taken.` }, { status: 400 });
    }

    // Safety rule: Prevent disabling a region if clients are currently assigned to it
    if (existing.is_active === 1 && newIsActive === 0) {
      const assignedCountRs = await queryOne<{ count: number }>(
        'SELECT COUNT(*) as count FROM clients WHERE region_id = ?',
        [regionId]
      );
      const assignedCount = assignedCountRs ? Number(assignedCountRs.count) : 0;
      if (assignedCount > 0) {
        return NextResponse.json(
          {
            error: `Cannot disable region "${existing.name}" because ${assignedCount} client(s) are currently assigned to it. Please reassign those clients before disabling.`,
          },
          { status: 400 }
        );
      }
    }

    const now = new Date().toISOString();
    await execute(
      `UPDATE regions SET
        name = ?,
        code = ?,
        description = ?,
        is_active = ?,
        updated_at = ?
       WHERE id = ?`,
      [
        trimmedName,
        trimmedCode,
        description !== undefined ? description.trim() : existing.description,
        newIsActive,
        now,
        regionId,
      ]
    );

    await logAudit({
      actorType: 'admin',
      actorId: session.adminId,
      actorEmail: session.email,
      action: 'UPDATE_REGION',
      details: {
        regionId,
        previousName: existing.name,
        newName: trimmedName,
        previousActive: existing.is_active,
        newActive: newIsActive,
      },
    });

    return NextResponse.json({ success: true, regionId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update region' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const regionId = parseInt(params.id, 10);
  if (isNaN(regionId)) return NextResponse.json({ error: 'Invalid region ID' }, { status: 400 });

  const cookieStore = cookies();
  const token = cookieStore.get('admin_session')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const session = verifyToken<AdminSessionPayload>(token);
  if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 });

  const existing = await queryOne<RegionRecord>('SELECT * FROM regions WHERE id = ?', [regionId]);
  if (!existing) return NextResponse.json({ error: 'Region not found' }, { status: 404 });

  // Safety rule: Prevent deleting a region if clients are currently assigned to it
  const assignedCountRs = await queryOne<{ count: number }>(
    'SELECT COUNT(*) as count FROM clients WHERE region_id = ?',
    [regionId]
  );
  const assignedCount = assignedCountRs ? Number(assignedCountRs.count) : 0;
  if (assignedCount > 0) {
    return NextResponse.json(
      {
        error: `Cannot delete region "${existing.name}" because ${assignedCount} client(s) are currently assigned to it. Please reassign those clients before deletion.`,
      },
      { status: 400 }
    );
  }

  await execute('DELETE FROM regions WHERE id = ?', [regionId]);

  await logAudit({
    actorType: 'admin',
    actorId: session.adminId,
    actorEmail: session.email,
    action: 'DELETE_REGION',
    details: { regionId, name: existing.name },
  });

  return NextResponse.json({ success: true });
}
