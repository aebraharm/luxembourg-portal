'use client';

import React, { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import {
  Globe,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Users,
  AlertTriangle,
  X,
  Search,
  Sparkles,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import { RegionRecord } from '@/lib/types';

export default function AdminRegionsPage() {
  const [regions, setRegions] = useState<RegionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modal states
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<RegionRecord | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<RegionRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchRegions = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/regions');
      const data = await res.json();
      setRegions(data.regions || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load regions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegions();
  }, []);

  const openCreateModal = () => {
    setModalMode('create');
    setSelectedRegion(null);
    setName('');
    setCode('');
    setDescription('');
    setIsActive(true);
    setFormError(null);
  };

  const openEditModal = (r: RegionRecord) => {
    setModalMode('edit');
    setSelectedRegion(r);
    setName(r.name);
    setCode(r.code || '');
    setDescription(r.description || '');
    setIsActive(r.is_active === 1);
    setFormError(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError('Region display name is required.');
      return;
    }

    setSubmitting(true);

    try {
      if (modalMode === 'create') {
        const res = await fetch('/api/regions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            code: code.trim() || null,
            description: description.trim(),
            isActive,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          setFormError(data.error || 'Failed to create region');
          return;
        }

        setSuccess(`Region "${name.trim()}" created successfully.`);
      } else if (modalMode === 'edit' && selectedRegion) {
        const res = await fetch(`/api/regions/${selectedRegion.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            code: code.trim() || null,
            description: description.trim(),
            isActive,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          setFormError(data.error || 'Failed to update region');
          return;
        }

        setSuccess(`Region "${name.trim()}" updated successfully.`);
      }

      setModalMode(null);
      fetchRegions();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      setFormError(err.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);

    try {
      const res = await fetch(`/api/regions/${deleteTarget.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to delete region');
        setDeleteTarget(null);
        return;
      }

      setSuccess(`Region "${deleteTarget.name}" deleted.`);
      setDeleteTarget(null);
      fetchRegions();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to delete region');
    } finally {
      setDeleting(false);
    }
  };

  const filteredRegions = regions.filter((r) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      r.name.toLowerCase().includes(term) ||
      (r.code && r.code.toLowerCase().includes(term)) ||
      (r.description && r.description.toLowerCase().includes(term))
    );
  });

  const totalClientsAssigned = regions.reduce((acc, r) => acc + (r.client_count || 0), 0);
  const activeCount = regions.filter((r) => r.is_active === 1).length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Globe className="w-6 h-6 text-sky-600" />
              Regional Jurisdictions & Configuration
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Configure applicant regional zones. Assigned regions display dynamically on client loading screens and consular profiles.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-600 text-white font-semibold text-sm hover:bg-red-700 transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add New Region
          </button>
        </div>

        {/* Feedback notices */}
        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600" />
            <div className="flex-1">
              <p className="font-semibold">Operation Notice</p>
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

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Regions</div>
            <div className="text-2xl font-bold text-slate-900 mt-2">{regions.length}</div>
            <div className="text-xs text-slate-500 mt-1">{activeCount} active in portal</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Regional Corridors</div>
            <div className="text-2xl font-bold text-emerald-600 mt-2">{activeCount}</div>
            <div className="text-xs text-slate-500 mt-1">Available for client assignment</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Assigned Applicants</div>
            <div className="text-2xl font-bold text-sky-600 mt-2">{totalClientsAssigned}</div>
            <div className="text-xs text-slate-500 mt-1">Across all registered regions</div>
          </div>
        </div>

        {/* Table & Controls */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search regions by name or code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <button
              onClick={fetchRegions}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Region Name</th>
                  <th className="py-3 px-4">Identifier Code</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Assigned Clients</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400">
                      Loading configured regions...
                    </td>
                  </tr>
                ) : filteredRegions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400">
                      No matching regions found.
                    </td>
                  </tr>
                ) : (
                  filteredRegions.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-slate-900 flex items-center gap-2">
                        <Globe className="w-4 h-4 text-sky-500" />
                        {r.name}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-600">
                        {r.code ? (
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                            {r.code}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500 max-w-xs truncate">
                        {r.description || '—'}
                      </td>
                      <td className="py-3.5 px-4">
                        {r.is_active === 1 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                            <XCircle className="w-3 h-3" />
                            Disabled
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-sky-50 text-sky-700 text-xs font-semibold">
                          <Users className="w-3 h-3" />
                          {r.client_count || 0}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(r)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-sky-600 hover:bg-sky-50 transition"
                          title="Edit Region"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(r)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition"
                          title="Delete Region"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Create / Edit Modal */}
        {modalMode && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Globe className="w-5 h-5 text-sky-600" />
                  {modalMode === 'create' ? 'Add Regional Jurisdiction' : `Edit Region: ${selectedRegion?.name}`}
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

              <form onSubmit={handleSave} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Region Display Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Europe, Africa, Asia-Pacific, North America"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Displayed prominently on applicant loading screens (e.g. "Your designated region: Europe").
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Jurisdiction Code (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. EU, AF, APAC, NA"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Description & Consular Scope
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Brief notes regarding diplomatic or visa jurisdiction..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="w-4 h-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500"
                    />
                    <span className="text-sm font-medium text-slate-800">
                      Enable Region for Applicant Assignment
                    </span>
                  </label>
                </div>

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
                    {submitting ? 'Saving...' : modalMode === 'create' ? 'Create Region' : 'Save Changes'}
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
                <h3 className="text-lg font-bold text-slate-900">Delete Region</h3>
              </div>
              <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                Are you sure you want to delete region <span className="font-semibold text-slate-900">"{deleteTarget.name}"</span>?
                {deleteTarget.client_count && deleteTarget.client_count > 0 ? (
                  <span className="block mt-2 text-red-600 font-semibold">
                    Warning: There are {deleteTarget.client_count} client(s) currently assigned to this region. Deletion will be rejected by the server until clients are reassigned.
                  </span>
                ) : null}
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
