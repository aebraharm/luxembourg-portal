'use client';

import React, { useEffect, useState, useRef } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import {
  Users,
  Plus,
  Search,
  Filter,
  Download,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  Camera,
  X,
  FileText,
  AlertTriangle,
  User,
  ShieldCheck,
  ChevronDown,
} from 'lucide-react';
import { ClientRecord, PaymentStatus } from '@/lib/types';

export default function AdminClientsPage() {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeFilter, setActiveFilter] = useState('all');

  // Create / Edit modal state
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [selectedClient, setSelectedClient] = useState<ClientRecord | null>(null);

  // Form fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [caseCategory, setCaseCategory] = useState('Work Visa (EU Blue Card - Luxembourg)');
  const [caseDetails, setCaseDetails] = useState('');
  const [amountEur, setAmountEur] = useState('850.00');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('pending');
  const [paymentInstructions, setPaymentInstructions] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [canClientEditPhoto, setCanClientEditPhoto] = useState(true);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Delete confirm
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const fetchClients = async () => {
    setLoading(true);
    try {
      let url = `/api/clients?search=${encodeURIComponent(search)}&status=${statusFilter}`;
      if (activeFilter !== 'all') {
        url += `&active=${activeFilter}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      setClients(data.clients || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [search, statusFilter, activeFilter]);

  const openCreateModal = () => {
    setModalMode('create');
    setSelectedClient(null);
    setFullName('');
    setEmail('');
    setReferenceNumber('');
    setCaseCategory('Work Visa (EU Blue Card - Luxembourg)');
    setCaseDetails('');
    setAmountEur('850.00');
    setPaymentStatus('pending');
    setPaymentInstructions(
      'Please settle the official consular processing fee within 14 calendar days of case notification.'
    );
    setAdminNotes('');
    setIsActive(true);
    setCanClientEditPhoto(true);
    setPhotoUrl(null);
    setFormError(null);
  };

  const openEditModal = (c: ClientRecord) => {
    setModalMode('edit');
    setSelectedClient(c);
    setFullName(c.full_name);
    setEmail(c.email);
    setReferenceNumber(c.reference_number);
    setCaseCategory(c.case_category);
    setCaseDetails(c.case_details || '');
    setAmountEur((c.amount_cents / 100).toFixed(2));
    setPaymentStatus(c.payment_status);
    setPaymentInstructions(c.payment_instructions || '');
    setAdminNotes(c.admin_notes || '');
    setIsActive(c.is_active === 1);
    setCanClientEditPhoto(c.can_client_edit_photo === 1);
    setPhotoUrl(c.photo_url || null);
    setFormError(null);
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Strict validation
    if (!referenceNumber.trim()) {
      setFormError('Reference number is required. The administrator must manually assign this value.');
      return;
    }

    setFormSubmitting(true);

    try {
      const payload = {
        fullName,
        email,
        referenceNumber,
        caseCategory,
        caseDetails,
        amountEur,
        paymentStatus,
        paymentInstructions,
        adminNotes,
        isActive,
        canClientEditPhoto,
        photoUrl,
      };

      const url = modalMode === 'create' ? '/api/clients' : `/api/clients/${selectedClient?.id}`;
      const method = modalMode === 'create' ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Failed to save client record.');
      } else {
        setModalMode(null);
        fetchClients();
      }
    } catch (err: any) {
      setFormError(err.message || 'Error communicating with server.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (modalMode === 'edit' && selectedClient) {
      const formData = new FormData();
      formData.append('photo', file);
      const res = await fetch(`/api/clients/${selectedClient.id}/photo`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.photoUrl) {
        setPhotoUrl(data.photoUrl);
      }
    } else {
      // In create mode, read as local base64 data preview
      const reader = new FileReader();
      reader.onload = () => {
        setPhotoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteClient = async (id: number) => {
    try {
      const res = await fetch(`/api/clients/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setDeleteId(null);
        fetchClients();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const exportCsv = () => {
    window.location.href = `/api/clients?search=${encodeURIComponent(search)}&status=${statusFilter}&export=csv`;
  };

  const exportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(clients, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `clients_export_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
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
      <div className="space-y-6">
        {/* Header & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Client &amp; Case Reference Records
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Create, edit, and assign manual reference numbers and EUR fee obligations to immigration applicants.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={exportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={exportJson}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export JSON</span>
            </button>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-600/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Create Client Record</span>
            </button>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by applicant name, email, manual reference number, or case category..."
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 font-medium"
            >
              <option value="all">All Payment Statuses</option>
              <option value="pending">Pending</option>
              <option value="under_review">Under Review</option>
              <option value="completed">Completed / Paid</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 font-medium"
            >
              <option value="all">All Accounts</option>
              <option value="1">Active Only</option>
              <option value="0">Inactive Only</option>
            </select>
          </div>
        </div>

        {/* Clients Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-6 font-bold">Applicant</th>
                  <th className="py-3 px-6 font-bold">Reference Number</th>
                  <th className="py-3 px-6 font-bold">Case Category</th>
                  <th className="py-3 px-6 font-bold">Assigned Fee</th>
                  <th className="py-3 px-6 font-bold">Payment Status</th>
                  <th className="py-3 px-6 font-bold">Account</th>
                  <th className="py-3 px-6 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      Loading consular client records...
                    </td>
                  </tr>
                ) : clients.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      No client records match the current filters.
                    </td>
                  </tr>
                ) : (
                  clients.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-6">
                        <div className="flex items-center gap-3">
                          {c.photo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={c.photo_url}
                              alt={c.full_name}
                              className="w-9 h-9 rounded-full object-cover border border-slate-200"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-xs">
                              {c.full_name.charAt(0)}
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-slate-900">{c.full_name}</div>
                            <div className="text-[11px] text-slate-500">{c.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-6">
                        <span className="font-mono font-bold text-sky-800 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
                          {c.reference_number}
                        </span>
                        <span className="block text-[10px] text-slate-400 mt-0.5">Manual Entry</span>
                      </td>
                      <td className="py-3 px-6 text-slate-700 font-medium max-w-xs truncate">
                        {c.case_category}
                      </td>
                      <td className="py-3 px-6 font-bold text-slate-900 text-sm">
                        {(c.amount_cents / 100).toLocaleString('en-US', {
                          style: 'currency',
                          currency: 'EUR',
                        })}
                      </td>
                      <td className="py-3 px-6">
                        {getStatusBadge(c.payment_status)}
                      </td>
                      <td className="py-3 px-6">
                        {c.is_active === 1 ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(c)}
                            className="p-1.5 text-slate-500 hover:text-sky-700 hover:bg-sky-50 rounded-lg transition-colors"
                            title="Edit Client Record"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteId(c.id)}
                            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Client Record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create / Edit Client Modal */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 border border-slate-200 shadow-2xl my-8 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {modalMode === 'create' ? 'Create New Client Record' : 'Edit Client Record'}
                </h3>
                <p className="text-xs text-slate-500">
                  All reference numbers must be manually assigned by the administrator.
                </p>
              </div>
              <button onClick={() => setModalMode(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveClient} className="space-y-4">
              {/* Photo preview and upload */}
              <div className="flex items-center gap-4 pb-2 border-b border-slate-100">
                <div className="relative">
                  {photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={photoUrl}
                      alt="Preview"
                      className="w-16 h-16 rounded-2xl object-cover border border-slate-200 shadow-xs"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                      <User className="w-8 h-8" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-sky-600 text-white flex items-center justify-center shadow-xs hover:bg-sky-700"
                    title="Upload photograph"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="file"
                    ref={photoInputRef}
                    onChange={handlePhotoUpload}
                    accept="image/png, image/jpeg, image/jpg, image/webp"
                    className="hidden"
                  />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Client Profile Photograph
                  </span>
                  <p className="text-[11px] text-slate-500">
                    PNG, JPG, or WEBP up to 2MB. Optional official portrait.
                  </p>
                  {photoUrl && (
                    <button
                      type="button"
                      onClick={() => setPhotoUrl(null)}
                      className="text-[11px] text-red-600 font-semibold hover:underline mt-1"
                    >
                      Remove Photo
                    </button>
                  )}
                </div>
              </div>

              {/* Row 1: Name and Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Elena Rostova"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Applicant Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. elena.rostova@example.com"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              {/* Row 2: Manually Assigned Reference Number & Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Reference Number (MANUAL ONLY) *
                    </label>
                  </div>
                  <input
                    type="text"
                    required
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    placeholder="e.g. LUX-VISA-2026-8812"
                    className="w-full px-3 py-2 text-xs font-mono font-bold tracking-wider uppercase rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Must be uniquely assigned by admin. Never auto-generated.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Assigned Fee in EUR (€) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                      €
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={amountEur}
                      onChange={(e) => setAmountEur(e.target.value)}
                      placeholder="850.00"
                      className="w-full pl-7 pr-3 py-2 text-xs font-bold rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </div>
              </div>

              {/* Row 3: Case Category and Payment Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Visa / Case Category
                  </label>
                  <input
                    type="text"
                    required
                    value={caseCategory}
                    onChange={(e) => setCaseCategory(e.target.value)}
                    placeholder="e.g. Work Visa (EU Blue Card)"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Payment Status
                  </label>
                  <select
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="under_review">Under Consular Review</option>
                    <option value="completed">Completed / Paid</option>
                    <option value="failed">Failed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              {/* Case details and instructions */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Consular File Details &amp; Application Notes
                </label>
                <textarea
                  rows={2}
                  value={caseDetails}
                  onChange={(e) => setCaseDetails(e.target.value)}
                  placeholder="Case notes, consular file ID, or applicant comments..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Payment Instructions Displayed to Client
                </label>
                <textarea
                  rows={2}
                  value={paymentInstructions}
                  onChange={(e) => setPaymentInstructions(e.target.value)}
                  placeholder="Instructions for settlement..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500"
                />
              </div>

              {/* Admin Internal Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Internal Administrative Notes (Confidential)
                </label>
                <input
                  type="text"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Internal notes visible to consular admins only"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500"
                />
              </div>

              {/* Toggles */}
              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-6 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 text-sky-600 rounded-sm focus:ring-sky-500"
                  />
                  <span className="font-semibold text-slate-800">Account Active (Allows Login)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={canClientEditPhoto}
                    onChange={(e) => setCanClientEditPhoto(e.target.checked)}
                    className="w-4 h-4 text-sky-600 rounded-sm focus:ring-sky-500"
                  />
                  <span className="font-semibold text-slate-800">Client Can Edit Photo</span>
                </label>
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-600/20 disabled:opacity-50"
                >
                  {formSubmitting ? 'Saving Record...' : modalMode === 'create' ? 'Create Client' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 border border-slate-200 shadow-xl space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-bold text-slate-900">Confirm Deletion</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete this client record? All associated payment histories and access tokens will be removed.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteId(null)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteClient(deleteId)}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold"
              >
                Delete Client
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
