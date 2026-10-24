import React from 'react';
import { getBranding, getLegalConfig } from '@/lib/settings';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export const dynamic = 'force-dynamic';

export default async function TermsPage() {
  const branding = await getBranding();
  const legal = await getLegalConfig();

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col">
      <Navbar
        agencyName={branding.agency_name}
        tagline={branding.tagline}
        logoUrl={branding.logo_url}
      />
      <main className="flex-1 max-w-4xl mx-auto px-4 py-16 w-full">
        <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Terms of Service &amp; Representation</h1>
        <p className="text-sm text-slate-500 mb-8">Official Consular Representation and Financial Remittance Terms</p>
        <div className="prose prose-slate max-w-none bg-slate-50 p-8 rounded-2xl border border-slate-200 text-sm whitespace-pre-wrap leading-relaxed font-sans">
          {legal.terms_of_service}
        </div>
      </main>
      <Footer branding={branding} />
    </div>
  );
}
