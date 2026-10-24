import { getDb } from './db';
import { getSecurityConfig } from './settings';

export function checkRateLimit(ip: string, email: string): { allowed: boolean; waitMinutes?: number } {
  const db = getDb();
  const config = getSecurityConfig();
  const key = `${ip}:${email.trim().toLowerCase()}`;
  const now = new Date();

  const record = db.prepare('SELECT * FROM login_rate_limits WHERE key = ?').get(key) as {
    key: string;
    attempts: number;
    last_attempt: string;
    blocked_until: string | null;
  } | undefined;

  if (record && record.blocked_until) {
    const blockedUntilDate = new Date(record.blocked_until);
    if (now < blockedUntilDate) {
      const waitMinutes = Math.ceil((blockedUntilDate.getTime() - now.getTime()) / 60000);
      return { allowed: false, waitMinutes };
    } else {
      // Unblock
      db.prepare('DELETE FROM login_rate_limits WHERE key = ?').run(key);
    }
  }

  return { allowed: true };
}

export function recordFailedLogin(ip: string, email: string): { blocked: boolean; waitMinutes?: number } {
  const db = getDb();
  const config = getSecurityConfig();
  const key = `${ip}:${email.trim().toLowerCase()}`;
  const now = new Date();

  const record = db.prepare('SELECT * FROM login_rate_limits WHERE key = ?').get(key) as {
    key: string;
    attempts: number;
    last_attempt: string;
    blocked_until: string | null;
  } | undefined;

  if (!record) {
    db.prepare('INSERT INTO login_rate_limits (key, attempts, last_attempt, blocked_until) VALUES (?, 1, ?, NULL)')
      .run(key, now.toISOString());
    return { blocked: false };
  }

  const newAttempts = record.attempts + 1;
  if (newAttempts >= config.max_login_attempts) {
    const blockedUntil = new Date(now.getTime() + config.lockout_minutes * 60000).toISOString();
    db.prepare('UPDATE login_rate_limits SET attempts = ?, last_attempt = ?, blocked_until = ? WHERE key = ?')
      .run(newAttempts, now.toISOString(), blockedUntil, key);
    return { blocked: true, waitMinutes: config.lockout_minutes };
  } else {
    db.prepare('UPDATE login_rate_limits SET attempts = ?, last_attempt = ? WHERE key = ?')
      .run(newAttempts, now.toISOString(), key);
    return { blocked: false };
  }
}

export function clearRateLimit(ip: string, email: string) {
  const db = getDb();
  const key = `${ip}:${email.trim().toLowerCase()}`;
  db.prepare('DELETE FROM login_rate_limits WHERE key = ?').run(key);
}
