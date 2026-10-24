# Luxembourg Immigration Agency Visa Payment Portal

A production-grade, secure, responsive fintech payment portal built exclusively for an immigration agency handling statutory visa-related fees, consular disbursements, and relocation tariffs.

The platform provides two completely segregated environments:
1. **Public-Facing Client Portal**: A guided multi-page client journey with dedicated loading transition screens, fee schedules in EUR (€), card payments (with demo test mode ending in "Payment failed"), regional PayPal notices, and cryptocurrency remittances.
2. **Comprehensive Admin Portal**: A secure administration dashboard to manually assign unique client reference numbers, manage case categories, reconcile verified remittances, inspect audit logs, and configure all website content and 16 settings categories.

---

## 🎨 Fintech Design System

- **Primary Background**: Clean White (`#ffffff`) with subtle slate off-whites (`#f8fafc`).
- **Secondary Accent**: Sky Blue (`#0284c7`, `#38bdf8`, `#e0f2fe`).
- **Primary Clickable Buttons & Important Actions**: Red (`#dc2626`, hover `#b91c1c`).
- **Typography & Text**: Dark Navy / Charcoal (`#0f172a`, `#1e293b`).
- **Cards**: Clean white surfaces with subtle borders (`#e2e8f0`), rounded corners, and soft shadows.

---

## 🔐 Credentials for Immediate Evaluation

### 1. Administrative Portal
- **Login URL**: `/admin/login`
- **Email**: `portal@gmail.com`
- **Initial Password**: `12345678` *(Triggers mandatory password replacement banner upon initial login)*

### 2. Client Portal (Pre-Seeded Sample Cases)
- **Login URL**: `/login` (requires **Email** + **Manually Assigned Reference Number**)
- **Applicant 1**:
  - Email: `elena.rostova@example.com`
  - Reference Number: `LUX-VISA-2026-8812`
  - Category: `Work Visa (EU Blue Card - Luxembourg)`
  - Fee: `€850.00`
- **Applicant 2**:
  - Email: `marcus.vance@example.com`
  - Reference Number: `LUX-VISA-2026-9943`
  - Category: `Long-Term Residence Permit & Family Reunification`
  - Fee: `€1,200.00`

---

## 🚀 Key Functional Modules

### 1. Multi-Step Client Experience & Dedicated Loading Screens
- Step 1: **Homepage** (`/`) - Strictly focused on visa payments.
- Step 2: **Client Login** (`/login`) - Strict validation of email and manually assigned reference number.
- Step 3: **Transition Screen** -> **Client Dashboard** (`/client/dashboard`) - Personalized applicant details, profile picture, fee schedule, and payment history.
- Step 4: **Case Review** - Review consular details and assigned EUR tariffs.
- Step 5: **Payment Selection** (`/client/payment/select`) - Select between Card, PayPal, and Cryptocurrency.
- Step 6: **Transition Screen** -> **Dedicated Method Page**:
  - **Card Payment** (`/client/payment/card`): Card terminal with 3D-Secure 2.0 simulation. In demo mode, concludes with the exact status message `"Payment failed"`.
  - **PayPal** (`/client/payment/paypal`): Displays the exact regional policy message: *"PayPal payments are currently unavailable in your region. Please select another available payment method."*
  - **Cryptocurrency** (`/client/payment/crypto`): Custody depository wallets (USDT ERC20/TRC20, BTC, ETH) with strict network checks, copy address, required confirmations (12), and Transaction Hash (TxID) verification queue.
- Step 7: **Execution** -> **Loading Screen** -> **Payment Result** (`/client/payment/result`).

### 2. Administrator Portal & Controls
- **Executive Dashboard** (`/admin`): Real database summaries for total clients, assigned tariffs in EUR, successful payments, pending verifications, and recent transaction feeds.
- **Client Management** (`/admin/clients`): Full CRUD operations. **Strict Requirement**: Manual entry of unique reference numbers is mandatory; reference numbers are never auto-generated. Includes profile photo upload, export to CSV and JSON.
- **Payment Remittances** (`/admin/payments`): Search and filter transactions by client, reference number, date, amount, method, and status. Reconcile verified crypto/wire payments to `completed` with mandatory audit notes.
- **Website & CMS Settings** (`/admin/settings`):
  1. *General Consular Settings*
  2. *Branding and Logo* (upload, preview, replace, remove agency logo)
  3. *Theme and UI Customization* (color tokens, border radius)
  4. *Homepage Content* (headlines, descriptions, buttons, FAQs, section toggles)
  5. *Loading Screens* (transition duration ms, titles, progress indicators)
  6. *Client Portal Governance*
  7. *Manual Reference Number Policies*
  8. *Payment Method Availability & Order*
  9. *Card Payment Configuration* (Demo vs Live mode, failure message)
  10. *PayPal Regional Notice Configuration*
  11. *Cryptocurrency Configuration* (wallets, networks, coins, confirmations)
  12. *Email & Notification Triggers*
  13. *Security & Session Settings* (rate limiting, timeouts)
  14. *Legal & Policy Disclosures* (Terms of Service, GDPR Privacy, Refund Policy)
  15. *Audit Logs* (`/admin/audit-logs`)
  16. *Database & Application Health* (`/admin/health`)

---

## 🔒 Security Architecture

1. **Password Security**: Strong salted bcrypt password hashes. Plaintext passwords are never logged or stored.
2. **Session Security**: HTTP-only, SameSite cookies with cryptographically signed HMAC-SHA256 tokens.
3. **PCI-DSS Compliance**: Credit card numbers and CVV codes are never stored, logged, or retained on the application server.
4. **Monetary Representation**: Stored in integer minor units (EUR cents) to prevent floating-point rounding errors.
5. **Rate Limiting & Lockout**: Brute-force protection on authentication endpoints tracking IP and email with automatic lockouts.
6. **Audit Trail**: Every administrative action, client login, and financial status change is recorded in immutable audit logs.
7. **Statutory Non-Affiliation**: Disclaimers clearly state that the agency is an independent immigration advisory firm and fees do not guarantee government visa issuance.

---

## 🛠️ Technology Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Database Engine**: Built-in SQLite 3 (WAL Mode) via `node:sqlite`
- **Cryptography**: Node `crypto` & `bcryptjs`
- **Test Runner**: `tsx` test suite (`scripts/test-runner.ts` & `scripts/e2e-scenario-test.ts`)

---

## 🏃 Getting Started & Running

```bash
# 1. Install dependencies
npm install

# 2. Run automated tests
npm test

# 3. Run end-to-end scenario test
npx tsx scripts/e2e-scenario-test.ts

# 4. Build production bundle
npm run build

# 5. Start dev server bound to 0.0.0.0:3000
npm run dev
```
