import { createClient, Client } from '@libsql/client';
import path from 'node:path';
import fs from 'node:fs';
import bcrypt from 'bcryptjs';

let dbClient: Client | null = null;
let initPromise: Promise<void> | null = null;

export interface DatabaseConfig {
  isProduction: boolean;
  isNetlify: boolean;
  url: string;
  authToken: string;
  isRemote: boolean;
}

/**
 * Parses and sanitizes database configuration from environment variables.
 * Trims values and removes wrapping quotes.
 */
export function getDatabaseConfig(): DatabaseConfig {
  const isNetlify = Boolean(
    process.env.NETLIFY ||
    process.env.NETLIFY_BLOBS_CONTEXT ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.LAMBDA_TASK_ROOT
  );
  const isProduction = process.env.NODE_ENV === 'production' || isNetlify;

  const rawUrl =
    process.env.TURSO_DATABASE_URL ||
    process.env.LIBSQL_DATABASE_URL ||
    process.env.DATABASE_URL ||
    '';
  const rawToken =
    process.env.TURSO_AUTH_TOKEN ||
    process.env.LIBSQL_AUTH_TOKEN ||
    process.env.DATABASE_AUTH_TOKEN ||
    '';

  const url = rawUrl.trim().replace(/^['"]|['"]$/g, '');
  const authToken = rawToken.trim().replace(/^['"]|['"]$/g, '');

  const isRemote = Boolean(
    url &&
    (url.startsWith('libsql://') ||
     url.startsWith('https://') ||
     url.startsWith('http://'))
  );

  return { isProduction, isNetlify, url, authToken, isRemote };
}

/**
 * Resets the cached database client and initialization promise (used in testing).
 */
export function resetDbClientForTesting(): void {
  dbClient = null;
  initPromise = null;
}

/**
 * Obtains or creates the active database client.
 * In production or on Netlify, strictly requires a remote Turso/libSQL database.
 * Never attempts filesystem operations or local SQLite fallback in production.
 */
export function getDb(): Client {
  if (!dbClient) {
    const config = getDatabaseConfig();

    if (config.isProduction) {
      // Production must strictly use a remote managed database
      if (!config.url) {
        throw new Error(
          'Production Database Configuration Error: TURSO_DATABASE_URL is not configured. Please add TURSO_DATABASE_URL in Netlify Environment Variables (scoped to Functions).'
        );
      }

      if (config.url.startsWith('file:') || !config.isRemote) {
        throw new Error(
          'Production Database Configuration Error: Local filesystem SQLite is disabled in serverless production. TURSO_DATABASE_URL must start with libsql:// or https://.'
        );
      }

      if (!config.authToken) {
        throw new Error(
          'Production Database Configuration Error: TURSO_AUTH_TOKEN is not configured. Please add TURSO_AUTH_TOKEN in Netlify Environment Variables (scoped to Functions).'
        );
      }

      dbClient = createClient({
        url: config.url,
        authToken: config.authToken,
      });
      return dbClient;
    }

    // Non-production (local development and test suites)
    if (config.isRemote) {
      dbClient = createClient({
        url: config.url,
        authToken: config.authToken || undefined,
      });
      return dbClient;
    }

    // Local SQLite fallback strictly for offline development/testing
    let localPath = config.url || 'file:data/portal.sqlite';
    if (localPath.startsWith('file:')) {
      const filePath = localPath.replace(/^file:/, '');
      const resolvedPath = path.isAbsolute(filePath)
        ? filePath
        : path.resolve(process.cwd(), filePath);
      const dir = path.dirname(resolvedPath);

      // Only attempt mkdir in non-production, non-serverless environments
      if (!config.isNetlify && !fs.existsSync(dir)) {
        try {
          fs.mkdirSync(dir, { recursive: true });
        } catch (err: any) {
          console.warn('Local directory creation notice:', err.message);
        }
      }
      localPath = `file:${resolvedPath}`;
    }

    dbClient = createClient({ url: localPath });
  }

  return dbClient;
}

export async function ensureDbInit(): Promise<void> {
  if (!initPromise) {
    initPromise = initDatabaseSchema();
  }
  return initPromise;
}

async function initDatabaseSchema(): Promise<void> {
  const client = getDb();
  const config = getDatabaseConfig();

  // Create tables idempotently (safe: CREATE TABLE IF NOT EXISTS preserves all existing data)
  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS administrators (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'super_admin',
      must_change_password INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL,
      reference_number TEXT UNIQUE NOT NULL,
      photo_url TEXT,
      case_category TEXT NOT NULL,
      case_details TEXT NOT NULL DEFAULT '',
      amount_cents INTEGER NOT NULL,
      payment_status TEXT NOT NULL DEFAULT 'pending',
      payment_instructions TEXT NOT NULL DEFAULT '',
      admin_notes TEXT NOT NULL DEFAULT '',
      is_active INTEGER NOT NULL DEFAULT 1,
      can_client_edit_photo INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
    CREATE INDEX IF NOT EXISTS idx_clients_ref ON clients(reference_number);

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      reference_number TEXT NOT NULL,
      method TEXT NOT NULL,
      amount_cents INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'EUR',
      status TEXT NOT NULL DEFAULT 'pending',
      mode TEXT NOT NULL DEFAULT 'demo',
      provider_ref TEXT,
      failure_reason TEXT,
      crypto_currency TEXT,
      crypto_network TEXT,
      crypto_tx_hash TEXT,
      client_ip TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_payments_client ON payments(client_id);
    CREATE INDEX IF NOT EXISTS idx_payments_ref ON payments(reference_number);
    CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      category TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor_type TEXT NOT NULL,
      actor_id INTEGER,
      actor_email TEXT NOT NULL,
      action TEXT NOT NULL,
      details TEXT NOT NULL DEFAULT '{}',
      ip_address TEXT NOT NULL DEFAULT '127.0.0.1',
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);

    CREATE TABLE IF NOT EXISTS uploaded_assets (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      data_base64 TEXT NOT NULL,
      asset_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS login_rate_limits (
      key TEXT PRIMARY KEY,
      attempts INTEGER NOT NULL DEFAULT 1,
      last_attempt TEXT NOT NULL,
      blocked_until TEXT
    );
  `);

  // Bootstrap initial administrator ONLY if the administrators table is completely empty.
  // Never re-seed or overwrite existing production administrators.
  const adminCountRs = await client.execute('SELECT COUNT(*) as count FROM administrators');
  const adminCount = Number(adminCountRs.rows[0].count);
  const now = new Date().toISOString();

  if (adminCount === 0) {
    const defaultPassword = process.env.INITIAL_ADMIN_PASSWORD || '12345678';
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(defaultPassword, salt);

    await client.execute({
      sql: `INSERT INTO administrators (email, password_hash, full_name, role, must_change_password, created_at, updated_at)
            VALUES (?, ?, ?, ?, 1, ?, ?)`,
      args: ['portal@gmail.com', hash, 'Portal Lead Administrator', 'super_admin', now, now],
    });

    await client.execute({
      sql: `INSERT INTO audit_logs (actor_type, actor_id, actor_email, action, details, ip_address, created_at)
            VALUES ('system', NULL, 'system', 'ADMIN_INITIALIZED', '{"email": "portal@gmail.com", "bootstrap": true}', '127.0.0.1', ?)`,
      args: [now],
    });
  }

  // Seed sample clients ONLY in local development/testing when table is empty.
  // Never automatically seed sample clients into production.
  if (!config.isProduction) {
    const clientsCountRs = await client.execute('SELECT COUNT(*) as count FROM clients');
    const clientCount = Number(clientsCountRs.rows[0].count);

    if (clientCount === 0) {
      await client.execute({
        sql: `INSERT INTO clients (
          full_name, email, reference_number, photo_url, case_category, case_details,
          amount_cents, payment_status, payment_instructions, admin_notes, is_active,
          can_client_edit_photo, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          'Elena Rostova',
          'elena.rostova@example.com',
          'LUX-VISA-2026-8812',
          null,
          'Work Visa (EU Blue Card - Luxembourg)',
          'Application under Grand-Ducal Regulation for Highly Qualified Employment. Consular file ref #LU-HQ-9902.',
          85000,
          'pending',
          'Please settle the official government consular application processing fee within 14 calendar days of issuance. Payment confirms submission for consular review.',
          'Verified by Consular Liaison Office. Awaiting administrative fee remittance.',
          1,
          1,
          now,
          now,
        ],
      });

      await client.execute({
        sql: `INSERT INTO clients (
          full_name, email, reference_number, photo_url, case_category, case_details,
          amount_cents, payment_status, payment_instructions, admin_notes, is_active,
          can_client_edit_photo, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          'Marcus Vance',
          'marcus.vance@example.com',
          'LUX-VISA-2026-9943',
          null,
          'Long-Term Residence Permit & Family Reunification',
          'Application for Long-Term Residence and dependent spouse sponsorship. File ref #LU-FR-1148.',
          120000,
          'pending',
          'Consular processing and biometric registration processing fee for primary applicant and accompanying family member.',
          'All biometric appointments scheduled pending fee settlement confirmation.',
          1,
          1,
          now,
          now,
        ],
      });
    }
  }
}

// Typed query helpers
export async function queryAll<T = any>(sql: string, args: any[] = []): Promise<T[]> {
  await ensureDbInit();
  const client = getDb();
  const rs = await client.execute({ sql, args });
  return rs.rows as unknown as T[];
}

export async function queryOne<T = any>(sql: string, args: any[] = []): Promise<T | null> {
  await ensureDbInit();
  const client = getDb();
  const rs = await client.execute({ sql, args });
  if (rs.rows.length === 0) return null;
  return rs.rows[0] as unknown as T;
}

export async function execute(
  sql: string,
  args: any[] = []
): Promise<{ lastInsertRowid: number; rowsAffected: number }> {
  await ensureDbInit();
  const client = getDb();
  const rs = await client.execute({ sql, args });
  return {
    lastInsertRowid: rs.lastInsertRowid !== undefined ? Number(rs.lastInsertRowid) : 0,
    rowsAffected: rs.rowsAffected,
  };
}
