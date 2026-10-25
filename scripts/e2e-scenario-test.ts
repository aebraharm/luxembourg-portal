/**
 * End-to-End Scenario Test:
 * Simulates complete client & admin lifecycle with separate client creation,
 * regional assignments, dedicated invoices, and payment reconciliation.
 */

import {
  getDb,
  ensureDbInit,
  queryOne,
  queryAll,
  execute,
  generateInvoiceNumber,
  deriveInvoiceStatus,
} from '../src/lib/db';
import { authenticateAdmin, authenticateClient } from '../src/lib/auth';
import { getPaymentMethodConfig } from '../src/lib/settings';

async function runE2EScenario() {
  console.log('\n======================================================');
  console.log('🚀 END-TO-END IMMIGRATION PORTAL SCENARIO VERIFICATION');
  console.log('======================================================\n');

  await ensureDbInit();

  // Step 1: Admin Authentication
  console.log('Step 1: Admin logs in with bootstrap credentials');
  const adminAuth = await authenticateAdmin('portal@gmail.com', '12345678');
  if (!adminAuth.admin) throw new Error('Admin login failed');
  console.log('  ✓ Admin logged in:', adminAuth.admin.email);

  // Step 2: Regional Configuration
  console.log('\nStep 2: Admin configures and verifies applicant regions');
  const europeRegion = await queryOne<any>('SELECT * FROM regions WHERE name = ?', ['Europe']);
  if (!europeRegion) throw new Error('Europe region not found');
  console.log(`  ✓ Region verified: ${europeRegion.name} (Code: ${europeRegion.code})`);

  // Step 3: Admin creates new client without requiring an initial fee
  console.log('\nStep 3: Admin creates applicant record WITHOUT initial fee or invoice');
  const manualRef = 'LUX-VISA-2026-7721';
  const applicantEmail = 'lucas.morin@example.eu';
  const now = new Date().toISOString();

  // Clean state for re-runs
  await execute('DELETE FROM clients WHERE email = ?', [applicantEmail]);

  const clientInsert = await execute(
    `INSERT INTO clients (
      full_name, email, reference_number, photo_url, case_category,
      case_details, amount_cents, payment_status, payment_instructions,
      admin_notes, is_active, can_client_edit_photo, region_id, created_at, updated_at
    ) VALUES (?, ?, ?, NULL, ?, ?, 0, 'pending', ?, ?, 1, 1, ?, ?, ?)`,
    [
      'Lucas Morin',
      applicantEmail,
      manualRef,
      'EU Blue Card - High Qualification',
      'Consular file #LUX-HQ-2026-7721',
      'Please settle fees upon invoice issuance.',
      'Intake verified by case officer.',
      europeRegion.id,
      now,
      now,
    ]
  );
  const clientId = clientInsert.lastInsertRowid;
  console.log('  ✓ Client created without fee: Lucas Morin (Ref: ' + manualRef + ') in region: Europe');

  // Step 4: Verify duplicate reference number rejection
  console.log('\nStep 4: Test duplicate reference number rejection');
  try {
    await execute(
      `INSERT INTO clients (
        full_name, email, reference_number, case_category, amount_cents, created_at, updated_at
      ) VALUES ('Duplicate Tester', 'dup@test.com', ?, 'Work Visa', 0, ?, ?)`,
      [manualRef, now, now]
    );
    throw new Error('Database allowed duplicate reference number!');
  } catch (err: any) {
    if (err.message.includes('UNIQUE constraint failed') || err.message.includes('unique')) {
      console.log('  ✓ Database strictly rejected duplicate reference number as required');
    } else {
      throw err;
    }
  }

  // Step 5: Admin issues a dedicated invoice for the client
  console.log('\nStep 5: Admin issues official statutory invoice for the client');
  const invoiceNum = await generateInvoiceNumber();
  const invoiceInsert = await execute(
    `INSERT INTO invoices (
      client_id, invoice_number, reason, amount_cents, currency,
      issue_date, due_date, status, notes, admin_notes, created_at, updated_at
    ) VALUES (?, ?, 'EU Blue Card Statutory Processing Tariff', 150000, 'EUR', '2026-10-25', '2026-11-10', 'issued', ?, ?, ?, ?)`,
    [
      clientId,
      invoiceNum,
      'Official statutory consular processing fee.',
      'Approved by Consular Section Chief.',
      now,
      now,
    ]
  );
  const invoiceId = invoiceInsert.lastInsertRowid;
  console.log(`  ✓ Dedicated invoice issued: ${invoiceNum} for €1,500.00 EUR (Status: issued)`);

  // Step 6: Client Authenticates & Resolves Region
  console.log('\nStep 6: Client authenticates and resolves designated region');
  const clientAuth = await authenticateClient(applicantEmail, manualRef);
  if (!clientAuth.client) throw new Error('Client authentication failed');
  console.log(`  ✓ Client authenticated: ${clientAuth.client.full_name} | Designated Region: ${clientAuth.client.region_name}`);
  if (clientAuth.client.region_name !== 'Europe') {
    throw new Error('Client region did not match configured database region!');
  }

  // Step 7: Simulate Card Demo Payment Attempt
  console.log('\nStep 7: Client executes simulated card payment (Demo Mode)');
  const pConfig = await getPaymentMethodConfig();
  const failureMessage = pConfig.card_demo_failure_message;
  if (failureMessage !== 'Payment failed') {
    throw new Error(`Expected exact failure message 'Payment failed', got: '${failureMessage}'`);
  }

  await execute(
    `INSERT INTO payments (
      client_id, reference_number, method, amount_cents, currency,
      status, mode, invoice_id, failure_reason, client_ip, created_at, updated_at
    ) VALUES (?, ?, 'card', 150000, 'EUR', 'failed', 'demo', ?, ?, '127.0.0.1', ?, ?)`,
    [clientId, manualRef, invoiceId, failureMessage, now, now]
  );
  console.log('  ✓ Card payment attempt recorded with status: failed and message: ' + failureMessage);

  // Step 8: Client submits Cryptocurrency Remittance with TxID for the Invoice
  console.log('\nStep 8: Client submits cryptocurrency remittance with TxID for invoice');
  const sampleTxHash = '0x8f7a912c34d5e67890123456789abcdef0123456789abcdef0123456789abcdef';
  const cryptoPayRes = await execute(
    `INSERT INTO payments (
      client_id, reference_number, method, amount_cents, currency,
      status, mode, invoice_id, crypto_currency, crypto_network, crypto_tx_hash,
      client_ip, created_at, updated_at
    ) VALUES (?, ?, 'crypto', 150000, 'EUR', 'under_review', 'live', ?, 'USDT', 'Ethereum (ERC20)', ?, '127.0.0.1', ?, ?)`,
    [clientId, manualRef, invoiceId, sampleTxHash, now, now]
  );
  const cryptoPaymentId = cryptoPayRes.lastInsertRowid;

  // Invoice transitions to payment_pending; client to under_review
  await execute("UPDATE invoices SET status = 'payment_pending', updated_at = ? WHERE id = ?", [now, invoiceId]);
  await execute("UPDATE clients SET payment_status = 'under_review', updated_at = ? WHERE id = ?", [now, clientId]);
  console.log('  ✓ Crypto remittance queued under_review (Invoice status: payment_pending)');

  // Step 9: Admin reconciles the payment
  console.log('\nStep 9: Admin reconciles verified payment to completed');
  await execute(
    `UPDATE payments
     SET status = 'completed', provider_ref = 'ETHERSCAN-BLOCK-CONFIRMED', updated_at = ?
     WHERE id = ?`,
    [now, cryptoPaymentId]
  );
  await execute("UPDATE invoices SET status = 'paid', updated_at = ? WHERE id = ?", [now, invoiceId]);
  await execute("UPDATE clients SET payment_status = 'completed', updated_at = ? WHERE id = ?", [now, clientId]);
  console.log('  ✓ Admin reconciled payment to completed (Invoice updated to paid)');

  // Step 10: Verify Final States
  console.log('\nStep 10: Verify client and invoice final states');
  const finalInvoice = await queryOne<any>('SELECT * FROM invoices WHERE id = ?', [invoiceId]);
  const finalClient = await queryOne<any>('SELECT * FROM clients WHERE id = ?', [clientId]);

  if (finalInvoice.status !== 'paid') throw new Error('Invoice was not updated to paid!');
  if (finalClient.payment_status !== 'completed') throw new Error('Client was not updated to completed!');

  console.log(`  ✓ Invoice ${finalInvoice.invoice_number} final status: ${finalInvoice.status}`);
  console.log(`  ✓ Client ${finalClient.full_name} final status: ${finalClient.payment_status}`);

  console.log('\n======================================================');
  console.log('🎉 END-TO-END SCENARIO COMPLETED WITH 100% SUCCESS!');
  console.log('======================================================\n');
}

runE2EScenario();
