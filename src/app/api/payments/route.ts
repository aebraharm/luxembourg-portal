import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, ClientSessionPayload, AdminSessionPayload } from '@/lib/auth';
import { queryOne, queryAll, execute, deriveInvoiceStatus } from '@/lib/db';
import { getPaymentMethodConfig } from '@/lib/settings';
import { logAudit } from '@/lib/audit';
import { ClientRecord, InvoiceRecord, PaymentRecord } from '@/lib/types';

// Client creating a payment attempt
export async function POST(request: Request) {
  const cookieStore = cookies();
  const clientToken = cookieStore.get('client_session')?.value;

  if (!clientToken) {
    return NextResponse.json({ error: 'Unauthorized: Session missing' }, { status: 401 });
  }

  const session = verifyToken<ClientSessionPayload>(clientToken);
  if (!session) {
    return NextResponse.json({ error: 'Session expired' }, { status: 401 });
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';

  const client = await queryOne<ClientRecord>('SELECT * FROM clients WHERE id = ?', [session.clientId]);
  if (!client || client.is_active !== 1) {
    return NextResponse.json({ error: 'Client record not found or inactive' }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { method, invoiceId: requestedInvoiceId, cryptoCurrency, cryptoNetwork, cryptoTxHash } = body;
    const now = new Date().toISOString();
    const pConfig = await getPaymentMethodConfig();

    // Resolve target invoice
    let targetInvoice: InvoiceRecord | null = null;
    if (requestedInvoiceId) {
      const parsedInvId = parseInt(String(requestedInvoiceId), 10);
      if (!isNaN(parsedInvId)) {
        targetInvoice = await queryOne<InvoiceRecord>(
          'SELECT * FROM invoices WHERE id = ? AND client_id = ?',
          [parsedInvId, client.id]
        );
        if (!targetInvoice) {
          return NextResponse.json(
            { error: 'Specified invoice not found or does not belong to your account.' },
            { status: 404 }
          );
        }
      }
    } else {
      // Find first payable invoice for this client
      targetInvoice = await queryOne<InvoiceRecord>(
        "SELECT * FROM invoices WHERE client_id = ? AND status IN ('issued', 'unpaid', 'overdue') ORDER BY id ASC LIMIT 1",
        [client.id]
      );
    }

    // Validate invoice eligibility if present
    if (targetInvoice) {
      const effectiveStatus = deriveInvoiceStatus(targetInvoice.status, targetInvoice.due_date);
      if (effectiveStatus === 'paid') {
        return NextResponse.json(
          { error: 'This invoice has already been fully paid and verified.' },
          { status: 400 }
        );
      }
      if (effectiveStatus === 'cancelled') {
        return NextResponse.json(
          { error: 'This invoice has been cancelled and is no longer payable.' },
          { status: 400 }
        );
      }
      if (effectiveStatus === 'draft') {
        return NextResponse.json(
          { error: 'This invoice is currently in draft state and cannot be paid.' },
          { status: 400 }
        );
      }
      if (effectiveStatus === 'payment_pending') {
        return NextResponse.json(
          { error: 'A payment remittance for this invoice is already submitted and pending consular review.' },
          { status: 400 }
        );
      }
    }

    const payableAmountCents = targetInvoice ? targetInvoice.amount_cents : client.amount_cents;

    if (method === 'card') {
      if (!pConfig.card_enabled) {
        return NextResponse.json({ error: 'Card payments are currently disabled.' }, { status: 400 });
      }

      // Card payment in Demo Mode: MUST end with exact status message "Payment failed"
      const mode = pConfig.card_mode;
      const failureReason = pConfig.card_demo_failure_message || 'Payment failed';

      // Insert failed attempt into payments table
      // Notice: We NEVER store card number, expiry, or CVV in database!
      const result = await execute(
        `INSERT INTO payments (
          client_id, reference_number, method, amount_cents, currency,
          status, mode, invoice_id, failure_reason, client_ip, created_at, updated_at
        ) VALUES (?, ?, 'card', ?, 'EUR', 'failed', ?, ?, ?, ?, ?, ?)`,
        [
          client.id,
          client.reference_number,
          payableAmountCents,
          mode,
          targetInvoice ? targetInvoice.id : null,
          failureReason,
          ip,
          now,
          now,
        ]
      );

      const paymentId = result.lastInsertRowid;

      await logAudit({
        actorType: 'client',
        actorId: client.id,
        actorEmail: client.email,
        action: 'CARD_PAYMENT_ATTEMPT_FAILED',
        details: {
          paymentId,
          referenceNumber: client.reference_number,
          invoiceId: targetInvoice ? targetInvoice.id : null,
          invoiceNumber: targetInvoice ? targetInvoice.invoice_number : null,
          amountCents: payableAmountCents,
          mode,
          failureReason,
        },
        ipAddress: ip,
      });

      return NextResponse.json({
        success: true,
        paymentId,
        status: 'failed',
        failureReason,
        mode,
      });
    } else if (method === 'crypto') {
      if (!pConfig.crypto_enabled) {
        return NextResponse.json({ error: 'Cryptocurrency payments are currently disabled.' }, { status: 400 });
      }

      if (!cryptoTxHash || !cryptoTxHash.trim()) {
        return NextResponse.json({ error: 'Blockchain transaction hash (TxID) is required.' }, { status: 400 });
      }

      // Record crypto attempt under 'under_review' for consular finance verification
      const result = await execute(
        `INSERT INTO payments (
          client_id, reference_number, method, amount_cents, currency,
          status, mode, invoice_id, crypto_currency, crypto_network, crypto_tx_hash,
          client_ip, created_at, updated_at
        ) VALUES (?, ?, 'crypto', ?, 'EUR', 'under_review', 'live', ?, ?, ?, ?, ?, ?, ?)`,
        [
          client.id,
          client.reference_number,
          payableAmountCents,
          targetInvoice ? targetInvoice.id : null,
          cryptoCurrency || 'USDT',
          cryptoNetwork || 'Ethereum (ERC20)',
          cryptoTxHash.trim(),
          ip,
          now,
          now,
        ]
      );

      const paymentId = result.lastInsertRowid;

      // Update invoice status to 'payment_pending' if invoice is associated
      if (targetInvoice) {
        await execute(
          "UPDATE invoices SET status = 'payment_pending', updated_at = ? WHERE id = ?",
          [now, targetInvoice.id]
        );
      }

      // Update client status to under_review
      await execute('UPDATE clients SET payment_status = \'under_review\', updated_at = ? WHERE id = ?', [now, client.id]);

      await logAudit({
        actorType: 'client',
        actorId: client.id,
        actorEmail: client.email,
        action: 'CRYPTO_PAYMENT_SUBMITTED',
        details: {
          paymentId,
          referenceNumber: client.reference_number,
          invoiceId: targetInvoice ? targetInvoice.id : null,
          invoiceNumber: targetInvoice ? targetInvoice.invoice_number : null,
          cryptoCurrency,
          cryptoNetwork,
          cryptoTxHash: cryptoTxHash.trim(),
        },
        ipAddress: ip,
      });

      return NextResponse.json({
        success: true,
        paymentId,
        status: 'under_review',
      });
    }

    return NextResponse.json({ error: 'Invalid payment method specified.' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Payment processing error' }, { status: 500 });
  }
}

// Admin fetching list of payments
export async function GET(request: Request) {
  const cookieStore = cookies();
  const adminToken = cookieStore.get('admin_session')?.value;

  if (!adminToken) {
    return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
  }

  const session = verifyToken<AdminSessionPayload>(adminToken);
  if (!session) {
    return NextResponse.json({ error: 'Session expired' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const method = searchParams.get('method');
  const search = searchParams.get('search');
  const invoiceId = searchParams.get('invoiceId');

  let query = `
    SELECT
      p.*,
      c.full_name as client_name,
      c.email as client_email,
      inv.invoice_number as invoice_number,
      inv.reason as invoice_reason
    FROM payments p
    LEFT JOIN clients c ON p.client_id = c.id
    LEFT JOIN invoices inv ON p.invoice_id = inv.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (invoiceId) {
    query += ' AND p.invoice_id = ?';
    params.push(parseInt(invoiceId, 10));
  }

  if (status && status !== 'all') {
    query += ' AND p.status = ?';
    params.push(status);
  }

  if (method && method !== 'all') {
    query += ' AND p.method = ?';
    params.push(method);
  }

  if (search) {
    query += ` AND (
      p.reference_number LIKE ?
      OR c.full_name LIKE ?
      OR c.email LIKE ?
      OR p.crypto_tx_hash LIKE ?
      OR inv.invoice_number LIKE ?
    )`;
    const term = `%${search.trim()}%`;
    params.push(term, term, term, term, term);
  }

  query += ' ORDER BY p.created_at DESC';

  const payments = await queryAll<PaymentRecord>(query, params);
  return NextResponse.json({ payments });
}
