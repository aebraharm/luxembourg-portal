'use client';

import React from 'react';
import Link from 'next/link';
import { BrandLogo } from './BrandLogo';
import { ShieldCheck, Lock, UserCheck, ShieldAlert } from 'lucide-react';

interface NavbarProps {
  agencyName?: string;
  tagline?: string;
  logoUrl?: string | null;
  clientSession?: { clientName: string; referenceNumber: string } | null;
}

export function Navbar({ agencyName, tagline, logoUrl, clientSession }: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      {/* Top security banner */}
      <div className="bg-slate-900 text-slate-300 text-[11px] py-1.5 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
            <span className="font-medium text-slate-200">Official Visa &amp; Immigration Payment System</span>
            <span className="hidden sm:inline text-slate-500">|</span>
            <span className="hidden sm:inline text-slate-400">256-bit Consular TLS Encryption</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-emerald-400 font-semibold text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Gateway Operational
            </span>
            <Link
              href="/admin/login"
              className="text-slate-400 hover:text-white transition-colors flex items-center gap-1 font-medium"
            >
              <Lock className="w-3 h-3 text-sky-400" />
              <span>Admin Portal</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main navigation bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        <BrandLogo
          logoUrl={logoUrl}
          agencyName={agencyName}
          tagline={tagline}
          size="md"
          href="/"
        />

        {/* Center / Right Nav Items */}
        <nav className="flex items-center gap-3 sm:gap-6">
          <Link
            href="/#guidelines"
            className="hidden md:inline-flex text-sm font-semibold text-slate-700 hover:text-sky-700 transition-colors"
          >
            Payment Guidelines
          </Link>
          <Link
            href="/#methods"
            className="hidden sm:inline-flex text-sm font-semibold text-slate-700 hover:text-sky-700 transition-colors"
          >
            Payment Methods
          </Link>
          <Link
            href="/#faq"
            className="hidden lg:inline-flex text-sm font-semibold text-slate-700 hover:text-sky-700 transition-colors"
          >
            FAQs
          </Link>
          <Link
            href="/terms"
            className="hidden lg:inline-flex text-sm font-semibold text-slate-700 hover:text-sky-700 transition-colors"
          >
            Legal Notices
          </Link>

          {/* Action button: RED as required for primary clickable button */}
          {clientSession ? (
            <div className="flex items-center gap-2">
              <Link
                href="/client/dashboard"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-sm transition-all active:scale-95"
              >
                <UserCheck className="w-4 h-4" />
                <span>My Dashboard</span>
              </Link>
            </div>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-sm transition-all active:scale-95 hover:shadow-red-500/20"
            >
              <Lock className="w-4 h-4" />
              <span>Access Payment Portal</span>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
