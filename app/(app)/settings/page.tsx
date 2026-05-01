'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import { Skeleton } from '@/components/ui/Skeleton';
import { ROLES } from '@/lib/constants';
import {
  User,
  Lock,
  Bell,
  Save,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Plug,
  Key,
  CreditCard,
  Users as UsersIcon,
  MapPin,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  SettingsShell,
  SettingsCard,
  SettingsCardBody,
  SettingsToggle,
  settingsInputClass,
  settingsLabelClass,
  settingsPrimaryButtonClass,
  settingsDangerButtonClass,
} from '@/components/settings/SettingsShell';

type TabId = 'profile' | 'password' | 'notifications' | 'integrations';

function NotificationRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-slate-700">{label}</span>
      <SettingsToggle checked={checked} onChange={onChange} />
    </div>
  );
}

const tabs: { id: TabId; label: string; icon: typeof User }[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'password', label: 'Password', icon: Lock },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'integrations', label: 'Integrations', icon: Plug },
];

interface OverviewKpi {
  plan?: string;
  locations?: number;
  users?: number;
  integrations?: { configured: number; total: number };
}

export default function SettingsPage() {
  const { profile, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('profile');
  const [overview, setOverview] = useState<OverviewKpi>({});

  useEffect(() => {
    // Best-effort fetch of summary KPIs — silently skip if endpoints don't exist.
    Promise.allSettled([
      fetch('/api/billing/plan').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/locations').then((r) => (r.ok ? r.json() : null)),
    ]).then(([planRes, locRes]) => {
      const next: OverviewKpi = {};
      if (planRes.status === 'fulfilled' && planRes.value) {
        next.plan = planRes.value.name ?? planRes.value.tier;
        if (planRes.value.usage) {
          next.users = planRes.value.usage.users;
          next.integrations = {
            configured: planRes.value.usage.integrations ?? 0,
            total: planRes.value.limits?.max_integrations ?? 0,
          };
        }
      }
      if (locRes.status === 'fulfilled' && locRes.value?.items) {
        next.locations = locRes.value.items.length;
      }
      setOverview(next);
    });
  }, []);

  if (loading) {
    return (
      <SettingsShell title="Settings" subtitle="Account, security, and notification preferences">
        <Skeleton className="h-48 w-full" />
      </SettingsShell>
    );
  }

  const role = profile?.role as keyof typeof ROLES;

  return (
    <SettingsShell
      title="Settings"
      subtitle="Account, security, and notification preferences"
    >
      {/* Overview KPI tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KpiTile
          icon={CreditCard}
          label="Plan"
          value={overview.plan ?? '—'}
          href="/settings/billing"
        />
        <KpiTile
          icon={MapPin}
          label="Locations"
          value={overview.locations?.toString() ?? '—'}
          href="/settings/locations"
        />
        <KpiTile
          icon={UsersIcon}
          label="Users"
          value={overview.users?.toString() ?? '—'}
          href="/settings/team"
        />
        <KpiTile
          icon={ShieldCheck}
          label="Integrations"
          value={
            overview.integrations
              ? `${overview.integrations.configured}/${overview.integrations.total || '∞'}`
              : '—'
          }
          href="#integrations"
          onClick={() => setActiveTab('integrations')}
        />
      </div>

      {/* Tabs */}
      <SettingsCard className="mb-4">
        <div className="border-b border-slate-200 flex flex-wrap">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors',
                  active
                    ? 'border-[#0369A1] text-[#0369A1]'
                    : 'border-transparent text-slate-600 hover:text-[#020617]',
                )}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>

        <SettingsCardBody>
          {activeTab === 'profile' && (
            <ProfileTab
              profile={profile as Record<string, unknown> | null}
              role={role}
            />
          )}
          {activeTab === 'password' && <PasswordTab />}
          {activeTab === 'notifications' && <NotificationsTab />}
          {activeTab === 'integrations' && <IntegrationsTab />}
        </SettingsCardBody>
      </SettingsCard>
    </SettingsShell>
  );
}

function KpiTile({
  icon: Icon,
  label,
  value,
  href,
  onClick,
}: {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  value: string;
  href: string;
  onClick?: () => void;
}) {
  const inner = (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow cursor-pointer h-full">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</p>
          <p className="mt-2 font-display text-2xl font-bold text-[#020617] tabular-nums">{value}</p>
        </div>
        <div className="p-2 rounded-md bg-sky-50 text-[#0369A1]">
          <Icon size={18} />
        </div>
      </div>
    </div>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="text-left">
        {inner}
      </button>
    );
  }
  return <Link href={href}>{inner}</Link>;
}

