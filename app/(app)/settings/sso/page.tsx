'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Skeleton } from '@/components/ui/Skeleton';
import { ShieldCheck, AlertCircle, CheckCircle2, ExternalLink } from 'lucide-react';

type Provider = 'okta' | 'azure_ad' | 'google_workspace' | 'onelogin' | 'generic_saml';

const PROVIDERS: { value: Provider; label: string }[] = [
  { value: 'okta', label: 'Okta' },
  { value: 'azure_ad', label: 'Azure AD / Entra ID' },
  { value: 'google_workspace', label: 'Google Workspace' },
  { value: 'onelogin', label: 'OneLogin' },
  { value: 'generic_saml', label: 'Generic SAML 2.0' },
];

export default function SSOSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [orgId, setOrgId] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [provider, setProvider] = useState<Provider>('okta');
  const [metadataMode, setMetadataMode] = useState<'xml' | 'url'>('url');
  const [metadataXml, setMetadataXml] = useState('');
  const [metadataUrl, setMetadataUrl] = useState('');
  const [domainList, setDomainList] = useState('');
  const [attrEmail, setAttrEmail] = useState('NameID');
  const [attrName, setAttrName] = useState('displayName');
  const [attrRole, setAttrRole] = useState('');

  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('user_id', user.id)
        .single();
      if (!profile) {
        setLoading(false);
        return;
      }
      setOrgId(profile.org_id);

      const { data: config } = await supabase
        .from('sso_configurations')
        .select('*')
        .eq('org_id', profile.org_id)
        .maybeSingle();

      if (config) {
        setEnabled(config.enabled);
        setProvider(config.provider);
        if (config.metadata_xml) {
          setMetadataMode('xml');
          setMetadataXml(config.metadata_xml);
        }
        if (config.metadata_url) {
          setMetadataMode('url');
          setMetadataUrl(config.metadata_url);
        }
        setDomainList((config.domain_allowlist || []).join(', '));
        const m = config.attribute_mapping || {};
        if (m.email) setAttrEmail(m.email);
        if (m.name) setAttrName(m.name);
        if (m.role) setAttrRole(m.role);
      }
      setLoading(false);
    }
    load();
  }, [supabase]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);

    const domains = domainList
      .split(',')
      .map((d) => d.trim().toLowerCase().replace(/^@/, ''))
      .filter(Boolean);

    const attribute_mapping: Record<string, string> = {
      email: attrEmail,
      name: attrName,
    };
    if (attrRole) attribute_mapping.role = attrRole;

    const res = await fetch('/api/auth/sso/configure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider,
        metadata_xml: metadataMode === 'xml' ? metadataXml : null,
        metadata_url: metadataMode === 'url' ? metadataUrl : null,
        domain_allowlist: domains,
        attribute_mapping,
        enabled: true,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Failed to save SSO configuration');
      setSaving(false);
      return;
    }

    setEnabled(true);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  async function handleDisable() {
    if (!confirm('Disable SSO for your organization? Users will fall back to password auth.')) return;
    setSaving(true);
    const res = await fetch('/api/auth/sso/disable', { method: 'POST' });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || 'Failed to disable SSO');
      setSaving(false);
      return;
    }
    setEnabled(false);
    setSaving(false);
  }

  function handleTestSso() {
    const firstDomain = domainList.split(',')[0]?.trim().toLowerCase().replace(/^@/, '');
    if (!firstDomain) {
      setError('Add at least one domain to the allowlist before testing.');
      return;
    }
    window.open(`/login?sso_domain=${encodeURIComponent(firstDomain)}`, '_blank');
  }

  if (loading) {
    return (
      <div className="p-8 max-w-3xl mx-auto space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">SSO / SAML</h1>
        <p className="text-sm text-white/40 mt-1">
          Configure single sign-on for your organization. Requires Supabase Pro plan.
        </p>
      </div>

      {/* Status banner */}
      <div
        className={
          'mb-6 rounded-xl border px-4 py-3 flex items-center gap-3 ' +
          (enabled
            ? 'bg-emerald-500/[0.06] border-emerald-500/20'
            : 'bg-white/[0.02] border-white/[0.06]')
        }
      >
        {enabled ? (
          <CheckCircle2 className="size-5 text-emerald-400" />
        ) : (
          <ShieldCheck className="size-5 text-white/40" />
        )}
        <div className="flex-1">
          <p className="text-sm font-semibold text-white">
            SSO is {enabled ? 'Enabled' : 'Disabled'}
          </p>
          <p className="text-xs text-white/40">
            {enabled
              ? 'Users with allowlisted email domains will be auto-routed to your IDP.'
              : 'Configure your IDP and save to enable.'}
          </p>
        </div>
        {enabled && (
          <button
            onClick={handleDisable}
            disabled={saving}
            className="text-xs text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg border border-red-500/20 hover:bg-red-500/[0.06] transition"
          >
            Disable
          </button>
        )}
      </div>

      {error && (
        <div className="mb-6 rounded-xl bg-red-500/[0.06] border border-red-500/20 px-4 py-3 flex items-center gap-3">
          <AlertCircle className="size-4 text-red-400" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {saved && (
        <div className="mb-6 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/20 px-4 py-3 flex items-center gap-3">
          <CheckCircle2 className="size-4 text-emerald-400" />
          <p className="text-sm text-emerald-300">SSO configuration saved.</p>
        </div>
      )}

      {/* Provider selection */}
      <section className="mb-6">
        <label className="text-xs font-medium text-white/60 uppercase tracking-wide">
          Identity Provider
        </label>
        <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2">
          {PROVIDERS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setProvider(p.value)}
              className={
                'h-12 rounded-xl border text-sm transition ' +
                (provider === p.value
                  ? 'bg-[#00D4AA]/[0.08] border-[#00D4AA]/40 text-white'
                  : 'bg-white/[0.02] border-white/[0.06] text-white/60 hover:border-white/[0.12]')
              }
            >
              {p.label}
            </button>
          ))}
        </div>
      </section>

      {/* Metadata */}
      <section className="mb-6">
        <label className="text-xs font-medium text-white/60 uppercase tracking-wide">
          IDP Metadata
        </label>
        <div className="mt-2 flex gap-2 mb-3">
          <button
            type="button"
            onClick={() => setMetadataMode('url')}
            className={
              'px-3 py-1.5 rounded-lg text-xs ' +
              (metadataMode === 'url'
                ? 'bg-white/[0.08] text-white'
                : 'bg-white/[0.02] text-white/40 hover:text-white/70')
            }
          >
            URL
          </button>
          <button
            type="button"
            onClick={() => setMetadataMode('xml')}
            className={
              'px-3 py-1.5 rounded-lg text-xs ' +
              (metadataMode === 'xml'
                ? 'bg-white/[0.08] text-white'
                : 'bg-white/[0.02] text-white/40 hover:text-white/70')
            }
          >
            Paste XML
          </button>
        </div>

        {metadataMode === 'url' ? (
          <input
            type="url"
            value={metadataUrl}
            onChange={(e) => setMetadataUrl(e.target.value)}
            placeholder="https://your-idp.com/app/metadata"
            className="w-full h-11 rounded-xl bg-white/[0.02] border border-white/[0.06] px-4 text-sm text-white focus:outline-none focus:border-[#00D4AA]/30"
          />
        ) : (
          <textarea
            value={metadataXml}
            onChange={(e) => setMetadataXml(e.target.value)}
            placeholder="<md:EntityDescriptor ...>...</md:EntityDescriptor>"
            rows={8}
            className="w-full rounded-xl bg-white/[0.02] border border-white/[0.06] px-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-[#00D4AA]/30"
          />
        )}
      </section>

      {/* Domain allowlist */}
      <section className="mb-6">
        <label className="text-xs font-medium text-white/60 uppercase tracking-wide">
          Domain Allowlist
        </label>
        <input
          type="text"
          value={domainList}
          onChange={(e) => setDomainList(e.target.value)}
          placeholder="acmepm.com, acme-realty.com"
          className="mt-2 w-full h-11 rounded-xl bg-white/[0.02] border border-white/[0.06] px-4 text-sm text-white focus:outline-none focus:border-[#00D4AA]/30"
        />
        <p className="text-xs text-white/30 mt-2">
          Comma-separated. Users signing in with these email domains are auto-routed to your IDP.
        </p>
      </section>

      {/* Attribute mapping */}
      <section className="mb-6">
        <label className="text-xs font-medium text-white/60 uppercase tracking-wide">
          Attribute Mapping
        </label>
        <div className="mt-2 space-y-3">
          <div>
            <label className="text-xs text-white/40">Email (default: NameID)</label>
            <input
              type="text"
              value={attrEmail}
              onChange={(e) => setAttrEmail(e.target.value)}
              className="mt-1 w-full h-10 rounded-lg bg-white/[0.02] border border-white/[0.06] px-3 text-sm text-white focus:outline-none focus:border-[#00D4AA]/30"
            />
          </div>
          <div>
            <label className="text-xs text-white/40">Name (default: displayName)</label>
            <input
              type="text"
              value={attrName}
              onChange={(e) => setAttrName(e.target.value)}
              className="mt-1 w-full h-10 rounded-lg bg-white/[0.02] border border-white/[0.06] px-3 text-sm text-white focus:outline-none focus:border-[#00D4AA]/30"
            />
          </div>
          <div>
            <label className="text-xs text-white/40">Role (optional)</label>
            <input
              type="text"
              value={attrRole}
              onChange={(e) => setAttrRole(e.target.value)}
              placeholder="e.g. groups"
              className="mt-1 w-full h-10 rounded-lg bg-white/[0.02] border border-white/[0.06] px-3 text-sm text-white focus:outline-none focus:border-[#00D4AA]/30"
            />
          </div>
        </div>
      </section>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-4 border-t border-white/[0.06]">
        <button
          onClick={handleSave}
          disabled={saving || !orgId}
          className="h-11 px-5 rounded-xl bg-[#00D4AA] text-[#06080C] text-sm font-semibold hover:bg-[#00eabb] disabled:opacity-50 transition"
        >
          {saving ? 'Saving...' : enabled ? 'Save Changes' : 'Save & Enable'}
        </button>

        <button
          onClick={handleTestSso}
          type="button"
          className="h-11 px-4 rounded-xl border border-white/[0.06] text-sm text-white/70 hover:bg-white/[0.04] hover:text-white transition flex items-center gap-2"
        >
          <ExternalLink className="size-4" />
          Test SSO
        </button>
      </div>

      <p className="text-xs text-white/30 mt-6 leading-relaxed">
        Need help? After enabling SSO in Supabase Pro, your IDP will need:{' '}
        <span className="text-white/50 font-mono">
          ACS URL: {process.env.NEXT_PUBLIC_SUPABASE_URL || '<supabase-url>'}/auth/v1/sso/saml/acs
        </span>
      </p>
    </div>
  );
}
