'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BrandLogo } from '@/components/BrandLogo';
import { LoadingScreen } from '@/components/LoadingScreen';
import {
  ArrowLeft,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  Coins,
  Globe,
  Info,
} from 'lucide-react';
import { PaymentMethodSettings } from '@/lib/types';

interface ClientMe {
  id: number;
  fullName: string;
  referenceNumber: string;
  caseCategory: string;
  amountCents: number;
}

function PayPalPaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const invoiceId = searchParams?.get('invoiceId');

  const [client, setClient] = useState<ClientMe | null>(null);
  const [methods, setMethods] = useState<PaymentMethodSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const [branding, setBranding] = useState<{
    agency_name: string;
    tagline: string;
    logo_url: string | null;
  }>({
    agency_name: 'Luxembourg Global Visa & Immigration Services',
    tagline: 'Consular Payment & Relocation Gateway',
    logo_url: null,
  });

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/client/me'),
      fetch('/api/settings'),
    ])
      .then(async ([meRes, settingsRes]) => {
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
        if (settingsData.paymentMethods) setMethods(settingsData.paymentMethods);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <LoadingScreen
        title="Checking PayPal Gateway Availability"
        description="Verifying regional merchant settlement options..."
        agencyName={branding.agency_name}
        tagline={branding.tagline}
        logoUrl={branding.logo_url}
        minDurationMs={800}
      />
    );
  }

  if (!client || !methods) return null;

  const formattedAmount = (client.amountCents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'EUR',
  });

  const message =
    methods.paypal_unavailability_message ||
    'PayPal payments are currently unavailable in your region. Please select another available payment method.';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-sky-100 selection:text-sky-900">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          <BrandLogo
            logoUrl={branding.logo_url}
            agencyName={branding.agency_name}
            tagline="PayPal Consular Settlement"
            size="md"
            href="/client/payment/select"
          />
          <button
            onClick={() => router.push('/client/payment/select')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Select Another Method</span>
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto px-4 sm:px-6 py-12 w-full space-y-6">
        {/* Case & Amount Summary */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-sky-700 uppercase tracking-wider">
              Consular Case File
            </span>
            <div className="text-base font-mono font-bold text-slate-900 mt-0.5">
              {client.referenceNumber}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{client.caseCategory}</p>
          </div>

          <div className="text-right">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Fee Invoiced
            </span>
            <span className="text-2xl font-black text-slate-900">{formattedAmount}</span>
          </div>
        </div>

        {/* Dedicated PayPal Regional Notice Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-md text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mx-auto">
            <AlertTriangle className="w-8 h-8" />
          </div>

          <div className="space-y-3 max-w-lg mx-auto">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider bg-amber-100 px-3 py-1 rounded-full border border-amber-200">
              Regional Channel Availability Notice
            </span>

            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              PayPal Settlement Notice
            </h2>

            {/* The exact required message:
                "PayPal payments are currently unavailable in your region. Please select another available payment method." */}
            <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-950 font-medium text-sm leading-relaxed text-left">
              {message}
            </div>

            <p className="text-xs text-slate-500 leading-relaxed text-left pt-2">
              European consular fee clearing mandates require direct acquiring gateways or verified ledger settlements. In accordance with current regional routing policies, PayPal processing is not active for this case category.
            </p>
          </div>

          {/* Primary Action Button: Return to payment-method selection page */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => router.push(invoiceId ? `/client/payment/select?invoiceId=${invoiceId}` : '/client/payment/select')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white font-bold text-sm shadow-md shadow-red-600/20 transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Select Another Payment Method</span>
            </button>
          </div>

          {/* Alternative methods quick link */}
          <div className="pt-6 border-t border-slate-100 grid grid-cols-2 gap-3 text-xs">
            <button
              onClick={() => router.push('/client/payment/card')}
              className="p-3 rounded-xl border border-slate-200 hover:border-sky-300 hover:bg-sky-50/50 transition-colors flex items-center justify-center gap-2 font-semibold text-slate-700"
            >
              <CreditCard className="w-4 h-4 text-sky-600" />
              <span>Pay by Card</span>
            </button>
            <button
              onClick={() => router.push('/client/payment/crypto')}
              className="p-3 rounded-xl border border-slate-200 hover:border-sky-300 hover:bg-sky-50/50 transition-colors flex items-center justify-center gap-2 font-semibold text-slate-700"
            >
              <Coins className="w-4 h-4 text-emerald-600" />
              <span>Pay by Crypto</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function PayPalPaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="text-xs font-semibold text-slate-500">Loading payment policy...</div>
        </div>
      }
    >
      <PayPalPaymentContent />
    </Suspense>
  );
}
