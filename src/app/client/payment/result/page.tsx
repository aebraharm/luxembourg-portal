'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BrandLogo } from '@/components/BrandLogo';
import { LoadingScreen } from '@/components/LoadingScreen';
import {
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
  RotateCcw,
  CreditCard,
  Coins,
  ShieldCheck,
  FileText,
  Printer,
  ChevronRight,
  ExternalLink,
  HelpCircle,
} from 'lucide-react';
import { PaymentRecord } from '@/lib/types';

function PaymentResultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paymentId = searchParams.get('id');

  const [payment, setPayment] = useState<PaymentRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [branding, setBranding] = useState<{
    agency_name: string;
    tagline: string;
    logo_url: string | null;
    support_email: string;
    support_phone: string;
  }>({
    agency_name: 'Luxembourg Global Visa & Immigration Services',
    tagline: 'Consular Payment & Relocation Gateway',
    logo_url: null,
    support_email: 'payments@lux-immigration-portal.eu',
    support_phone: '+352 28 80 44 00',
  });

  useEffect(() => {
    if (!paymentId) {
      router.push('/client/dashboard');
      return;
    }

    Promise.all([
      fetch(`/api/payments/${paymentId}`),
      fetch('/api/settings'),
    ])
      .then(async ([payRes, setRes]) => {
        if (!payRes.ok) {
          setError('Unable to load payment transaction record.');
          return;
        }
        const payData = await payRes.json();
        setPayment(payData.payment);

        const setData = await setRes.json();
        if (setData.branding) setBranding(setData.branding);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [paymentId, router]);

  if (loading) {
    return (
      <LoadingScreen
        title="Generating Transaction Report"
        description="Compiling official consular payment certificate..."
        agencyName={branding.agency_name}
        tagline={branding.tagline}
        logoUrl={branding.logo_url}
        minDurationMs={800}
      />
    );
  }

  if (error || !payment) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-4">
          <XCircle className="w-12 h-12 text-red-600 mx-auto" />
          <h2 className="text-xl font-bold text-slate-900">Transaction Not Found</h2>
          <p className="text-xs text-slate-500">{error || 'Invalid payment record reference.'}</p>
          <button
            onClick={() => router.push('/client/dashboard')}
            className="w-full py-3 px-4 rounded-xl bg-slate-900 text-white font-semibold text-xs"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const formattedAmount = (payment.amount_cents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'EUR',
  });

  const isFailed = payment.status === 'failed';
  const isPending = payment.status === 'pending' || payment.status === 'under_review';
  const isCompleted = payment.status === 'completed';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-sky-100 selection:text-sky-900">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          <BrandLogo
            logoUrl={branding.logo_url}
            agencyName={branding.agency_name}
            tagline="Consular Payment Certificate & Status"
            size="md"
            href="/client/dashboard"
          />
          <button
            onClick={() => router.push('/client/dashboard')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto px-4 sm:px-6 py-12 w-full space-y-6">
        {/* Result Card */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-10 shadow-lg text-center space-y-6">
          {/* Status Icon */}
          <div>
            {isFailed && (
              <div className="w-20 h-20 rounded-full bg-red-100 border-4 border-red-50 flex items-center justify-center text-red-600 mx-auto shadow-inner animate-in zoom-in-75 duration-300">
                <XCircle className="w-10 h-10" />
              </div>
            )}
            {isPending && (
              <div className="w-20 h-20 rounded-full bg-amber-100 border-4 border-amber-50 flex items-center justify-center text-amber-600 mx-auto shadow-inner animate-in zoom-in-75 duration-300">
                <Clock className="w-10 h-10" />
              </div>
            )}
            {isCompleted && (
              <div className="w-20 h-20 rounded-full bg-emerald-100 border-4 border-emerald-50 flex items-center justify-center text-emerald-600 mx-auto shadow-inner animate-in zoom-in-75 duration-300">
                <CheckCircle2 className="w-10 h-10" />
              </div>
            )}
          </div>

          {/* Status Message Header */}
          <div className="space-y-2">
            {/* When failed, display exact message: "Payment failed" */}
            {isFailed && (
              <>
                <h1 className="text-3xl font-black text-red-600 tracking-tight">
                  Payment failed
                </h1>
                <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                  {payment.mode === 'demo'
                    ? 'This card payment simulation was executed in test mode. The simulated outcome concluded with the failed status as configured in administrative settings.'
                    : payment.failure_reason || 'The card issuer or payment processor declined this authorization request.'}
                </p>
              </>
            )}

            {isPending && (
              <>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  Verification in Progress
                </h1>
                <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                  Your transaction has been submitted to the consular finance queue. Staff will verify on-chain confirmations and update your official file.
                </p>
              </>
            )}

            {isCompleted && (
              <>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  Payment Completed &amp; Cleared
                </h1>
                <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                  Your consular payment has been verified and registered on your official immigration case file.
                </p>
              </>
            )}
          </div>

          {/* Breakdown / Receipt Ledger */}
          <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-5 text-left text-xs space-y-3">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <span className="text-slate-500 font-medium">Transaction ID</span>
              <span className="font-mono font-bold text-slate-800">#{payment.id}</span>
            </div>

            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <span className="text-slate-500 font-medium">Case Reference Number</span>
              <span className="font-mono font-bold text-sky-800">{payment.reference_number}</span>
            </div>

            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <span className="text-slate-500 font-medium">Payment Channel</span>
              <span className="capitalize font-semibold text-slate-900">
                {payment.method === 'card' && 'Debit / Credit Card'}
                {payment.method === 'paypal' && 'PayPal'}
                {payment.method === 'crypto' && `Cryptocurrency (${payment.crypto_currency || 'USDT'})`}
              </span>
            </div>

            {payment.crypto_network && (
              <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Blockchain Network</span>
                <span className="font-semibold text-slate-800">{payment.crypto_network}</span>
              </div>
            )}

            {payment.crypto_tx_hash && (
              <div className="pb-3 border-b border-slate-200 space-y-1">
                <span className="text-slate-500 font-medium block">Submitted Transaction Hash (TxID)</span>
                <p className="font-mono text-[11px] text-slate-800 break-all bg-white p-2 rounded-lg border border-slate-200">
                  {payment.crypto_tx_hash}
                </p>
              </div>
            )}

            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <span className="text-slate-500 font-medium">Timestamp (UTC)</span>
              <span className="text-slate-700">{new Date(payment.created_at).toLocaleString()}</span>
            </div>

            <div className="flex justify-between items-center pt-1 font-bold text-sm">
              <span className="text-slate-900">Total Invoiced (EUR)</span>
              <span className="text-slate-900 font-black">{formattedAmount}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            {isFailed && (
              <>
                <button
                  onClick={() => router.push('/client/payment/card')}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white font-bold text-sm shadow-md shadow-red-600/20 transition-all"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Retry Card Payment</span>
                </button>
                <button
                  onClick={() => router.push('/client/payment/select')}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-sm transition-colors"
                >
                  <span>Select Another Method</span>
                </button>
              </>
            )}

            {isPending && (
              <button
                onClick={() => router.push('/client/dashboard')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white font-bold text-sm shadow-md transition-all"
              >
                <span>Return to Client Dashboard</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {isCompleted && (
              <>
                <button
                  onClick={() => window.print()}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm shadow-sm transition-all"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Receipt</span>
                </button>
                <button
                  onClick={() => router.push('/client/dashboard')}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-md transition-all"
                >
                  <span>Return to Dashboard</span>
                </button>
              </>
            )}
          </div>

          {/* Consular Support Helpdesk Notice */}
          <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-400 space-y-1">
            <p className="flex items-center justify-center gap-1.5 text-slate-500 font-medium">
              <HelpCircle className="w-3.5 h-3.5 text-sky-600" />
              <span>Questions regarding this payment transaction?</span>
            </p>
            <p>
              Contact our finance desk at{' '}
              <a href={`mailto:${branding.support_email}`} className="text-sky-600 hover:underline">
                {branding.support_email}
              </a>{' '}
              or phone {branding.support_phone}. Quote Ref: <strong className="font-mono text-slate-700">{payment.reference_number}</strong>.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function PaymentResultPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-sky-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <PaymentResultContent />
    </Suspense>
  );
}
