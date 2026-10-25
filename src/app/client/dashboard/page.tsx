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
  Globe,
  Receipt,
  X,
  AlertTriangle,
} from 'lucide-react';
import { PaymentRecord, PaymentStatus, InvoiceRecord, InvoiceStatus } from '@/lib/types';

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
  region?: string | null;
  regionId?: number | null;
  createdAt: string;
}

export default function ClientDashboardPage() {
  const router = useRouter();

  const [client, setClient] = useState<ClientData | null>(null);
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [navigating, setNavigating] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Selected invoice for detail modal
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRecord | null>(null);

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
      const [meRes, settingsRes, invoicesRes, paymentsRes] = await Promise.all([
        fetch('/api/auth/client/me'),
        fetch('/api/settings'),
        fetch('/api/invoices/client'),
        fetch('/api/payments/client'),
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

      if (invoicesRes.ok) {
        const invData = await invoicesRes.json();
        setInvoices(invData.invoices || []);
      }

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

  const proceedToPayInvoice = (invoiceId?: number) => {
    const query = invoiceId ? `?invoiceId=${invoiceId}` : '';
    setNavigating(true);
    setTimeout(() => {
      router.push(`/client/payment/select${query}`);
    }, 400);
  };

  const getInvoiceStatusBadge = (inv: InvoiceRecord) => {
    const effStatus = inv.effective_status || inv.status;
    switch (effStatus) {
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Paid &amp; Settled
          </span>
        );
      case 'payment_pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
            <Clock className="w-3 h-3 text-sky-600" />
            Under Verification
          </span>
        );
      case 'overdue':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertTriangle className="w-3 h-3 text-rose-600" />
            Overdue
          </span>
        );
      case 'unpaid':
      case 'issued':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" />
            Awaiting Payment
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200 line-through">
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
            {effStatus}
          </span>
        );
    }
  };

  if (loading) {
    return (
      <LoadingScreen
        title="Preparing your client portal..."
        description="Decrypting consular file and fee schedule..."
        agencyName={branding.agency_name}
        tagline={branding.tagline}
        logoUrl={branding.logo_url}
        region={client?.region}
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
        title="Preparing Payment Gateways"
        description="Connecting to authorized consular settlement channels..."
        agencyName={branding.agency_name}
        tagline={branding.tagline}
        logoUrl={branding.logo_url}
        region={client?.region}
        currentStep={3}
        totalSteps={4}
        stepName="Payment Method Initialization"
        minDurationMs={600}
      />
    );
  }

  if (!client) {
    return null;
  }

  // Determine payable invoices
  const payableInvoices = invoices.filter(
    (i) => (i.effective_status || i.status) === 'issued' || (i.effective_status || i.status) === 'unpaid' || (i.effective_status || i.status) === 'overdue'
  );

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
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-xs font-semibold text-sky-300 uppercase tracking-wider">
                  Immigration Client Record
                </span>
                <span className="text-white/40">•</span>
                <span className="text-xs text-white/80 font-mono font-medium">{client.referenceNumber}</span>
                {client.region ? (
                  <>
                    <span className="text-white/40">•</span>
                    <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-200 border border-sky-400/30 font-medium">
                      <Globe className="w-3 h-3" />
                      {client.region}
                    </span>
                  </>
                ) : null}
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

            {payableInvoices.length > 0 && (
              <button
                onClick={() => proceedToPayInvoice(payableInvoices[0]?.id)}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white font-bold text-sm shadow-lg shadow-red-600/30 transition-all"
              >
                <span>Pay Outstanding Fee</span>
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

        {/* Assigned Consular Invoices Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Receipt className="w-5 h-5 text-sky-600" />
                Assigned Consular Invoices &amp; Fee Schedules
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Official statutory payment notices issued for your immigration and relocation procedure.
              </p>
            </div>
            <button
              onClick={loadData}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
          </div>

          {/* If Client has NO invoices: Professional Empty State */}
          {invoices.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-12 text-center max-w-2xl mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto mb-4 border border-sky-100">
                <FileText className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">
                No Invoices Currently Available
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed max-w-md mx-auto mb-6">
                Your immigration case currently has no pending or issued invoices. Consular disbursement schedules will appear here once officially generated by your assigned case officer.
              </p>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 max-w-md mx-auto flex items-center justify-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Your application file is active. No immediate fee settlement is required at this stage.</span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {invoices.map((inv) => {
                const effStatus = inv.effective_status || inv.status;
                const isPayable = effStatus === 'issued' || effStatus === 'unpaid' || effStatus === 'overdue';

                return (
                  <div
                    key={inv.id}
                    className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 flex flex-col justify-between hover:shadow-md transition-shadow"
                  >
                    <div>
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <span className="font-mono text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <Receipt className="w-4 h-4 text-sky-600" />
                          {inv.invoice_number}
                        </span>
                        {getInvoiceStatusBadge(inv)}
                      </div>

                      <div className="mt-3">
                        <h4 className="text-sm font-bold text-slate-900 leading-snug">
                          {inv.reason}
                        </h4>
                        <div className="mt-2 text-2xl font-black text-slate-900">
                          €{((inv.amount_cents || 0) / 100).toFixed(2)}{' '}
                          <span className="text-xs font-semibold text-slate-500">EUR (€)</span>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs text-slate-500">
                        <div>
                          <span className="block text-[10px] uppercase font-semibold text-slate-400">Issue Date</span>
                          <span className="font-medium text-slate-700">{inv.issue_date}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] uppercase font-semibold text-slate-400">Due Date</span>
                          <span className="font-medium text-slate-700">{inv.due_date}</span>
                        </div>
                      </div>

                      {inv.notes && (
                        <p className="mt-3 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 line-clamp-2">
                          {inv.notes}
                        </p>
                      )}
                    </div>

                    <div className="mt-5 pt-3 border-t border-slate-100 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedInvoice(inv)}
                        className="flex-1 py-2 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition text-center"
                      >
                        View Invoice
                      </button>

                      {isPayable ? (
                        <button
                          type="button"
                          onClick={() => proceedToPayInvoice(inv.id)}
                          className="flex-1 py-2 text-xs font-bold rounded-lg bg-red-600 text-white hover:bg-red-700 transition shadow-xs text-center flex items-center justify-center gap-1"
                        >
                          <span>Pay Invoice</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      ) : effStatus === 'payment_pending' ? (
                        <span className="flex-1 py-2 text-xs font-semibold rounded-lg bg-sky-50 text-sky-700 text-center border border-sky-200">
                          Pending Review
                        </span>
                      ) : (
                        <span className="flex-1 py-2 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 text-center border border-emerald-200">
                          Paid
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Case Information & Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-6">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
              Official Consular Case Profile
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Applicant Legal Identity
                </span>
                <span className="font-bold text-sm text-slate-900 mt-0.5 block">{client.fullName}</span>
                <span className="text-slate-500 mt-0.5 block">{client.email}</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Consular Reference Code
                </span>
                <span className="font-mono font-bold text-sm text-sky-800 mt-0.5 block">
                  {client.referenceNumber}
                </span>
                <span className="text-slate-500 mt-0.5 block">Manually assigned official file</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Designated Region
                </span>
                <span className="font-semibold text-slate-900 mt-0.5 block flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-sky-600" />
                  {client.region || 'Regional details are being prepared'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Category of Submission
                </span>
                <span className="font-semibold text-slate-900 mt-0.5 block">{client.caseCategory}</span>
              </div>
            </div>

            {client.caseDetails && (
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Case Details &amp; Background Notes
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                  {client.caseDetails}
                </p>
              </div>
            )}
          </div>

          <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-6">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
              Consular Assistance
            </h3>

            <div className="space-y-4 text-xs text-slate-600">
              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-sky-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-800 block">Diplomatic Fee Desk</span>
                  <a href={`mailto:${branding.support_email}`} className="text-sky-700 hover:underline">
                    {branding.support_email}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="w-4 h-4 text-sky-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-800 block">Consular Hotline</span>
                  <span>{branding.support_phone}</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-sky-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-800 block">Working Hours</span>
                  <span>{branding.support_hours}</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <div className="p-3.5 rounded-xl bg-sky-50 text-sky-900 text-[11px] leading-relaxed">
                <ShieldCheck className="w-4 h-4 text-sky-700 inline-block mr-1" />
                All payments processed through this portal are held under Luxembourg Ministry of Foreign Affairs statutory regulations.
              </div>
            </div>
          </div>
        </div>

        {/* Payment Remittance History Table */}
        <section className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-900">
              Remittance Transaction History
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Verified record of submitted payment attempts and consular reconciliations.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] uppercase font-bold text-slate-500 tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-6">Date</th>
                  <th className="py-3 px-6">Payment Method</th>
                  <th className="py-3 px-6">Associated Invoice</th>
                  <th className="py-3 px-6">Amount (EUR)</th>
                  <th className="py-3 px-6">Transaction Status</th>
                  <th className="py-3 px-6">Audit Remark</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No payment remittance attempts recorded yet.
                    </td>
                  </tr>
                ) : (
                  payments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-6 font-medium text-slate-700">
                        {new Date(p.created_at).toLocaleDateString('en-GB')}
                      </td>
                      <td className="py-3.5 px-6 font-semibold uppercase text-slate-900">
                        {p.method}
                      </td>
                      <td className="py-3.5 px-6 font-mono text-sky-700">
                        {p.invoice_number || '—'}
                      </td>
                      <td className="py-3.5 px-6 font-bold text-slate-900">
                        €{((p.amount_cents || 0) / 100).toFixed(2)}
                      </td>
                      <td className="py-3.5 px-6">
                        {p.status === 'completed' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Completed
                          </span>
                        ) : p.status === 'under_review' ? (
                          <span className="inline-flex items-center gap-1 text-sky-700 font-semibold">
                            <Clock className="w-3.5 h-3.5 text-sky-600" />
                            Under Review
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-700 font-semibold">
                            <XCircle className="w-3.5 h-3.5 text-rose-600" />
                            {p.failure_reason || 'Failed'}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-6 text-slate-500 font-mono text-[11px] truncate max-w-xs">
                        {p.crypto_tx_hash || p.provider_ref || p.failure_reason || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 sm:p-8 my-8 animate-in fade-in zoom-in-95 duration-200">
            {/* Header with Agency Branding */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <BrandLogo
                logoUrl={branding.logo_url}
                agencyName={branding.agency_name}
                tagline={branding.tagline}
                size="sm"
                showTagline={false}
              />
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[11px] uppercase font-bold text-sky-700 tracking-wider">
                    Statutory Fee Invoice
                  </span>
                  <h3 className="text-lg font-black text-slate-900 mt-0.5">
                    {selectedInvoice.invoice_number}
                  </h3>
                </div>
                <div>{getInvoiceStatusBadge(selectedInvoice)}</div>
              </div>

              {/* Client & Region details */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Applicant:</span>
                  <span className="font-bold text-slate-900">{client.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Reference Number:</span>
                  <span className="font-mono font-bold text-sky-800">{client.referenceNumber}</span>
                </div>
                {client.region && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Designated Region:</span>
                    <span className="font-semibold text-slate-800 flex items-center gap-1">
                      <Globe className="w-3 h-3 text-sky-600" />
                      {client.region}
                    </span>
                  </div>
                )}
              </div>

              {/* Reason for payment & Amount */}
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Payment Reason
                </span>
                <p className="text-sm font-bold text-slate-900">
                  {selectedInvoice.reason}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-sky-50/70 border border-sky-100 flex items-baseline justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-sky-800 uppercase tracking-wider">
                    Amount Payable (EUR)
                  </span>
                  <div className="text-3xl font-black text-slate-900 mt-0.5">
                    €{((selectedInvoice.amount_cents || 0) / 100).toFixed(2)}
                  </div>
                </div>
                <span className="text-xs font-bold text-sky-700 uppercase">
                  EUR (€) Strictly
                </span>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3 text-xs text-slate-600">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
                  <span className="block text-[10px] uppercase font-semibold text-slate-400">Date of Issuance</span>
                  <span className="font-bold text-slate-800">{selectedInvoice.issue_date}</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
                  <span className="block text-[10px] uppercase font-semibold text-slate-400">Payment Due Date</span>
                  <span className="font-bold text-slate-800">{selectedInvoice.due_date}</span>
                </div>
              </div>

              {/* Instructions */}
              {selectedInvoice.notes && (
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Payment Instructions
                  </span>
                  <p className="text-xs text-slate-700 bg-white p-3 rounded-lg border border-slate-200 leading-relaxed">
                    {selectedInvoice.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-700 hover:bg-slate-100"
              >
                Close
              </button>
              {((selectedInvoice.effective_status || selectedInvoice.status) === 'issued' ||
                (selectedInvoice.effective_status || selectedInvoice.status) === 'unpaid' ||
                (selectedInvoice.effective_status || selectedInvoice.status) === 'overdue') && (
                <button
                  type="button"
                  onClick={() => proceedToPayInvoice(selectedInvoice.id)}
                  className="px-5 py-2 text-xs font-bold rounded-lg bg-red-600 text-white hover:bg-red-700 shadow-sm flex items-center gap-1.5"
                >
                  <span>Proceed to Payment</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
