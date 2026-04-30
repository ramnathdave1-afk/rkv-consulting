'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import { Palette, CheckCircle2, RotateCcw, Eye, Mail, LayoutDashboard } from 'lucide-react';

interface BrandForm {
  brand_name: string;
  brand_primary_color: string;
  brand_secondary_color: string;
  brand_logo_url: string;
  brand_favicon_url: string;
  brand_email_sender_name: string;
  brand_email_reply_to: string;
  brand_email_signature: string;
  brand_custom_domain: string;
  brand_subdomain: string;
  white_label_enabled: boolean;
}

const EMPTY: BrandForm = {
  brand_name: '',
  brand_primary_color: '#00bfa6',
  brand_secondary_color: '#1a1a2e',
  brand_logo_url: '',
  brand_favicon_url: '',
  brand_email_sender_name: '',
  brand_email_reply_to: '',
  brand_email_signature: '',
  brand_custom_domain: '',
  brand_subdomain: '',
  white_label_enabled: false,
};

type PreviewTab = 'email' | 'portal' | 'login';

export default function BrandingPage() {
  const [form, setForm] = useState<BrandForm>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewTab, setPreviewTab] = useState<PreviewTab>('email');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('/api/settings/branding', { cache: 'no-store' });
        if (!res.ok) {
          setLoading(false);
          return;
        }
        const json = await res.json();
        if (!mounted) return;
        const raw = json.raw ?? {};
        setForm({
          brand_name: raw.brand_name ?? '',
          brand_primary_color: raw.brand_primary_color ?? raw.brand_color ?? '#00bfa6',
          brand_secondary_color: raw.brand_secondary_color ?? '#1a1a2e',
          brand_logo_url: raw.brand_logo_url ?? raw.logo_url ?? '',
          brand_favicon_url: raw.brand_favicon_url ?? '',
          brand_email_sender_name: raw.brand_email_sender_name ?? raw.email_from_name ?? '',
          brand_email_reply_to: raw.brand_email_reply_to ?? raw.email_from_address ?? '',
          brand_email_signature: raw.brand_email_signature ?? '',
          brand_custom_domain: raw.brand_custom_domain ?? '',
          brand_subdomain: raw.brand_subdomain ?? '',
          white_label_enabled: !!raw.white_label_enabled,
        });
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  function update<K extends keyof BrandForm>(key: K, value: BrandForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      // Mirror the new brand_* fields into the legacy fields so older code
      // paths that still read brand_color / email_from_* keep working.
      const payload = {
        ...form,
        brand_color: form.brand_primary_color,
        logo_url: form.brand_logo_url || null,
        email_from_name: form.brand_email_sender_name || null,
        email_from_address: form.brand_email_reply_to || null,
      };
      const res = await fetch('/api/settings/branding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Failed to save');
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    if (!confirm('Reset all branding to RKV defaults? This clears your logo, colors, and email config.')) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/settings/branding', { method: 'DELETE' });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Failed to reset');
      }
      setForm(EMPTY);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to reset');
    } finally {
      setSaving(false);
    }
  }

  // Preview brand uses defaults to fill blanks (so the user sees what tenants would see).
  const previewBrand = useMemo(
    () => ({
      name: form.brand_name || 'RKV Consulting',
      primary: form.brand_primary_color || '#00bfa6',
      secondary: form.brand_secondary_color || '#1a1a2e',
      logo: form.brand_logo_url,
      sender: form.brand_email_sender_name || form.brand_name || 'RKV Consulting',
      replyTo: form.brand_email_reply_to || 'noreply@rkv-consulting.com',
      signature: form.brand_email_signature || 'Sent via RKV Consulting',
    }),
    [form],
  );

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold text-text-primary">Branding</h1>
        <p className="text-sm text-text-secondary">
          White-label your tenant portal, login screen, and transactional emails.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ─── Form ─── */}
        <div className="glass-card p-5 space-y-5">
          <div className="flex items-center gap-2">
            <Palette size={16} className="text-accent" />
            <h3 className="text-sm font-semibold text-text-primary">Brand Identity</h3>
            <label className="ml-auto flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.white_label_enabled}
                onChange={(e) => update('white_label_enabled', e.target.checked)}
                className="rounded accent-accent"
              />
              <span className="text-xs text-text-secondary">Enable white-label</span>
            </label>
          </div>

          <Field label="Brand Name">
            <input
              type="text"
              value={form.brand_name}
              onChange={(e) => update('brand_name', e.target.value)}
              placeholder="Acme Property Management"
              className={inputClass}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Primary Color">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.brand_primary_color}
                  onChange={(e) => update('brand_primary_color', e.target.value)}
                  className="h-9 w-12 rounded border border-border cursor-pointer"
                />
                <input
                  type="text"
                  value={form.brand_primary_color}
                  onChange={(e) => update('brand_primary_color', e.target.value)}
                  className={`${inputClass} font-mono`}
                />
              </div>
            </Field>
            <Field label="Secondary Color">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.brand_secondary_color}
                  onChange={(e) => update('brand_secondary_color', e.target.value)}
                  className="h-9 w-12 rounded border border-border cursor-pointer"
                />
                <input
                  type="text"
                  value={form.brand_secondary_color}
                  onChange={(e) => update('brand_secondary_color', e.target.value)}
                  className={`${inputClass} font-mono`}
                />
              </div>
            </Field>
          </div>

          <Field label="Logo URL">
            <input
              type="url"
              value={form.brand_logo_url}
              onChange={(e) => update('brand_logo_url', e.target.value)}
              placeholder="https://cdn.example.com/logo.png"
              className={inputClass}
            />
          </Field>

          <Field label="Favicon URL">
            <input
              type="url"
              value={form.brand_favicon_url}
              onChange={(e) => update('brand_favicon_url', e.target.value)}
              placeholder="https://cdn.example.com/favicon.ico"
              className={inputClass}
            />
          </Field>

          <hr className="border-border/40" />

          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <Mail size={14} /> Email
          </h3>

          <Field label="Email Sender Name">
            <input
              type="text"
              value={form.brand_email_sender_name}
              onChange={(e) => update('brand_email_sender_name', e.target.value)}
              placeholder="Acme PM Notifications"
              className={inputClass}
            />
          </Field>

          <Field label="Reply-To Address">
            <input
              type="email"
              value={form.brand_email_reply_to}
              onChange={(e) => update('brand_email_reply_to', e.target.value)}
              placeholder="hello@acmepm.com"
              className={inputClass}
            />
          </Field>

          <Field label="Email Signature">
            <textarea
              value={form.brand_email_signature}
              onChange={(e) => update('brand_email_signature', e.target.value)}
              placeholder="The Acme PM Team · acmepm.com"
              rows={2}
              className={`${inputClass} resize-none`}
            />
          </Field>

          <hr className="border-border/40" />

          <h3 className="text-sm font-semibold text-text-primary">Hosting</h3>

          <Field label="Subdomain" hint="acmepm → acmepm.rkv-consulting.com">
            <input
              type="text"
              value={form.brand_subdomain}
              onChange={(e) =>
                update('brand_subdomain', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
              }
              placeholder="acmepm"
              className={inputClass}
            />
          </Field>

          <Field label="Custom Domain" hint="Roadmap — DNS + SSL provisioning still required">
            <input
              type="text"
              value={form.brand_custom_domain}
              onChange={(e) => update('brand_custom_domain', e.target.value.toLowerCase())}
              placeholder="portal.acmepm.com"
              className={inputClass}
            />
          </Field>

          {error && (
            <div className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 disabled:opacity-50"
            >
              {saved ? (
                <>
                  <CheckCircle2 size={14} />
                  Saved
                </>
              ) : saving ? (
                'Saving...'
              ) : (
                'Save Branding'
              )}
            </button>
            <button
              onClick={handleReset}
              disabled={saving}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-text-secondary text-sm hover:bg-bg-elevated disabled:opacity-50"
            >
              <RotateCcw size={14} /> Reset to defaults
            </button>
          </div>
        </div>

        {/* ─── Preview ─── */}
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Eye size={16} className="text-accent" />
            <h3 className="text-sm font-semibold text-text-primary">Preview</h3>
            <div className="ml-auto flex items-center gap-1">
              {(['email', 'portal', 'login'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setPreviewTab(t)}
                  className={`px-2.5 py-1 rounded-md text-xs capitalize ${
                    previewTab === t
                      ? 'bg-accent text-white'
                      : 'text-text-secondary hover:bg-bg-elevated'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {previewTab === 'email' && (
            <div className="rounded-lg overflow-hidden border border-border bg-white">
              <div
                style={{ background: previewBrand.primary }}
                className="px-6 py-5 text-center"
              >
                {previewBrand.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewBrand.logo}
                    alt={previewBrand.name}
                    className="h-10 mx-auto"
                  />
                ) : (
                  <div className="text-white text-lg font-bold">{previewBrand.name}</div>
                )}
              </div>
              <div className="px-6 py-6 text-sm text-gray-800 space-y-3">
                <p className="font-medium">Hi Sarah,</p>
                <p>
                  Your maintenance request <strong>"Kitchen sink leaking"</strong> has been
                  received and assigned to a technician. We&apos;ll be in touch within 24
                  hours to schedule a visit.
                </p>
                <p>
                  <a
                    href="#"
                    className="inline-block mt-2 px-4 py-2 rounded-md text-white text-sm font-medium"
                    style={{ background: previewBrand.primary }}
                  >
                    View Request
                  </a>
                </p>
              </div>
              <div className="px-6 py-3 bg-gray-50 text-center text-[11px] text-gray-500 border-t border-gray-100">
                {previewBrand.signature}
              </div>
              <div className="px-6 py-2 bg-gray-100 text-[10px] text-gray-400 font-mono border-t border-gray-200">
                From: {previewBrand.sender} &lt;{previewBrand.replyTo}&gt;
              </div>
            </div>
          )}

          {previewTab === 'portal' && (
            <div className="rounded-lg overflow-hidden border border-border bg-white text-gray-800">
              <div
                style={{ background: previewBrand.primary }}
                className="px-6 py-3 flex items-center gap-3"
              >
                {previewBrand.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewBrand.logo}
                    alt={previewBrand.name}
                    className="h-7"
                  />
                ) : null}
                <span className="text-white font-semibold text-sm">{previewBrand.name}</span>
              </div>
              <div className="p-6 space-y-3">
                <h2 className="text-lg font-bold">Welcome, Sarah</h2>
                <p className="text-xs text-gray-500">Tenant Portal</p>
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="rounded-md border border-gray-200 p-3">
                    <p className="text-[10px] uppercase text-gray-400">Property</p>
                    <p className="text-sm font-medium">Maple Apartments</p>
                  </div>
                  <div className="rounded-md border border-gray-200 p-3">
                    <p className="text-[10px] uppercase text-gray-400">Rent</p>
                    <p className="text-sm font-medium">$1,850</p>
                  </div>
                </div>
                <button
                  className="mt-3 px-4 py-2 rounded-md text-white text-sm font-medium"
                  style={{ background: previewBrand.primary }}
                >
                  Submit Maintenance Request
                </button>
              </div>
            </div>
          )}

          {previewTab === 'login' && (
            <div className="rounded-lg overflow-hidden border border-border" style={{ background: previewBrand.secondary }}>
              <div className="p-8 text-center text-white space-y-4">
                {previewBrand.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewBrand.logo}
                    alt={previewBrand.name}
                    className="h-10 mx-auto"
                  />
                ) : (
                  <LayoutDashboard size={32} className="mx-auto opacity-60" />
                )}
                <div>
                  <h2 className="text-xl font-bold">{previewBrand.name}</h2>
                  <p className="text-xs text-white/60">Sign in to your portal</p>
                </div>
                <div className="space-y-2 max-w-xs mx-auto">
                  <div className="h-9 rounded-md bg-white/10 border border-white/20" />
                  <div className="h-9 rounded-md bg-white/10 border border-white/20" />
                  <button
                    className="w-full h-9 rounded-md text-sm font-semibold"
                    style={{ background: previewBrand.primary, color: '#fff' }}
                  >
                    Sign In
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const inputClass =
  'w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none';

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-xs text-text-muted block mb-1">{label}</label>
      {children}
      {hint && <p className="text-[10px] text-text-muted mt-1">{hint}</p>}
    </div>
  );
}
