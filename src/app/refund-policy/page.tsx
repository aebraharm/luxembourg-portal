import React from 'react';
import { getBranding, getLegalConfig } from '@/lib/settings';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export const dynamic = 'force-dynamic';

export default function RefundPolicyPage() {
  const branding = getBranding();
  const legal = getLegalConfig();

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col">
      <Navbar
        agencyName={branding.agency_name}
        tagline={branding.tagline}
        logoUrl={branding.logo_url}
      />
      <main className="flex-1 max-w-4xl mx-auto px-4 py-16 w-full">
        <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Payment &amp; Refund Policy</h1>
        <p className="text-sm text-slate-500 mb-8">Statutory Consular Tariffs and Non-Refundable Fee Guidance</p>
        <div className="prose prose-slate max-w-none bg-slate-50 p-8 rounded-2xl border border-slate-200 text-sm whitespace-pre-wrap leading-relaxed font-sans mb-8">
          {legal.payment_and_refund_policy}
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-4">Consular Fee Tariff Schedule</h2>
        <div className="prose prose-slate max-w-none bg-slate-50 p-8 rounded-2xl border border-slate-200 text-sm whitespace-pre-wrap leading-relaxed font-sans">
          {legal.fee_disclosure}
        </div>
      </main>
      <Footer branding={branding} />
    </div>
  );
}
