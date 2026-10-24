'use client';

import React from 'react';
import Link from 'next/link';

interface BrandLogoProps {
  logoUrl?: string | null;
  agencyName?: string;
  tagline?: string;
  size?: 'sm' | 'md' | 'lg';
  href?: string;
  showTagline?: boolean;
}

export function BrandLogo({
  logoUrl,
  agencyName = 'Luxembourg Global Visa & Immigration Services',
  tagline = 'Consular Payment & Relocation Gateway',
  size = 'md',
  href,
  showTagline = true,
}: BrandLogoProps) {
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
  };

  const textSizes = {
    sm: 'text-sm font-semibold',
    md: 'text-base font-bold',
    lg: 'text-xl font-extrabold',
  };

  const content = (
    <div className="flex items-center gap-3 group">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt={agencyName}
          className={`${iconSizes[size]} object-contain rounded-lg border border-slate-200 bg-white p-0.5 shadow-xs`}
        />
      ) : (
        <div
          className={`${iconSizes[size]} rounded-xl bg-gradient-to-br from-sky-500 to-sky-700 flex items-center justify-center text-white shadow-sm ring-2 ring-sky-100 flex-shrink-0 transition-transform group-hover:scale-105`}
        >
          {/* Luxembourg Lion / European Consular Seal Motif */}
          <svg
            className="w-3/5 h-3/5 fill-current text-white"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="m9 12 2 2 4-4" stroke="white" strokeWidth="2.5" />
          </svg>
        </div>
      )}
      <div className="flex flex-col min-w-0">
        <span
          className={`${textSizes[size]} text-slate-900 tracking-tight leading-snug truncate group-hover:text-sky-700 transition-colors`}
        >
          {agencyName}
        </span>
        {showTagline && tagline && (
          <span className="text-[11px] text-slate-500 font-medium tracking-normal leading-tight truncate">
            {tagline}
          </span>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex focus:outline-hidden focus:ring-2 focus:ring-sky-500 rounded-lg">
        {content}
      </Link>
    );
  }

  return content;
}
