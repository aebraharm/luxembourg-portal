/**
 * Comprehensive Automated Test Suite
 * Tests all core backend logic, security requirements, and data operations
 */

import { getDb } from '../src/lib/db';
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
    // Test 1: Database Initialization
    console.log('--- Suite 1: Database & Seed Verification ---');
    const db = getDb();
    assert(db !== null, 'Database connection initialized successfully');

    const adminCheck = db.prepare('SELECT * FROM administrators WHERE email = ?').get('portal@gmail.com') as any;
    assert(adminCheck !== undefined, 'Default administrator portal@gmail.com exists');
    assert(adminCheck.must_change_password === 1, 'Initial admin flag must_change_password is true');

    const clients = db.prepare('SELECT COUNT(*) as count FROM clients').get() as { count: number };
    assert(clients.count >= 2, 'Pre-seeded sample client records exist');

    // Test 2: Administrator Authentication
    console.log('\n--- Suite 2: Administrator Authentication & Password Hash ---');
    const adminAuthSuccess = authenticateAdmin('portal@gmail.com', '12345678');
    assert(adminAuthSuccess.admin !== undefined, 'Admin authenticates with initial credentials 12345678');

    const adminAuthFail = authenticateAdmin('portal@gmail.com', 'wrongpassword');
    assert(adminAuthFail.admin === undefined && adminAuthFail.error !== undefined, 'Admin fails with incorrect password');

    // Test 3: Client Authentication
    console.log('\n--- Suite 3: Client Authentication (Email + Reference Number) ---');
    const clientAuthSuccess = authenticateClient('elena.rostova@example.com', 'LUX-VISA-2026-8812');
    assert(clientAuthSuccess.client !== undefined, 'Client Elena Rostova authenticates with email and reference number');
    assert(clientAuthSuccess.client!.reference_number === 'LUX-VISA-2026-8812', 'Client reference number matches');

    const clientAuthCaseInsensitive = authenticateClient('ELENA.ROSTOVA@EXAMPLE.COM', 'lux-visa-2026-8812');
    assert(clientAuthCaseInsensitive.client !== undefined, 'Client authentication handles case normalization');

    const clientAuthMismatch = authenticateClient('elena.rostova@example.com', 'LUX-VISA-WRONG-9999');
    assert(clientAuthMismatch.client === undefined, 'Client authentication rejects invalid reference number');

    // Test 4: Reference Number Requirement (Manual Entry & Uniqueness)
    console.log('\n--- Suite 4: Manual Reference Number Assignment & Uniqueness ---');
    const duplicateRef = 'LUX-VISA-2026-8812';
    const clash = db.prepare('SELECT id FROM clients WHERE UPPER(reference_number) = ?').get(duplicateRef);
    assert(clash !== undefined, 'Database identifies existing reference number to prevent duplication');

    // Test 5: Rate Limiting & Lockout
    console.log('\n--- Suite 5: Brute Force & Rate Limiting Protection ---');
    const testIp = '192.168.1.100';
    const testEmail = 'brute.force@example.com';
    clearRateLimit(testIp, testEmail);

    let rateStatus = checkRateLimit(testIp, testEmail);
    assert(rateStatus.allowed === true, 'Initial request allowed through rate limiter');

    // Simulate 5 failed attempts
    for (let i = 0; i < 4; i++) {
      recordFailedLogin(testIp, testEmail);
    }
    const fifthAttempt = recordFailedLogin(testIp, testEmail);
    assert(fifthAttempt.blocked === true, '5th failed attempt locks out user');

    rateStatus = checkRateLimit(testIp, testEmail);
    assert(rateStatus.allowed === false, 'Rate limiter actively blocks locked IP/email');
    clearRateLimit(testIp, testEmail);

    // Test 6: Settings Engine & Configuration Persistence
    console.log('\n--- Suite 6: Data-Driven Settings & CMS Engine ---');
    const branding = getBranding();
    assert(typeof branding.agency_name === 'string', 'Branding settings loaded with agency name');

    const paymentMethods = getPaymentMethodConfig();
    assert(paymentMethods.card_enabled === true, 'Card payment method is enabled by default');
    assert(paymentMethods.card_demo_failure_message === 'Payment failed', 'Card demo outcome is exactly "Payment failed"');
    assert(paymentMethods.paypal_unavailability_message.includes('currently unavailable in your region'), 'PayPal message matches regional notice requirement');

    // Test 7: Minor Unit Monetary Arithmetic (Integer Cents)
    console.log('\n--- Suite 7: Monetary Minor Unit Representation (Integer Cents) ---');
    const elena = db.prepare('SELECT amount_cents FROM clients WHERE reference_number = ?').get('LUX-VISA-2026-8812') as { amount_cents: number };
    assert(Number.isInteger(elena.amount_cents), 'Fee amount is stored as strict integer minor units');
    assert(elena.amount_cents === 85000, 'Elena fee €850.00 is stored as 85000 cents (no floating-point rounding errors)');

    // Test 8: Crypto Remittance Submission
    console.log('\n--- Suite 8: Cryptocurrency Remittance & Verification Queue ---');
    const cryptoCoin = paymentMethods.crypto_currencies.find((c) => c.symbol === 'USDT');
    assert(cryptoCoin !== undefined, 'USDT is configured with depository address');
    assert(typeof cryptoCoin!.wallet_address === 'string' && cryptoCoin!.wallet_address.length > 10, 'Valid wallet address is configured for USDT');

    console.log('\n======================================================');
    console.log(`🎉 ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`);
    console.log('======================================================\n');
  } catch (err: any) {
    console.error('\n❌ Test Suite Aborted with Error:', err.message);
    process.exit(1);
  }
}

runTests();
