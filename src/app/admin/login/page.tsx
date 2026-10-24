'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BrandLogo } from '@/components/BrandLogo';
import { Lock, Mail, KeyRound, AlertCircle, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [branding, setBranding] = useState<{
    agency_name: string;
    tagline: string;
    logo_url: string | null;
  }>({
    agency_name: 'Luxembourg Global Visa & Immigration Services',
    tagline: 'Consular Administration',
    logo_url: null,
  });

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.branding) setBranding(data.branding);
      })
      .catch((err) => console.error(err));
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Both email and password are required.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setLoading(false);
        setError(data.error || 'Authentication failed. Please verify credentials.');
        return;
      }

      router.push('/admin');
    } catch (err: any) {
      setLoading(false);
      setError(err.message || 'Unable to connect to administrative server.');
    }
  };

  const fillDefaultCredentials = () => {
    setEmail('portal@gmail.com');
    setPassword('12345678');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8 text-white selection:bg-sky-500 selection:text-white">
      <div className="max-w-md w-full mx-auto space-y-8">
        {/* Brand header */}
        <div className="flex flex-col items-center text-center">
          <div className="bg-white/10 p-3 rounded-2xl border border-slate-800 backdrop-blur-xs">
            <BrandLogo
              logoUrl={branding.logo_url}
              agencyName={branding.agency_name}
              tagline="Consular Administrative Portal"
              size="lg"
              href="/"
            />
          </div>

          <div className="mt-6 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-950 border border-sky-800 text-sky-400 text-xs font-semibold">
            <Lock className="w-3.5 h-3.5" />
            <span>Authorized Personnel Only</span>
          </div>

          <h2 className="mt-3 text-2xl font-extrabold text-white tracking-tight">
            Consular Admin Console
          </h2>
          <p className="mt-1 text-xs text-slate-400 max-w-sm">
            Sign in to manage client records, assign reference numbers, reconcile payments, and configure gateway settings.
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-850 bg-slate-800/80 border border-slate-700/80 p-6 sm:p-8 rounded-2xl shadow-2xl space-y-6 backdrop-blur-md">
          {error && (
            <div className="p-4 rounded-xl bg-red-950/70 border border-red-800 text-red-200 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="leading-relaxed font-medium">{error}</div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Administrator Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="portal@gmail.com"
                  className="w-full pl-10 pr-3.5 py-3 text-sm bg-slate-900/80 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3.5 py-3 text-sm bg-slate-900/80 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white font-bold text-sm shadow-lg shadow-red-600/30 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Verifying Administrator Token...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Access Admin Console</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Initial Credentials Shortcut */}
          <div className="pt-4 border-t border-slate-700/80">
            <button
              type="button"
              onClick={fillDefaultCredentials}
              className="w-full p-2.5 rounded-xl bg-slate-900/70 border border-slate-700 hover:border-sky-500 transition-colors text-left flex items-center justify-between group"
            >
              <div className="text-xs">
                <span className="text-[10px] text-sky-400 font-bold uppercase tracking-wider block flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-sky-400" />
                  Initial Setup Credentials
                </span>
                <span className="text-slate-300 font-mono text-[11px]">portal@gmail.com / 12345678</span>
              </div>
              <span className="text-[11px] font-semibold text-sky-400 group-hover:underline">
                Quick Fill
              </span>
            </button>
          </div>
        </div>

        <div className="text-center text-xs text-slate-500">
          <span>Protected by bcrypt salted hashing &amp; TLS 1.3 protocol.</span>
        </div>
      </div>
    </div>
  );
}
