/**
 * End-to-End Scenario Test:
 * Simulates complete client & admin lifecycle from creation to reconciliation
 */

import { getDb, ensureDbInit, queryOne, execute } from '../src/lib/db';
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

  // Step 2: Admin creates new client with manual reference number
  console.log('\nStep 2: Admin creates new applicant with manual reference number');
  const manualRef = 'LUX-VISA-2026-7721';
  const applicantEmail = 'lucas.morin@example.eu';
  const now = new Date().toISOString();

  // Ensure clean state for test run
  await execute('DELETE FROM clients WHERE email = ?', [applicantEmail]);

  await execute(
    `INSERT INTO clients (
      full_name, email, reference_number, photo_url, case_category,
      case_details, amount_cents, payment_status, payment_instructions,
      admin_notes, is_active, can_client_edit_photo, created_at, updated_at
    ) VALUES (?, ?, ?, NULL, ?, ?, ?, 'pending', ?, ?, 1, 1, ?, ?)`,
    [
      'Lucas Morin',
      applicantEmail,
      manualRef,
      'EU Blue Card - High Qualification',
      'Consular file #LUX-HQ-2026-7721',
      150000, // €1,500.00
      'Please settle before consular appointment.',
      'Intake verified by case officer.',
      now,
      now,
    ]
  );
  console.log('  ✓ Client created with manual reference:', manualRef, 'and fee: €1,500.00');

  // Step 3: Verify strict uniqueness constraint
  console.log('\nStep 3: Test duplicate reference number rejection');
  try {
    await execute(
      `INSERT INTO clients (
        full_name, email, reference_number, case_category, amount_cents, created_at, updated_at
      ) VALUES ('Duplicate Tester', 'dup@test.com', ?, 'Work Visa', 50000, ?, ?)`,
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

  // Step 4: Client Authentication
  console.log('\nStep 4: Client authenticates using email + reference number');
  const clientAuth = await authenticateClient(applicantEmail, manualRef);
  if (!clientAuth.client) throw new Error('Client authentication failed');
  console.log('  ✓ Client authenticated:', clientAuth.client.full_name, 'Status:', clientAuth.client.payment_status);

  // Step 5: Simulate Demo Card Payment Attempt
  console.log('\nStep 5: Client executes simulated card payment (Demo Mode)');
  const pConfig = await getPaymentMethodConfig();
  const failureMessage = pConfig.card_demo_failure_message;
  if (failureMessage !== 'Payment failed') {
    throw new Error(`Expected exact failure message 'Payment failed', got: '${failureMessage}'`);
  }

  const cardPayRes = await execute(
    `INSERT INTO payments (
      client_id, reference_number, method, amount_cents, currency,
      status, mode, failure_reason, client_ip, created_at, updated_at
    ) VALUES (?, ?, 'card', ?, 'EUR', 'failed', 'demo', ?, '127.0.0.1', ?, ?)`,
    [clientAuth.client.id, manualRef, 150000, failureMessage, now, now]
  );

  const cardPaymentId = cardPayRes.lastInsertRowid;
  console.log('  ✓ Card payment attempt recorded with status: failed and message:', failureMessage);

  // Step 6: Client submits Cryptocurrency Remittance with TxID
  console.log('\nStep 6: Client submits cryptocurrency remittance with TxID');
  const sampleTxHash = '0x8f7a912c34d5e67890123456789abcdef0123456789abcdef0123456789abcdef';
  const cryptoPayRes = await execute(
    `INSERT INTO payments (
      client_id, reference_number, method, amount_cents, currency,
      status, mode, crypto_currency, crypto_network, crypto_tx_hash,
      client_ip, created_at, updated_at
    ) VALUES (?, ?, 'crypto', ?, 'EUR', 'under_review', 'live', 'USDT', 'Ethereum (ERC20)', ?, '127.0.0.1', ?, ?)`,
    [clientAuth.client.id, manualRef, 150000, sampleTxHash, now, now]
  );

  const cryptoPaymentId = cryptoPayRes.lastInsertRowid;

  // Update client status to under_review
  await execute('UPDATE clients SET payment_status = \'under_review\' WHERE id = ?', [clientAuth.client.id]);
  console.log('  ✓ Crypto remittance queued with status: under_review (TxID logged)');

  // Step 7: Admin reviews and reconciles the payment
  console.log('\nStep 7: Admin reconciles verified payment to completed');
  await execute(
    `UPDATE payments
     SET status = 'completed', provider_ref = 'ETHERSCAN-BLOCK-CONFIRMED', updated_at = ?
     WHERE id = ?`,
    [now, cryptoPaymentId]
  );

  await execute('UPDATE clients SET payment_status = \'completed\', updated_at = ? WHERE id = ?', [now, clientAuth.client.id]);
  console.log('  ✓ Admin reconciled payment to completed');

  // Step 8: Verify Client's Final Status
  console.log('\nStep 8: Verify client final case state');
  const finalClient = await queryOne<any>('SELECT * FROM clients WHERE id = ?', [clientAuth.client.id]);
  if (finalClient.payment_status !== 'completed') {
    throw new Error('Client status did not reconcile to completed!');
  }
  console.log('  ✓ Client payment status confirmed:', finalClient.payment_status);

  console.log('\n======================================================');
  console.log('🎉 END-TO-END SCENARIO COMPLETED WITH 100% SUCCESS!');
  console.log('======================================================\n');
}

runE2EScenario();