function ProfileTab({
  profile,
  role,
}: {
  profile: Record<string, unknown> | null;
  role: string;
}) {
  const supabase = createClient();
  const [fullName, setFullName] = useState((profile?.full_name as string) || '');
  const [company, setCompany] = useState((profile?.company as string) || '');
  const [jobTitle, setJobTitle] = useState((profile?.job_title as string) || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('profiles')
        .update({ full_name: fullName, company, job_title: jobTitle })
        .eq('user_id', user.id);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-5">
      <div>
        <label className={settingsLabelClass}>Full Name</label>
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className={settingsInputClass}
        />
      </div>
      <div>
        <label className={settingsLabelClass}>Email</label>
        <input
          type="email"
          value={(profile?.email as string) || ''}
          disabled
          className={cn(settingsInputClass, 'bg-slate-50 text-slate-500 cursor-not-allowed')}
        />
        <p className="text-xs text-slate-500 mt-1">Contact support to change your email.</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={settingsLabelClass}>Company</label>
          <input
            type="text"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Your company"
            className={settingsInputClass}
          />
        </div>
        <div>
          <label className={settingsLabelClass}>Job Title</label>
          <input
            type="text"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            placeholder="Your role"
            className={settingsInputClass}
          />
        </div>
      </div>
      <div>
        <label className={settingsLabelClass}>Role</label>
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-sm font-medium text-[#020617]">
            {role && ROLES[role as keyof typeof ROLES]
              ? ROLES[role as keyof typeof ROLES].label
              : role || '—'}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            {role && ROLES[role as keyof typeof ROLES]
              ? ROLES[role as keyof typeof ROLES].description
              : ''}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className={settingsPrimaryButtonClass}
        >
          {saved ? <CheckCircle2 size={14} /> : <Save size={14} />}
          {saving ? 'Saving...' : saved ? 'Saved' : 'Save Changes'}
        </button>
      </div>

      <div className="pt-6 mt-6 border-t border-slate-200">
        <h3 className="text-sm font-semibold text-red-600 flex items-center gap-2">
          <Trash2 size={14} /> Danger Zone
        </h3>
        <p className="text-xs text-slate-500 mt-1 mb-3">
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>
        <button type="button" className={settingsDangerButtonClass}>
          <Trash2 size={14} />
          Delete Account
        </button>
      </div>
    </div>
  );
}

function PasswordTab() {
  const supabase = createClient();
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters' });
      return;
    }
    if (newPw !== confirmPw) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }

    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPw });
    setSaving(false);

    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setMessage({ type: 'success', text: 'Password updated successfully' });
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
    }
  };

  return (
    <form onSubmit={handleChange} className="space-y-4">
      {message && (
        <div
          className={cn(
            'flex items-center gap-2 rounded-md px-3 py-2 text-sm',
            message.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
              : 'bg-red-50 border border-red-200 text-red-700',
          )}
        >
          {message.type === 'success' ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
          {message.text}
        </div>
      )}
      <div>
        <label className={settingsLabelClass}>Current Password</label>
        <input
          type="password"
          value={currentPw}
          onChange={(e) => setCurrentPw(e.target.value)}
          required
          className={settingsInputClass}
        />
      </div>
      <div>
        <label className={settingsLabelClass}>New Password</label>
        <input
          type="password"
          value={newPw}
          onChange={(e) => setNewPw(e.target.value)}
          required
          minLength={8}
          className={settingsInputClass}
        />
        <p className="text-xs text-slate-500 mt-1">Minimum 8 characters.</p>
      </div>
      <div>
        <label className={settingsLabelClass}>Confirm New Password</label>
        <input
          type="password"
          value={confirmPw}
          onChange={(e) => setConfirmPw(e.target.value)}
          required
          className={settingsInputClass}
        />
      </div>
      <button type="submit" disabled={saving} className={settingsPrimaryButtonClass}>
        <Lock size={14} />
        {saving ? 'Updating...' : 'Update Password'}
      </button>
    </form>
  );
}

