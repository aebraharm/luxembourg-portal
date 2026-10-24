'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BrandLogo } from '@/components/BrandLogo';
import { LoadingScreen } from '@/components/LoadingScreen';
import {
  Lock,
  Mail,
  FileCheck2,
  AlertCircle,
  ShieldCheck,
  ArrowRight,
  HelpCircle,
  KeyRound,
  Sparkles,
} from 'lucide-react';

export default function ClientLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [showLoadingScreen, setShowLoadingScreen] = useState(false);
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
    default_title: 'Verifying Immigration Credentials',
    default_description: 'Loading confidential case record and assigned fee schedule...',
    transition_duration_ms: 1400,
  });

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.branding) setBranding(data.branding);
        if (data.loading) setLoadingConfig(data.loading);
      })
      .catch((err) => console.error('Failed to load settings:', err));
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !referenceNumber.trim()) {
      setError('Both email address and payment reference number are required.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/client/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, referenceNumber }),
      });

      const data = await res.json();

      if (!res.ok) {
        setLoading(false);
        setError(data.error || 'Authentication failed. Please verify your reference number.');
        return;
      }

      // Successful login -> trigger dedicated multi-step loading screen
      setShowLoadingScreen(true);
    } catch (err: any) {
      setLoading(false);
      setError(err.message || 'Unable to connect to immigration portal server.');
    }
  };

  const fillQuickDemo = (demoEmail: string, demoRef: string) => {
    setEmail(demoEmail);
    setReferenceNumber(demoRef);
    setError(null);
  };

  if (showLoadingScreen) {
    return (
      <LoadingScreen
        title="Accessing Confidential Case File"
        description={`Establishing 256-bit secure session for Reference: ${referenceNumber.toUpperCase()}`}
        agencyName={branding.agency_name}
        tagline={branding.tagline}
        logoUrl={branding.logo_url}
        currentStep={1}
        totalSteps={4}
        stepName="Client Authentication & Verification"
        minDurationMs={loadingConfig.transition_duration_ms || 1400}
        onComplete={() => {
          router.push('/client/dashboard');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8 selection:bg-sky-100 selection:text-sky-900">
      <div className="max-w-md w-full mx-auto space-y-8">
        {/* Brand header */}
        <div className="flex flex-col items-center text-center">
          <BrandLogo
            logoUrl={branding.logo_url}
            agencyName={branding.agency_name}
            tagline={branding.tagline}
            size="lg"
            href="/"
          />
          <div className="mt-6 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-100 text-sky-800 text-xs font-semibold">
            <Lock className="w-3.5 h-3.5 text-sky-600" />
            <span>Encrypted Client Gateway</span>
          </div>
          <h2 className="mt-3 text-2xl font-extrabold text-slate-900 tracking-tight">
            Authenticate Case Reference
          </h2>
          <p className="mt-1.5 text-xs text-slate-500 max-w-sm">
            Enter the registered email and manually assigned reference number provided by your case manager.
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white py-8 px-6 sm:px-8 rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="leading-relaxed font-medium">{error}</div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Field 1: Email */}
            <div>
              <label htmlFor="email" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Registered Applicant Email
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="applicant@example.com"
                  className="block w-full pl-10 pr-3.5 py-3 text-sm text-slate-900 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Field 2: Reference Number */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="ref" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Payment Reference Number
                </label>
                <span className="text-[11px] text-slate-400 font-medium">Manually Assigned</span>
              </div>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <FileCheck2 className="w-4 h-4" />
                </div>
                <input
                  id="ref"
                  name="referenceNumber"
                  type="text"
                  required
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="e.g. LUX-VISA-2026-8812"
                  className="block w-full pl-10 pr-3.5 py-3 text-sm text-slate-900 font-mono tracking-wider bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500 uppercase transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Primary Action Button: RED */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white font-bold text-sm shadow-md shadow-red-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Verifying Case Reference...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Access My Case File</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick Demo Pre-fills for Testing/Evaluation */}
          <div className="pt-4 border-t border-slate-100">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-sky-500" />
              <span>Quick Test Credentials (Pre-seeded Demo Cases)</span>
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => fillQuickDemo('elena.rostova@example.com', 'LUX-VISA-2026-8812')}
                className="text-left p-2.5 rounded-lg border border-slate-200 hover:border-sky-300 hover:bg-sky-50/50 transition-colors"
              >
                <div className="font-bold text-slate-800">Elena Rostova</div>
                <div className="text-[10px] text-slate-500 font-mono truncate">LUX-VISA-2026-8812</div>
                <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">€850.00 • Work Visa</div>
              </button>
              <button
                type="button"
                onClick={() => fillQuickDemo('marcus.vance@example.com', 'LUX-VISA-2026-9943')}
                className="text-left p-2.5 rounded-lg border border-slate-200 hover:border-sky-300 hover:bg-sky-50/50 transition-colors"
              >
                <div className="font-bold text-slate-800">Marcus Vance</div>
                <div className="text-[10px] text-slate-500 font-mono truncate">LUX-VISA-2026-9943</div>
                <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">€1,200.00 • Residence</div>
              </button>
            </div>
          </div>
        </div>

        {/* Security and Notice Footer */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Strict Client Verification • Rate-Limited Access</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Lost your reference number? Contact your assigned case officer or email{' '}
            <a href="mailto:payments@lux-immigration-portal.eu" className="text-sky-600 hover:underline">
              payments@lux-immigration-portal.eu
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
