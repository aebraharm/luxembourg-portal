'use client';

import React, { useEffect, useState, useRef } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import {
  Sliders,
  Image as ImageIcon,
  Palette,
  Globe,
  Loader,
  UserCheck,
  FileCheck2,
  CreditCard,
  Coins,
  Mail,
  ShieldCheck,
  FileText,
  Activity,
  Save,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Trash2,
  Eye,
  Plus,
  RefreshCw,
} from 'lucide-react';
import {
  AgencyBrandingSettings,
  ThemeSettings,
  LoadingScreenSettings,
  HomepageSettings,
  PaymentMethodSettings,
  LegalContentSettings,
  SecuritySettings,
} from '@/lib/types';

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<string>('branding');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Settings states
  const [branding, setBranding] = useState<AgencyBrandingSettings | null>(null);
  const [theme, setTheme] = useState<ThemeSettings | null>(null);
  const [loadingConfig, setLoadingConfig] = useState<LoadingScreenSettings | null>(null);
  const [homepage, setHomepage] = useState<HomepageSettings | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodSettings | null>(null);
  const [legal, setLegal] = useState<LegalContentSettings | null>(null);
  const [security, setSecurity] = useState<SecuritySettings | null>(null);

  // General settings state
  const [general, setGeneral] = useState({
    default_currency: 'EUR',
    timezone: 'Europe/Luxembourg (CET/CEST)',
    consular_jurisdiction: 'Grand Duchy of Luxembourg & European Union',
    support_escalation_email: 'consular-compliance@lux-immigration-portal.eu',
  });

  // Logo upload ref
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const fetchAllSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.branding) setBranding(data.branding);
      if (data.theme) setTheme(data.theme);
      if (data.loading) setLoadingConfig(data.loading);
      if (data.homepage) setHomepage(data.homepage);
      if (data.paymentMethods) setPaymentMethods(data.paymentMethods);
      if (data.legal) setLegal(data.legal);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchAllSettings();
  }, []);

  const saveCurrentSection = async (key: string, value: any, categoryName = 'general') => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value, category: categoryName }),
      });

      const data = await res.json();
      if (!res.ok) {
        setSaveError(data.error || 'Failed to save settings.');
      } else {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
      }
    } catch (err: any) {
      setSaveError(err.message || 'Error saving settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    setSaveError(null);

    const formData = new FormData();
    formData.append('logo', file);

    try {
      const res = await fetch('/api/branding/logo', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setSaveError(data.error || 'Failed to upload agency logo.');
      } else {
        setBranding((prev) => (prev ? { ...prev, logo_url: data.logo_url } : null));
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
      }
    } catch (err: any) {
      setSaveError(err.message || 'Error uploading logo');
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  const handleLogoRemove = async () => {
    setUploadingLogo(true);
    try {
      const res = await fetch('/api/branding/logo', { method: 'DELETE' });
      if (res.ok) {
        setBranding((prev) => (prev ? { ...prev, logo_url: null } : null));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUploadingLogo(false);
    }
  };

  const tabs = [
    { id: 'branding', label: 'Branding & Logo', icon: ImageIcon },
    { id: 'theme', label: 'Theme & Design System', icon: Palette },
    { id: 'homepage', label: 'Homepage Content', icon: Globe },
    { id: 'loading', label: 'Loading Screen Transitions', icon: Loader },
    { id: 'methods', label: 'Payment Methods & Order', icon: CreditCard },
    { id: 'card', label: 'Card Payment (Demo/Live)', icon: CreditCard },
    { id: 'paypal', label: 'PayPal Configuration', icon: Globe },
    { id: 'crypto', label: 'Cryptocurrency Settings', icon: Coins },
    { id: 'client_portal', label: 'Client Portal Rules', icon: UserCheck },
    { id: 'reference_numbers', label: 'Manual Reference Number Policies', icon: FileCheck2 },
    { id: 'notifications', label: 'Email & Notifications', icon: Mail },
    { id: 'security', label: 'Security & Sessions', icon: ShieldCheck },
    { id: 'legal', label: 'Legal & Policy Content', icon: FileText },
    { id: 'general', label: 'General Consular Settings', icon: Sliders },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Website &amp; Consular System Configuration
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Data-driven configuration: branding, theme tokens, payment outcomes, and multi-step parameters.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {saveSuccess && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-bold animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Settings Saved!
              </span>
            )}
            {saveError && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-100 text-red-800 text-xs font-bold animate-in fade-in">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                {saveError}
              </span>
            )}
          </div>
        </div>

        {/* Settings Navigation Tabs */}
        <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-sm overflow-x-auto flex gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isCurrent = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSaveSuccess(false);
                  setSaveError(null);
                }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                  isCurrent
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Panes */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
          {/* TAB 1: BRANDING & LOGO */}
          {activeTab === 'branding' && branding && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <h3 className="text-base font-bold text-slate-900">Agency Branding &amp; Logo Assets</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  The uploaded logo is rendered across client headers, login screens, loading transition screens, and email receipts.
                </p>
              </div>

              {/* Logo Upload & Preview Area */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Official Agency Logo
                </label>
                <div className="flex items-center gap-5">
                  {branding.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={branding.logo_url}
                      alt="Agency Logo"
                      className="w-20 h-20 object-contain rounded-xl bg-white border border-slate-200 p-2 shadow-xs"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-white border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400">
                      <ImageIcon className="w-8 h-8" />
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        disabled={uploadingLogo}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{branding.logo_url ? 'Replace Logo' : 'Upload New Logo'}</span>
                      </button>

                      {branding.logo_url && (
                        <button
                          type="button"
                          onClick={handleLogoRemove}
                          disabled={uploadingLogo}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 hover:bg-red-50 text-red-600 text-xs font-semibold transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      PNG, SVG, WEBP, or JPG format up to 3MB. Recommended resolution: 512x512px.
                    </p>
                    <input
                      type="file"
                      ref={logoInputRef}
                      onChange={handleLogoUpload}
                      accept="image/png, image/svg+xml, image/webp, image/jpeg"
                      className="hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Text fields */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Official Agency Name
                  </label>
                  <input
                    type="text"
                    value={branding.agency_name}
                    onChange={(e) => setBranding({ ...branding, agency_name: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Agency Tagline / Subtitle
                  </label>
                  <input
                    type="text"
                    value={branding.tagline}
                    onChange={(e) => setBranding({ ...branding, tagline: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Support Email
                    </label>
                    <input
                      type="email"
                      value={branding.support_email}
                      onChange={(e) => setBranding({ ...branding, support_email: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Support Phone Number
                    </label>
                    <input
                      type="text"
                      value={branding.support_phone}
                      onChange={(e) => setBranding({ ...branding, support_phone: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Office Address
                  </label>
                  <input
                    type="text"
                    value={branding.office_address}
                    onChange={(e) => setBranding({ ...branding, office_address: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Support Operating Hours
                  </label>
                  <input
                    type="text"
                    value={branding.support_hours}
                    onChange={(e) => setBranding({ ...branding, support_hours: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => saveCurrentSection('branding', branding, 'branding')}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-600/20"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Saving...' : 'Save Branding Changes'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: THEME & DESIGN SYSTEM */}
          {activeTab === 'theme' && theme && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <h3 className="text-base font-bold text-slate-900">Design System Tokens</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Fintech guidelines: Primary background white, secondary sky blue, primary clickable buttons red, text dark navy.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Primary Button Action Color (Red)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={theme.primary_color}
                      onChange={(e) => setTheme({ ...theme, primary_color: e.target.value })}
                      className="w-10 h-10 rounded-xl cursor-pointer border border-slate-200"
                    />
                    <input
                      type="text"
                      value={theme.primary_color}
                      onChange={(e) => setTheme({ ...theme, primary_color: e.target.value })}
                      className="flex-1 px-3 py-2 text-xs font-mono rounded-xl border border-slate-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Secondary Color (Sky Blue)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={theme.secondary_sky}
                      onChange={(e) => setTheme({ ...theme, secondary_sky: e.target.value })}
                      className="w-10 h-10 rounded-xl cursor-pointer border border-slate-200"
                    />
                    <input
                      type="text"
                      value={theme.secondary_sky}
                      onChange={(e) => setTheme({ ...theme, secondary_sky: e.target.value })}
                      className="flex-1 px-3 py-2 text-xs font-mono rounded-xl border border-slate-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Card Border Radius
                  </label>
                  <input
                    type="text"
                    value={theme.card_radius}
                    onChange={(e) => setTheme({ ...theme, card_radius: e.target.value })}
                    placeholder="0.75rem or 1rem"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Button Border Radius
                  </label>
                  <input
                    type="text"
                    value={theme.button_radius}
                    onChange={(e) => setTheme({ ...theme, button_radius: e.target.value })}
                    placeholder="0.5rem or 0.75rem"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => saveCurrentSection('theme', theme, 'theme')}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-600/20"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Saving...' : 'Save Theme Tokens'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: HOMEPAGE CONTENT */}
          {activeTab === 'homepage' && homepage && (
            <div className="space-y-6 max-w-3xl">
              <div>
                <h3 className="text-base font-bold text-slate-900">Public Homepage Content &amp; Sections</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Every headline, supporting paragraph, FAQ, and section visibility toggle is editable below.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Hero Section Badge Text
                  </label>
                  <input
                    type="text"
                    value={homepage.hero_badge}
                    onChange={(e) => setHomepage({ ...homepage, hero_badge: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Hero Primary Headline
                  </label>
                  <input
                    type="text"
                    value={homepage.hero_headline}
                    onChange={(e) => setHomepage({ ...homepage, hero_headline: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Hero Supporting Description
                  </label>
                  <textarea
                    rows={3}
                    value={homepage.hero_description}
                    onChange={(e) => setHomepage({ ...homepage, hero_description: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Hero Primary Button Label
                    </label>
                    <input
                      type="text"
                      value={homepage.hero_button_text}
                      onChange={(e) => setHomepage({ ...homepage, hero_button_text: e.target.value })}
                      className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Hero Secondary Security Notice
                    </label>
                    <input
                      type="text"
                      value={homepage.hero_secondary_info}
                      onChange={(e) => setHomepage({ ...homepage, hero_secondary_info: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                    />
                  </div>
                </div>

                {/* Section Visibility Toggles */}
                <div className="pt-4 border-t border-slate-100">
                  <span className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                    Homepage Section Visibility Controls
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg bg-slate-50 border border-slate-200">
                      <input
                        type="checkbox"
                        checked={homepage.show_welcome_section}
                        onChange={(e) => setHomepage({ ...homepage, show_welcome_section: e.target.checked })}
                        className="rounded-sm text-sky-600"
                      />
                      <span>Show Welcome &amp; Consular Mission</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg bg-slate-50 border border-slate-200">
                      <input
                        type="checkbox"
                        checked={homepage.show_instructions_section}
                        onChange={(e) => setHomepage({ ...homepage, show_instructions_section: e.target.checked })}
                        className="rounded-sm text-sky-600"
                      />
                      <span>Show 4-Step Reference Instructions</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg bg-slate-50 border border-slate-200">
                      <input
                        type="checkbox"
                        checked={homepage.show_methods_section}
                        onChange={(e) => setHomepage({ ...homepage, show_methods_section: e.target.checked })}
                        className="rounded-sm text-sky-600"
                      />
                      <span>Show Payment Methods Overview</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg bg-slate-50 border border-slate-200">
                      <input
                        type="checkbox"
                        checked={homepage.show_faq_section}
                        onChange={(e) => setHomepage({ ...homepage, show_faq_section: e.target.checked })}
                        className="rounded-sm text-sky-600"
                      />
                      <span>Show Frequently Asked Questions</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => saveCurrentSection('homepage', homepage, 'homepage')}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-600/20"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Saving...' : 'Save Homepage Content'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: LOADING SCREEN TRANSITIONS */}
          {activeTab === 'loading' && loadingConfig && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <h3 className="text-base font-bold text-slate-900">Multi-Step Loading Screen Transitions</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure transition durations, messages, and progress indicator settings between client portal steps.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Transition Duration (Milliseconds)
                  </label>
                  <input
                    type="number"
                    min={400}
                    max={4000}
                    step={100}
                    value={loadingConfig.transition_duration_ms}
                    onChange={(e) =>
                      setLoadingConfig({
                        ...loadingConfig,
                        transition_duration_ms: parseInt(e.target.value, 10) || 1200,
                      })
                    }
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Recommended: 1200ms - 1500ms. Respects prefers-reduced-motion automatically.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Default Loading Title
                  </label>
                  <input
                    type="text"
                    value={loadingConfig.default_title}
                    onChange={(e) => setLoadingConfig({ ...loadingConfig, default_title: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Default Descriptive Message
                  </label>
                  <textarea
                    rows={2}
                    value={loadingConfig.default_description}
                    onChange={(e) =>
                      setLoadingConfig({ ...loadingConfig, default_description: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                  />
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={loadingConfig.show_progress_steps}
                      onChange={(e) =>
                        setLoadingConfig({ ...loadingConfig, show_progress_steps: e.target.checked })
                      }
                      className="rounded-sm text-sky-600"
                    />
                    <span className="text-xs font-bold text-slate-700">
                      Display Step Progress Indicator (Step X of 4)
                    </span>
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => saveCurrentSection('loading', loadingConfig, 'loading')}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-600/20"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Saving...' : 'Save Loading Settings'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 5: PAYMENT METHODS & ORDER */}
          {activeTab === 'methods' && paymentMethods && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <h3 className="text-base font-bold text-slate-900">Supported Payment Methods</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  The application strictly allows three channels: Card payment, PayPal, and Cryptocurrency.
                </p>
              </div>

              <div className="space-y-3">
                {/* Method 1 */}
                <div className="p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-5 h-5 text-sky-600" />
                    <div>
                      <span className="font-bold text-xs text-slate-900 block">1. Debit &amp; Credit Card</span>
                      <span className="text-[11px] text-slate-500">Mode: {paymentMethods.card_mode}</span>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={paymentMethods.card_enabled}
                      onChange={(e) =>
                        setPaymentMethods({ ...paymentMethods, card_enabled: e.target.checked })
                      }
                      className="rounded-sm text-sky-600"
                    />
                    <span className="text-xs font-semibold">Enabled</span>
                  </label>
                </div>

                {/* Method 2 */}
                <div className="p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Globe className="w-5 h-5 text-sky-600" />
                    <div>
                      <span className="font-bold text-xs text-slate-900 block">2. PayPal Transfer</span>
                      <span className="text-[11px] text-slate-500">Configurable regional notice</span>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={paymentMethods.paypal_enabled}
                      onChange={(e) =>
                        setPaymentMethods({ ...paymentMethods, paypal_enabled: e.target.checked })
                      }
                      className="rounded-sm text-sky-600"
                    />
                    <span className="text-xs font-semibold">Enabled</span>
                  </label>
                </div>

                {/* Method 3 */}
                <div className="p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Coins className="w-5 h-5 text-emerald-600" />
                    <div>
                      <span className="font-bold text-xs text-slate-900 block">3. Cryptocurrency Remittance</span>
                      <span className="text-[11px] text-slate-500">Blockchain verified with custodian wallets</span>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={paymentMethods.crypto_enabled}
                      onChange={(e) =>
                        setPaymentMethods({ ...paymentMethods, crypto_enabled: e.target.checked })
                      }
                      className="rounded-sm text-sky-600"
                    />
                    <span className="text-xs font-semibold">Enabled</span>
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => saveCurrentSection('payment_methods', paymentMethods, 'payment_methods')}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-600/20"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Saving...' : 'Save Method Availability'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 6: CARD PAYMENT CONFIGURATION */}
          {activeTab === 'card' && paymentMethods && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <h3 className="text-base font-bold text-slate-900">Card Payment Configuration</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure simulation mode, exact demo failure message, and provider settings.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Operating Mode
                  </label>
                  <select
                    value={paymentMethods.card_mode}
                    onChange={(e) =>
                      setPaymentMethods({ ...paymentMethods, card_mode: e.target.value as any })
                    }
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200"
                  >
                    <option value="demo">Demo / Test Simulation Mode</option>
                    <option value="live">Live Provider Mode</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Exact Simulated Failure Status Message
                  </label>
                  <input
                    type="text"
                    value={paymentMethods.card_demo_failure_message}
                    onChange={(e) =>
                      setPaymentMethods({
                        ...paymentMethods,
                        card_demo_failure_message: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Specified in prompt requirement: Exactly <strong>&quot;Payment failed&quot;</strong>.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Client Instructions Displayed on Card Page
                  </label>
                  <textarea
                    rows={2}
                    value={paymentMethods.card_instructions}
                    onChange={(e) =>
                      setPaymentMethods({ ...paymentMethods, card_instructions: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={paymentMethods.card_allow_retry}
                      onChange={(e) =>
                        setPaymentMethods({ ...paymentMethods, card_allow_retry: e.target.checked })
                      }
                      className="rounded-sm text-sky-600"
                    />
                    <span className="text-xs font-bold text-slate-700">
                      Allow Client to Retry Card Payment After Failure
                    </span>
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => saveCurrentSection('payment_methods', paymentMethods, 'payment_methods')}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-600/20"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Saving...' : 'Save Card Settings'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 7: PAYPAL CONFIGURATION */}
          {activeTab === 'paypal' && paymentMethods && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <h3 className="text-base font-bold text-slate-900">PayPal Regional Settings</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure regional policy notice and integration parameters.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Exact Regional Unavailability Message
                  </label>
                  <textarea
                    rows={3}
                    value={paymentMethods.paypal_unavailability_message}
                    onChange={(e) =>
                      setPaymentMethods({
                        ...paymentMethods,
                        paypal_unavailability_message: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Specified in prompt requirement: Exactly <strong>&quot;PayPal payments are currently unavailable in your region. Please select another available payment method.&quot;</strong>
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Future PayPal Client ID (Placeholder)
                  </label>
                  <input
                    type="text"
                    value={paymentMethods.paypal_client_id}
                    onChange={(e) =>
                      setPaymentMethods({ ...paymentMethods, paypal_client_id: e.target.value })
                    }
                    placeholder="sb-client-id-..."
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => saveCurrentSection('payment_methods', paymentMethods, 'payment_methods')}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-600/20"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Saving...' : 'Save PayPal Settings'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 8: CRYPTOCURRENCY SETTINGS */}
          {activeTab === 'crypto' && paymentMethods && (
            <div className="space-y-6 max-w-3xl">
              <div>
                <h3 className="text-base font-bold text-slate-900">Cryptocurrency Depository &amp; Custody</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure depository wallet addresses, networks, and confirmation requirements. No hardcoded addresses.
                </p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Required Network Confirmations
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={60}
                      value={paymentMethods.crypto_required_confirmations}
                      onChange={(e) =>
                        setPaymentMethods({
                          ...paymentMethods,
                          crypto_required_confirmations: parseInt(e.target.value, 10) || 12,
                        })
                      }
                      className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Crypto Support Contact Email
                    </label>
                    <input
                      type="email"
                      value={paymentMethods.crypto_support_contact}
                      onChange={(e) =>
                        setPaymentMethods({
                          ...paymentMethods,
                          crypto_support_contact: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Crypto Payment Instructions
                  </label>
                  <textarea
                    rows={2}
                    value={paymentMethods.crypto_instructions}
                    onChange={(e) =>
                      setPaymentMethods({ ...paymentMethods, crypto_instructions: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                  />
                </div>

                {/* Wallets Table */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Configured Depository Cryptocurrencies &amp; Wallets
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const newCoins = [
                          ...(paymentMethods.crypto_currencies || []),
                          {
                            symbol: 'ETH',
                            name: 'Ethereum',
                            network: 'Ethereum Mainnet',
                            wallet_address: '',
                            enabled: true,
                          },
                        ];
                        setPaymentMethods({ ...paymentMethods, crypto_currencies: newCoins });
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-700 hover:underline"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Cryptocurrency Asset</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {paymentMethods.crypto_currencies.map((coin, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Symbol</label>
                            <input
                              type="text"
                              value={coin.symbol}
                              onChange={(e) => {
                                const list = [...paymentMethods.crypto_currencies];
                                list[idx].symbol = e.target.value;
                                setPaymentMethods({ ...paymentMethods, crypto_currencies: list });
                              }}
                              className="w-full px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Asset Name</label>
                            <input
                              type="text"
                              value={coin.name}
                              onChange={(e) => {
                                const list = [...paymentMethods.crypto_currencies];
                                list[idx].name = e.target.value;
                                setPaymentMethods({ ...paymentMethods, crypto_currencies: list });
                              }}
                              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Network</label>
                            <input
                              type="text"
                              value={coin.network}
                              onChange={(e) => {
                                const list = [...paymentMethods.crypto_currencies];
                                list[idx].network = e.target.value;
                                setPaymentMethods({ ...paymentMethods, crypto_currencies: list });
                              }}
                              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white font-semibold text-sky-800"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase">
                            Official Custody Depository Wallet Address (Required)
                          </label>
                          <input
                            type="text"
                            value={coin.wallet_address}
                            onChange={(e) => {
                              const list = [...paymentMethods.crypto_currencies];
                              list[idx].wallet_address = e.target.value;
                              setPaymentMethods({ ...paymentMethods, crypto_currencies: list });
                            }}
                            placeholder="e.g. 0x... or TX..."
                            className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-slate-200 bg-white"
                          />
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                            <input
                              type="checkbox"
                              checked={coin.enabled}
                              onChange={(e) => {
                                const list = [...paymentMethods.crypto_currencies];
                                list[idx].enabled = e.target.checked;
                                setPaymentMethods({ ...paymentMethods, crypto_currencies: list });
                              }}
                              className="rounded-sm text-sky-600"
                            />
                            <span>Asset Enabled</span>
                          </label>

                          <button
                            type="button"
                            onClick={() => {
                              const list = paymentMethods.crypto_currencies.filter((_, i) => i !== idx);
                              setPaymentMethods({ ...paymentMethods, crypto_currencies: list });
                            }}
                            className="text-xs text-red-600 hover:underline flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove Asset</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => saveCurrentSection('payment_methods', paymentMethods, 'payment_methods')}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-600/20"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Saving...' : 'Save Cryptocurrency Config'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 9: LEGAL CONTENT */}
          {activeTab === 'legal' && legal && (
            <div className="space-y-6 max-w-3xl">
              <div>
                <h3 className="text-base font-bold text-slate-900">Legal Disclosures &amp; Terms</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Update statutory non-affiliation notices, privacy policy, and consular fee refund schedules.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Terms of Service &amp; Representation
                  </label>
                  <textarea
                    rows={6}
                    value={legal.terms_of_service}
                    onChange={(e) => setLegal({ ...legal, terms_of_service: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Privacy &amp; Data Protection Policy (GDPR)
                  </label>
                  <textarea
                    rows={6}
                    value={legal.privacy_policy}
                    onChange={(e) => setLegal({ ...legal, privacy_policy: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Payment &amp; Refund Policy
                  </label>
                  <textarea
                    rows={5}
                    value={legal.payment_and_refund_policy}
                    onChange={(e) =>
                      setLegal({ ...legal, payment_and_refund_policy: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Statutory Fee Tariff Disclosure Schedule
                  </label>
                  <textarea
                    rows={4}
                    value={legal.fee_disclosure}
                    onChange={(e) => setLegal({ ...legal, fee_disclosure: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => saveCurrentSection('legal', legal, 'legal')}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-600/20"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Saving...' : 'Save Legal Policies'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 10: CLIENT PORTAL RULES */}
          {activeTab === 'client_portal' && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <h3 className="text-base font-bold text-slate-900">Client Portal Governance</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Rules controlling client access permissions and profile field modifications.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
                <div className="font-bold text-slate-900">Permission Safeguards:</div>
                <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
                  <li>Clients CANNOT modify their assigned reference numbers.</li>
                  <li>Clients CANNOT modify assigned EUR fee tariffs.</li>
                  <li>Clients CANNOT alter consular payment status.</li>
                  <li>Photograph updates are governed per-client by the administrative toggle.</li>
                </ul>
              </div>

              <p className="text-xs text-slate-500">
                These rules are permanently enforced in server API routes and database integrity constraints.
              </p>
            </div>
          )}

          {/* TAB 11: MANUAL REFERENCE NUMBER POLICIES */}
          {activeTab === 'reference_numbers' && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <h3 className="text-base font-bold text-slate-900">Reference Number Assignment Policy</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Mandatory operational requirement: All reference numbers must be manually assigned.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-sky-50 border border-sky-200 text-sky-950 text-xs space-y-2">
                <div className="font-bold text-sky-900 flex items-center gap-2">
                  <FileCheck2 className="w-4 h-4 text-sky-700" />
                  <span>Statutory Manual Assignment Rule</span>
                </div>
                <p className="leading-relaxed">
                  The application strictly prohibits automatic generation of reference numbers. Each client record requires an officer to enter a unique manual reference (e.g. LUX-VISA-2026-XXXX). Duplicate references are rejected at the database level.
                </p>
              </div>
            </div>
          )}

          {/* TAB 12: GENERAL CONSULAR SETTINGS */}
          {activeTab === 'general' && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <h3 className="text-base font-bold text-slate-900">General Consular Operations</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Base currency, timezone, and jurisdiction parameters.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Settlement Currency
                  </label>
                  <input
                    type="text"
                    disabled
                    value="EUR (€) - Minor Unit Standard"
                    className="w-full px-3 py-2 text-xs font-bold bg-slate-100 rounded-xl border border-slate-200 text-slate-600"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    All visa fees are strictly denominated in Euros (EUR €).
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Consular Timezone
                  </label>
                  <input
                    type="text"
                    value={general.timezone}
                    onChange={(e) => setGeneral({ ...general, timezone: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Legal Jurisdiction
                  </label>
                  <input
                    type="text"
                    value={general.consular_jurisdiction}
                    onChange={(e) => setGeneral({ ...general, consular_jurisdiction: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => saveCurrentSection('general', general, 'general')}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-600/20"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Saving...' : 'Save General Settings'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 13: EMAIL & NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <h3 className="text-base font-bold text-slate-900">Email &amp; Notification Triggers</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure notification recipients for verified remittances and failed payment alerts.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Finance Notification Inbound Mailbox
                  </label>
                  <input
                    type="email"
                    defaultValue="finance-desk@lux-immigration-portal.eu"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                  />
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                  <span className="font-bold text-slate-800">Automated Notification Alerts:</span>
                  <div className="space-y-1 text-slate-600">
                    <div>• Alert on cryptocurrency submission (TxID pending)</div>
                    <div>• Alert on consecutive card payment failures</div>
                    <div>• Client receipt transmission on reconciliation</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 14: SECURITY & SESSIONS */}
          {activeTab === 'security' && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <h3 className="text-base font-bold text-slate-900">Security &amp; Session Management</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Rate limiting thresholds, session lifetimes, and brute-force protections.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Client Session Timeout (Minutes)
                  </label>
                  <input
                    type="number"
                    defaultValue={60}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Admin Session Timeout (Minutes)
                  </label>
                  <input
                    type="number"
                    defaultValue={120}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Max Failed Logins Before Lockout
                  </label>
                  <input
                    type="number"
                    defaultValue={5}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Lockout Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    defaultValue={15}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
