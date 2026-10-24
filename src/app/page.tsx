import React from 'react';
import Link from 'next/link';
import {
  getBranding,
  getHomepageConfig,
  getPaymentMethodConfig,
} from '@/lib/settings';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import {
  ShieldCheck,
  CreditCard,
  Coins,
  ArrowRight,
  FileCheck2,
  Lock,
  HelpCircle,
  Clock,
  Phone,
  Mail,
  CheckCircle2,
  Building2,
  Globe,
  AlertCircle,
} from 'lucide-react';
import { cookies } from 'next/headers';
import { verifyToken, ClientSessionPayload } from '@/lib/auth';
import { queryOne } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const branding = await getBranding();
  const homepage = await getHomepageConfig();
  const methods = await getPaymentMethodConfig();

  // Check if client is already logged in
  const cookieStore = cookies();
  const clientToken = cookieStore.get('client_session')?.value;
  let clientSession: { clientName: string; referenceNumber: string } | null = null;

  if (clientToken) {
    const session = verifyToken<ClientSessionPayload>(clientToken);
    if (session) {
      const client = await queryOne<{ full_name: string }>('SELECT full_name FROM clients WHERE id = ?', [session.clientId]);
      if (client) {
        clientSession = {
          clientName: client.full_name,
          referenceNumber: session.referenceNumber,
        };
      }
    }
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col selection:bg-sky-100 selection:text-sky-900">
      <Navbar
        agencyName={branding.agency_name}
        tagline={branding.tagline}
        logoUrl={branding.logo_url}
        clientSession={clientSession}
      />

      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="relative overflow-hidden bg-gradient-to-b from-sky-50/70 via-white to-white pt-16 pb-20 border-b border-slate-100">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#0284c70a_1px,transparent_1px),linear-gradient(to_bottom,#0284c70a_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              {/* Left Column: Headlines & Action */}
              <div className="lg:col-span-7 space-y-6">
                {/* Badge */}
                {homepage.hero_badge && (
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-100/80 border border-sky-200 text-sky-800 text-xs font-semibold tracking-wide uppercase shadow-xs">
                    <ShieldCheck className="w-4 h-4 text-sky-600" />
                    <span>{homepage.hero_badge}</span>
                  </div>
                )}

                {/* Primary Headline */}
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.12]">
                  {homepage.hero_headline}
                </h1>

                {/* Supporting description */}
                <p className="text-lg sm:text-xl text-slate-600 font-normal leading-relaxed max-w-2xl">
                  {homepage.hero_description}
                </p>

                {/* Primary Call to Action Button in RED */}
                <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                  <Link
                    href={clientSession ? '/client/dashboard' : '/login'}
                    className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white font-bold text-base shadow-lg shadow-red-600/25 transition-all group"
                  >
                    <span>{homepage.hero_button_text}</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Link>

                  <a
                    href="#guidelines"
                    className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-semibold text-base border border-slate-200 shadow-xs transition-colors"
                  >
                    <FileCheck2 className="w-4 h-4 text-sky-600" />
                    <span>Case Reference Guide</span>
                  </a>
                </div>

                {/* Secondary Security Information */}
                <div className="flex items-center gap-2.5 text-xs text-slate-500 font-medium pt-2">
                  <Lock className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span>{homepage.hero_secondary_info}</span>
                </div>
              </div>

              {/* Right Column: Interactive Portal Showcase Card */}
              <div className="lg:col-span-5">
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xl shadow-sky-900/5 p-6 sm:p-8 space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-lg bg-sky-100 flex items-center justify-center text-sky-700 font-bold text-sm">
                        LUX
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">Consular Payment Gateway</h3>
                        <p className="text-xs text-slate-500">Official Visa Fee Processing</p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold text-[11px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      EUR (€) Only
                    </span>
                  </div>

                  {/* Highlights */}
                  <div className="space-y-3.5">
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-sky-600 flex-shrink-0 mt-0.5">
                        <FileCheck2 className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">Manually Assigned Reference</h4>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Every reference is issued personally by your designated immigration consultant.
                        </p>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-sky-600 flex-shrink-0 mt-0.5">
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">Multi-Channel Settlement</h4>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Support for Debit/Credit Cards, PayPal regional transfers, and verified Cryptocurrency.
                        </p>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-emerald-600 flex-shrink-0 mt-0.5">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">Encrypted Case Tracking</h4>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Status updates reconcile in real time against your official immigration file.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Quick Access Action */}
                  <div className="pt-2">
                    <Link
                      href="/login"
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm transition-colors shadow-xs"
                    >
                      <Lock className="w-4 h-4 text-sky-400" />
                      <span>Authenticate with Case Reference</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* WELCOME / ABOUT DEDICATED VISA PAYMENTS SECTION */}
        {homepage.show_welcome_section && (
          <section className="py-20 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="max-w-3xl mx-auto text-center space-y-4">
                <span className="text-xs font-bold text-sky-700 tracking-wider uppercase bg-sky-50 border border-sky-100 px-3 py-1 rounded-full">
                  Exclusively For Immigration Cases
                </span>
                <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
                  {homepage.welcome_title}
                </h2>
                <p className="text-base text-slate-600 leading-relaxed">
                  {homepage.welcome_text}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-14">
                <div className="bg-slate-50/70 p-8 rounded-2xl border border-slate-200/80 hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center mb-5">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">Consular Fee Direct Remittance</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Facilitate official consular tariffs, administrative filing stamp fees, and diplomatic courier disbursements without intermediary conversion losses.
                  </p>
                </div>

                <div className="bg-slate-50/70 p-8 rounded-2xl border border-slate-200/80 hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center mb-5">
                    <Globe className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">Schengen &amp; National Categories</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Accommodating Work Visas (EU Blue Card), Family Reunification, Student Long-Stay (Type D), and Long-Term Residence applications.
                  </p>
                </div>

                <div className="bg-slate-50/70 p-8 rounded-2xl border border-slate-200/80 hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center mb-5">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">Audit-Proof Payment Receipts</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Receive verified payment receipts formatted for direct submission to the Ministry of Foreign Affairs and consular immigration desks.
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* GUIDELINES & INSTRUCTIONS SECTION */}
        {homepage.show_instructions_section && (
          <section id="guidelines" className="py-20 bg-slate-50 border-y border-slate-200/80">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="max-w-3xl mx-auto text-center space-y-4 mb-16">
                <span className="text-xs font-bold text-sky-700 tracking-wider uppercase bg-white border border-sky-200 px-3 py-1 rounded-full">
                  Step-by-Step Procedure
                </span>
                <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
                  {homepage.instructions_title}
                </h2>
                <p className="text-base text-slate-600">
                  Follow these four steps to securely review and fulfill your assigned immigration case fees.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {homepage.instructions_steps.map((item) => (
                  <div
                    key={item.step}
                    className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs relative flex flex-col justify-between"
                  >
                    <div>
                      <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 font-extrabold text-base flex items-center justify-center border border-red-100 mb-4">
                        0{item.step}
                      </div>
                      <h3 className="text-base font-bold text-slate-900 mb-2">{item.title}</h3>
                      <p className="text-xs text-slate-600 leading-relaxed">{item.desc}</p>
                    </div>
                    <div className="mt-6 pt-4 border-t border-slate-100 text-[11px] text-sky-700 font-semibold flex items-center gap-1">
                      <span>Requirement Verified</span>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* AVAILABLE PAYMENT METHODS SECTION */}
        {homepage.show_methods_section && (
          <section id="methods" className="py-20 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="max-w-3xl mx-auto text-center space-y-4 mb-16">
                <span className="text-xs font-bold text-sky-700 tracking-wider uppercase bg-sky-50 border border-sky-100 px-3 py-1 rounded-full">
                  Supported Channels
                </span>
                <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
                  Accepted Visa Payment Methods
                </h2>
                <p className="text-base text-slate-600">
                  Our agency facilitates fee settlement strictly through three authorized channels.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Method 1: Card Payment */}
                <div className={`p-8 rounded-2xl border transition-all ${methods.card_enabled ? 'bg-white border-slate-200 shadow-md hover:border-sky-300' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-12 h-12 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
                      <CreditCard className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                      {methods.card_mode === 'demo' ? 'Demo / Simulation' : 'Live Gateway'}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Debit / Credit Card</h3>
                  <p className="text-sm text-slate-600 leading-relaxed mb-6">
                    Instant processing for Visa, Mastercard, and European debit networks via encrypted 3D-Secure 2.0 authentication.
                  </p>
                  <ul className="space-y-2 text-xs text-slate-600 mb-8 border-t border-slate-100 pt-4">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Immediate verification attempt</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Zero cardholder fee in EUR (€)</span>
                    </li>
                  </ul>
                  <Link
                    href="/login"
                    className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors"
                  >
                    <span>Proceed to Card Payment</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {/* Method 2: PayPal */}
                <div className={`p-8 rounded-2xl border transition-all ${methods.paypal_enabled ? 'bg-white border-slate-200 shadow-md hover:border-sky-300' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-12 h-12 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-extrabold text-lg">
                      PP
                    </div>
                    <span className="text-xs font-bold text-amber-600 uppercase tracking-wide">
                      Regional Notice
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">PayPal Transfer</h3>
                  <p className="text-sm text-slate-600 leading-relaxed mb-6">
                    PayPal account and linked bank balance remittance for eligible geographical jurisdictions.
                  </p>
                  <ul className="space-y-2 text-xs text-slate-600 mb-8 border-t border-slate-100 pt-4">
                    <li className="flex items-center gap-2">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                      <span>Subject to jurisdictional availability</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Configurable regional gateway</span>
                    </li>
                  </ul>
                  <Link
                    href="/login"
                    className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors"
                  >
                    <span>Check PayPal Availability</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {/* Method 3: Cryptocurrency */}
                <div className={`p-8 rounded-2xl border transition-all ${methods.crypto_enabled ? 'bg-white border-slate-200 shadow-md hover:border-sky-300' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-12 h-12 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
                      <Coins className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold text-emerald-600 uppercase tracking-wide">
                      Blockchain Verified
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Cryptocurrency Remittance</h3>
                  <p className="text-sm text-slate-600 leading-relaxed mb-6">
                    Direct on-chain remittance for international clients utilizing USDT (ERC-20 / TRC-20), Bitcoin, or Ethereum.
                  </p>
                  <ul className="space-y-2 text-xs text-slate-600 mb-8 border-t border-slate-100 pt-4">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span>12 required network confirmations</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Manual consular liaison review</span>
                    </li>
                  </ul>
                  <Link
                    href="/login"
                    className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors"
                  >
                    <span>View Crypto Instructions</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* FREQUENTLY ASKED QUESTIONS */}
        {homepage.show_faq_section && (
          <section id="faq" className="py-20 bg-slate-50 border-t border-slate-200/80">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center space-y-4 mb-16">
                <span className="text-xs font-bold text-sky-700 tracking-wider uppercase bg-white border border-sky-200 px-3 py-1 rounded-full">
                  Applicant Helpdesk
                </span>
                <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
                  Frequently Asked Questions
                </h2>
                <p className="text-base text-slate-600">
                  Common questions regarding visa fee assignment, reference credentials, and settlement timelines.
                </p>
              </div>

              <div className="space-y-4">
                {homepage.faqs.map((faq, idx) => (
                  <div
                    key={idx}
                    className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs"
                  >
                    <h3 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-sky-600 flex-shrink-0" />
                      <span>{faq.question}</span>
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed pl-6">
                      {faq.answer}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* SUPPORT / CONTACT SECTION */}
        {homepage.show_support_section && (
          <section className="py-16 bg-white border-t border-slate-200/80">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="bg-gradient-to-r from-sky-900 to-slate-900 text-white rounded-3xl p-8 sm:p-12 shadow-xl flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="space-y-3 max-w-xl">
                  <h3 className="text-2xl sm:text-3xl font-bold tracking-tight">
                    Need Assistance with Your Payment Reference?
                  </h3>
                  <p className="text-sm text-sky-100 leading-relaxed">
                    Our consular finance desk is available to verify references and resolve invoice inquiries during business hours.
                  </p>
                  <div className="pt-2 flex flex-wrap gap-6 text-xs text-sky-200">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-sky-300" />
                      {branding.support_hours}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Phone className="w-4 h-4 text-sky-300" />
                      {branding.support_phone}
                    </span>
                  </div>
                </div>

                <div className="flex-shrink-0 flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                  <a
                    href={`mailto:${branding.support_email}`}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white text-slate-900 hover:bg-slate-100 font-bold text-sm transition-colors"
                  >
                    <Mail className="w-4 h-4 text-sky-600" />
                    <span>Email Support Desk</span>
                  </a>
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm transition-colors shadow-md"
                  >
                    <Lock className="w-4 h-4" />
                    <span>Access Portal</span>
                  </Link>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer branding={branding} />
    </div>
  );
}
