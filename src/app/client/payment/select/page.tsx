'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BrandLogo } from '@/components/BrandLogo';
import { LoadingScreen } from '@/components/LoadingScreen';
import {
  CreditCard,
  Coins,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Lock,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  FileText,
} from 'lucide-react';
import { PaymentMethodSettings, InvoiceRecord } from '@/lib/types';

interface ClientMe {
  id: number;
  fullName: string;
  referenceNumber: string;
  caseCategory: string;
  amountCents: number;
  paymentStatus: string;
  region?: string | null;
}

function PaymentSelectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const invoiceId = searchParams?.get('invoiceId');

  const [client, setClient] = useState<ClientMe | null>(null);
  const [methods, setMethods] = useState<PaymentMethodSettings | null>(null);
  const [invoice, setInvoice] = useState<InvoiceRecord | null>(null);
  const [loading, setLoading] = useState(true);

  // Transition state
  const [targetRoute, setTargetRoute] = useState<string | null>(null);
  const [targetTitle, setTargetTitle] = useState('Connecting to Payment Gateway');
  const [targetDesc, setTargetDesc] = useState('Securing transmission line...');

  const [branding, setBranding] = useState<{
    agency_name: string;
    tagline: string;
    logo_url: string | null;
  }>({
    agency_name: 'Luxembourg Global Visa & Immigration Services',
    tagline: 'Consular Payment & Relocation Gateway',
    logo_url: null,
  });

  const [loadingConfig, setLoadingConfig] = useState({
    transition_duration_ms: 1200,
  });

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/client/me'),
      fetch('/api/settings'),
      invoiceId ? fetch(`/api/invoices/${invoiceId}`) : Promise.resolve(null),
    ])
      .then(async ([meRes, settingsRes, invRes]) => {
        if (!meRes.ok) {
          router.push('/login');
          return;
        }
        const meData = await meRes.json();
        if (!meData.authenticated || !meData.client) {
          router.push('/login');
          return;
        }
        setClient(meData.client);

        const settingsData = await settingsRes.json();
        if (settingsData.branding) setBranding(settingsData.branding);
        if (settingsData.loading) setLoadingConfig(settingsData.loading);
        if (settingsData.paymentMethods) setMethods(settingsData.paymentMethods);

        if (invRes && invRes.ok) {
          const invData = await invRes.json();
          if (invData.invoice) setInvoice(invData.invoice);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [router, invoiceId]);

  const selectMethod = (path: string, title: string, desc: string) => {
    setTargetTitle(title);
    setTargetDesc(desc);
    const finalPath = invoiceId ? `${path}?invoiceId=${invoiceId}` : path;
    setTargetRoute(finalPath);
  };

  if (loading) {
    return (
      <LoadingScreen
        title="Loading Payment Channels"
        description="Retrieving active payment processors for your jurisdiction..."
        agencyName={branding.agency_name}
        tagline={branding.tagline}
        logoUrl={branding.logo_url}
        region={client?.region}
        currentStep={2}
        totalSteps={4}
        minDurationMs={800}
      />
    );
  }

  if (targetRoute) {
    return (
      <LoadingScreen
        title={targetTitle}
        description={targetDesc}
        agencyName={branding.agency_name}
        tagline={branding.tagline}
        logoUrl={branding.logo_url}
        region={client?.region}
        currentStep={3}
        totalSteps={4}
        stepName="Gateway Initialization"
        minDurationMs={loadingConfig.transition_duration_ms || 1200}
        onComplete={() => {
          router.push(targetRoute);
        }}
      />
    );
  }

  if (!client || !methods) return null;

  const displayAmountCents = invoice ? invoice.amount_cents : client.amountCents;
  const formattedAmount = (displayAmountCents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'EUR',
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-sky-100 selection:text-sky-900">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          <BrandLogo
            logoUrl={branding.logo_url}
            agencyName={branding.agency_name}
            tagline="Payment Gateway Selection"
            size="md"
            href="/client/dashboard"
          />
          <button
            onClick={() => router.push('/client/dashboard')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Dashboard</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-10 w-full space-y-8">
        {/* Progress Step Indicator */}
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-4 text-xs font-semibold text-slate-500">
          <div className="flex items-center gap-2 text-sky-800 font-bold">
            <span className="w-6 h-6 rounded-full bg-sky-600 text-white flex items-center justify-center text-xs">
              3
            </span>
            <span>Step 3: Select Payment Method</span>
          </div>
          <span className="text-slate-400">Step 3 of 4</span>
        </div>

        {/* Case & Fee Summary Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-sky-700 uppercase tracking-wider">
                Case Reference
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs font-mono font-bold text-slate-800">
                {client.referenceNumber}
              </span>
              {invoice && (
                <>
                  <span className="text-slate-300">•</span>
                  <span className="text-xs font-mono font-bold text-slate-700 flex items-center gap-1">
                    <Receipt className="w-3.5 h-3.5 text-sky-600" />
                    {invoice.invoice_number}
                  </span>
                </>
              )}
            </div>
            <h2 className="text-xl font-extrabold text-slate-900">{client.fullName}</h2>
            <p className="text-xs text-slate-500">
              {invoice ? invoice.reason : client.caseCategory}
            </p>
          </div>

          <div className="sm:text-right bg-slate-50 p-4 rounded-xl border border-slate-200/80 sm:bg-transparent sm:border-0 sm:p-0">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">
              {invoice ? `Invoice ${invoice.invoice_number} Amount` : 'Assigned Consular Tariff'}
            </span>
            <div className="text-3xl font-black text-slate-900 tracking-tight mt-0.5">
              {formattedAmount}
            </div>
            <span className="text-[11px] text-emerald-600 font-semibold flex sm:justify-end items-center gap-1 mt-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>EUR (€) Strictly</span>
            </span>
          </div>
        </div>

        {/* Payment Methods Grid */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Available Payment Methods
          </h3>

          <div className="grid grid-cols-1 gap-5">
            {/* METHOD 1: CARD PAYMENT */}
            {methods.card_enabled && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-sm hover:border-sky-300 hover:shadow-md transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-6 group">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-700 flex-shrink-0 group-hover:scale-105 transition-transform">
                    <CreditCard className="w-7 h-7" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5">
                      <h4 className="text-lg font-bold text-slate-900">Credit or Debit Card</h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200">
                        {methods.card_mode === 'demo' ? 'Demo Simulation Mode' : 'Live Gateway'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed max-w-xl">
                      Visa, Mastercard, Maestro. Encrypted 3D-Secure 2.0 authentication. Instant transaction log generation in EUR.
                    </p>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1 font-medium">
                      <span>• Instant response</span>
                      <span>• 256-bit TLS handshake</span>
                      <span>• No cardholder currency conversion fee</span>
                    </div>
                  </div>
                </div>

                <div className="w-full md:w-auto flex-shrink-0">
                  <button
                    onClick={() =>
                      selectMethod(
                        '/client/payment/card',
                        'Initializing Secure Card Gateway',
                        'Establishing secure TLS 1.3 socket with acquiring processor...'
                      )
                    }
                    className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white font-bold text-sm shadow-md shadow-red-600/20 transition-all"
                  >
                    <span>Pay with Card</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* METHOD 2: CRYPTOCURRENCY REMITTANCE */}
            {methods.crypto_enabled && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-sm hover:border-sky-300 hover:shadow-md transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-6 group">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-700 flex-shrink-0 group-hover:scale-105 transition-transform">
                    <Coins className="w-7 h-7" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5">
                      <h4 className="text-lg font-bold text-slate-900">
                        Cryptocurrency Remittance (USDT / BTC / ETH)
                      </h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                        Manual Verification
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed max-w-xl">
                      Direct depository transfer to official immigration custody escrow. Requires submitter to record blockchain transaction hash (TxID).
                    </p>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1 font-medium">
                      <span>• Multi-sig custody</span>
                      <span>• Audited on-chain ledger</span>
                      <span>• Verified by finance officers</span>
                    </div>
                  </div>
                </div>

                <div className="w-full md:w-auto flex-shrink-0">
                  <button
                    onClick={() =>
                      selectMethod(
                        '/client/payment/crypto',
                        'Loading Depository Escrow Wallets',
                        'Retrieving authenticated custody public keys and conversion rates...'
                      )
                    }
                    className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white font-bold text-sm shadow-md transition-all"
                  >
                    <span>Pay with Crypto</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* METHOD 3: PAYPAL DISBURSEMENT */}
            {methods.paypal_enabled && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-sm hover:border-sky-300 hover:shadow-md transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-6 group">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-800 flex-shrink-0 group-hover:scale-105 transition-transform">
                    <span className="text-xl font-black italic tracking-tighter text-sky-700">P</span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5">
                      <h4 className="text-lg font-bold text-slate-900">PayPal / Digital Wallet</h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        Regional Restrictions Apply
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed max-w-xl">
                      {methods.paypal_notice_message}
                    </p>
                  </div>
                </div>

                <div className="w-full md:w-auto flex-shrink-0">
                  <button
                    onClick={() =>
                      selectMethod(
                        '/client/payment/paypal',
                        'Querying Regional PayPal Policy',
                        'Verifying applicant regional jurisdiction compliance...'
                      )
                    }
                    className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border-2 border-slate-300 hover:border-slate-400 text-slate-700 font-bold text-sm transition-all"
                  >
                    <span>Check PayPal Availability</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Security Assurance Footer */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 text-xs text-slate-500 space-y-2">
          <div className="flex items-center gap-2 text-slate-900 font-bold">
            <Lock className="w-4 h-4 text-emerald-600" />
            <span>Grand Duchy of Luxembourg Consular Payment Compliance</span>
          </div>
          <p className="leading-relaxed">
            All remittances are processed strictly in EUR (€). Your payment reference number is irrevocably bound to your immigration case docket. Do not close your browser during gateway redirects.
          </p>
        </div>
      </main>
    </div>
  );
}

export default function PaymentSelectPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="text-xs font-semibold text-slate-500">Loading payment channels...</div>
        </div>
      }
    >
      <PaymentSelectContent />
    </Suspense>
  );
}
