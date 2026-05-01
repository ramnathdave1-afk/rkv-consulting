'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Skeleton } from '@/components/ui/Skeleton';
import { ShieldCheck, AlertCircle, CheckCircle2, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  SettingsShell,
  SettingsCard,
  SettingsCardHeader,
  SettingsCardBody,
  settingsInputClass,
  settingsLabelClass,
  settingsPrimaryButtonClass,
  settingsSecondaryButtonClass,
  settingsDangerButtonClass,
} from '@/components/settings/SettingsShell';

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
      const {
        data: { user },
      } = await supabase.auth.getUser();
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
      <SettingsShell title="SSO / SAML" subtitle="Configure single sign-on for your organization.">
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </SettingsShell>
    );
  }

  return (
    <SettingsShell
      title="SSO / SAML"
      subtitle="Configure single sign-on for your organization. Requires Supabase Pro plan."
    >
      <div className="space-y-6">
        {/* Status banner */}
        <SettingsCard
          className={cn(
            enabled
              ? 'border-emerald-200 bg-emerald-50/50'
              : 'border-slate-200',
          )}
        >
          <SettingsCardBody className="flex items-center gap-3">
            {enabled ? (
              <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />
            ) : (
              <ShieldCheck className="h-6 w-6 text-slate-400 shrink-0" />
            )}
            <div className="flex-1">
              <p className="font-display font-semibold text-[#020617]">
                SSO is {enabled ? 'Enabled' : 'Disabled'}
              </p>
              <p className="text-xs text-slate-500">
                {enabled
                  ? 'Users with allowlisted email domains will be auto-routed to your IDP.'
                  : 'Configure your IDP and save to enable.'}
              </p>
            </div>
            {enabled && (
              <button
                type="button"
                onClick={handleDisable}
                disabled={saving}
                className={settingsDangerButtonClass}
              >
                Disable
              </button>
            )}
          </SettingsCardBody>
        </SettingsCard>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 flex items-center gap-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {saved && (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-center gap-3 text-sm text-emerald-700">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <p>SSO configuration saved.</p>
          </div>
        )}

        {/* Provider selection */}
        <SettingsCard>
          <SettingsCardHeader title="Identity Provider" description="Pick the IDP your team uses." />
          <SettingsCardBody>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {PROVIDERS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setProvider(p.value)}
                  className={cn(
                    'h-12 rounded-md border text-sm font-medium transition-colors',
                    provider === p.value
                      ? 'bg-sky-50 border-[#0369A1] text-[#0369A1]'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300',
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </SettingsCardBody>
        </SettingsCard>

        {/* Metadata */}
        <SettingsCard>
          <SettingsCardHeader title="IDP Metadata" description="Either point to your IDP metadata URL or paste the XML directly." />
          <SettingsCardBody className="space-y-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMetadataMode('url')}
                className={cn(
                  'h-9 px-3 rounded-md text-xs font-medium border transition-colors',
                  metadataMode === 'url'
                    ? 'bg-sky-50 border-[#0369A1] text-[#0369A1]'
                    : 'bg-white border-slate-200 text-slate-600',
                )}
              >
                URL
              </button>
              <button
                type="button"
                onClick={() => setMetadataMode('xml')}
                className={cn(
                  'h-9 px-3 rounded-md text-xs font-medium border transition-colors',
                  metadataMode === 'xml'
                    ? 'bg-sky-50 border-[#0369A1] text-[#0369A1]'
                    : 'bg-white border-slate-200 text-slate-600',
                )}
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
                className={settingsInputClass}
              />
            ) : (
              <textarea
                value={metadataXml}
                onChange={(e) => setMetadataXml(e.target.value)}
                placeholder="<md:EntityDescriptor ...>...</md:EntityDescriptor>"
                rows={8}
                className={cn(settingsInputClass, 'h-auto py-2 font-mono')}
              />
            )}
          </SettingsCardBody>
        </SettingsCard>

        {/* Domain allowlist */}
        <SettingsCard>
          <SettingsCardHeader
            title="Domain Allowlist"
            description="Users signing in with these email domains are auto-routed to your IDP."
          />
          <SettingsCardBody>
            <input
              type="text"
              value={domainList}
              onChange={(e) => setDomainList(e.target.value)}
              placeholder="acmepm.com, acme-realty.com"
              className={settingsInputClass}
            />
            <p className="text-xs text-slate-500 mt-2">Comma-separated.</p>
          </SettingsCardBody>
        </SettingsCard>

        {/* Attribute mapping */}
        <SettingsCard>
          <SettingsCardHeader title="Attribute Mapping" description="Map IDP attributes to user fields." />
          <SettingsCardBody className="space-y-3">
            <div>
              <label className={settingsLabelClass}>Email <span className="text-slate-400 font-normal">(default: NameID)</span></label>
              <input
                type="text"
                value={attrEmail}
                onChange={(e) => setAttrEmail(e.target.value)}
                className={settingsInputClass}
              />
            </div>
            <div>
              <label className={settingsLabelClass}>Name <span className="text-slate-400 font-normal">(default: displayName)</span></label>
              <input
                type="text"
                value={attrName}
                onChange={(e) => setAttrName(e.target.value)}
                className={settingsInputClass}
              />
            </div>
            <div>
              <label className={settingsLabelClass}>Role <span className="text-slate-400 font-normal">(optional)</span></label>
              <input
                type="text"
                value={attrRole}
                onChange={(e) => setAttrRole(e.target.value)}
                placeholder="e.g. groups"
                className={settingsInputClass}
              />
            </div>
          </SettingsCardBody>
        </SettingsCard>

        {/* Actions / sticky save */}
        <div className="sticky bottom-0 bg-white border-t border-slate-200 -mx-6 px-6 py-4 flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !orgId}
            className={settingsPrimaryButtonClass}
          >
            {saving ? 'Saving...' : enabled ? 'Save Changes' : 'Save & Enable'}
          </button>
          <button type="button" onClick={handleTestSso} className={settingsSecondaryButtonClass}>
            <ExternalLink size={14} /> Test SSO
          </button>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          Need help? After enabling SSO in Supabase Pro, your IDP will need:{' '}
          <span className="font-mono text-slate-700">
            ACS URL: {process.env.NEXT_PUBLIC_SUPABASE_URL || '<supabase-url>'}/auth/v1/sso/saml/acs
          </span>
        </p>
      </div>
    </SettingsShell>
  );
}
