'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AdminLayout } from '@/components/AdminLayout';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  X,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  CreditCard,
  User,
  Calendar,
  DollarSign,
  Copy,
  Receipt,
  FileCheck2,
  Ban,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { InvoiceRecord, InvoiceStatus, ClientRecord } from '@/lib/types';

function InvoicesContent() {
  const searchParams = useSearchParams();
  const initialClientId = searchParams?.get('clientId');

  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [clientIdFilter, setClientIdFilter] = useState<string>(initialClientId || 'all');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modal states
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view' | 'cancel' | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRecord | null>(null);

  // Form states
  const [selectedClientId, setSelectedClientId] = useState<number | ''>('');
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [reason, setReason] = useState('Visa application processing fee');
  const [amountEur, setAmountEur] = useState('850.00');
  const [issueDate, setIssueDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState<InvoiceStatus>('issued');
  const [notes, setNotes] = useState('');
  const [adminNotes, setAdminNotes] = useState('');

  // Cancellation modal states
  const [cancellationReason, setCancellationReason] = useState('');
  const [createReplacement, setCreateReplacement] = useState(false);

  // Form submitting
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<InvoiceRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const paymentReasonSuggestions = [
    'Visa application processing fee',
    'Immigration consultation fee',
    'Document assessment fee',
    'Work permit processing fee',
    'EU Blue Card statutory tariff',
    'Family reunification consular charge',
    'Long-Term residence biometric processing',
    'Relocation legal verification fee',
  ];

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      let url = `/api/invoices?search=${encodeURIComponent(search)}&status=${statusFilter}`;
      if (clientIdFilter !== 'all') {
        url += `&clientId=${clientIdFilter}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      setInvoices(data.invoices || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const res = await fetch('/api/clients');
      const data = await res.json();
      setClients(data.clients || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [search, statusFilter, clientIdFilter]);

  const openCreateModal = (preselectedClientId?: number) => {
    setModalMode('create');
    setSelectedInvoice(null);
    setSelectedClientId(preselectedClientId || (clients[0]?.id || ''));
    setClientSearchTerm('');
    setInvoiceNumber('');
    setReason('Visa application processing fee');
    setAmountEur('850.00');
    const today = new Date().toISOString().split('T')[0];
    const due = new Date();
    due.setDate(due.getDate() + 14);
    setIssueDate(today);
    setDueDate(due.toISOString().split('T')[0]);
    setStatus('issued');
    setNotes('Official statutory immigration processing invoice. Settling confirms consular file submission.');
    setAdminNotes('');
    setFormError(null);
  };

  const openEditModal = (inv: InvoiceRecord) => {
    setModalMode('edit');
    setSelectedInvoice(inv);
    setSelectedClientId(inv.client_id);
    setInvoiceNumber(inv.invoice_number);
    setReason(inv.reason);
    setAmountEur(((inv.amount_cents || 0) / 100).toFixed(2));
    setIssueDate(inv.issue_date);
    setDueDate(inv.due_date);
    setStatus(inv.status);
    setNotes(inv.notes || '');
    setAdminNotes(inv.admin_notes || '');
    setFormError(null);
  };

  const openViewModal = (inv: InvoiceRecord) => {
    setModalMode('view');
    setSelectedInvoice(inv);
  };

  const openCancelModal = (inv: InvoiceRecord) => {
    setModalMode('cancel');
    setSelectedInvoice(inv);
    setCancellationReason('Administrative adjustment / duplicate issuance');
    setCreateReplacement(false);
    setFormError(null);
  };

  const handleSaveInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedClientId) {
      setFormError('Please select a client for this invoice.');
      return;
    }

    if (!reason.trim()) {
      setFormError('Reason for payment is required.');
      return;
    }

    const amt = parseFloat(amountEur);
    if (isNaN(amt) || amt <= 0) {
      setFormError('Amount must be a positive number in EUR (€).');
      return;
    }

    setSubmitting(true);

    try {
      if (modalMode === 'create') {
        const res = await fetch('/api/invoices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: selectedClientId,
            invoiceNumber: invoiceNumber.trim() || undefined,
            reason: reason.trim(),
            amountEur,
            issueDate,
            dueDate,
            status,
            notes: notes.trim(),
            adminNotes: adminNotes.trim(),
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          setFormError(data.error || 'Failed to create invoice');
          return;
        }

        setSuccess(`Invoice ${data.invoiceNumber || ''} created successfully.`);
      } else if (modalMode === 'edit' && selectedInvoice) {
        const res = await fetch(`/api/invoices/${selectedInvoice.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reason: reason.trim(),
            amountEur,
            issueDate,
            dueDate,
            status,
            notes: notes.trim(),
            adminNotes: adminNotes.trim(),
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          setFormError(data.error || 'Failed to update invoice');
          return;
        }

        setSuccess(`Invoice ${selectedInvoice.invoice_number} updated successfully.`);
      }

      setModalMode(null);
      fetchInvoices();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      setFormError(err.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    setSubmitting(true);
    setFormError(null);

    try {
      const res = await fetch(`/api/invoices/${selectedInvoice.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'cancelled',
          cancellationReason: cancellationReason.trim(),
          createReplacement,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Failed to cancel invoice');
        return;
      }

      setSuccess(
        `Invoice ${selectedInvoice.invoice_number} cancelled.${
          createReplacement ? ' Replacement invoice was generated.' : ''
        }`
      );
      setModalMode(null);
      fetchInvoices();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      setFormError(err.message || 'Cancellation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);

    try {
      const res = await fetch(`/api/invoices/${deleteTarget.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to delete invoice');
        setDeleteTarget(null);
        return;
      }

      setSuccess(`Invoice ${deleteTarget.invoice_number} deleted.`);
      setDeleteTarget(null);
      fetchInvoices();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to delete invoice');
    } finally {
      setDeleting(false);
    }
  };

  const filteredClientsForSearch = clients.filter((c) => {
    if (!clientSearchTerm.trim()) return true;
    const term = clientSearchTerm.toLowerCase();
    return (
      c.full_name.toLowerCase().includes(term) ||
      c.email.toLowerCase().includes(term) ||
      c.reference_number.toLowerCase().includes(term)
    );
  });

  const getStatusBadge = (inv: InvoiceRecord) => {
    const effStatus = inv.effective_status || inv.status;
    switch (effStatus) {
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Paid
          </span>
        );
      case 'payment_pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
            <Clock className="w-3 h-3 text-sky-600" />
            Payment Pending
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
            Unpaid
          </span>
        );
      case 'draft':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <FileText className="w-3 h-3 text-slate-500" />
            Draft
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200 line-through">
            <Ban className="w-3 h-3 text-slate-400" />
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

  const totalInvoicedCents = invoices
    .filter((i) => i.status !== 'cancelled')
    .reduce((acc, i) => acc + (i.amount_cents || 0), 0);

  const totalPaidCents = invoices
    .filter((i) => i.status === 'paid')
    .reduce((acc, i) => acc + (i.amount_cents || 0), 0);

  const totalPendingCents = invoices
    .filter((i) => i.status === 'issued' || i.status === 'unpaid' || i.status === 'payment_pending' || i.effective_status === 'overdue')
    .reduce((acc, i) => acc + (i.amount_cents || 0), 0);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Receipt className="w-6 h-6 text-sky-600" />
              Consular Invoices & Fee Schedules
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Issue, manage, edit, and track statutory consular fees independently of client registration. All amounts strictly managed in EUR (€).
            </p>
          </div>
          <button
            type="button"
            onClick={() => openCreateModal()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-600 text-white font-semibold text-sm hover:bg-red-700 transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Create Invoice
          </button>
        </div>

        {/* Feedback banners */}
        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600" />
            <div className="flex-1">
              <p className="font-semibold">Notice</p>
              <p className="mt-0.5">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {success && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>{success}</span>
            </div>
            <button onClick={() => setSuccess(null)} className="text-emerald-500 hover:text-emerald-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Financial KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Active Invoices</div>
            <div className="text-2xl font-bold text-slate-900 mt-2">{invoices.length}</div>
            <div className="text-xs text-slate-500 mt-1">Across all consular applicants</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Invoiced (EUR)</div>
            <div className="text-2xl font-bold text-slate-900 mt-2">
              €{(totalInvoicedCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-500 mt-1">Statutory disbursement value</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Collected / Settled</div>
            <div className="text-2xl font-bold text-emerald-600 mt-2">
              €{(totalPaidCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-500 mt-1">Verified remittances received</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Outstanding / Pending</div>
            <div className="text-2xl font-bold text-amber-600 mt-2">
              €{(totalPendingCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-500 mt-1">Awaiting client payment</div>
          </div>
        </div>

        {/* Table & Filtering */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            {/* Search */}
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search invoice #, applicant name, ref..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="all">All Statuses</option>
                <option value="issued">Issued / Unpaid</option>
                <option value="payment_pending">Payment Pending</option>
                <option value="paid">Paid & Verified</option>
                <option value="overdue">Overdue</option>
                <option value="draft">Draft</option>
                <option value="cancelled">Cancelled</option>
              </select>

              <select
                value={clientIdFilter}
                onChange={(e) => setClientIdFilter(e.target.value)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 max-w-[200px]"
              >
                <option value="all">All Clients</option>
                {clients.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.full_name} ({c.reference_number})
                  </option>
                ))}
              </select>

              <button
                onClick={fetchInvoices}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Invoice Number</th>
                  <th className="py-3 px-4">Applicant & Reference</th>
                  <th className="py-3 px-4">Reason for Payment</th>
                  <th className="py-3 px-4">Amount (EUR)</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-400">
                      Loading consular invoices...
                    </td>
                  </tr>
                ) : invoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400">
                      <Receipt className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                      <p className="font-semibold text-slate-700">No invoices found</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Create an invoice for an applicant to begin tracking fees.
                      </p>
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-900 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-sky-600" />
                        {inv.invoice_number}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{inv.client_name || '—'}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono text-sky-700">{inv.client_reference}</span>
                          {inv.client_region && (
                            <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 text-[10px]">
                              {inv.client_region}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-700 max-w-xs truncate">
                        {inv.reason}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        €{((inv.amount_cents || 0) / 100).toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        {inv.due_date}
                      </td>
                      <td className="py-3.5 px-4">
                        {getStatusBadge(inv)}
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1">
                        <button
                          type="button"
                          onClick={() => openViewModal(inv)}
                          className="px-2.5 py-1 text-xs font-semibold rounded text-sky-700 hover:bg-sky-50 transition"
                          title="View Invoice"
                        >
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(inv)}
                          className="px-2.5 py-1 text-xs font-semibold rounded text-slate-700 hover:bg-slate-100 transition"
                          title="Edit Invoice"
                        >
                          Edit
                        </button>
                        {inv.status !== 'cancelled' && (
                          <button
                            type="button"
                            onClick={() => openCancelModal(inv)}
                            className="px-2 py-1 text-xs font-semibold rounded text-amber-700 hover:bg-amber-50 transition"
                            title="Cancel Invoice"
                          >
                            Cancel
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(inv)}
                          className="p-1 rounded text-slate-400 hover:text-red-600 transition"
                          title="Delete Invoice"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Create / Edit Invoice Modal */}
        {(modalMode === 'create' || modalMode === 'edit') && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-2xl w-full p-6 my-8 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-sky-600" />
                  {modalMode === 'create' ? 'Create Consular Invoice' : `Edit Invoice: ${selectedInvoice?.invoice_number}`}
                </h3>
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {formError && (
                <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Notice if editing paid invoice */}
              {modalMode === 'edit' && selectedInvoice?.status === 'paid' && (
                <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0 text-amber-600" />
                  <span>
                    Controlled Safety Workflow: This invoice has confirmed verified payments. The monetary amount is locked and cannot be silently altered. To replace or cancel, use the dedicated cancellation action.
                  </span>
                </div>
              )}

              <form onSubmit={handleSaveInvoice} className="mt-4 space-y-4">
                {/* Client selector (only active on create) */}
                {modalMode === 'create' ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Target Applicant / Client *
                    </label>
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="Type to filter client by name, email, or reference..."
                        value={clientSearchTerm}
                        onChange={(e) => setClientSearchTerm(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                      <select
                        required
                        value={String(selectedClientId)}
                        onChange={(e) => setSelectedClientId(Number(e.target.value))}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                      >
                        <option value="">-- Choose an applicant --</option>
                        {filteredClientsForSearch.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.full_name} | Ref: {c.reference_number} | {c.email}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Applicant
                    </label>
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-900">
                      {selectedInvoice?.client_name} ({selectedInvoice?.client_reference})
                    </div>
                  </div>
                )}

                {/* Reason for payment with suggestions */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Reason for Payment *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Visa application processing fee, Consultation fee..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <span className="text-[11px] text-slate-400 self-center">Suggestions:</span>
                    {paymentReasonSuggestions.slice(0, 4).map((s) => (
                      <button
                        type="button"
                        key={s}
                        onClick={() => setReason(s)}
                        className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 hover:bg-sky-100 hover:text-sky-800 transition"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Amount (EUR) & Status */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Invoice Amount (EUR €) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-500">€</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        required
                        disabled={modalMode === 'edit' && selectedInvoice?.status === 'paid'}
                        placeholder="850.00"
                        value={amountEur}
                        onChange={(e) => setAmountEur(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:bg-slate-100 disabled:text-slate-500"
                      />
                    </div>
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      Strictly EUR (€). Stored securely as integer minor cents.
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Invoice Status *
                    </label>
                    <select
                      value={status}
                      disabled={modalMode === 'edit' && selectedInvoice?.status === 'paid'}
                      onChange={(e) => setStatus(e.target.value as InvoiceStatus)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white disabled:bg-slate-100"
                    >
                      <option value="draft">Draft (hidden from client)</option>
                      <option value="issued">Issued (visible, payable)</option>
                      <option value="unpaid">Unpaid (visible, payable)</option>
                      <option value="payment_pending">Payment Pending (under verification)</option>
                      <option value="paid">Paid (settled)</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Issue Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={issueDate}
                      onChange={(e) => setIssueDate(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Due Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </div>

                {/* Client Instructions & Notes */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Client Visible Instructions & Notes
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Instructions shown to applicant on this invoice..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                {/* Internal Admin Notes */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Internal Consular Administrative Notes (Never Shown to Client)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Internal case tracking, consular file authorization, audit remarks..."
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                {/* Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setModalMode(null)}
                    className="px-4 py-2 text-sm font-semibold rounded-lg text-slate-700 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 text-sm font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 transition disabled:opacity-50"
                  >
                    {submitting ? 'Saving...' : modalMode === 'create' ? 'Issue Invoice' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* View Invoice Modal */}
        {modalMode === 'view' && selectedInvoice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 my-8 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-sky-600" />
                  <span className="font-mono font-bold text-slate-900">{selectedInvoice.invoice_number}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Invoice Sheet View */}
              <div className="mt-4 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-base font-bold text-slate-900">{selectedInvoice.reason}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Applicant: <span className="font-semibold text-slate-800">{selectedInvoice.client_name}</span> (Ref: {selectedInvoice.client_reference})
                    </p>
                    {selectedInvoice.client_region && (
                      <p className="text-xs text-slate-500">
                        Designated Region: <span className="text-sky-700 font-semibold">{selectedInvoice.client_region}</span>
                      </p>
                    )}
                  </div>
                  <div>{getStatusBadge(selectedInvoice)}</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center">
                  <div>
                    <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Total Amount Due</span>
                    <div className="text-2xl font-bold text-slate-900 mt-0.5">
                      €{((selectedInvoice.amount_cents || 0) / 100).toFixed(2)} EUR
                    </div>
                  </div>
                  <div className="text-right text-xs text-slate-500">
                    <div>Issued: <span className="font-medium text-slate-800">{selectedInvoice.issue_date}</span></div>
                    <div>Due: <span className="font-medium text-slate-800">{selectedInvoice.due_date}</span></div>
                  </div>
                </div>

                {selectedInvoice.notes && (
                  <div>
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Applicant Payment Instructions
                    </div>
                    <p className="text-xs text-slate-700 bg-white p-3 rounded-lg border border-slate-200">
                      {selectedInvoice.notes}
                    </p>
                  </div>
                )}

                {selectedInvoice.admin_notes && (
                  <div>
                    <div className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      Internal Consular Notes (Confidential)
                    </div>
                    <p className="text-xs text-slate-700 bg-amber-50/50 p-3 rounded-lg border border-amber-200">
                      {selectedInvoice.admin_notes}
                    </p>
                  </div>
                )}

                <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-100 flex justify-between">
                  <span>Created: {new Date(selectedInvoice.created_at).toLocaleString()}</span>
                  <span>Updated: {new Date(selectedInvoice.updated_at).toLocaleString()}</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 mt-4">
                <button
                  type="button"
                  onClick={() => openEditModal(selectedInvoice)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200"
                >
                  Edit Details
                </button>
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-sky-600 text-white hover:bg-sky-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Cancellation Modal */}
        {modalMode === 'cancel' && selectedInvoice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center gap-3 text-amber-600 mb-3">
                <div className="p-2 rounded-full bg-amber-50">
                  <Ban className="w-6 h-6 text-amber-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Cancel Invoice</h3>
              </div>

              <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                Cancelling invoice <span className="font-semibold text-slate-900">{selectedInvoice.invoice_number}</span> (€{((selectedInvoice.amount_cents || 0) / 100).toFixed(2)}). Cancellation will be recorded in the administrative security audit log.
              </p>

              <form onSubmit={handleCancelInvoice} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Reason for Cancellation *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Applicant requested waiver, duplicated fee..."
                    value={cancellationReason}
                    onChange={(e) => setCancellationReason(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={createReplacement}
                      onChange={(e) => setCreateReplacement(e.target.checked)}
                      className="w-4 h-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500"
                    />
                    <span className="text-xs font-semibold text-slate-800">
                      Issue new replacement invoice immediately
                    </span>
                  </label>
                  <p className="text-[11px] text-slate-500 mt-1 pl-6.5">
                    Generates a new sequential invoice linked to this cancelled record.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setModalMode(null)}
                    className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-700 hover:bg-slate-100"
                  >
                    Go Back
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 text-xs font-semibold rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition disabled:opacity-50"
                  >
                    {submitting ? 'Cancelling...' : 'Confirm Cancellation'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center gap-3 text-red-600 mb-3">
                <div className="p-2 rounded-full bg-red-50">
                  <ShieldAlert className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Delete Invoice</h3>
              </div>
              <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                Are you sure you want to permanently delete invoice <span className="font-semibold text-slate-900">{deleteTarget.invoice_number}</span>?
                {deleteTarget.status === 'paid' && (
                  <span className="block mt-2 text-red-600 font-semibold text-xs">
                    Protected: Paid invoices cannot be deleted to ensure accounting audit compliance.
                  </span>
                )}
              </p>
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="px-4 py-2 text-sm font-semibold rounded-lg text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-5 py-2 text-sm font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 transition disabled:opacity-50"
                >
                  {deleting ? 'Deleting...' : 'Confirm Deletion'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

export default function AdminInvoicesPage() {
  return (
    <Suspense
      fallback={
        <AdminLayout>
          <div className="py-12 text-center text-slate-400">Loading invoices...</div>
        </AdminLayout>
      }
    >
      <InvoicesContent />
    </Suspense>
  );
}