function NotificationsTab() {
  const supabase = createClient();
  const [prefs, setPrefs] = useState({
    email_new_work_orders: true,
    email_lease_renewals: true,
    email_maintenance_updates: true,
    email_weekly_digest: true,
    inapp_ai_conversations: true,
    inapp_work_order_status: true,
    inapp_showing_reminders: true,
    inapp_vacancy_alerts: true,
    inapp_financial_alerts: true,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: authUser } }: { data: { user: { id: string } | null } }) => {
      if (!authUser) return;
      supabase
        .from('profiles')
        .select('notification_preferences')
        .eq('user_id', authUser.id)
        .single()
        .then(({ data }: { data: { notification_preferences: Record<string, boolean> } | null }) => {
          if (data?.notification_preferences) {
            setPrefs((prev) => ({ ...prev, ...data.notification_preferences }));
          }
        });
    });
  }, [supabase]);

  const handleSave = async () => {
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('profiles').update({ notification_preferences: prefs }).eq('user_id', user.id);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-display font-semibold text-[#020617] text-sm mb-2">Email Notifications</h3>
        <div className="divide-y divide-slate-100">
          <NotificationRow
            label="New work order notifications"
            checked={prefs.email_new_work_orders}
            onChange={(v) => setPrefs({ ...prefs, email_new_work_orders: v })}
          />
          <NotificationRow
            label="Lease renewal reminders"
            checked={prefs.email_lease_renewals}
            onChange={(v) => setPrefs({ ...prefs, email_lease_renewals: v })}
          />
          <NotificationRow
            label="Maintenance status updates"
            checked={prefs.email_maintenance_updates}
            onChange={(v) => setPrefs({ ...prefs, email_maintenance_updates: v })}
          />
          <NotificationRow
            label="Weekly portfolio digest"
            checked={prefs.email_weekly_digest}
            onChange={(v) => setPrefs({ ...prefs, email_weekly_digest: v })}
          />
        </div>
      </div>

      <div>
        <h3 className="font-display font-semibold text-[#020617] text-sm mb-2">In-App Notifications</h3>
        <div className="divide-y divide-slate-100">
          <NotificationRow
            label="AI conversation activity"
            checked={prefs.inapp_ai_conversations}
            onChange={(v) => setPrefs({ ...prefs, inapp_ai_conversations: v })}
          />
          <NotificationRow
            label="Work order status changes"
            checked={prefs.inapp_work_order_status}
            onChange={(v) => setPrefs({ ...prefs, inapp_work_order_status: v })}
          />
          <NotificationRow
            label="Upcoming showing reminders"
            checked={prefs.inapp_showing_reminders}
            onChange={(v) => setPrefs({ ...prefs, inapp_showing_reminders: v })}
          />
          <NotificationRow
            label="Vacancy alerts"
            checked={prefs.inapp_vacancy_alerts}
            onChange={(v) => setPrefs({ ...prefs, inapp_vacancy_alerts: v })}
          />
          <NotificationRow
            label="Financial variance alerts"
            checked={prefs.inapp_financial_alerts}
            onChange={(v) => setPrefs({ ...prefs, inapp_financial_alerts: v })}
          />
        </div>
      </div>

      <button type="button" onClick={handleSave} disabled={saving} className={settingsPrimaryButtonClass}>
        {saved ? <CheckCircle2 size={14} /> : <Save size={14} />}
        {saving ? 'Saving...' : saved ? 'Saved' : 'Save Preferences'}
      </button>
    </div>
  );
}

/* ─── Integrations Tab ─── */
function IntegrationsTab() {
  return (
    <div className="space-y-4">
      <ApifyIntegrationCard />
      <RentCastIntegrationCard />
      <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
        <h3 className="text-sm font-semibold text-[#020617] mb-2">Comp source trade-offs</h3>
        <ul className="text-xs text-slate-600 space-y-1 leading-relaxed">
          <li>
            <span className="font-medium text-[#020617]">Apify (primary):</span> free with our existing
            subscription, slower (~30 sec per scrape), Zillow data, AVM approximated from comps.
          </li>
          <li>
            <span className="font-medium text-[#020617]">RentCast (fallback):</span> $49/mo paid, faster
            (~2 sec), better AVM accuracy, first-party comps + ZIP market stats.
          </li>
          <li className="text-slate-500">
            Deal scoring tries Apify first; if it returns no comps for an address, it falls back to
            RentCast (when configured), then to Claude-only mode.
          </li>
        </ul>
      </div>
    </div>
  );
}

function StatusPill({ ok, okLabel = 'Configured', notLabel = 'Not configured' }: { ok: boolean; okLabel?: string; notLabel?: string }) {
  return (
    <span
      className={cn(
        'text-xs px-2 py-0.5 rounded-full border whitespace-nowrap',
        ok
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-amber-200 bg-amber-50 text-amber-700',
      )}
    >
      {ok ? okLabel : notLabel}
    </span>
  );
}

