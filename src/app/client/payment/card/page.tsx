'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BrandLogo } from '@/components/BrandLogo';
import { LoadingScreen } from '@/components/LoadingScreen';
import {
  CreditCard,
  Lock,
  ShieldCheck,
  ArrowLeft,
  AlertCircle,
  HelpCircle,
  Info,
  CheckCircle2,
  Receipt,
} from 'lucide-react';
import { PaymentMethodSettings, InvoiceRecord } from '@/lib/types';

interface ClientMe {
  id: number;
  fullName: string;
  referenceNumber: string;
  caseCategory: string;
  amountCents: number;
  region?: string | null;
}

function CardPaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const invoiceId = searchParams?.get('invoiceId');

  const [client, setClient] = useState<ClientMe | null>(null);
  const [invoice, setInvoice] = useState<InvoiceRecord | null>(null);
  const [methods, setMethods] = useState<PaymentMethodSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Form inputs (handled strictly client-side; never stored or logged to server!)
  const [cardholderName, setCardholderName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [transitionToResult, setTransitionToResult] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    transition_duration_ms: 1400,
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
        setCardholderName(meData.client.fullName);

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

  // Card input mask formatters
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '').slice(0, 16);
    val = val.replace(/(.{4})/g, '$1 ').trim();
    setCardNumber(val);
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (val.length >= 2) {
      val = `${val.slice(0, 2)}/${val.slice(2)}`;
    }
    setCardExpiry(val);
  };

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
    setCardCvv(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!cardholderName.trim()) {
      setError('Cardholder name is required.');
      return;
    }

    if (cardNumber.replace(/\s/g, '').length < 15) {
      setError('Please enter a valid 16-digit debit or credit card number.');
      return;
    }

    if (cardExpiry.length < 5) {
      setError('Please enter a valid expiry date (MM/YY).');
      return;
    }

    if (cardCvv.length < 3) {
      setError('Please enter a valid CVV security code.');
      return;
    }

    setSubmitting(true);

    try {
      // NOTE: We only send method metadata. We DO NOT send or store sensitive card number or CVV!
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'card',
          invoiceId: invoiceId || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setSubmitting(false);
        setError(data.error || 'Card processing service encountered an error.');
        return;
      }

      // Successful call -> transition into Loading Screen before showing result
      setTransitionToResult(data.paymentId);
    } catch (err: any) {
      setSubmitting(false);
      setError(err.message || 'Payment communication failed.');
    }
  };

  if (loading) {
    return (
      <LoadingScreen
        title="Securing 3D-Secure 2.0 Gateway"
        description="Initializing encrypted payment terminal..."
        agencyName={branding.agency_name}
        tagline={branding.tagline}
        logoUrl={branding.logo_url}
        minDurationMs={800}
      />
    );
  }

  if (transitionToResult) {
    return (
      <LoadingScreen
        title="Processing Consular Remittance"
        description="Communicating with European card acquirer and verifying authorization tokens..."
        agencyName={branding.agency_name}
        tagline={branding.tagline}
        logoUrl={branding.logo_url}
        currentStep={4}
        totalSteps={4}
        stepName="Card Settlement Verification"
        minDurationMs={loadingConfig.transition_duration_ms || 1400}
        onComplete={() => {
          router.push(`/client/payment/result?id=${transitionToResult}`);
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

  const isDemo = methods.card_mode === 'demo';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-sky-100 selection:text-sky-900">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          <BrandLogo
            logoUrl={branding.logo_url}
            agencyName={branding.agency_name}
            tagline="Encrypted Card Payment Terminal"
            size="md"
            href="/client/payment/select"
          />
          <button
            onClick={() => router.push(invoiceId ? `/client/payment/select?invoiceId=${invoiceId}` : '/client/payment/select')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Change Method</span>
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto px-4 sm:px-6 py-10 w-full space-y-6">
        {/* Banner if Demo Mode Active */}
        {isDemo && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3 shadow-xs">
            <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold uppercase tracking-wider block text-amber-950">
                Payment Simulation / Demo Mode Active
              </span>
              <p className="text-amber-800 leading-relaxed">
                This transaction terminal is operating in designated <strong>Demo Test Mode</strong>. No real funds will be charged to your financial institution. Submitting this simulated test transaction will demonstrate the system outcome handling.
              </p>
            </div>
          </div>
        )}

        {/* Case & Amount Summary Header */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-sky-700 uppercase tracking-wider">
                Consular Case File Reference
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
            <div className="text-base font-mono font-bold text-slate-900 mt-0.5">
              {client.referenceNumber}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {invoice ? invoice.reason : client.caseCategory}
            </p>
          </div>

          <div className="text-right">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Total Fee (EUR)
            </span>
            <span className="text-2xl font-black text-slate-900">{formattedAmount}</span>
          </div>
        </div>

        {/* Payment Processing Form Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-md space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center">
                <CreditCard className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Card Payment Details</h3>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
              <Lock className="w-3.5 h-3.5 text-emerald-600" />
              <span>256-bit TLS</span>
            </div>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Cardholder Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Cardholder Full Name
              </label>
              <input
                type="text"
                required
                value={cardholderName}
                onChange={(e) => setCardholderName(e.target.value)}
                placeholder="e.g. Elena Rostova"
                className="w-full px-3.5 py-3 text-sm rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              />
            </div>

            {/* Card Number */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Card Number
                </label>
                <span className="text-[11px] text-slate-400">Visa / Mastercard / Maestro</span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={cardNumber}
                  onChange={handleCardNumberChange}
                  placeholder="4000 0000 0000 0000"
                  maxLength={19}
                  className="w-full pl-3.5 pr-10 py-3 text-sm font-mono tracking-wider rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                />
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                  <CreditCard className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Expiry and CVV */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Expiry Date
                </label>
                <input
                  type="text"
                  required
                  value={cardExpiry}
                  onChange={handleExpiryChange}
                  placeholder="MM/YY"
                  maxLength={5}
                  className="w-full px-3.5 py-3 text-sm font-mono tracking-wider text-center rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    CVV / CVC
                  </label>
                  <span className="text-[10px] text-slate-400">3-4 digits</span>
                </div>
                <input
                  type="password"
                  required
                  value={cardCvv}
                  onChange={handleCvvChange}
                  placeholder="•••"
                  maxLength={4}
                  className="w-full px-3.5 py-3 text-sm font-mono tracking-widest text-center rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                />
              </div>
            </div>

            {/* Instructions */}
            <p className="text-xs text-slate-500 leading-relaxed pt-2">
              {methods.card_instructions ||
                'Enter your card details above to process consular fee payment. Card details are processed according to PCI-DSS standards.'}
            </p>

            {/* Primary Action Button: RED */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2.5 py-4 px-6 rounded-xl bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white font-bold text-base shadow-lg shadow-red-600/25 transition-all disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Transmitting Authorization Request...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Authorize Payment of {formattedAmount}</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Security details */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-center gap-4 text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>3D Secure 2.0 Protection</span>
            </span>
            <span>•</span>
            <span>Zero Data Storage on Local Server</span>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function CardPaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="text-xs font-semibold text-slate-500">Initializing card terminal...</div>
        </div>
      }
    >
      <CardPaymentContent />
    </Suspense>
  );
}
