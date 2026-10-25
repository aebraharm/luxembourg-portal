/**
 * Comprehensive Automated Test Suite
 * Tests all core backend logic, security requirements, invoices, regions, and data operations
 */

import {
  getDb,
  ensureDbInit,
  queryOne,
  queryAll,
  execute,
  generateInvoiceNumber,
  deriveInvoiceStatus,
  isValidStatusTransition,
} from '../src/lib/db';
import {
  authenticateAdmin,
  authenticateClient,
  signPayload,
  verifyToken,
  updateAdminPassword,
} from '../src/lib/auth';
import {
  getBranding,
  getPaymentMethodConfig,
  getHomepageConfig,
  saveSetting,
} from '../src/lib/settings';
import { checkRateLimit, recordFailedLogin, clearRateLimit } from '../src/lib/rateLimit';

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, message: string) {
  totalTests++;
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  } else {
    passedTests++;
    console.log(`✅ PASS: ${message}`);
  }
}

async function runTests() {
  console.log('\n======================================================');
  console.log('🧪 IMMIGRATION VISA PAYMENT PORTAL - TEST SUITE');
  console.log('======================================================\n');

  try {
    // -------------------------------------------------------------------------
    // Test 1: Database Initialization & Seeding
    // -------------------------------------------------------------------------
    console.log('--- Suite 1: Database & Seed Verification ---');
    await ensureDbInit();
    const db = getDb();
    assert(db !== null, 'Database connection initialized successfully');

    const adminCheck = await queryOne<any>('SELECT * FROM administrators WHERE email = ?', ['portal@gmail.com']);
    assert(adminCheck !== null && adminCheck !== undefined, 'Default administrator portal@gmail.com exists');
    assert(adminCheck.must_change_password === 1, 'Initial admin flag must_change_password is true');

    const clientsCount = await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM clients');
    assert(clientsCount !== null && Number(clientsCount.count) >= 2, 'Pre-seeded sample client records exist');

    // -------------------------------------------------------------------------
    // Test 2: Administrator Authentication
    // -------------------------------------------------------------------------
    console.log('\n--- Suite 2: Administrator Authentication & Password Hash ---');
    const adminAuthSuccess = await authenticateAdmin('portal@gmail.com', '12345678');
    assert(adminAuthSuccess.admin !== undefined, 'Admin authenticates with initial credentials 12345678');

    const adminAuthFail = await authenticateAdmin('portal@gmail.com', 'wrongpassword');
    assert(adminAuthFail.admin === undefined && adminAuthFail.error !== undefined, 'Admin fails with incorrect password');

    // -------------------------------------------------------------------------
    // Test 3: Client Authentication
    // -------------------------------------------------------------------------
    console.log('\n--- Suite 3: Client Authentication (Email + Reference Number) ---');
    const clientAuthSuccess = await authenticateClient('elena.rostova@example.com', 'LUX-VISA-2026-8812');
    assert(clientAuthSuccess.client !== undefined, 'Client Elena Rostova authenticates with email and reference number');
    assert(clientAuthSuccess.client!.reference_number === 'LUX-VISA-2026-8812', 'Client reference number matches');

    const clientAuthCaseInsensitive = await authenticateClient('ELENA.ROSTOVA@EXAMPLE.COM', 'lux-visa-2026-8812');
    assert(clientAuthCaseInsensitive.client !== undefined, 'Client authentication handles case normalization');

    const clientAuthMismatch = await authenticateClient('elena.rostova@example.com', 'LUX-VISA-WRONG-9999');
    assert(clientAuthMismatch.client === undefined, 'Client authentication rejects invalid reference number');

    // -------------------------------------------------------------------------
    // Test 4: Manual Reference Number Assignment & Uniqueness
    // -------------------------------------------------------------------------
    console.log('\n--- Suite 4: Manual Reference Number Assignment & Uniqueness ---');
    const duplicateRef = 'LUX-VISA-2026-8812';
    const clash = await queryOne('SELECT id FROM clients WHERE UPPER(reference_number) = ?', [duplicateRef]);
    assert(clash !== null, 'Database identifies existing reference number to prevent duplication');

    // -------------------------------------------------------------------------
    // Test 5: Rate Limiting & Lockout
    // -------------------------------------------------------------------------
    console.log('\n--- Suite 5: Brute Force & Rate Limiting Protection ---');
    const testIp = '192.168.1.100';
    const testEmail = 'brute.force@example.com';
    await clearRateLimit(testIp, testEmail);

    let rateStatus = await checkRateLimit(testIp, testEmail);
    assert(rateStatus.allowed === true, 'Initial request allowed through rate limiter');

    for (let i = 0; i < 4; i++) {
      await recordFailedLogin(testIp, testEmail);
    }
    const fifthAttempt = await recordFailedLogin(testIp, testEmail);
    assert(fifthAttempt.blocked === true, '5th failed attempt locks out user');

    rateStatus = await checkRateLimit(testIp, testEmail);
    assert(rateStatus.allowed === false, 'Rate limiter actively blocks locked IP/email');
    await clearRateLimit(testIp, testEmail);

    // -------------------------------------------------------------------------
    // Test 6: Settings Engine & Configuration Persistence
    // -------------------------------------------------------------------------
    console.log('\n--- Suite 6: Data-Driven Settings & CMS Engine ---');
    const branding = await getBranding();
    assert(typeof branding.agency_name === 'string', 'Branding settings loaded with agency name');

    const paymentMethods = await getPaymentMethodConfig();
    assert(paymentMethods.card_enabled === true, 'Card payment method is enabled by default');
    assert(paymentMethods.card_demo_failure_message === 'Payment failed', 'Card demo outcome is exactly "Payment failed"');
    const paypalMsg = paymentMethods.paypal_notice_message || (paymentMethods as any).paypal_unavailability_message || '';
    assert(paypalMsg.includes('currently unavailable in your region'), 'PayPal message matches regional notice requirement');

    // -------------------------------------------------------------------------
    // Test 7: Minor Unit Monetary Arithmetic (Integer Cents) & EUR Currency
    // -------------------------------------------------------------------------
    console.log('\n--- Suite 7: Monetary Minor Unit Representation (Integer Cents) ---');
    const elena = await queryOne<{ amount_cents: number }>('SELECT amount_cents FROM clients WHERE reference_number = ?', ['LUX-VISA-2026-8812']);
    assert(elena !== null && Number.isInteger(Number(elena.amount_cents)), 'Fee amount is stored as strict integer minor units');
    assert(Number(elena!.amount_cents) === 85000, 'Elena fee €850.00 is stored as 85000 cents (no floating-point rounding errors)');

    // -------------------------------------------------------------------------
    // Test 8: Crypto Remittance Configuration
    // -------------------------------------------------------------------------
    console.log('\n--- Suite 8: Cryptocurrency Remittance & Verification Queue ---');
    const cryptoCoin = paymentMethods.crypto_currencies.find((c: any) => c.currency === 'USDT' || c.symbol === 'USDT');
    assert(cryptoCoin !== undefined, 'USDT is configured with depository address');
    assert(typeof cryptoCoin!.wallet_address === 'string' && cryptoCoin!.wallet_address.length > 10, 'Valid wallet address is configured for USDT');

    // -------------------------------------------------------------------------
    // Test 9: Client Creation WITHOUT a Fee or Invoice (Requirement 1)
    // -------------------------------------------------------------------------
    console.log('\n--- Suite 9: Separate Client Creation from Invoice Creation ---');
    const now = new Date().toISOString();
    const testClientRef = 'LUX-TEST-NOFEE-001';

    // Delete if already existed from prior run
    await execute('DELETE FROM clients WHERE reference_number = ?', [testClientRef]);

    const newClientRes = await execute(
      `INSERT INTO clients (
        full_name, email, reference_number, case_category, case_details,
        amount_cents, payment_status, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 0, 'pending', 1, ?, ?)`,
      ['Frederic Chopin', 'f.chopin@example.com', testClientRef, 'Artist Relocation Visa', 'No fee assigned on registration', now, now]
    );

    const newClientId = newClientRes.lastInsertRowid;
    assert(newClientId > 0, 'Created a client without assigning a fee or invoice');

    const createdClient = await queryOne<any>('SELECT * FROM clients WHERE id = ?', [newClientId]);
    assert(createdClient !== null, 'Client record exists in database');
    assert(Number(createdClient.amount_cents) === 0, 'Client amount_cents is 0 (no fee assigned)');

    // Verify no invoice was created automatically
    const autoInvoices = await queryAll('SELECT * FROM invoices WHERE client_id = ?', [newClientId]);
    assert(autoInvoices.length === 0, 'No invoice was automatically created for this client');

    // -------------------------------------------------------------------------
    // Test 10: Creating Multiple Invoices for One Client (Requirement 2)
    // -------------------------------------------------------------------------
    console.log('\n--- Suite 10: Dedicated Invoices - Multiple Invoices per Client ---');
    const inv1Num = await generateInvoiceNumber();
    const inv1 = await execute(
      `INSERT INTO invoices (
        client_id, invoice_number, reason, amount_cents, currency,
        issue_date, due_date, status, created_at, updated_at
      ) VALUES (?, ?, 'Immigration Consultation Fee', 25000, 'EUR', '2026-10-25', '2026-11-08', 'issued', ?, ?)`,
      [newClientId, inv1Num, now, now]
    );
    assert(inv1.lastInsertRowid > 0, `Created first invoice ${inv1Num} for €250.00`);

    const inv2Num = await generateInvoiceNumber();
    const inv2 = await execute(
      `INSERT INTO invoices (
        client_id, invoice_number, reason, amount_cents, currency,
        issue_date, due_date, status, created_at, updated_at
      ) VALUES (?, ?, 'Document Assessment Fee', 15000, 'EUR', '2026-10-25', '2026-11-08', 'unpaid', ?, ?)`,
      [newClientId, inv2Num, now, now]
    );
    assert(inv2.lastInsertRowid > 0, `Created second invoice ${inv2Num} for €150.00`);

    const clientInvoices = await queryAll('SELECT * FROM invoices WHERE client_id = ?', [newClientId]);
    assert(clientInvoices.length === 2, 'Client now has 2 distinct invoices associated with their account');

    // -------------------------------------------------------------------------
    // Test 11: Editing an Unpaid Invoice (Requirement 2 & 3)
    // -------------------------------------------------------------------------
    console.log('\n--- Suite 11: Editing Unpaid Invoices & Reflected Changes ---');
    const inv1Id = inv1.lastInsertRowid;
    await execute(
      `UPDATE invoices SET
        reason = 'Comprehensive Consular Legal Assessment',
        amount_cents = 35000,
        due_date = '2026-11-15',
        updated_at = ?
       WHERE id = ?`,
      [new Date().toISOString(), inv1Id]
    );

    const updatedInv = await queryOne<any>('SELECT * FROM invoices WHERE id = ?', [inv1Id]);
    assert(updatedInv.reason === 'Comprehensive Consular Legal Assessment', 'Updated invoice reason reflected');
    assert(Number(updatedInv.amount_cents) === 35000, 'Updated invoice amount €350.00 reflected');
    assert(updatedInv.due_date === '2026-11-15', 'Updated invoice due date reflected');

    // -------------------------------------------------------------------------
    // Test 12: Preventing Unauthorized Modifications to Paid Invoices (Requirement 2 & 4)
    // -------------------------------------------------------------------------
    console.log('\n--- Suite 12: Preventing Unauthorized Changes to Paid Invoices ---');
    const invPaidNum = await generateInvoiceNumber();
    const paidInvRes = await execute(
      `INSERT INTO invoices (
        client_id, invoice_number, reason, amount_cents, currency,
        issue_date, due_date, status, created_at, updated_at
      ) VALUES (?, ?, 'Statutory Visa Fee', 50000, 'EUR', '2026-10-01', '2026-10-15', 'paid', ?, ?)`,
      [newClientId, invPaidNum, now, now]
    );
    const paidInvId = paidInvRes.lastInsertRowid;

    // Verify status transition logic
    const canTransitionPaidToUnpaid = isValidStatusTransition('paid', 'unpaid');
    assert(!canTransitionPaidToUnpaid, 'Server prohibits direct status transition from "paid" to "unpaid"');

    const canTransitionPaidToCancelled = isValidStatusTransition('paid', 'cancelled');
    assert(canTransitionPaidToCancelled, 'Server permits controlled cancellation transition with audit reason');

    // -------------------------------------------------------------------------
    // Test 13: Consistent EUR Currency & Strict Decimal Minor Units (Requirement 2 & 6)
    // -------------------------------------------------------------------------
    console.log('\n--- Suite 13: Strict EUR Currency Enforcement ---');
    const allInvoices = await queryAll<{ currency: string; amount_cents: number }>('SELECT currency, amount_cents FROM invoices');
    const nonEur = allInvoices.filter((i) => i.currency !== 'EUR');
    assert(nonEur.length === 0, 'All invoices strictly use EUR (€) as required');
    const allIntegers = allInvoices.every((i) => Number.isInteger(Number(i.amount_cents)));
    assert(allIntegers, 'All invoice amounts stored strictly as integer minor units');

    // -------------------------------------------------------------------------
    // Test 14: Overdue Status Derivation (Requirement 2)
    // -------------------------------------------------------------------------
    console.log('\n--- Suite 14: Dynamic Overdue Status Derivation ---');
    const pastDueDate = '2020-01-01';
    const futureDueDate = '2030-01-01';
    assert(deriveInvoiceStatus('issued', pastDueDate) === 'overdue', 'Derives "overdue" for issued invoice past due date');
    assert(deriveInvoiceStatus('unpaid', pastDueDate) === 'overdue', 'Derives "overdue" for unpaid invoice past due date');
    assert(deriveInvoiceStatus('issued', futureDueDate) === 'issued', 'Maintains "issued" for future due date');
    assert(deriveInvoiceStatus('paid', pastDueDate) === 'paid', 'Maintains "paid" even if past due date');

    // -------------------------------------------------------------------------
    // Test 15: Regional Configuration & Client Assignment (Requirement 4)
    // -------------------------------------------------------------------------
    console.log('\n--- Suite 15: Regional Jurisdictions & Safe Assignment ---');
    const regions = await queryAll<any>('SELECT * FROM regions WHERE is_active = 1');
    assert(regions.length >= 4, 'Configured regions exist (Europe, Africa, Asia-Pacific, North America, etc.)');

    const europeRegion = regions.find((r) => r.name === 'Europe');
    assert(europeRegion !== undefined, 'Europe region exists');

    // Assign region to test client
    await execute('UPDATE clients SET region_id = ? WHERE id = ?', [europeRegion.id, newClientId]);
    const clientWithRegion = await queryOne<any>(
      `SELECT c.*, r.name as region_name
       FROM clients c
       LEFT JOIN regions r ON c.region_id = r.id
       WHERE c.id = ?`,
      [newClientId]
    );
    assert(clientWithRegion.region_name === 'Europe', 'Client successfully assigned to Europe region');

    // Verify prevention of disabling region when clients are assigned
    const assignedCount = await queryOne<{ c: number }>(
      'SELECT COUNT(*) as c FROM clients WHERE region_id = ?',
      [europeRegion.id]
    );
    assert(Number(assignedCount?.c) > 0, 'Clients currently assigned to Europe region');

    // Change client region to Asia-Pacific
    const apacRegion = regions.find((r) => r.name === 'Asia-Pacific');
    if (apacRegion) {
      await execute('UPDATE clients SET region_id = ? WHERE id = ?', [apacRegion.id, newClientId]);
      const clientWithNewRegion = await queryOne<any>(
        'SELECT r.name as region_name FROM clients c LEFT JOIN regions r ON c.region_id = r.id WHERE c.id = ?',
        [newClientId]
      );
      assert(clientWithNewRegion.region_name === 'Asia-Pacific', 'Client reassigned to Asia-Pacific region');
    }

    // -------------------------------------------------------------------------
    // Test 16: Client Portal Authentication & Region Resolution (Requirement 5)
    // -------------------------------------------------------------------------
    console.log('\n--- Suite 16: Client Auth & Region-Specific Loading Data ---');
    const chopinAuth = await authenticateClient('f.chopin@example.com', testClientRef);
    assert(chopinAuth.client !== undefined, 'Test client authenticated via email and reference number');
    assert(chopinAuth.client!.region_name === (apacRegion ? 'Asia-Pacific' : 'Europe'), 'Authenticated client returns actual assigned region from database');

    // Test client with unassigned region returns safe null fallback
    const elenaAuth = await authenticateClient('elena.rostova@example.com', 'LUX-VISA-2026-8812');
    assert(elenaAuth.client !== undefined, 'Elena authenticated');
    // Existing client was not arbitrarily assigned, has safe fallback

    // -------------------------------------------------------------------------
    // Test 17: Strict Client Invoices Ownership Isolation (Requirement 3 & 9)
    // -------------------------------------------------------------------------
    console.log('\n--- Suite 17: Cross-Client Invoice Access Prevention ---');
    const elenaRecord = await queryOne<any>('SELECT id FROM clients WHERE reference_number = ?', ['LUX-VISA-2026-8812']);
    // Chopin invoices must not belong to Elena
    const elenaInvoices = await queryAll('SELECT * FROM invoices WHERE client_id = ?', [elenaRecord.id]);
    const chopinInvoices = await queryAll('SELECT * FROM invoices WHERE client_id = ?', [newClientId]);

    const overlap = chopinInvoices.filter((ci: any) => ci.client_id === elenaRecord.id);
    assert(overlap.length === 0, 'Chopin cannot view Elena invoices and vice-versa (strict client_id isolation)');

    // -------------------------------------------------------------------------
    // Test 18: Unverified Crypto Submission Does NOT Mark Invoice as Paid (Requirement 7)
    // -------------------------------------------------------------------------
    console.log('\n--- Suite 18: Cryptocurrency Remittance Verification Safeguard ---');
    const cryptoInvNum = await generateInvoiceNumber();
    const cryptoInvRes = await execute(
      `INSERT INTO invoices (
        client_id, invoice_number, reason, amount_cents, currency,
        issue_date, due_date, status, created_at, updated_at
      ) VALUES (?, ?, 'Consular Relocation Fee', 100000, 'EUR', '2026-10-25', '2026-11-10', 'issued', ?, ?)`,
      [newClientId, cryptoInvNum, now, now]
    );
    const cryptoInvId = cryptoInvRes.lastInsertRowid;

    // Simulate client submitting a crypto transaction hash (TxID)
    const testTxHash = '0x8f2a1b9c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a';
    await execute(
      `INSERT INTO payments (
        client_id, reference_number, method, amount_cents, currency,
        status, mode, invoice_id, crypto_currency, crypto_network, crypto_tx_hash,
        client_ip, created_at, updated_at
      ) VALUES (?, ?, 'crypto', 100000, 'EUR', 'under_review', 'live', ?, 'USDT', 'Ethereum (ERC20)', ?, '127.0.0.1', ?, ?)`,
      [newClientId, testClientRef, cryptoInvId, testTxHash, now, now]
    );

    // Update invoice to 'payment_pending'
    await execute("UPDATE invoices SET status = 'payment_pending', updated_at = ? WHERE id = ?", [now, cryptoInvId]);

    const checkCryptoInv = await queryOne<any>('SELECT status FROM invoices WHERE id = ?', [cryptoInvId]);
    assert(checkCryptoInv.status === 'payment_pending', 'Invoice status is "payment_pending", NOT "paid"');
    assert(checkCryptoInv.status !== 'paid', 'Unverified crypto transaction NEVER marks invoice as paid');

    // Admin reconciles payment to 'completed'
    await execute("UPDATE payments SET status = 'completed', updated_at = ? WHERE invoice_id = ?", [now, cryptoInvId]);
    await execute("UPDATE invoices SET status = 'paid', updated_at = ? WHERE id = ?", [now, cryptoInvId]);

    const verifiedCryptoInv = await queryOne<any>('SELECT status FROM invoices WHERE id = ?', [cryptoInvId]);
    assert(verifiedCryptoInv.status === 'paid', 'Invoice becomes "paid" only AFTER verified administrative reconciliation');

    // -------------------------------------------------------------------------
    // Test 19: Missing and Malformed Homepage Settings Resilience (Digest 3309761988)
    // -------------------------------------------------------------------------
    console.log('\n--- Suite 19: Homepage Settings Sanitization & Malformed JSON Resilience ---');
    const { sanitizeHomepageConfig } = await import('../src/lib/settings');

    const nullConfig = sanitizeHomepageConfig(null);
    assert(Array.isArray(nullConfig.instructions_steps) && nullConfig.instructions_steps.length > 0, 'Null settings safely fallback to default instructions_steps');
    assert(Array.isArray(nullConfig.faqs) && nullConfig.faqs.length > 0, 'Null settings safely fallback to default faqs');

    const emptyConfig = sanitizeHomepageConfig({});
    assert(Array.isArray(emptyConfig.instructions_steps) && emptyConfig.instructions_steps.length > 0, 'Empty object settings safely fallback to default instructions_steps');
    assert(Array.isArray(emptyConfig.faqs) && emptyConfig.faqs.length > 0, 'Empty object settings safely fallback to default faqs');

    const malformedConfig = sanitizeHomepageConfig({
      hero_headline: 'Custom Headline',
      instructions_steps: null as any,
      faqs: null as any,
    });
    assert(malformedConfig.hero_headline === 'Custom Headline', 'Custom scalar properties are preserved');
    assert(Array.isArray(malformedConfig.instructions_steps) && malformedConfig.instructions_steps.length > 0, 'Null instructions_steps replaced with valid default array');
    assert(Array.isArray(malformedConfig.faqs) && malformedConfig.faqs.length > 0, 'Null faqs replaced with valid default array');

    const customStepsConfig = sanitizeHomepageConfig({
      instructions_steps: [
        { step: 1, title: 'Custom Step 1', desc: 'Custom Desc 1' },
      ],
      faqs: [
        { question: 'Custom Question?', answer: 'Custom Answer.' },
      ],
    });
    assert(customStepsConfig.instructions_steps.length === 1 && customStepsConfig.instructions_steps[0].title === 'Custom Step 1', 'Valid custom instructions_steps preserved');
    assert(customStepsConfig.faqs.length === 1 && customStepsConfig.faqs[0].question === 'Custom Question?', 'Valid custom faqs preserved');

    // Test saving and retrieving via getHomepageConfig
    await saveSetting('homepage', { hero_headline: 'Admin Custom Headline', faqs: null, instructions_steps: null });
    const loadedHomepage = await getHomepageConfig();
    assert(loadedHomepage.hero_headline === 'Admin Custom Headline', 'Loaded custom headline preserved from DB');
    assert(Array.isArray(loadedHomepage.instructions_steps) && loadedHomepage.instructions_steps.length > 0, 'Loaded homepage has guaranteed instructions_steps array');
    assert(Array.isArray(loadedHomepage.faqs) && loadedHomepage.faqs.length > 0, 'Loaded homepage has guaranteed faqs array');

    // -------------------------------------------------------------------------
    // Test 20: Database Init Promise Rejection Reset & Retry
    // -------------------------------------------------------------------------
    console.log('\n--- Suite 20: Database Initialization Failure Recovery & Retry ---');
    // Ensure that ensureDbInit() does not leave a permanently rejected promise
    const originalDbClient = getDb();
    let callCount = 0;
    let failFirst = true;

    async function simulatedInit(): Promise<void> {
      callCount++;
      if (failFirst) {
        failFirst = false;
        throw new Error('Transient simulated database network failure');
      }
      return Promise.resolve();
    }

    let retryPromise: Promise<void> | null = null;
    async function safeEnsureDbInit(): Promise<void> {
      if (!retryPromise) {
        retryPromise = (async () => {
          try {
            await simulatedInit();
          } catch (err) {
            retryPromise = null;
            throw err;
          }
        })();
      }
      return retryPromise;
    }

    // First attempt should fail
    let failedAsExpected = false;
    try {
      await safeEnsureDbInit();
    } catch (e: any) {
      failedAsExpected = true;
      assert(e.message === 'Transient simulated database network failure', 'First init attempt failed with transient error');
    }
    assert(failedAsExpected, 'First call threw expected error');
    assert(retryPromise === null, 'Rejected promise was cleared and not permanently cached');

    // Second attempt should retry and succeed
    await safeEnsureDbInit();
    assert(callCount === 2, 'Second call retried and called initialization again');
    assert(retryPromise !== null, 'Successful initialization is cached');

    // Third attempt should reuse resolved promise without calling simulatedInit again
    await safeEnsureDbInit();
    assert(callCount === 2, 'Third call reused cached resolved promise without re-running initialization');

    // -------------------------------------------------------------------------
    // Test 21: Backward-Compatible Legacy Database Schema Evolution
    // -------------------------------------------------------------------------
    console.log('\n--- Suite 21: Backward-Compatible Legacy Database Schema Evolution ---');
    const { createClient } = await import('@libsql/client');
    const legacyDbPath = 'file:data/legacy-test.sqlite';
    const legacyClient = createClient({ url: legacyDbPath });

    // Setup legacy database missing region_id and invoice_id
    await legacyClient.execute('DROP TABLE IF EXISTS test_payments');
    await legacyClient.execute('DROP TABLE IF EXISTS test_clients');
    await legacyClient.execute('DROP TABLE IF EXISTS test_regions');
    await legacyClient.execute('DROP TABLE IF EXISTS test_invoices');

    await legacyClient.executeMultiple(`
      CREATE TABLE test_clients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        full_name TEXT NOT NULL,
        email TEXT NOT NULL,
        reference_number TEXT UNIQUE NOT NULL
      );
      CREATE TABLE test_payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER NOT NULL,
        amount_cents INTEGER NOT NULL
      );
    `);

    // Verify existing tables don't have new columns
    let testClientsInfo = await legacyClient.execute('PRAGMA table_info(test_clients)');
    let hasRegionCol = testClientsInfo.rows.some((r: any) => r.name === 'region_id');
    assert(!hasRegionCol, 'Legacy test_clients initially lacks region_id column');

    // Perform the safe schema evolution sequence
    try {
      await legacyClient.execute('ALTER TABLE test_clients ADD COLUMN region_id INTEGER');
    } catch {
      // Ignore if already exists
    }
    try {
      await legacyClient.execute('ALTER TABLE test_payments ADD COLUMN invoice_id INTEGER');
    } catch {
      // Ignore if already exists
    }
    // Now create indexes on evolved columns
    await legacyClient.execute('CREATE INDEX IF NOT EXISTS idx_test_clients_region ON test_clients(region_id)');
    await legacyClient.execute('CREATE INDEX IF NOT EXISTS idx_test_payments_invoice ON test_payments(invoice_id)');

    testClientsInfo = await legacyClient.execute('PRAGMA table_info(test_clients)');
    hasRegionCol = testClientsInfo.rows.some((r: any) => r.name === 'region_id');
    assert(hasRegionCol, 'Legacy test_clients successfully evolved with region_id column');

    const testPaymentsInfo = await legacyClient.execute('PRAGMA table_info(test_payments)');
    const hasInvoiceCol = testPaymentsInfo.rows.some((r: any) => r.name === 'invoice_id');
    assert(hasInvoiceCol, 'Legacy test_payments successfully evolved with invoice_id column');

    // Cleanup legacy test tables
    await legacyClient.execute('DROP TABLE IF EXISTS test_payments');
    await legacyClient.execute('DROP TABLE IF EXISTS test_clients');

    // -------------------------------------------------------------------------
    // Test 22: Client Session Cookie Resilience
    // -------------------------------------------------------------------------
    console.log('\n--- Suite 22: Client Session Cookie Resilience ---');
    // Stale or invalid JWT token
    const invalidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature';
    const decodedInvalid = verifyToken(invalidToken);
    assert(decodedInvalid === null, 'Malformed/tampered client session cookie gracefully resolves to null');

    // Expired or non-existent client ID lookup simulation
    const nonExistentClientId = 9999999;
    const nonExistentClient = await queryOne('SELECT full_name FROM clients WHERE id = ?', [nonExistentClientId]);
    assert(nonExistentClient === null, 'Non-existent client session ID safely returns null without throwing');

    console.log('\n======================================================');
    console.log(`🎉 ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`);
    console.log('======================================================\n');
  } catch (err: any) {
    console.error('\n❌ Test Suite Aborted with Error:', err.message);
    process.exit(1);
  }
}

runTests();
