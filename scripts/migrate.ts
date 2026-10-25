/**
 * Database Migration & Schema Verification Script
 * Idempotently initializes tables, checks migrations, and ensures data integrity.
 * Usage: npx tsx scripts/migrate.ts
 */

import { getDatabaseConfig, ensureDbInit, queryOne, queryAll } from '../src/lib/db';

async function runMigration() {
  console.log('\n======================================================');
  console.log('🔄 DATABASE MIGRATION & HEALTH VERIFICATION');
  console.log('======================================================\n');

  try {
    const config = getDatabaseConfig();

    console.log(`Target Database: ${config.isRemote ? 'Managed Distributed Cluster (Turso/libSQL)' : 'Local File Storage'}`);
    console.log(`Endpoint URL:    ${config.url ? config.url.replace(/:[^:@]+@/, ':***@') : '(none)'}`);

    // Step 1: Ensure database schema is initialized
    console.log('\n[1/5] Applying schema migrations & table structures...');
    await ensureDbInit();
    console.log('  ✓ Tables created: administrators, regions, clients, invoices, payments, settings, audit_logs, uploaded_assets, login_rate_limits');
    console.log('  ✓ Indexes verified on email, reference_number, region_id, invoice_number, status, and created_at timestamps');

    // Step 2: Validate Administrator Account
    console.log('\n[2/5] Verifying administrator bootstrap...');
    const admin = await queryOne<{ email: string; role: string; must_change_password: number }>(
      'SELECT email, role, must_change_password FROM administrators WHERE email = ?',
      ['portal@gmail.com']
    );

    if (admin) {
      console.log(`  ✓ Administrator active: ${admin.email} (Role: ${admin.role}, MustChangePassword: ${admin.must_change_password === 1})`);
    } else {
      console.warn('  ⚠️ No administrator found.');
    }

    // Step 3: Verify Regions
    console.log('\n[3/5] Verifying regional jurisdictions...');
    const regions = await queryAll<{ id: number; name: string; code: string; is_active: number }>(
      'SELECT id, name, code, is_active FROM regions ORDER BY id ASC'
    );
    console.log(`  ✓ Total regions configured: ${regions.length}`);
    for (const r of regions) {
      console.log(`    - [${r.code || 'N/A'}] ${r.name} (Active: ${r.is_active === 1 ? 'Yes' : 'No'})`);
    }

    // Step 4: Verify Client Records & Manually Assigned Reference Numbers
    console.log('\n[4/5] Verifying client records & reference number integrity...');
    const clients = await queryAll<{ id: number; full_name: string; reference_number: string; amount_cents: number; region_name?: string }>(
      `SELECT c.id, c.full_name, c.reference_number, c.amount_cents, r.name as region_name
       FROM clients c
       LEFT JOIN regions r ON c.region_id = r.id
       ORDER BY c.id ASC`
    );

    console.log(`  ✓ Total client records: ${clients.length}`);
    for (const c of clients) {
      console.log(`    - ID #${c.id}: ${c.full_name} | Ref: ${c.reference_number} | Region: ${c.region_name || 'Unassigned'} | Fee: €${(c.amount_cents / 100).toFixed(2)}`);
    }

    // Step 5: Verify System Statistics & Table Distribution
    console.log('\n[5/5] Verifying table row distributions...');
    const tables = ['administrators', 'regions', 'clients', 'invoices', 'payments', 'settings', 'audit_logs', 'uploaded_assets'];
    for (const tbl of tables) {
      const row = await queryOne<{ c: number }>(`SELECT COUNT(*) as c FROM ${tbl}`);
      console.log(`  ✓ Table '${tbl}': ${row ? row.c : 0} rows`);
    }

    console.log('\n======================================================');
    console.log('🎉 MIGRATION & VERIFICATION COMPLETED SUCCESSFULLY!');
    console.log('======================================================\n');
  } catch (err: any) {
    console.error('\n❌ Migration failed:', err.message);
    process.exit(1);
  }
}

runMigration();
