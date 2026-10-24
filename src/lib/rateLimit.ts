import { queryOne, execute } from './db';
import { getSecurityConfig } from './settings';

export async function checkRateLimit(ip: string, email: string): Promise<{ allowed: boolean; waitMinutes?: number }> {
  const config = await getSecurityConfig();
  const key = `${ip}:${email.trim().toLowerCase()}`;
  const now = new Date();

  const record = await queryOne<{
    key: string;
    attempts: number;
    last_attempt: string;
    blocked_until: string | null;
  }>('SELECT * FROM login_rate_limits WHERE key = ?', [key]);

  if (record && record.blocked_until) {
    const blockedUntilDate = new Date(record.blocked_until);
    if (now < blockedUntilDate) {
      const waitMinutes = Math.ceil((blockedUntilDate.getTime() - now.getTime()) / 60000);
      return { allowed: false, waitMinutes };
    } else {
      // Unblock
      await execute('DELETE FROM login_rate_limits WHERE key = ?', [key]);
    }
  }

  return { allowed: true };
}

export async function recordFailedLogin(ip: string, email: string): Promise<{ blocked: boolean; waitMinutes?: number }> {
  const config = await getSecurityConfig();
  const key = `${ip}:${email.trim().toLowerCase()}`;
  const now = new Date();

  const record = await queryOne<{
    key: string;
    attempts: number;
    last_attempt: string;
    blocked_until: string | null;
  }>('SELECT * FROM login_rate_limits WHERE key = ?', [key]);

  if (!record) {
    await execute('INSERT INTO login_rate_limits (key, attempts, last_attempt, blocked_until) VALUES (?, 1, ?, NULL)', [
      key,
      now.toISOString(),
    ]);
    return { blocked: false };
  }

  const newAttempts = record.attempts + 1;
  if (newAttempts >= config.max_login_attempts) {
    const blockedUntil = new Date(now.getTime() + config.lockout_minutes * 60000).toISOString();
    await execute('UPDATE login_rate_limits SET attempts = ?, last_attempt = ?, blocked_until = ? WHERE key = ?', [
      newAttempts,
      now.toISOString(),
      blockedUntil,
      key,
    ]);
    return { blocked: true, waitMinutes: config.lockout_minutes };
  } else {
    await execute('UPDATE login_rate_limits SET attempts = ?, last_attempt = ? WHERE key = ?', [
      newAttempts,
      now.toISOString(),
      key,
    ]);
    return { blocked: false };
  }
}

export async function clearRateLimit(ip: string, email: string): Promise<void> {
  const key = `${ip}:${email.trim().toLowerCase()}`;
  await execute('DELETE FROM login_rate_limits WHERE key = ?', [key]);
}
