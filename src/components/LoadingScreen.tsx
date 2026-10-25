'use client';

import React, { useEffect, useState } from 'react';
import { BrandLogo } from './BrandLogo';
import { ShieldCheck, ArrowRight, RotateCw, AlertTriangle, Globe } from 'lucide-react';

interface LoadingScreenProps {
  title?: string;
  description?: string;
  agencyName?: string;
  tagline?: string;
  logoUrl?: string | null;
  region?: string | null;
  currentStep?: number;
  totalSteps?: number;
  stepName?: string;
  minDurationMs?: number;
  onComplete?: () => void;
  onError?: (err: Error) => void;
  showSteps?: boolean;
}

export function LoadingScreen({
  title = 'Preparing your client portal...',
  description = 'Verifying immigration records through 256-bit encrypted gateway...',
  agencyName,
  tagline,
  logoUrl,
  region,
  currentStep,
  totalSteps = 4,
  stepName,
  minDurationMs = 1200,
  onComplete,
  showSteps = true,
}: LoadingScreenProps) {
  const [progress, setProgress] = useState(15);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    // Respect prefers-reduced-motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const effectiveDuration = mediaQuery.matches ? 200 : minDurationMs;

    const intervalTime = 40;
    const stepIncrement = (100 / (effectiveDuration / intervalTime)) * 0.9;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 98) {
          clearInterval(interval);
          return 98;
        }
        return Math.min(prev + stepIncrement, 98);
      });
    }, intervalTime);

    const completionTimer = setTimeout(() => {
      setProgress(100);
      if (onComplete) {
        onComplete();
      }
    }, effectiveDuration);

    // Failsafe timeout to prevent infinite stuck screens
    const safetyTimer = setTimeout(() => {
      setTimedOut(true);
    }, 12000);

    return () => {
      clearInterval(interval);
      clearTimeout(completionTimer);
      clearTimeout(safetyTimer);
    };
  }, [minDurationMs, onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/95 backdrop-blur-md px-4 select-none animate-in fade-in duration-300">
      <div className="w-full max-w-md mx-auto flex flex-col items-center text-center p-8 bg-white border border-slate-200/80 rounded-2xl shadow-xl shadow-sky-500/5">
        {/* Logo and Seal Header */}
        <div className="mb-6">
          <BrandLogo
            logoUrl={logoUrl}
            agencyName={agencyName}
            tagline={tagline}
            size="lg"
            showTagline={false}
          />
        </div>

        {/* Animated Visual Loader */}
        <div className="relative w-24 h-24 mb-6 flex items-center justify-center">
          {/* Outer glowing pulsing sky-blue ring */}
          <div className="absolute inset-0 rounded-full border-4 border-sky-100 animate-pulse" />

          {/* Animated SVG ring spinner */}
          <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
            <circle
              className="text-slate-100"
              strokeWidth="6"
              stroke="currentColor"
              fill="transparent"
              r="40"
              cx="50"
              cy="50"
            />
            <circle
              className="text-sky-600 transition-all duration-300 ease-out"
              strokeWidth="6"
              strokeDasharray={251.2}
              strokeDashoffset={251.2 - (251.2 * progress) / 100}
              strokeLinecap="round"
              stroke="currentColor"
              fill="transparent"
              r="40"
              cx="50"
              cy="50"
            />
          </svg>

          {/* Center icon / emblem */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600 shadow-inner">
              <ShieldCheck className="w-6 h-6 animate-pulse" />
            </div>
          </div>
        </div>

        {/* Title and Message */}
        <h3 className="text-xl font-bold text-slate-900 tracking-tight mb-2">
          {title}
        </h3>
        <p className="text-sm text-slate-600 max-w-sm mb-4 leading-relaxed">
          {description}
        </p>

        {/* Region Banner Component */}
        <div className="w-full mb-6">
          {region ? (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-50 border border-sky-200 text-sky-800 text-xs font-semibold shadow-xs animate-in fade-in">
              <Globe className="w-3.5 h-3.5 text-sky-600" />
              <span>Your designated region: <span className="font-bold">{region}</span></span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-slate-600 text-xs font-medium">
              <Globe className="w-3.5 h-3.5 text-slate-400" />
              <span>Your regional details are being prepared</span>
            </div>
          )}
        </div>

        {/* Step Indicator */}
        {showSteps && currentStep !== undefined && (
          <div className="w-full bg-slate-50 border border-slate-200/80 rounded-xl p-3 mb-4 text-xs">
            <div className="flex justify-between items-center text-slate-500 mb-1.5 font-medium">
              <span>Security Progression</span>
              <span className="text-sky-700 font-semibold">
                Step {currentStep} of {totalSteps}
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-sky-600 h-1.5 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${Math.min(100, (currentStep / totalSteps) * 100)}%` }}
              />
            </div>
            {stepName && (
              <p className="mt-2 text-slate-700 font-semibold flex items-center justify-center gap-1.5">
                <span>Phase:</span>
                <span className="text-sky-800">{stepName}</span>
              </p>
            )}
          </div>
        )}

        {/* Security and TLS Assurance */}
        <div className="flex items-center gap-2 text-xs text-slate-600 font-medium pt-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span>Encrypted Visa Consular Protocol (TLS 1.3)</span>
        </div>

        {/* Failsafe timeout recovery if network stall */}
        {timedOut && (
          <div className="mt-6 pt-4 border-t border-slate-100 w-full animate-in fade-in">
            <div className="flex items-center justify-center gap-2 text-amber-700 text-xs mb-3">
              <AlertTriangle className="w-4 h-4" />
              <span>Gateway response is taking longer than expected.</span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
              >
                <RotateCw className="w-3.5 h-3.5" />
                Reload Page
              </button>
              {onComplete && (
                <button
                  type="button"
                  onClick={onComplete}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
                >
                  Continue Anyway
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
