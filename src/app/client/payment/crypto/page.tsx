'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BrandLogo } from '@/components/BrandLogo';
import { LoadingScreen } from '@/components/LoadingScreen';
import {
  Coins,
  ArrowLeft,
  Copy,
  Check,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Clock,
  HelpCircle,
  ExternalLink,
  QrCode,
} from 'lucide-react';
import { PaymentMethodSettings } from '@/lib/types';

interface ClientMe {
  id: number;
  fullName: string;
  referenceNumber: string;
  caseCategory: string;
  amountCents: number;
}

export default function CryptoPaymentPage() {
  const router = useRouter();

  const [client, setClient] = useState<ClientMe | null>(null);
  const [methods, setMethods] = useState<PaymentMethodSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Selected crypto coin
  const [selectedCoinIndex, setSelectedCoinIndex] = useState(0);
  const [txHash, setTxHash] = useState('');
  const [copied, setCopied] = useState(false);
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
        if (settingsData.loading) setLoadingConfig(settingsData.loading);
        if (settingsData.paymentMethods) setMethods(settingsData.paymentMethods);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [router]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmitTx = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!txHash.trim()) {
      setError('Please paste the blockchain transaction hash (TxID) to submit for consular verification.');
      return;
    }

    if (txHash.trim().length < 10) {
      setError('Please enter a valid blockchain transaction hash.');
      return;
    }

    const currentCoin = methods?.crypto_currencies[selectedCoinIndex];
    if (!currentCoin || !currentCoin.wallet_address) {
      setError('Selected cryptocurrency does not have an active depository address configured.');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'crypto',
          cryptoCurrency: currentCoin.symbol,
          cryptoNetwork: currentCoin.network,
          cryptoTxHash: txHash.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setSubmitting(false);
        setError(data.error || 'Failed to submit transaction for verification.');
        return;
      }

      setTransitionToResult(data.paymentId);
    } catch (err: any) {
      setSubmitting(false);
      setError(err.message || 'Network error submitting transaction.');
    }
  };

  if (loading) {
    return (
      <LoadingScreen
        title="Loading Consular Depository Wallets"
        description="Querying authorized custody addresses and blockchain settlement parameters..."
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
        title="Registering Blockchain Transaction"
        description="Logging transaction hash to consular ledger for on-chain audit and staff review..."
        agencyName={branding.agency_name}
        tagline={branding.tagline}
        logoUrl={branding.logo_url}
        currentStep={4}
        totalSteps={4}
        stepName="Consular Review Queue"
        minDurationMs={loadingConfig.transition_duration_ms || 1400}
        onComplete={() => {
          router.push(`/client/payment/result?id=${transitionToResult}`);
        }}
      />
    );
  }

  if (!client || !methods) return null;

  const formattedAmount = (client.amountCents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'EUR',
  });

  const availableCoins = (methods.crypto_currencies || []).filter((c) => c.enabled);
  const activeCoin = availableCoins[selectedCoinIndex] || availableCoins[0];
  const isAddressConfigured = Boolean(activeCoin?.wallet_address && activeCoin.wallet_address.trim().length > 0);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-sky-100 selection:text-sky-900">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          <BrandLogo
            logoUrl={branding.logo_url}
            agencyName={branding.agency_name}
            tagline="Cryptocurrency Remittance Depository"
            size="md"
            href="/client/payment/select"
          />
          <button
            onClick={() => router.push('/client/payment/select')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Change Method</span>
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-10 w-full space-y-6">
        {/* Case & Amount Summary Header */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-sky-700 uppercase tracking-wider">
              Consular Case File Reference
            </span>
            <div className="text-base font-mono font-bold text-slate-900 mt-0.5">
              {client.referenceNumber}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{client.caseCategory}</p>
          </div>

          <div className="text-right">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Required Remittance (EUR)
            </span>
            <span className="text-2xl font-black text-slate-900">{formattedAmount}</span>
          </div>
        </div>

        {/* Currency Selector Tabs */}
        {availableCoins.length > 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Select Settlement Asset &amp; Network:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {availableCoins.map((coin, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedCoinIndex(idx)}
                  className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                    selectedCoinIndex === idx
                      ? 'border-sky-500 bg-sky-50/60 ring-2 ring-sky-200'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div>
                    <span className="font-extrabold text-sm text-slate-900">{coin.symbol}</span>
                    <span className="block text-[11px] text-slate-500 font-medium">{coin.name}</span>
                    <span className="block text-[10px] text-sky-700 font-semibold">{coin.network}</span>
                  </div>
                  {selectedCoinIndex === idx && (
                    <span className="w-2 h-2 rounded-full bg-sky-600" />
                  )}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>No cryptocurrency assets are currently enabled in the administrative settings.</span>
          </div>
        )}

        {/* Depository Wallet Details Card */}
        {activeCoin && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-md space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {activeCoin.name} ({activeCoin.symbol})
                  </h3>
                  <span className="text-xs text-sky-700 font-semibold">
                    Network: {activeCoin.network}
                  </span>
                </div>
              </div>

              <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                {methods.crypto_required_confirmations || 12} Confirmations Required
              </span>
            </div>

            {/* Validation warning if address not configured */}
            {!isAddressConfigured ? (
              <div className="p-5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Depository Wallet Address Not Configured</span>
                </div>
                <p className="leading-relaxed text-amber-800">
                  The administrator has not configured a valid wallet address for <strong>{activeCoin.symbol} ({activeCoin.network})</strong>. Please select another cryptocurrency or contact your case liaison.
                </p>
              </div>
            ) : (
              <>
                {/* Wallet Address Display */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Official Custody Depository Address:
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 p-3.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs sm:text-sm text-slate-900 break-all select-all">
                      {activeCoin.wallet_address}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(activeCoin.wallet_address)}
                      className="inline-flex items-center gap-1.5 px-4 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors flex-shrink-0"
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-400" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Copy Address</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Important Network Match Warning */}
                <div className="p-4 rounded-xl bg-red-50/80 border border-red-200 text-xs text-red-900 leading-relaxed flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="font-bold uppercase tracking-wider text-red-950 block">
                      Strict Network Requirement:
                    </span>
                    <p>
                      Transfer funds exclusively on the <strong>{activeCoin.network}</strong> network. Sending tokens via incompatible blockchains or unsupported smart contracts will result in irrecoverable loss of consular funds.
                    </p>
                  </div>
                </div>

                {/* Instructions */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-relaxed space-y-1">
                  <span className="font-bold text-slate-800 block">Payment Procedure:</span>
                  <p>
                    {methods.crypto_instructions ||
                      'Remit the EUR fee equivalent directly to the address above. Once submitted on-chain, paste your Transaction Hash (TxID) below.'}
                  </p>
                </div>

                {/* Submission Form for Transaction Hash */}
                <form onSubmit={handleSubmitTx} className="space-y-4 pt-2 border-t border-slate-100">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Paste Blockchain Transaction Hash (TxID / TxHash)
                    </label>
                    <input
                      type="text"
                      required
                      value={txHash}
                      onChange={(e) => setTxHash(e.target.value)}
                      placeholder="e.g. 0x3f5c78a9... or 4b8d9c2..."
                      className="w-full px-3.5 py-3 text-sm font-mono rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                    />
                  </div>

                  {error && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Primary Action Button: RED */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full inline-flex items-center justify-center gap-2.5 py-4 px-6 rounded-xl bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white font-bold text-base shadow-lg shadow-red-600/25 transition-all disabled:opacity-50"
                    >
                      {submitting ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Registering Hash for Verification...</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-5 h-5" />
                          <span>Submit Transaction for Consular Verification</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-500 text-center leading-normal">
                    Important: Submitting your TxID logs the transfer in the consular finance verification queue. Payment will update to confirmed once our staff verifies on-chain receipt.
                  </p>
                </form>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
