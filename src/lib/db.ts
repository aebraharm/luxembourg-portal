import { createClient, Client } from '@libsql/client';
import path from 'node:path';
import fs from 'node:fs';
import bcrypt from 'bcryptjs';
import { InvoiceStatus } from './types';

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
    initPromise = (async () => {
      try {
        await initDatabaseSchema();
      } catch (err) {
        // Clear cached promise on failure so subsequent requests can retry
        initPromise = null;
        throw err;
      }
    })();
  }
  return initPromise;
}

async function initDatabaseSchema(): Promise<void> {
  const client = getDb();
  const config = getDatabaseConfig();

  // Create core tables idempotently (safe: CREATE TABLE IF NOT EXISTS preserves all existing data)
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

    CREATE TABLE IF NOT EXISTS regions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      code TEXT,
      description TEXT DEFAULT '',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_regions_name ON regions(name);
    CREATE INDEX IF NOT EXISTS idx_regions_active ON regions(is_active);

    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL,
      reference_number TEXT UNIQUE NOT NULL,
      photo_url TEXT,
      case_category TEXT NOT NULL,
      case_details TEXT NOT NULL DEFAULT '',
      amount_cents INTEGER NOT NULL DEFAULT 0,
      payment_status TEXT NOT NULL DEFAULT 'pending',
      payment_instructions TEXT NOT NULL DEFAULT '',
      admin_notes TEXT NOT NULL DEFAULT '',
      is_active INTEGER NOT NULL DEFAULT 1,
      can_client_edit_photo INTEGER NOT NULL DEFAULT 1,
      region_id INTEGER,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (region_id) REFERENCES regions(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
    CREATE INDEX IF NOT EXISTS idx_clients_ref ON clients(reference_number);

    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      invoice_number TEXT UNIQUE NOT NULL,
      reason TEXT NOT NULL,
      amount_cents INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'EUR',
      issue_date TEXT NOT NULL,
      due_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'issued',
      notes TEXT DEFAULT '',
      admin_notes TEXT DEFAULT '',
      replacement_invoice_id INTEGER,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(client_id);
    CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);
    CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
    CREATE INDEX IF NOT EXISTS idx_invoices_due ON invoices(due_date);

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      reference_number TEXT NOT NULL,
      method TEXT NOT NULL,
      amount_cents INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'EUR',
      status TEXT NOT NULL DEFAULT 'pending',
      mode TEXT NOT NULL DEFAULT 'demo',
      invoice_id INTEGER,
      provider_ref TEXT,
      failure_reason TEXT,
      crypto_currency TEXT,
      crypto_network TEXT,
      crypto_tx_hash TEXT,
      client_ip TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL
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

  // Backward-compatible schema evolution: ensure region_id exists on clients
  try {
    await client.execute('ALTER TABLE clients ADD COLUMN region_id INTEGER REFERENCES regions(id)');
  } catch {
    // Column already exists or created via initial DDL
  }

  // Backward-compatible schema evolution: ensure invoice_id exists on payments
  try {
    await client.execute('ALTER TABLE payments ADD COLUMN invoice_id INTEGER REFERENCES invoices(id)');
  } catch {
    // Column already exists or created via initial DDL
  }

  // Safely create indexes on evolved columns AFTER columns are guaranteed to exist
  try {
    await client.execute('CREATE INDEX IF NOT EXISTS idx_clients_region ON clients(region_id)');
  } catch {
    // Index already exists
  }

  try {
    await client.execute('CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id)');
  } catch {
    // Index already exists
  }

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

  // Bootstrap default regions if regions table is empty
  const regionsCountRs = await client.execute('SELECT COUNT(*) as count FROM regions');
  const regionsCount = Number(regionsCountRs.rows[0].count);

  if (regionsCount === 0) {
    const defaultRegions = [
      { name: 'Europe', code: 'EU', description: 'European Union, Schengen, and EEA applicant zone' },
      { name: 'Africa', code: 'AF', description: 'African regional consular and diplomatic zone' },
      { name: 'Asia-Pacific', code: 'APAC', description: 'Asia-Pacific relocation and talent acquisition territory' },
      { name: 'North America', code: 'NA', description: 'North American consular and skilled visa corridor' },
      { name: 'Other', code: 'OTH', description: 'International and special jurisdictional territories' },
    ];

    for (const r of defaultRegions) {
      await client.execute({
        sql: `INSERT INTO regions (name, code, description, is_active, created_at, updated_at)
              VALUES (?, ?, ?, 1, ?, ?)`,
        args: [r.name, r.code, r.description, now, now],
      });
    }
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
          can_client_edit_photo, region_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
          null,
          now,
          now,
        ],
      });

      await client.execute({
        sql: `INSERT INTO clients (
          full_name, email, reference_number, photo_url, case_category, case_details,
          amount_cents, payment_status, payment_instructions, admin_notes, is_active,
          can_client_edit_photo, region_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
          null,
          now,
          now,
        ],
      });
    }
  }

  // Backward compatibility migration: create initial invoices for existing clients who have fees but no invoices
  const existingClientsWithFees = await client.execute(
    `SELECT c.id, c.full_name, c.reference_number, c.case_category, c.amount_cents, c.payment_status, c.created_at
     FROM clients c
     WHERE c.amount_cents > 0
       AND NOT EXISTS (SELECT 1 FROM invoices inv WHERE inv.client_id = c.id)`
  );

  const year = new Date().getFullYear();
  for (const row of existingClientsWithFees.rows) {
    const cId = Number(row.id);
    const amountCents = Number(row.amount_cents);
    const pStatus = String(row.payment_status);
    const caseCat = String(row.case_category || 'Immigration Fee');
    const invNumber = `INV-${year}-${String(cId).padStart(4, '0')}`;
    const issueDate = String(row.created_at).split('T')[0] || new Date().toISOString().split('T')[0];
    const dueDateObj = new Date();
    dueDateObj.setDate(dueDateObj.getDate() + 14);
    const dueDate = dueDateObj.toISOString().split('T')[0];

    const invStatus: InvoiceStatus =
      pStatus === 'completed'
        ? 'paid'
        : pStatus === 'under_review'
        ? 'payment_pending'
        : 'issued';

    const insertResult = await client.execute({
      sql: `INSERT INTO invoices (
        client_id, invoice_number, reason, amount_cents, currency,
        issue_date, due_date, status, notes, admin_notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'EUR', ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        cId,
        invNumber,
        `${caseCat} Consular Fee`,
        amountCents,
        issueDate,
        dueDate,
        invStatus,
        'Statutory consular disbursement for visa processing.',
        'Migrated from legacy client record fee schedule.',
        now,
        now,
      ],
    });

    const newInvoiceId = insertResult.lastInsertRowid;
    // Link any legacy payments belonging to this client to this invoice
    if (newInvoiceId) {
      await client.execute({
        sql: 'UPDATE payments SET invoice_id = ? WHERE client_id = ? AND invoice_id IS NULL',
        args: [newInvoiceId, cId],
      });
    }
  }
}

