'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
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
  Globe,
  Receipt,
  ExternalLink,
} from 'lucide-react';
import { ClientRecord, PaymentStatus, RegionRecord } from '@/lib/types';

export default function AdminClientsPage() {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [regions, setRegions] = useState<RegionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [regionFilter, setRegionFilter] = useState('all');
  const [activeFilter, setActiveFilter] = useState('all');

  // Create / Edit modal state
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [selectedClient, setSelectedClient] = useState<ClientRecord | null>(null);

  // Form fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [regionId, setRegionId] = useState<string>('');
  const [caseCategory, setCaseCategory] = useState('Work Visa (EU Blue Card - Luxembourg)');
  const [caseDetails, setCaseDetails] = useState('');
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

  const fetchRegions = async () => {
    try {
      const res = await fetch('/api/regions');
      const data = await res.json();
      setRegions(data.regions || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchClients = async () => {
    setLoading(true);
    try {
      let url = `/api/clients?search=${encodeURIComponent(search)}&status=${statusFilter}`;
      if (regionFilter !== 'all') {
        url += `&regionId=${regionFilter}`;
      }
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
    fetchRegions();
  }, []);

  useEffect(() => {
    fetchClients();
  }, [search, statusFilter, regionFilter, activeFilter]);

  const openCreateModal = () => {
    setModalMode('create');
    setSelectedClient(null);
    setFullName('');
    setEmail('');
    setReferenceNumber('');
    setRegionId(regions[0]?.id ? String(regions[0].id) : '');
    setCaseCategory('Work Visa (EU Blue Card - Luxembourg)');
    setCaseDetails('');
    setPaymentStatus('pending');
    setPaymentInstructions(
      'Official statutory consular processing. Fee schedules and invoices are managed independently in the Invoices dashboard.'
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
    setRegionId(c.region_id ? String(c.region_id) : '');
    setCaseCategory(c.case_category);
    setCaseDetails(c.case_details || '');
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
        regionId: regionId ? parseInt(regionId, 10) : null,
        caseCategory,
        caseDetails,
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
        fetchClients();
      } else {
        setFormError(data.error || 'Failed to upload photo');
      }
    } else {
      // Direct base64 preview for create modal
      const reader = new FileReader();
      reader.onload = () => {
        setPhotoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteClient = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/clients/${deleteId}`, { method: 'DELETE' });
      if (res.ok) {
        setDeleteId(null);
        fetchClients();
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to delete client');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getStatusBadge = (status: PaymentStatus) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Paid
          </span>
        );
      case 'under_review':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
            <Clock className="w-3 h-3 text-sky-600" />
            Under Review
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3 h-3 text-rose-600" />
            Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" />
            Pending
          </span>
        );
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page Title & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Users className="w-6 h-6 text-sky-600" />
              Consular Applicant Client Registry
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Register applicant accounts, configure regional assignments, and manage case profiles independently of invoice issuance.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <a
              href="/api/clients?export=csv"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </a>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              Add New Client
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by full name, email, manual reference number, or case..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Region Filter */}
            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="all">All Regions</option>
              <option value="unassigned">⚠️ Unassigned Region</option>
              {regions.map((r) => (
                <option key={r.id} value={String(r.id)}>
                  {r.name}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="all">All Payment Statuses</option>
              <option value="pending">Pending</option>
              <option value="under_review">Under Review</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>

            {/* Active state filter */}
            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="all">All Records</option>
              <option value="1">Active Only</option>
              <option value="0">Inactive Only</option>
            </select>
          </div>
        </div>

        {/* Client Records Table */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] uppercase font-bold text-slate-500 tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-6">Applicant Details</th>
                  <th className="py-3 px-6">Reference Number</th>
                  <th className="py-3 px-6">Assigned Region</th>
                  <th className="py-3 px-6">Visa Case Category</th>
                  <th className="py-3 px-6">Case Status</th>
                  <th className="py-3 px-6">Account</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      Loading consular client database...
                    </td>
                  </tr>
                ) : clients.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No matching applicant records found.
                    </td>
                  </tr>
                ) : (
                  clients.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-3">
                          {c.photo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={c.photo_url}
                              alt={c.full_name}
                              className="w-8 h-8 rounded-full object-cover border border-slate-200"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                              <User className="w-4 h-4" />
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-slate-900">{c.full_name}</div>
                            <div className="text-[11px] text-slate-400">{c.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-6">
                        <span className="font-mono font-bold text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-200 tracking-wide">
                          {c.reference_number}
                        </span>
                      </td>
                      <td className="py-3.5 px-6">
                        {c.region_name ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-sky-50 text-sky-800 border border-sky-200">
                            <Globe className="w-3 h-3 text-sky-600" />
                            {c.region_name}
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200"
                            title="No region assigned to this client"
                          >
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            No region assigned
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-6 text-slate-700 max-w-xs truncate">
                        {c.case_category}
                      </td>
                      <td className="py-3.5 px-6">
                        {getStatusBadge(c.payment_status)}
                      </td>
                      <td className="py-3.5 px-6">
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
                      <td className="py-3.5 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/admin/invoices?clientId=${c.id}`}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded text-sky-700 hover:bg-sky-50 border border-transparent hover:border-sky-200 transition"
                            title="View / Create Invoices for Applicant"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                            Invoices
                          </Link>
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
                  Reference numbers are manually assigned. Fee schedules and invoices are managed independently in Invoices.
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
                  <h4 className="text-xs font-bold text-slate-800">Biometric Passport Photo</h4>
                  <p className="text-[11px] text-slate-500">
                    PNG, JPG, or WEBP up to 5MB. Stored persistently in secure storage.
                  </p>
                </div>
              </div>

              {/* Row 1: Full Name and Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Full Legal Name *
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
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="applicant@example.com"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              {/* Row 2: Manually Assigned Reference Number & Configurable Region */}
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
                    Configurable Region
                  </label>
                  <select
                    value={regionId}
                    onChange={(e) => setRegionId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500 bg-white"
                  >
                    <option value="">-- No Region Assigned --</option>
                    {regions.map((r) => (
                      <option key={r.id} value={String(r.id)}>
                        {r.name} {r.code ? `(${r.code})` : ''}
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Displays on the client's branded loading screen upon sign-in.
                  </span>
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
                    Consular Payment Status
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
                  General Instructions Displayed to Client
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
              <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500"
                  />
                  <span className="text-xs font-semibold text-slate-700">Account Active</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={canClientEditPhoto}
                    onChange={(e) => setCanClientEditPhoto(e.target.checked)}
                    className="w-4 h-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500"
                  />
                  <span className="text-xs font-semibold text-slate-700">
                    Allow Applicant Photo Uploads
                  </span>
                </label>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 text-xs font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 transition disabled:opacity-50"
                >
                  {formSubmitting ? 'Saving...' : modalMode === 'create' ? 'Create Client' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 border border-slate-200 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900">Delete Client Record</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to delete this applicant? This action cannot be reversed.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 py-2 text-xs font-semibold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteClient}
                className="flex-1 py-2 text-xs font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
