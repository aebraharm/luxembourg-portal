'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { BrandLogo } from '@/components/BrandLogo';
import { LoadingScreen } from '@/components/LoadingScreen';
import {
  CreditCard,
  Coins,
  ShieldCheck,
  AlertCircle,
  Clock,
  ArrowRight,
  LogOut,
  User,
  Camera,
  CheckCircle2,
  XCircle,
  FileText,
  Mail,
  Phone,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { PaymentRecord, PaymentStatus } from '@/lib/types';

interface ClientData {
  id: number;
  fullName: string;
  email: string;
  referenceNumber: string;
  photoUrl: string | null;
  caseCategory: string;
  caseDetails: string;
  amountCents: number;
  paymentStatus: PaymentStatus;
  paymentInstructions: string;
  canClientEditPhoto: boolean;
  createdAt: string;
}

export default function ClientDashboardPage() {
  const router = useRouter();

  const [client, setClient] = useState<ClientData | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [navigating, setNavigating] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [branding, setBranding] = useState<{
    agency_name: string;
    tagline: string;
    logo_url: string | null;
    support_email: string;
    support_phone: string;
    support_hours: string;
  }>({
    agency_name: 'Luxembourg Global Visa & Immigration Services',
    tagline: 'Consular Payment & Relocation Gateway',
    logo_url: null,
    support_email: 'payments@lux-immigration-portal.eu',
    support_phone: '+352 28 80 44 00',
    support_hours: 'Monday – Friday, 08:30 – 17:30 CET',
  });

  const [loadingConfig, setLoadingConfig] = useState({
    transition_duration_ms: 1200,
  });

  const loadData = async () => {
    try {
      const [meRes, settingsRes] = await Promise.all([
        fetch('/api/auth/client/me'),
        fetch('/api/settings'),
      ]);

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

      // Fetch client payment history
      const paymentsRes = await fetch('/api/payments/client');
      if (paymentsRes.ok) {
        const pData = await paymentsRes.json();
        setPayments(pData.payments || []);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/client/logout', { method: 'POST' });
    router.push('/login');
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    setPhotoError(null);

    const formData = new FormData();
    formData.append('photo', file);

    try {
      const res = await fetch('/api/clients/profile-photo', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setPhotoError(data.error || 'Failed to upload photo');
      } else {
        setClient((prev) => (prev ? { ...prev, photoUrl: data.photoUrl } : null));
      }
    } catch (err: any) {
      setPhotoError(err.message || 'Error uploading photo');
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = async () => {
    setUploadingPhoto(true);
    setPhotoError(null);
    try {
      const res = await fetch('/api/clients/profile-photo', { method: 'DELETE' });
      if (res.ok) {
        setClient((prev) => (prev ? { ...prev, photoUrl: null } : null));
      }
    } catch (err: any) {
      setPhotoError(err.message || 'Error removing photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const proceedToPaymentMethodSelection = () => {
    setNavigating(true);
  };

  if (loading) {
    return (
      <LoadingScreen
        title="Loading Client Dashboard"
        description="Decrypting consular file and fee schedule..."
        agencyName={branding.agency_name}
        tagline={branding.tagline}
        logoUrl={branding.logo_url}
        currentStep={2}
        totalSteps={4}
        stepName="Loading Assigned Case Records"
        minDurationMs={800}
      />
    );
  }

  if (navigating && client) {
    return (
      <LoadingScreen
        title="Opening Payment Gateways"
        description="Preparing authorized settlement channels for your case..."
        agencyName={branding.agency_name}
        tagline={branding.tagline}
        logoUrl={branding.logo_url}
        currentStep={3}
        totalSteps={4}
        stepName="Payment Method Selection"
        minDurationMs={loadingConfig.transition_duration_ms || 1200}
        onComplete={() => {
          router.push('/client/payment/select');
        }}
      />
    );
  }

  if (!client) {
    return null;
  }

  const formattedAmount = (client.amountCents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'EUR',
  });

  const getStatusBadge = (status: PaymentStatus) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Paid &amp; Confirmed
          </span>
        );
      case 'under_review':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Under Consular Review
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
            <XCircle className="w-3.5 h-3.5 text-red-600" />
            Payment Failed
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
            Cancelled
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-800 border border-sky-200">
            <Clock className="w-3.5 h-3.5 text-sky-600" />
            Pending Remittance
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-sky-100 selection:text-sky-900">
      {/* Top Client Navigation Bar */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          <BrandLogo
            logoUrl={branding.logo_url}
            agencyName={branding.agency_name}
            tagline="Official Client Dashboard"
            size="md"
            href="/client/dashboard"
          />

          <div className="flex items-center gap-3 sm:gap-6">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-bold text-slate-900">{client.fullName}</span>
              <span className="text-[11px] font-mono text-sky-700 font-semibold">{client.referenceNumber}</span>
            </div>

            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 hover:border-red-200 hover:bg-red-50 text-slate-600 hover:text-red-600 text-xs font-semibold transition-colors shadow-xs"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-sky-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            {/* Profile Avatar / Photo */}
            <div className="relative group">
              {client.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={client.photoUrl}
                  alt={client.fullName}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-white/20 shadow-md bg-white/10"
                />
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/10 border-2 border-white/20 flex items-center justify-center text-sky-200 shadow-md">
                  <User className="w-8 h-8 sm:w-10 sm:h-10" />
                </div>
              )}

              {/* Photo Upload Trigger if permitted by admin */}
              {client.canClientEditPhoto && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Update profile photograph"
                  className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-700 shadow-md border-2 border-slate-900 transition-transform group-hover:scale-110"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
              )}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handlePhotoUpload}
                accept="image/png, image/jpeg, image/jpg, image/webp"
                className="hidden"
              />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-sky-300 uppercase tracking-wider">
                  Immigration Client Record
                </span>
                <span className="text-white/40">•</span>
                <span className="text-xs text-white/80 font-mono font-medium">{client.referenceNumber}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{client.fullName}</h1>
              <p className="text-xs sm:text-sm text-sky-100/90 mt-1 flex items-center gap-2">
                <span className="font-semibold">{client.caseCategory}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
            {client.canClientEditPhoto && client.photoUrl && (
              <button
                type="button"
                onClick={handleRemovePhoto}
                disabled={uploadingPhoto}
                className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white/80 hover:text-white transition-colors"
              >
                Remove Photo
              </button>
            )}

            {client.paymentStatus !== 'completed' && (
              <button
                onClick={proceedToPaymentMethodSelection}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white font-bold text-sm shadow-lg shadow-red-600/30 transition-all"
              >
                <span>Make Visa Fee Payment</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {photoError && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span>{photoError}</span>
          </div>
        )}

        {/* 2-Column Grid: Case Details & Assigned Fee */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: Assigned Fee & Primary Payment Action (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-md p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Assigned Consular Fee
                </h3>
                {getStatusBadge(client.paymentStatus)}
              </div>

              {/* Amount Display */}
              <div>
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Total Statutory Remittance Due (EUR)
                </span>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-4xl font-black text-slate-900 tracking-tight">
                    {formattedAmount}
                  </span>
                  <span className="text-sm font-semibold text-slate-500">EUR (€)</span>
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  Fixed statutory fee verified by Consular Liaison. No currency conversion surcharge.
                </p>
              </div>

              {/* Payment Instructions from Admin */}
              <div className="p-4 rounded-xl bg-sky-50/70 border border-sky-100 space-y-2">
                <h4 className="text-xs font-bold text-sky-900 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-sky-700" />
                  <span>Case Officer Instructions</span>
                </h4>
                <p className="text-xs text-slate-700 leading-relaxed">
                  {client.paymentInstructions ||
                    'Please settle your assigned fee promptly to avoid scheduling delays with consular filing.'}
                </p>
              </div>

              {/* Primary Action Button: RED */}
              <div>
                {client.paymentStatus === 'completed' ? (
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium space-y-2 text-center">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
                    <p className="font-bold text-sm text-emerald-900">Payment Verified &amp; Cleared</p>
                    <p>Your payment has been reconciled into the official consular case filing ledger.</p>
                  </div>
                ) : (
                  <button
                    onClick={proceedToPaymentMethodSelection}
                    className="w-full inline-flex items-center justify-center gap-2.5 py-4 px-6 rounded-xl bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white font-bold text-base shadow-lg shadow-red-600/25 transition-all"
                  >
                    <CreditCard className="w-5 h-5" />
                    <span>Proceed to Select Payment Method</span>
                    <ArrowRight className="w-5 h-5" />
                  </button>
                )}
              </div>

              <div className="text-center pt-1 border-t border-slate-100">
                <span className="text-[11px] text-slate-400 font-medium">
                  Reference: <strong className="font-mono text-slate-700">{client.referenceNumber}</strong>
                </span>
              </div>
            </div>

            {/* Consular Support Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-4">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-sky-600" />
                <span>Assigned Case Support</span>
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                If you have questions regarding your fee amount or case reference, please contact your designated consular desk.
              </p>
              <div className="space-y-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-sky-600" />
                  <a href={`mailto:${branding.support_email}`} className="text-sky-700 font-semibold hover:underline">
                    {branding.support_email}
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-sky-600" />
                  <span>{branding.support_phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-sky-600" />
                  <span>{branding.support_hours}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Case Information & Payment History (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Case Details Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Immigration Case File Summary
                </h3>
                <span className="text-xs font-mono font-semibold text-slate-500">
                  ID #{client.id}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-slate-400 font-medium">Applicant Full Name</span>
                  <p className="font-bold text-slate-900 text-sm mt-0.5">{client.fullName}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-slate-400 font-medium">Primary Contact Email</span>
                  <p className="font-bold text-slate-900 text-sm mt-0.5 truncate">{client.email}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-slate-400 font-medium">Payment Reference Number</span>
                  <p className="font-mono font-bold text-sky-800 text-sm mt-0.5">{client.referenceNumber}</p>
                  <span className="text-[10px] text-slate-400">Manually Assigned by Officer</span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-slate-400 font-medium">Case Category</span>
                  <p className="font-bold text-slate-900 text-sm mt-0.5">{client.caseCategory}</p>
                </div>
              </div>

              {client.caseDetails && (
                <div className="pt-2">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                    Consular Case Notes
                  </span>
                  <p className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 leading-relaxed font-sans whitespace-pre-wrap">
                    {client.caseDetails}
                  </p>
                </div>
              )}
            </div>

            {/* Payment History Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Payment History &amp; Attempts
                </h3>
                <span className="text-xs text-slate-500 font-medium">{payments.length} Record(s)</span>
              </div>

              {payments.length === 0 ? (
                <div className="text-center py-10 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">No Payment Attempts Recorded Yet</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    When you initiate or complete a payment, the full transaction history and status logs will appear here.
                  </p>
                  {client.paymentStatus !== 'completed' && (
                    <button
                      onClick={proceedToPaymentMethodSelection}
                      className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-xs shadow-xs"
                    >
                      <span>Initiate First Remittance</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider text-[11px]">
                        <th className="py-2.5 font-bold">Transaction</th>
                        <th className="py-2.5 font-bold">Method</th>
                        <th className="py-2.5 font-bold">Amount</th>
                        <th className="py-2.5 font-bold">Status</th>
                        <th className="py-2.5 font-bold">Date</th>
                        <th className="py-2.5 font-bold text-right">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {payments.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 font-mono font-bold text-slate-800">
                            #{p.id}
                          </td>
                          <td className="py-3 capitalize text-slate-700 font-medium">
                            {p.method}
                          </td>
                          <td className="py-3 font-bold text-slate-900">
                            {(p.amount_cents / 100).toLocaleString('en-US', {
                              style: 'currency',
                              currency: 'EUR',
                            })}
                          </td>
                          <td className="py-3">
                            {getStatusBadge(p.status)}
                          </td>
                          <td className="py-3 text-slate-500">
                            {new Date(p.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-3 text-right">
                            <button
                              onClick={() => router.push(`/client/payment/result?id=${p.id}`)}
                              className="text-sky-700 hover:text-sky-900 font-semibold inline-flex items-center gap-1"
                            >
                              <span>View</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
