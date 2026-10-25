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

## ☁️ Netlify Deployment Guide

The application is fully architected for Netlify's serverless environment, utilizing `@netlify/plugin-nextjs`, `@libsql/client` (managed serverless SQLite over HTTP/WebSocket via Turso), and `@netlify/blobs` for persistent file uploads.

### 1. Required Cloud Services

| Service | Recommended Provider | Purpose |
| :--- | :--- | :--- |
| **Serverless Database** | **Turso (ChiselStrike libSQL)** | Managed distributed SQLite over HTTP. Solves serverless read-only filesystem limitations, eliminates SQLite WAL lock issues, and supports concurrent serverless lambdas. |
| **Persistent Object Storage** | **Netlify Blobs** (or S3 / Cloudflare R2) | Stores agency logos and applicant portraits across serverless redeployments without disk dependency. |
| **Hosting & Functions** | **Netlify** | Next.js 14 App Router SSR, Server Actions, Edge Middleware, and API routes. |

### 2. Netlify Production Build Configuration

- **Base directory**: `.` (repository root)
- **Build command**: `npm run db:migrate && npm run build` (or `npm run build`)
- **Publish directory**: `.next`
- **Next.js Runtime Plugin**: `@netlify/plugin-nextjs` (pre-configured in `netlify.toml`)
- **Node.js Version**: `20.x` or `22.x`

### 3. Environment Variables to Configure in Netlify

In your Netlify team dashboard, navigate to **Site configuration > Environment variables** (ensure scope includes **Functions** and **Builds**) and add:

```env
# Database connection (Turso Managed libSQL) - REQUIRED in production
# URL must begin with libsql://, https://, or http://
TURSO_DATABASE_URL=libsql://your-database-name.turso.io
TURSO_AUTH_TOKEN=your-turso-jwt-auth-token-here

# Session signing & cryptography (Generate 32+ character random string)
SESSION_SECRET=generate-a-secure-random-32-byte-hex-string-for-production

# Initial administrator bootstrap password (only used on cold start if DB is empty)
INITIAL_ADMIN_PASSWORD=replace-with-a-strong-initial-bootstrap-password

# Environment mode
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-custom-domain.netlify.app
```

> **Note on Netlify Serverless Filesystem & Resolution of `ENOENT /var/task/data`:**
> Netlify runs Next.js server-side rendering and API routes on AWS Lambda serverless containers with read-only root filesystems (`/var/task`). 
> Any attempt to create local folders like `/var/task/data` causes `ENOENT: no such file or directory, mkdir '/var/task/data'`.
> The platform is configured to strictly enforce remote Turso libSQL connectivity in production (`NODE_ENV === 'production'` or `NETLIFY=true`). 
> If `TURSO_DATABASE_URL` or `TURSO_AUTH_TOKEN` is missing or points to a local `file:`, the server fails fast with a clean, descriptive configuration error and never attempts filesystem writes. Local SQLite file creation is restricted solely to offline development environments.

### 4. Step-by-Step Repository Connection to Netlify

1. **Log in to Netlify**: Go to [app.netlify.com](https://app.netlify.com).
2. **Add New Site**: Click **"Add new site" > "Import an existing project"**.
3. **Connect to Git Provider**: Select **GitHub** and authorize access to `aebraharm/luxembourg-portal`.
4. **Select Branch**: Choose branch `arena/11ecbdb2-luxembourg-portal` (or `main` upon merging).
5. **Set Build Settings**:
   - Build Command: `npm run build`
   - Publish directory: `.next`
6. **Set Environment Variables**: Click **"Add environment variables"** and input the required keys from `.env.example` (especially `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, and `SESSION_SECRET`).
7. **Deploy**: Click **"Deploy site"**. Netlify will install dependencies, build the Next.js bundle, apply HTTP headers from `netlify.toml`, and assign an SSL certificate automatically.

### 5. Running Database Migrations

You can run migrations locally or against your remote Turso database before or during deployment:

```bash
# To apply migrations to your remote Turso database:
TURSO_DATABASE_URL="libsql://your-db.turso.io" TURSO_AUTH_TOKEN="your-token" npm run db:migrate

# Or locally against the SQLite engine:
npm run db:migrate
```

The migration script:
- Verifies database connectivity.
- Idempotently creates all tables: `administrators`, `clients`, `payments`, `settings`, `audit_logs`, `uploaded_assets`, `login_rate_limits`.
- Applies indexes on `email`, `reference_number`, and `created_at`.
- Seeds the initial administrator (`portal@gmail.com`) if not already present.
- Seeds initial sample case files if empty.
- Never deletes or overwrites existing records.

---

## 🧪 Local Testing & Verification Commands

```bash
# 1. Install dependencies
npm install

# 2. Run unit & integration test suite (22 automated tests)
npm test

# 3. Run end-to-end scenario test (Admin creation -> Manual reference -> Client login -> Demo Card Failure -> Crypto TxID -> Admin reconciliation)
npm run test:e2e

# 4. Verify database migration & health check
npm run db:migrate

# 5. Execute complete Next.js production build
npm run build

# 6. Start local server bound to 0.0.0.0:3000
npm run dev
```

---

## 📋 Post-Deployment Verification Checklist

Once deployed to Netlify, execute the following operational validation checks:

- [ ] **Health Endpoint**: Visit `https://your-site.netlify.app/api/health`. Verify `status: "healthy"` and `connected: true`.
- [ ] **Administrator Authentication**:
  - Visit `/admin/login`.
  - Log in using `portal@gmail.com` and initial password.
  - Verify mandatory password-change notification appears.
  - Change password through the password modal and confirm session remains valid.
- [ ] **Manual Client Reference Number Creation**:
  - Navigate to `/admin/clients`.
  - Create a new client record, entering a manual reference number (e.g. `LUX-VISA-2026-1001`).
  - Attempt to create a second client with the same reference number and verify strict uniqueness rejection.
- [ ] **Client Authentication & Multi-Step Journey**:
  - Visit `/login`.
  - Enter the applicant email and manual reference number.
  - Observe transition loading screen.
  - Verify personalized dashboard loads with accurate EUR amount and instructions.
- [ ] **Payment Channel Testing**:
  - Select Card Payment: submit demo details and verify the exact termination status message: `"Payment failed"`.
  - Select PayPal: verify regional policy message appears with return navigation button.
  - Select Crypto: submit a test transaction hash and verify status updates to `"under_review"`.
- [ ] **Payment Reconciliation**:
  - In Admin Portal `/admin/payments`, review the pending crypto submission.
  - Reconcile status to `"completed"` with an audit note.
  - Refresh the client dashboard to verify the case now reflects `"Paid & Confirmed"`.
- [ ] **Upload Persistence**:
  - Upload an agency logo under `/admin/settings` (Branding tab).
  - Verify logo renders on the public homepage, client login, and loading screens.
- [ ] **Audit Trail**:
  - Inspect `/admin/audit-logs` to confirm every action is chronologically recorded.

---

## ⚠️ Pre-Live Blockers & Safeguards

Before processing real client visa payments in live production:
1. **Rotate Administrator Password**: The initial bootstrap password (`12345678`) must be replaced via `/admin` before admitting public traffic.
2. **Managed Database Provisioning**: Ensure `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` are populated in Netlify environment variables so records do not touch ephemeral container disks.
3. **Card Gateway Activation**: Keep card payments in **Demo mode** until official merchant agreements (e.g. Stripe European acquiring account) have been executed and API keys verified server-side.
4. **Cryptocurrency Custody Verification**: Ensure the depository wallet addresses in `/admin/settings` point to your organization's multi-signature hardware custody wallets.
