import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { getDb } from './db';
import { ClientRecord, AdministratorRecord } from './types';

const SESSION_SECRET = process.env.SESSION_SECRET || 'luxembourg-visa-portal-super-secure-secret-key-2026';

export interface ClientSessionPayload {
  clientId: number;
  email: string;
  referenceNumber: string;
  exp: number;
}

export interface AdminSessionPayload {
  adminId: number;
  email: string;
  role: string;
  mustChangePassword: boolean;
  exp: number;
}

export function signPayload(data: Record<string, any>, durationMinutes: number): string {
  const exp = Math.floor(Date.now() / 1000) + durationMinutes * 60;
  const payload = JSON.stringify({ ...data, exp });
  const base64Payload = Buffer.from(payload, 'utf8').toString('base64url');
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(base64Payload)
    .digest('base64url');
  return `${base64Payload}.${signature}`;
}

export function verifyToken<T>(token: string): T | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [base64Payload, signature] = parts;
    const expectedSig = crypto
      .createHmac('sha256', SESSION_SECRET)
      .update(base64Payload)
      .digest('base64url');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      return null;
    }

    const jsonStr = Buffer.from(base64Payload, 'base64url').toString('utf8');
    const data = JSON.parse(jsonStr);

    if (data.exp && data.exp < Math.floor(Date.now() / 1000)) {
      return null; // Expired
    }

    return data as T;
  } catch {
    return null;
  }
}

// Client authentication
export function authenticateClient(email: string, referenceNumber: string): { client?: ClientRecord; error?: string } {
  const db = getDb();
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedRef = referenceNumber.trim().toUpperCase();

  const client = db
    .prepare('SELECT * FROM clients WHERE LOWER(TRIM(email)) = ? AND UPPER(TRIM(reference_number)) = ?')
    .get(normalizedEmail, normalizedRef) as ClientRecord | undefined;

  if (!client) {
    return { error: 'Invalid email address or reference number. Please check your official case paperwork.' };
  }

  if (client.is_active !== 1) {
    return { error: 'This immigration client record is currently inactive. Please contact your designated case officer.' };
  }

  return { client };
}

// Admin authentication
export function authenticateAdmin(email: string, passwordPlain: string): { admin?: AdministratorRecord; error?: string } {
  const db = getDb();
  const normalizedEmail = email.trim().toLowerCase();

  const admin = db
    .prepare('SELECT * FROM administrators WHERE LOWER(TRIM(email)) = ?')
    .get(normalizedEmail) as AdministratorRecord | undefined;

  if (!admin) {
    return { error: 'Invalid administrator credentials.' };
  }

  const matches = bcrypt.compareSync(passwordPlain, admin.password_hash);
  if (!matches) {
    return { error: 'Invalid administrator credentials.' };
  }

  return { admin };
}

// Password update
export function updateAdminPassword(adminId: number, newPasswordPlain: string): { success: boolean; error?: string } {
  if (newPasswordPlain.length < 8) {
    return { success: false, error: 'Password must be at least 8 characters in length.' };
  }

  const db = getDb();
  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(newPasswordPlain, salt);
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE administrators
    SET password_hash = ?, must_change_password = 0, updated_at = ?
    WHERE id = ?
  `).run(hash, now, adminId);

  return { success: true };
}
