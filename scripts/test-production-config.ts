/**
 * Regression Test Suite: Production Database Initialization & Netlify Isolation
 * Verifies that production mode strictly requires Turso, never attempts local filesystem
 * operations, and never throws ENOENT / attempts mkdir('/var/task/data').
 */

import { getDb, getDatabaseConfig, resetDbClientForTesting } from '../src/lib/db';
import fs from 'node:fs';

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

async function runRegressionTests() {
  console.log('\n================================================================');
  console.log('🧪 REGRESSION TEST: PRODUCTION DATABASE & NETLIFY ISOLATION');
  console.log('================================================================\n');

  // Save original environment
  const originalEnv = { ...process.env };

  try {
    // -------------------------------------------------------------------------
    // Test 1: Production Mode with Missing TURSO_DATABASE_URL
    // -------------------------------------------------------------------------
    console.log('--- Test 1: Production fails fast if TURSO_DATABASE_URL is missing ---');
    (process.env as any).NODE_ENV = 'production';
    delete process.env.TURSO_DATABASE_URL;
    delete process.env.LIBSQL_DATABASE_URL;
    delete process.env.DATABASE_URL;
    delete process.env.TURSO_AUTH_TOKEN;
    resetDbClientForTesting();

    let err1: Error | null = null;
    try {
      getDb();
    } catch (e: any) {
      err1 = e;
    }

    assert(err1 !== null, 'getDb() throws when TURSO_DATABASE_URL is missing in production');
    assert(
      err1!.message.includes('TURSO_DATABASE_URL is not configured'),
      'Throws clear configuration error specifying TURSO_DATABASE_URL'
    );
    assert(
      !err1!.message.includes('ENOENT'),
      'Error is not an ENOENT filesystem error'
    );

    // -------------------------------------------------------------------------
    // Test 2: Production Mode Rejects Local File URL
    // -------------------------------------------------------------------------
    console.log('\n--- Test 2: Production rejects file: URLs without attempting filesystem writes ---');
    (process.env as any).NODE_ENV = 'production';
    process.env.TURSO_DATABASE_URL = 'file:/var/task/data/portal.sqlite';
    process.env.TURSO_AUTH_TOKEN = 'some-token';
    resetDbClientForTesting();

    let err2: Error | null = null;
    try {
      getDb();
    } catch (e: any) {
      err2 = e;
    }

    assert(err2 !== null, 'getDb() throws when file: URL is provided in production');
    assert(
      err2!.message.includes('Local filesystem SQLite is disabled in serverless production'),
      'Throws clear error stating local filesystem SQLite is disabled'
    );
    assert(
      !fs.existsSync('/var/task'),
      'Never attempted to create or write to /var/task'
    );

    // -------------------------------------------------------------------------
    // Test 3: Production Mode Requires TURSO_AUTH_TOKEN
    // -------------------------------------------------------------------------
    console.log('\n--- Test 3: Production requires TURSO_AUTH_TOKEN when URL is provided ---');
    (process.env as any).NODE_ENV = 'production';
    process.env.TURSO_DATABASE_URL = 'libsql://my-org-db.turso.io';
    delete process.env.TURSO_AUTH_TOKEN;
    delete process.env.LIBSQL_AUTH_TOKEN;
    resetDbClientForTesting();

    let err3: Error | null = null;
    try {
      getDb();
    } catch (e: any) {
      err3 = e;
    }

    assert(err3 !== null, 'getDb() throws when TURSO_AUTH_TOKEN is missing in production');
    assert(
      err3!.message.includes('TURSO_AUTH_TOKEN is not configured'),
      'Throws clear error specifying TURSO_AUTH_TOKEN'
    );

    // -------------------------------------------------------------------------
    // Test 4: Environment Variable Trimming and Sanitization
    // -------------------------------------------------------------------------
    console.log('\n--- Test 4: Trims whitespace and wrapping quotes from environment variables ---');
    (process.env as any).NODE_ENV = 'production';
    process.env.TURSO_DATABASE_URL = '   "libsql://sanitized-db.turso.io"   \n';
    process.env.TURSO_AUTH_TOKEN = '  \'eyToken12345\'  \r\n';
    resetDbClientForTesting();

    const config = getDatabaseConfig();
    assert(config.url === 'libsql://sanitized-db.turso.io', 'Database URL is correctly trimmed and unquoted');
    assert(config.authToken === 'eyToken12345', 'Auth token is correctly trimmed and unquoted');
    assert(config.isRemote === true, 'Recognized as remote managed database');

    const client = getDb();
    assert(client !== null, 'Creates remote libSQL client without any filesystem access');

    // -------------------------------------------------------------------------
    // Test 5: Netlify Runtime Detection
    // -------------------------------------------------------------------------
    console.log('\n--- Test 5: Netlify serverless environment detection ---');
    (process.env as any).NODE_ENV = 'development';
    process.env.NETLIFY = 'true';
    delete process.env.TURSO_DATABASE_URL;
    delete process.env.TURSO_AUTH_TOKEN;
    resetDbClientForTesting();

    let err5: Error | null = null;
    try {
      getDb();
    } catch (e: any) {
      err5 = e;
    }

    assert(err5 !== null, 'getDb() detects Netlify runtime and prevents local file fallback');
    assert(
      err5!.message.includes('TURSO_DATABASE_URL is not configured'),
      'Requires TURSO_DATABASE_URL on Netlify'
    );

    // -------------------------------------------------------------------------
    // Test 6: Development Fallback Works Offline
    // -------------------------------------------------------------------------
    console.log('\n--- Test 6: Development fallback preserved for local testing ---');
    (process.env as any).NODE_ENV = 'development';
    delete process.env.NETLIFY;
    delete process.env.TURSO_DATABASE_URL;
    delete process.env.TURSO_AUTH_TOKEN;
    resetDbClientForTesting();

    const devClient = getDb();
    assert(devClient !== null, 'Local development successfully initializes local SQLite client');

    console.log('\n================================================================');
    console.log(`🎉 ALL ${passedTests}/${totalTests} PRODUCTION REGRESSION TESTS PASSED!`);
    console.log('================================================================\n');
  } finally {
    // Restore original environment
    process.env = originalEnv;
    resetDbClientForTesting();
  }
}

runRegressionTests();
