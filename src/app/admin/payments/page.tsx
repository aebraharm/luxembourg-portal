'use client';

import React, { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import {
  CreditCard,
  Search,
  Filter,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  FileText,
  AlertTriangle,
  RotateCcw,
  X,
  Coins,
  ChevronRight,
} from 'lucide-react';
import { PaymentRecord, PaymentStatus } from '@/lib/types';

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<(PaymentRecord & { client_name?: string; client_email?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');

  // Reconciliation modal
  const [selectedPayment, setSelectedPayment] = useState<(PaymentRecord & { client_name?: string; client_email?: string }) | null>(null);
  const [reconcileStatus, setReconcileStatus] = useState<PaymentStatus>('completed');
  const [adminNote, setAdminNote] = useState('');
  const [providerRef, setProviderRef] = useState('');
  const [submittingReconciliation, setSubmittingReconciliation] = useState(false);
  const [reconcileError, setReconcileError] = useState<string | null>(null);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      let url = `/api/payments?search=${encodeURIComponent(search)}&status=${statusFilter}&method=${methodFilter}`;
      const res = await fetch(url);
      const data = await res.json();
      setPayments(data.payments || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [search, statusFilter, methodFilter]);

  const openReconcileModal = (p: PaymentRecord & { client_name?: string; client_email?: string }) => {
    setSelectedPayment(p);
    setReconcileStatus(p.status === 'completed' ? 'completed' : 'completed');
    setAdminNote('');
    setProviderRef(p.provider_ref || '');
    setReconcileError(null);
  };

  const handleReconcile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayment) return;
    setReconcileError(null);
    setSubmittingReconciliation(true);

    try {
      const res = await fetch(`/api/payments/${selectedPayment.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: reconcileStatus,
          adminNote,
          providerRef,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setReconcileError(data.error || 'Failed to reconcile payment');
      } else {
        setSelectedPayment(null);
        fetchPayments();
      }
    } catch (err: any) {
      setReconcileError(err.message || 'Network error');
    } finally {
      setSubmittingReconciliation(false);
    }
  };

  const exportCsv = () => {
    const headers = ['ID', 'Reference Number', 'Client Name', 'Email', 'Method', 'Amount EUR', 'Status', 'Mode', 'Crypto TxHash', 'Created At'];
    const rows = payments.map((p) => [
      p.id,
      p.reference_number,
      `"${(p.client_name || '').replace(/"/g, '""')}"`,
      p.client_email || '',
      p.method,
      (p.amount_cents / 100).toFixed(2),
      p.status,
      p.mode,
      `"${(p.crypto_tx_hash || '').replace(/"/g, '""')}"`,
      p.created_at,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `payments_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

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
            Paid / Completed
          </span>
        );
      case 'under_review':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
            <Clock className="w-3 h-3 text-amber-600" />
            Under Consular Review
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 text-red-600" />
            Payment Failed
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Payment Remittances &amp; Transactions
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Audit attempts, review blockchain transaction hashes, and reconcile verified consular payments.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={exportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export Remittances CSV</span>
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by reference number, client name, email, or transaction hash (TxID)..."
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 font-medium"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="under_review">Under Review</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 font-medium"
            >
              <option value="all">All Methods</option>
              <option value="card">Card Payment</option>
              <option value="paypal">PayPal</option>
              <option value="crypto">Cryptocurrency</option>
            </select>
          </div>
        </div>

        {/* Payments Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-6 font-bold">Transaction</th>
                  <th className="py-3 px-6 font-bold">Case Reference</th>
                  <th className="py-3 px-6 font-bold">Applicant</th>
                  <th className="py-3 px-6 font-bold">Method</th>
                  <th className="py-3 px-6 font-bold">Amount</th>
                  <th className="py-3 px-6 font-bold">Status</th>
                  <th className="py-3 px-6 font-bold">Created At</th>
                  <th className="py-3 px-6 font-bold text-right">Reconciliation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500">
                      Loading payment transactions...
                    </td>
                  </tr>
                ) : payments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500">
                      No payment records match the current filters.
                    </td>
                  </tr>
                ) : (
                  payments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-6">
                        <span className="font-mono font-bold text-slate-900">#{p.id}</span>
                        <span className="block text-[10px] text-slate-400 uppercase">{p.mode}</span>
                      </td>
                      <td className="py-3 px-6 font-mono font-bold text-sky-800">
                        {p.reference_number}
                      </td>
                      <td className="py-3 px-6">
                        <div className="font-bold text-slate-900">{p.client_name || 'Client #' + p.client_id}</div>
                        <div className="text-[11px] text-slate-500">{p.client_email}</div>
                      </td>
                      <td className="py-3 px-6 capitalize text-slate-700 font-medium">
                        {p.method === 'card' && 'Card'}
                        {p.method === 'paypal' && 'PayPal'}
                        {p.method === 'crypto' && `Crypto (${p.crypto_currency || 'USDT'})`}
                      </td>
                      <td className="py-3 px-6 font-bold text-slate-900 text-sm">
                        {formatEur(p.amount_cents)}
                      </td>
                      <td className="py-3 px-6">
                        {getStatusBadge(p.status)}
                      </td>
                      <td className="py-3 px-6 text-slate-500">
                        {new Date(p.created_at).toLocaleString()}
                      </td>
                      <td className="py-3 px-6 text-right">
                        <button
                          onClick={() => openReconcileModal(p)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-sky-50 text-slate-700 hover:text-sky-700 text-xs font-semibold transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Review &amp; Reconcile</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Reconciliation Modal */}
      {selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 border border-slate-200 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Transaction Audit &amp; Reconciliation
                </h3>
                <span className="text-xs font-mono text-sky-700">
                  Payment #{selectedPayment.id} • Ref: {selectedPayment.reference_number}
                </span>
              </div>
              <button onClick={() => setSelectedPayment(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {reconcileError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs">
                {reconcileError}
              </div>
            )}

            {/* Transaction metadata */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Applicant:</span>
                <span className="font-bold text-slate-800">{selectedPayment.client_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Method:</span>
                <span className="capitalize font-semibold text-slate-800">{selectedPayment.method}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount:</span>
                <span className="font-black text-slate-900">{formatEur(selectedPayment.amount_cents)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Current Status:</span>
                <div>{getStatusBadge(selectedPayment.status)}</div>
              </div>

              {selectedPayment.crypto_tx_hash && (
                <div className="pt-2 border-t border-slate-200 space-y-1">
                  <span className="text-slate-500 font-semibold block">Blockchain TxID / TxHash:</span>
                  <div className="p-2 bg-white rounded-lg border border-slate-200 font-mono text-[11px] text-slate-900 break-all select-all">
                    {selectedPayment.crypto_tx_hash}
                  </div>
                  <span className="text-[10px] text-slate-400">
                    Network: {selectedPayment.crypto_network || 'N/A'} • Coin: {selectedPayment.crypto_currency || 'N/A'}
                  </span>
                </div>
              )}

              {selectedPayment.failure_reason && (
                <div className="pt-2 border-t border-slate-200 text-red-700">
                  <span className="font-semibold">Recorded Failure Reason:</span>
                  <p>{selectedPayment.failure_reason}</p>
                </div>
              )}
            </div>

            {/* Reconciliation Form */}
            <form onSubmit={handleReconcile} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Reconcile Payment Status
                </label>
                <select
                  value={reconcileStatus}
                  onChange={(e) => setReconcileStatus(e.target.value as PaymentStatus)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500 font-semibold"
                >
                  <option value="completed">Completed / Cleared (Mark as Verified Paid)</option>
                  <option value="under_review">Under Consular Review (Pending Verification)</option>
                  <option value="failed">Failed / Rejected</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Consular Settlement Reference / Provider ID (Optional)
                </label>
                <input
                  type="text"
                  value={providerRef}
                  onChange={(e) => setProviderRef(e.target.value)}
                  placeholder="e.g. BANK-TX-889102 or Etherscan block confirmation"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Mandatory Administrative Reconciliation Note
                </label>
                <textarea
                  rows={2}
                  required
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="e.g. Verified on blockchain explorer / Checked bank transfer statement"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  This note will be logged in the permanent audit trail.
                </span>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedPayment(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReconciliation}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs disabled:opacity-50"
                >
                  {submittingReconciliation ? 'Saving Reconciliation...' : 'Apply Reconciliation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
