import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import bcrypt from 'bcryptjs';

const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'portal.sqlite');

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

let dbInstance: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (!dbInstance) {
    dbInstance = new DatabaseSync(DB_PATH);
    initDb(dbInstance);
  }
  return dbInstance;
}

function initDb(db: DatabaseSync) {
  // PRAGMA settings for performance and integrity
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA journal_mode = WAL;');

  // Create tables
  db.exec(`
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

  // Seed default administrator if not present
  const adminCheck = db.prepare('SELECT id FROM administrators WHERE email = ?').get('portal@gmail.com');
  const now = new Date().toISOString();

  if (!adminCheck) {
    const defaultPassword = process.env.INITIAL_ADMIN_PASSWORD || '12345678';
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(defaultPassword, salt);

    db.prepare(`
      INSERT INTO administrators (email, password_hash, full_name, role, must_change_password, created_at, updated_at)
      VALUES (?, ?, ?, ?, 1, ?, ?)
    `).run('portal@gmail.com', hash, 'Portal Lead Administrator', 'super_admin', now, now);

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (actor_type, actor_id, actor_email, action, details, ip_address, created_at)
      VALUES ('system', NULL, 'system', 'ADMIN_INITIALIZED', '{"email": "portal@gmail.com", "bootstrap": true}', '127.0.0.1', ?)
    `).run(now);
  }

  // Seed sample clients if clients table is empty
  const clientsCount = (db.prepare('SELECT COUNT(*) as count FROM clients').get() as { count: number }).count;
  if (clientsCount === 0) {
    db.prepare(`
      INSERT INTO clients (
        full_name, email, reference_number, photo_url, case_category, case_details,
        amount_cents, payment_status, payment_instructions, admin_notes, is_active,
        can_client_edit_photo, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
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
      now
    );

    db.prepare(`
      INSERT INTO clients (
        full_name, email, reference_number, photo_url, case_category, case_details,
        amount_cents, payment_status, payment_instructions, admin_notes, is_active,
        can_client_edit_photo, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
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
      now
    );
  }
}
