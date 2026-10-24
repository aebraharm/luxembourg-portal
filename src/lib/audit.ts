import { getDb } from './db';

export function logAudit(params: {
  actorType: 'admin' | 'client' | 'system';
  actorId?: number | null;
  actorEmail: string;
  action: string;
  details?: Record<string, any>;
  ipAddress?: string;
}) {
  try {
    const db = getDb();
    const now = new Date().toISOString();
    const detailsJson = JSON.stringify(params.details || {});

    db.prepare(`
      INSERT INTO audit_logs (actor_type, actor_id, actor_email, action, details, ip_address, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      params.actorType,
      params.actorId || null,
      params.actorEmail,
      params.action,
      detailsJson,
      params.ipAddress || '127.0.0.1',
      now
    );
  } catch (error) {
    console.error('Audit log failed:', error);
  }
}
