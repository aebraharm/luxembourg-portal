import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, AdminSessionPayload } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { AuditLogRecord } from '@/lib/types';

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
  const action = searchParams.get('action');
  const actorType = searchParams.get('actorType');
  const search = searchParams.get('search');
  const limit = parseInt(searchParams.get('limit') || '100', 10);

  const db = getDb();
  let query = 'SELECT * FROM audit_logs WHERE 1=1';
  const params: any[] = [];

  if (action && action !== 'all') {
    query += ' AND action = ?';
    params.push(action);
  }

  if (actorType && actorType !== 'all') {
    query += ' AND actor_type = ?';
    params.push(actorType);
  }

  if (search) {
    query += ' AND (actor_email LIKE ? OR action LIKE ? OR details LIKE ?)';
    const term = `%${search.trim()}%`;
    params.push(term, term, term);
  }

  query += ' ORDER BY created_at DESC LIMIT ?';
  params.push(limit);

  const logs = db.prepare(query).all(...params) as unknown as AuditLogRecord[];
  return NextResponse.json({ logs });
}
