'use client';

import React from 'react';
import Link from 'next/link';
import { BrandLogo } from './BrandLogo';
import { Mail, Phone, MapPin, Clock, ShieldCheck, Lock } from 'lucide-react';
import { AgencyBrandingSettings } from '@/lib/types';

interface FooterProps {
  branding: AgencyBrandingSettings;
}

export function Footer({ branding }: FooterProps) {
  return (
    <footer className="bg-slate-900 text-slate-300 pt-16 pb-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-slate-800">
          {/* Brand & Overview */}
          <div className="space-y-4">
            <div className="bg-white/10 p-3 rounded-xl inline-block backdrop-blur-xs">
              <BrandLogo
                logoUrl={branding.logo_url}
                agencyName={branding.agency_name}
                tagline={branding.tagline}
                size="md"
                showTagline={false}
              />
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Official payment gateway exclusively for registered immigration applicants and visa case references.
            </p>
            <div className="flex items-center gap-2 text-xs text-sky-400 font-medium">
              <ShieldCheck className="w-4 h-4" />
              <span>PCI-DSS Compliant &amp; GDPR Certified Processing</span>
            </div>
          </div>

          {/* Contact and Consular Support */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white tracking-wide uppercase">Consular Payment Support</h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li className="flex items-start gap-2.5">
                <Mail className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
                <a href={`mailto:${branding.support_email}`} className="hover:text-white transition-colors break-all">
                  {branding.support_email}
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <Phone className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
                <span className="text-slate-300 font-semibold">{branding.support_phone}</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
                <span>{branding.support_hours}</span>
              </li>
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
                <span>{branding.office_address}</span>
              </li>
            </ul>
          </div>

          {/* Quick Client Links */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white tracking-wide uppercase">Client Navigation</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>
                <Link href="/login" className="hover:text-white transition-colors flex items-center gap-1.5 font-semibold text-sky-400">
                  <span>→ Access Payment Portal</span>
                </Link>
              </li>
              <li>
                <Link href="/#guidelines" className="hover:text-white transition-colors">
                  Case Reference Guide
                </Link>
              </li>
              <li>
                <Link href="/#methods" className="hover:text-white transition-colors">
                  Accepted Payment Channels
                </Link>
              </li>
              <li>
                <Link href="/#faq" className="hover:text-white transition-colors">
                  Consular Billing FAQs
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-white transition-colors">
                  Legal Terms &amp; Representation
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-white transition-colors">
                  Privacy &amp; Data Protection
                </Link>
              </li>
              <li>
                <Link href="/refund-policy" className="hover:text-white transition-colors">
                  Payment &amp; Refund Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Administrative Portal Link */}
          <div className="space-y-3 bg-slate-800/40 p-4 rounded-xl border border-slate-800">
            <h4 className="text-sm font-bold text-white tracking-wide uppercase flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-sky-400" />
              Administrative Operations
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Restricted area for immigration case managers, compliance officers, and finance liaisons.
            </p>
            <Link
              href="/admin/login"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-semibold text-xs transition-colors w-full justify-center"
            >
              <Lock className="w-3.5 h-3.5 text-sky-300" />
              <span>Consular Admin Login</span>
            </Link>
          </div>
        </div>

        {/* Regulatory Disclaimer (Required by prompt: no false government claims) */}
        <div className="mt-8 pt-6 border-t border-slate-800/60 text-[11px] text-slate-400 leading-relaxed space-y-3">
          <p className="font-semibold text-slate-300">
            STATUTORY IMMIGRATION ADVISORY NOTICE:
          </p>
          <p>
            {branding.agency_name} is a professional immigration consultancy and consular services facilitator. We are not an embassy, consulate, or sovereign immigration authority. Remitted fees cover statutory government processing tariffs and authorized agency case representation. Remittance does not constitute a guarantee of visa approval or immigration status determination, which remains under the exclusive jurisdiction of the competent government authorities.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 text-slate-400">
            <p>{branding.copyright_text}</p>
            <p className="text-slate-400 flex items-center gap-2">
              <span>Currency: EUR (€) Only</span>
              <span>•</span>
              <span>TLS 1.3 Strict Security</span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
