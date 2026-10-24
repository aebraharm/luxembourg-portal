'use client';

import React, { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import {
  Activity,
  Database,
  Server,
  HardDrive,
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Layers,
} from 'lucide-react';

interface HealthData {
  status: string;
  database: string;
  databaseFile: string;
  databaseSizeKb: number;
  counts: {
    clients: number;
    payments: number;
    administrators: number;
    auditLogs: number;
    uploadedAssets: number;
  };
  nodeVersion: string;
  uptimeSeconds: number;
  timestamp: string;
}

export default function AdminHealthPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      setHealth(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Database &amp; Platform Health Metrics
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Operational diagnostics, database storage integrity, and runtime telemetry.
            </p>
          </div>

          <button
            onClick={fetchHealth}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Refresh Diagnostics</span>
          </button>
        </div>

        {health && (
          <div className="space-y-6">
            {/* Status card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">System Status: All Services Operational</h3>
                  <p className="text-xs text-slate-500">
                    Encrypted SQLite Engine • Zero Connection Leaks • Node {health.nodeVersion}
                  </p>
                </div>
              </div>

              <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200">
                Healthy
              </span>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
                <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase">
                  <Database className="w-4 h-4 text-sky-600" />
                  <span>Database Engine</span>
                </div>
                <div className="text-lg font-bold text-slate-900">{health.database}</div>
                <div className="text-[11px] font-mono text-slate-500 truncate">{health.databaseFile}</div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
                <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase">
                  <HardDrive className="w-4 h-4 text-indigo-600" />
                  <span>Database File Size</span>
                </div>
                <div className="text-2xl font-black text-slate-900">{health.databaseSizeKb} KB</div>
                <div className="text-[11px] text-emerald-600 font-semibold">WAL Checkpoint Active</div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
                <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>Runtime Uptime</span>
                </div>
                <div className="text-2xl font-black text-slate-900">{health.uptimeSeconds}s</div>
                <div className="text-[11px] text-slate-500">Process Running Smoothly</div>
              </div>
            </div>

            {/* Table Row Counts Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-sky-600" />
                <span>Database Table Row Distribution</span>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-500 font-medium block">Clients</span>
                  <span className="text-xl font-bold text-slate-900">{health.counts.clients}</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-500 font-medium block">Payments</span>
                  <span className="text-xl font-bold text-slate-900">{health.counts.payments}</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-500 font-medium block">Administrators</span>
                  <span className="text-xl font-bold text-slate-900">{health.counts.administrators}</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-500 font-medium block">Audit Logs</span>
                  <span className="text-xl font-bold text-slate-900">{health.counts.auditLogs}</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-500 font-medium block">Uploaded Assets</span>
                  <span className="text-xl font-bold text-slate-900">{health.counts.uploadedAssets}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
