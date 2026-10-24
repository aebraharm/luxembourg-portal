'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/AdminLayout';
import {
  Users,
  CreditCard,
  CheckCircle2,
  Clock,
  XCircle,
  Plus,
  ArrowRight,
  TrendingUp,
  FileCheck2,
  Settings,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { PaymentRecord, PaymentStatus } from '@/lib/types';

interface StatsData {
  totalClients: number;
  activeClients: number;
  totalAssignedCents: number;
  successfulCount: number;
  successfulTotalCents: number;
  pendingCount: number;
  pendingTotalCents: number;
  failedCount: number;
  failedTotalCents: number;
  recentPayments: (PaymentRecord & { client_name?: string; client_email?: string })[];
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/stats')
      .then((res) => res.json())
      .then((data) => setStats(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const formatEur = (cents: number) => {
    return (cents / 100).toLocaleString('en-US', {
      style: 'currency',
      currency: 'EUR',
    });
  };

  const getStatusBadge = (status: PaymentStatus) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Paid
          </span>
        );
      case 'under_review':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
            <Clock className="w-3 h-3 text-amber-600" />
            Under Review
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 text-red-600" />
            Failed
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
            Cancelled
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-100 text-sky-800">
            <Clock className="w-3 h-3 text-sky-600" />
            Pending
          </span>
        );
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Top Header & Quick Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Consular Executive Overview
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Real-time database statistics for visa case references, tariffs, and payment transactions.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/clients"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-red-600/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Create Client Record</span>
            </Link>
          </div>
        </div>

        {/* 4 Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: Total Clients */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Total Client Records
              </span>
              <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 tracking-tight">
                {stats ? stats.totalClients : '...'}
              </span>
              <span className="text-xs text-slate-500 font-semibold">
                ({stats ? stats.activeClients : 0} active)
              </span>
            </div>
            <Link
              href="/admin/clients"
              className="mt-3 text-[11px] font-bold text-sky-700 hover:underline inline-flex items-center gap-1"
            >
              <span>Manage Client Database</span>
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Card 2: Total Assigned Fees */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Total Assigned Fees
              </span>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <FileCheck2 className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 tracking-tight">
                {stats ? formatEur(stats.totalAssignedCents) : '...'}
              </span>
            </div>
            <p className="mt-3 text-[11px] text-slate-500 font-medium">
              Statutory Consular Tariffs in EUR
            </p>
          </div>

          {/* Card 3: Successful Payments */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Successful Payments
              </span>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 tracking-tight">
                {stats ? stats.successfulCount : 0}
              </span>
              <span className="text-xs font-bold text-emerald-700">
                {stats ? formatEur(stats.successfulTotalCents) : '€0.00'}
              </span>
            </div>
            <p className="mt-3 text-[11px] text-emerald-600 font-semibold">
              Verified &amp; Reconciled Remittances
            </p>
          </div>

          {/* Card 4: Pending / Failed Payments */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Pending &amp; Failed
              </span>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 tracking-tight">
                {stats ? stats.pendingCount : 0}
              </span>
              <span className="text-xs font-semibold text-slate-500">
                pending ({stats ? stats.failedCount : 0} failed)
              </span>
            </div>
            <Link
              href="/admin/payments"
              className="mt-3 text-[11px] font-bold text-sky-700 hover:underline inline-flex items-center gap-1"
            >
              <span>Review Payment Attempts</span>
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Quick Operations Shortcuts Bar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">
            Consular Quick Actions
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <Link
              href="/admin/clients"
              className="p-4 rounded-xl border border-slate-200 hover:border-sky-400 hover:bg-sky-50/50 transition-all flex items-start gap-3 group"
            >
              <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-slate-900 block">Manage Clients</span>
                <span className="text-slate-500 text-[11px]">Assign reference numbers &amp; fees</span>
              </div>
            </Link>

            <Link
              href="/admin/payments"
              className="p-4 rounded-xl border border-slate-200 hover:border-sky-400 hover:bg-sky-50/50 transition-all flex items-start gap-3 group"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-slate-900 block">Reconcile Payments</span>
                <span className="text-slate-500 text-[11px]">Verify crypto &amp; review transactions</span>
              </div>
            </Link>

            <Link
              href="/admin/settings"
              className="p-4 rounded-xl border border-slate-200 hover:border-sky-400 hover:bg-sky-50/50 transition-all flex items-start gap-3 group"
            >
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                <Settings className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-slate-900 block">System Settings</span>
                <span className="text-slate-500 text-[11px]">Branding, methods &amp; 16 config sections</span>
              </div>
            </Link>

            <Link
              href="/admin/audit-logs"
              className="p-4 rounded-xl border border-slate-200 hover:border-sky-400 hover:bg-sky-50/50 transition-all flex items-start gap-3 group"
            >
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-slate-900 block">Audit &amp; Security Logs</span>
                <span className="text-slate-500 text-[11px]">Review full administrative activity</span>
              </div>
            </Link>
          </div>
        </div>

        {/* Recent Payment Activity Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Recent Payment Attempts &amp; Transactions
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time activity recorded in the consular transactions ledger.
              </p>
            </div>
            <Link
              href="/admin/payments"
              className="text-xs font-bold text-sky-700 hover:underline flex items-center gap-1"
            >
              <span>View All Transactions</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-6 font-bold">Transaction</th>
                  <th className="py-3 px-6 font-bold">Applicant / Client</th>
                  <th className="py-3 px-6 font-bold">Reference Number</th>
                  <th className="py-3 px-6 font-bold">Method</th>
                  <th className="py-3 px-6 font-bold">Amount</th>
                  <th className="py-3 px-6 font-bold">Status</th>
                  <th className="py-3 px-6 font-bold">Timestamp</th>
                  <th className="py-3 px-6 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {!stats || stats.recentPayments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500">
                      No payment transactions recorded yet.
                    </td>
                  </tr>
                ) : (
                  stats.recentPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-6 font-mono font-bold text-slate-900">
                        #{p.id}
                      </td>
                      <td className="py-3.5 px-6">
                        <div className="font-bold text-slate-800">{p.client_name || 'Client #' + p.client_id}</div>
                        <div className="text-[11px] text-slate-500 truncate max-w-xs">{p.client_email}</div>
                      </td>
                      <td className="py-3.5 px-6 font-mono font-bold text-sky-800">
                        {p.reference_number}
                      </td>
                      <td className="py-3.5 px-6 capitalize font-medium text-slate-700">
                        {p.method === 'card' && 'Card'}
                        {p.method === 'paypal' && 'PayPal'}
                        {p.method === 'crypto' && `Crypto (${p.crypto_currency || 'USDT'})`}
                      </td>
                      <td className="py-3.5 px-6 font-bold text-slate-900">
                        {formatEur(p.amount_cents)}
                      </td>
                      <td className="py-3.5 px-6">
                        {getStatusBadge(p.status)}
                      </td>
                      <td className="py-3.5 px-6 text-slate-500">
                        {new Date(p.created_at).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-6 text-right">
                        <Link
                          href="/admin/payments"
                          className="text-xs font-semibold text-sky-700 hover:text-sky-900 hover:underline"
                        >
                          Details
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