function ApifyIntegrationCard() {
  const [configured, setConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('/api/integrations/apify')
      .then((r) => r.json())
      .then((data) => setConfigured(!!data.configured))
      .catch(() => setConfigured(false));
  }, []);

  return (
    <SettingsCard>
      <SettingsCardBody>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display font-semibold text-[#020617] flex items-center gap-2">
              <Plug size={16} className="text-[#0369A1]" /> Apify
              <span className="text-xs font-normal text-slate-500">(comps source — primary)</span>
            </h3>
            <p className="text-sm text-slate-600 mt-1 leading-relaxed">
              Scrapes Zillow comps via our existing Apify subscription. Free to use, no extra spend.
            </p>
          </div>
          {configured !== null && <StatusPill ok={configured} />}
        </div>
        {configured === false && (
          <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-xs text-slate-600">
              Set <span className="font-mono text-[#020617]">APIFY_API_TOKEN</span> in your server
              environment to enable.
            </p>
          </div>
        )}
      </SettingsCardBody>
    </SettingsCard>
  );
}

function RentCastIntegrationCard() {
  const [status, setStatus] = useState<{
    has_org_key: boolean;
    env_fallback: boolean;
    configured: boolean;
    masked_key: string | null;
  } | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetch('/api/integrations/rentcast')
      .then((r) => r.json())
      .then(setStatus)
      .catch(() =>
        setStatus({ has_org_key: false, env_fallback: false, configured: false, masked_key: null }),
      );
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/integrations/rentcast', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKey }),
      });
      if (!res.ok) throw new Error('Failed to save');
      const data = await res.json();
      setStatus((prev) => (prev ? { ...prev, ...data } : data));
      setApiKey('');
      setMessage({ type: 'success', text: 'RentCast API key saved' });
    } catch (e) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : 'Failed to save' });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleClear = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/integrations/rentcast', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: null }),
      });
      if (!res.ok) throw new Error('Failed to clear');
      const data = await res.json();
      setStatus((prev) => (prev ? { ...prev, ...data } : data));
      setMessage({ type: 'success', text: 'RentCast key removed' });
    } catch (e) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : 'Failed to clear' });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  return (
    <SettingsCard>
      <SettingsCardBody className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display font-semibold text-[#020617] flex items-center gap-2">
              <Key size={16} className="text-[#0369A1]" /> RentCast API
              <span className="text-xs font-normal text-slate-500">(optional fallback)</span>
            </h3>
            <p className="text-sm text-slate-600 mt-1 leading-relaxed">
              Paid AVM with first-party sale & rent comps. Used as fallback when Apify returns no comps.
              {' '}
              <a
                href="https://developers.rentcast.io/"
                target="_blank"
                rel="noreferrer"
                className="text-[#0369A1] hover:underline"
              >
                Get a key →
              </a>
            </p>
          </div>
          {status && <StatusPill ok={status.configured} />}
        </div>

        {message && (
          <div
            className={cn(
              'flex items-center gap-2 rounded-md px-3 py-2 text-sm',
              message.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                : 'bg-red-50 border border-red-200 text-red-700',
            )}
          >
            {message.type === 'success' ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
            {message.text}
          </div>
        )}

        {status?.has_org_key && status.masked_key && (
          <div className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Active Key</p>
              <p className="text-sm font-mono text-[#020617]">{status.masked_key}</p>
            </div>
            <button
              type="button"
              onClick={handleClear}
              disabled={saving}
              className={settingsDangerButtonClass}
            >
              <Trash2 size={14} />
              Remove
            </button>
          </div>
        )}

        {status?.env_fallback && !status.has_org_key && (
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-xs text-slate-600">
              Using server env var <span className="font-mono text-[#020617]">RENTCAST_API_KEY</span>.
              Set a key here to override per-org.
            </p>
          </div>
        )}

        <div>
          <label className={settingsLabelClass}>
            {status?.has_org_key ? 'Replace API Key' : 'API Key'}
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Paste your RentCast API key"
            className={cn(settingsInputClass, 'font-mono')}
          />
          <p className="text-xs text-slate-500 mt-1">Stored encrypted at rest in integration_configs.</p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !apiKey.trim()}
          className={settingsPrimaryButtonClass}
        >
          <Save size={14} />
          {saving ? 'Saving...' : 'Save Key'}
        </button>
      </SettingsCardBody>
    </SettingsCard>
  );
}

// Re-export ChevronRight to silence the unused import warning if I forgot.
void ChevronRight;
