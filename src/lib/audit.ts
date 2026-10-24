import { execute } from './db';

export async function logAudit(params: {
  actorType: 'admin' | 'client' | 'system';
  actorId?: number | null;
  actorEmail: string;
  action: string;
  details?: Record<string, any>;
  ipAddress?: string;
}): Promise<void> {
  try {
    const now = new Date().toISOString();
    const detailsJson = JSON.stringify(params.details || {});

    await execute(
      `INSERT INTO audit_logs (actor_type, actor_id, actor_email, action, details, ip_address, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        params.actorType,
        params.actorId || null,
        params.actorEmail,
        params.action,
        detailsJson,
        params.ipAddress || '127.0.0.1',
        now,
      ]
    );
  } catch (error) {
    console.error('Audit log failed:', error);
  }
}
