'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BrandLogo } from './BrandLogo';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Settings,
  ShieldCheck,
  FileText,
  Activity,
  LogOut,
  KeyRound,
  AlertTriangle,
  Menu,
  X,
  ExternalLink,
  Sliders,
  Palette,
  Globe,
  Coins,
  ShieldAlert,
} from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [admin, setAdmin] = useState<{
    id: number;
    email: string;
    fullName: string;
    role: string;
    mustChangePassword: boolean;
  } | null>(null);

  const [branding, setBranding] = useState<{
    agency_name: string;
    tagline: string;
    logo_url: string | null;
  }>({
    agency_name: 'Luxembourg Global Visa & Immigration Services',
    tagline: 'Consular Administration',
    logo_url: null,
  });

  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/admin/me'),
      fetch('/api/settings'),
    ])
      .then(async ([adminRes, settingsRes]) => {
        if (!adminRes.ok) {
          router.push('/admin/login');
          return;
        }
        const adminData = await adminRes.json();
        if (!adminData.authenticated || !adminData.admin) {
          router.push('/admin/login');
          return;
        }
        setAdmin(adminData.admin);

        const settingsData = await settingsRes.json();
        if (settingsData.branding) setBranding(settingsData.branding);
      })
      .catch((err) => {
        console.error(err);
        router.push('/admin/login');
      })
      .finally(() => setLoading(false));
  }, [router]);

  const handleLogout = async () => {
    await fetch('/api/auth/admin/logout', { method: 'POST' });
    router.push('/admin/login');
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    setPasswordSubmitting(true);

    try {
      const res = await fetch('/api/auth/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        setPasswordError(data.error || 'Failed to update password');
      } else {
        setPasswordSuccess(true);
        setAdmin((prev) => (prev ? { ...prev, mustChangePassword: false } : null));
        setTimeout(() => {
          setShowPasswordModal(false);
          setPasswordSuccess(false);
          setNewPassword('');
          setConfirmPassword('');
        }, 1500);
      }
    } catch (err: any) {
      setPasswordError(err.message || 'Error updating password');
    } finally {
      setPasswordSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-semibold text-slate-300">Authenticating Consular Admin Session...</span>
        </div>
      </div>
    );
  }

  if (!admin) return null;

  const navLinks = [
    { label: 'Overview', href: '/admin', icon: LayoutDashboard },
    { label: 'Clients', href: '/admin/clients', icon: Users },
    { label: 'Invoices', href: '/admin/invoices', icon: FileText },
    { label: 'Regions', href: '/admin/regions', icon: Globe },
    { label: 'Payments', href: '/admin/payments', icon: CreditCard },
    { label: 'Settings', href: '/admin/settings', icon: Sliders },
    { label: 'Audit Logs', href: '/admin/audit-logs', icon: ShieldCheck },
    { label: 'Health', href: '/admin/health', icon: Activity },
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col antialiased">
      {/* Top Banner if Initial Password has not been changed */}
      {admin.mustChangePassword && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2 text-xs font-bold flex items-center justify-between">
          <div className="flex items-center gap-2 max-w-5xl mx-auto w-full">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>
              SECURITY REQUIREMENT: You are currently using default initial administrator credentials (portal@gmail.com / 12345678). Please replace this password immediately.
            </span>
            <button
              onClick={() => setShowPasswordModal(true)}
              className="ml-auto underline hover:text-white px-2 py-0.5 rounded-sm bg-slate-950 text-white font-semibold text-[11px]"
            >
              Change Password Now
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-slate-900 text-white flex-shrink-0 border-r border-slate-800">
          {/* Admin Brand */}
          <div className="p-5 border-b border-slate-800">
            <BrandLogo
              logoUrl={branding.logo_url}
              agencyName={branding.agency_name}
              tagline="Consular Admin Portal"
              size="sm"
              href="/admin"
            />
          </div>

          {/* Nav links */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                    isActive
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Quick link to view live client portal */}
          <div className="p-3 border-t border-slate-800">
            <Link
              href="/"
              target="_blank"
              className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-medium transition-colors"
            >
              <span>View Client Portal</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </Link>
          </div>

          {/* Admin User Footer */}
          <div className="p-4 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">{admin.fullName}</p>
              <p className="text-[10px] text-slate-400 truncate">{admin.email}</p>
            </div>
            <button
              onClick={() => setShowPasswordModal(true)}
              title="Change Password"
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <KeyRound className="w-4 h-4" />
            </button>
            <button
              onClick={handleLogout}
              title="Logout"
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {/* Top Header */}
          <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 flex-shrink-0">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              <h2 className="text-sm font-bold text-slate-800 tracking-tight">
                Consular Case Remittance Control Console
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Admin Ledger
              </span>

              <button
                onClick={() => setShowPasswordModal(true)}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
              >
                <KeyRound className="w-3.5 h-3.5 text-slate-500" />
                <span>Change Password</span>
              </button>

              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors shadow-xs"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            </div>
          </header>

          {/* Mobile Drawer */}
          {mobileMenuOpen && (
            <div className="lg:hidden bg-slate-900 text-white p-4 space-y-2 border-b border-slate-800 animate-in slide-in-from-top duration-200">
              {navLinks.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold ${
                      isActive ? 'bg-sky-600 text-white' : 'text-slate-400 hover:bg-slate-800 text-slate-200'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
              <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-xs">
                <span>{admin.email}</span>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setShowPasswordModal(true);
                  }}
                  className="text-sky-400 underline"
                >
                  Change Password
                </button>
              </div>
            </div>
          )}

          {/* Page Body */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 sm:p-8 border border-slate-200 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-sky-600" />
                <h3 className="text-base font-bold text-slate-900">Change Admin Password</h3>
              </div>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {passwordSuccess ? (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold text-center">
                Password updated successfully!
              </div>
            ) : (
              <form onSubmit={handlePasswordChange} className="space-y-4">
                {passwordError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                    <span>{passwordError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    New Secure Password (min 8 chars)
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={passwordSubmitting}
                    className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs disabled:opacity-50"
                  >
                    {passwordSubmitting ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