/**
 * Derives overdue status dynamically based on current date and payment state.
 */
export function deriveInvoiceStatus(status: InvoiceStatus, dueDate: string): InvoiceStatus {
  if (status === 'issued' || status === 'unpaid') {
    const today = new Date().toISOString().split('T')[0];
    if (dueDate && dueDate < today) {
      return 'overdue';
    }
  }
  return status;
}

/**
 * Validates permitted invoice status transitions on the server.
 */
export function isValidStatusTransition(from: InvoiceStatus, to: InvoiceStatus): boolean {
  if (from === to) return true;

  const validTransitions: Record<InvoiceStatus, InvoiceStatus[]> = {
    draft: ['issued', 'cancelled'],
    issued: ['unpaid', 'payment_pending', 'paid', 'overdue', 'cancelled'],
    unpaid: ['payment_pending', 'paid', 'overdue', 'cancelled'],
    payment_pending: ['paid', 'unpaid', 'issued', 'cancelled'],
    overdue: ['payment_pending', 'paid', 'cancelled'],
    paid: ['cancelled'], // Only controlled cancellation allowed for paid invoices
    cancelled: [], // Terminal status
  };

  return (validTransitions[from] || []).includes(to);
}

/**
 * Generates a safe, unique, sequential invoice number.
 * Format: INV-YYYY-XXXX (e.g. INV-2026-0001)
 */
export async function generateInvoiceNumber(): Promise<string> {
  await ensureDbInit();
  const year = new Date().getFullYear();
  const pattern = `INV-${year}-%`;

  const client = getDb();
  const rs = await client.execute({
    sql: 'SELECT invoice_number FROM invoices WHERE invoice_number LIKE ? ORDER BY id DESC LIMIT 1',
    args: [pattern],
  });

  let nextSequence = 1;
  if (rs.rows.length > 0) {
    const lastNum = String(rs.rows[0].invoice_number);
    const parts = lastNum.split('-');
    if (parts.length === 3) {
      const parsed = parseInt(parts[2], 10);
      if (!isNaN(parsed)) {
        nextSequence = parsed + 1;
      }
    }
  }

  // Ensure uniqueness
  while (true) {
    const candidate = `INV-${year}-${String(nextSequence).padStart(4, '0')}`;
    const check = await client.execute({
      sql: 'SELECT id FROM invoices WHERE invoice_number = ?',
      args: [candidate],
    });
    if (check.rows.length === 0) {
      return candidate;
    }
    nextSequence++;
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
