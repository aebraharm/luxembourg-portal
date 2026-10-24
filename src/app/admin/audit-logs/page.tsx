'use client';

import React, { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import {
  ShieldCheck,
  Search,
  Filter,
  RefreshCw,
  Clock,
  User,
  ShieldAlert,
  ChevronDown,
} from 'lucide-react';
import { AuditLogRecord } from '@/lib/types';

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actorFilter, setActorFilter] = useState('all');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let url = `/api/audit-logs?search=${encodeURIComponent(search)}`;
      if (actorFilter !== 'all') {
        url += `&actorType=${actorFilter}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [search, actorFilter]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Audit &amp; Security Event Logs
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Immutable chronological record of logins, client record changes, payment transactions, and reconciliation decisions.
            </p>
          </div>

          <button
            onClick={fetchLogs}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Refresh Logs</span>
          </button>
        </div>

        {/* Filter bar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by actor email, action type, or details..."
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="w-full sm:w-auto">
            <select
              value={actorFilter}
              onChange={(e) => setActorFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 font-medium w-full sm:w-auto"
            >
              <option value="all">All Actor Types</option>
              <option value="admin">Admin Actions</option>
              <option value="client">Client Actions</option>
              <option value="system">System Events</option>
            </select>
          </div>
        </div>

        {/* Logs Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-6 font-bold">Event ID</th>
                  <th className="py-3 px-6 font-bold">Timestamp (UTC)</th>
                  <th className="py-3 px-6 font-bold">Actor</th>
                  <th className="py-3 px-6 font-bold">Action</th>
                  <th className="py-3 px-6 font-bold">IP Address</th>
                  <th className="py-3 px-6 font-bold">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500 font-sans">
                      Loading audit logs...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500 font-sans">
                      No audit events logged yet.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-6 font-bold text-slate-700">#{log.id}</td>
                      <td className="py-3 px-6 text-slate-600 font-sans text-xs">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="py-3 px-6 font-sans">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            log.actor_type === 'admin'
                              ? 'bg-sky-100 text-sky-800'
                              : log.actor_type === 'client'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {log.actor_type}
                        </span>
                        <div className="text-[11px] text-slate-600 mt-0.5 truncate max-w-xs">
                          {log.actor_email}
                        </div>
                      </td>
                      <td className="py-3 px-6 font-bold text-slate-900 font-mono text-xs">
                        {log.action}
                      </td>
                      <td className="py-3 px-6 text-slate-500">{log.ip_address}</td>
                      <td className="py-3 px-6 max-w-md truncate text-slate-600 font-mono text-[10px]">
                        {log.details}
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
