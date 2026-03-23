'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import { Skeleton } from '@/components/ui/Skeleton';
import { ROLES } from '@/lib/constants';
import { motion } from 'framer-motion';
import { User, Lock, Bell, Save, CheckCircle2, AlertTriangle, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type TabId = 'profile' | 'password' | 'notifications';

const tabs: { id: TabId; label: string; icon: typeof User }[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'password', label: 'Password', icon: Lock },
  { id: 'notifications', label: 'Notifications', icon: Bell },
];

export default function SettingsPage() {
  const { profile, user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('profile');

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-48 w-full max-w-lg" />
      </div>
    );
  }

  const role = profile?.role as keyof typeof ROLES;

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="font-display text-xl font-bold text-text-primary">Settings</h1>
        <p className="text-sm text-text-secondary">Account, security, and notification preferences</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-bg-secondary/60 p-1 border border-border/50">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all flex-1 justify-center',
              activeTab === tab.id
                ? 'bg-bg-elevated text-accent shadow-sm'
                : 'text-text-muted hover:text-text-secondary',
            )}
          >
            <tab.icon size={13} />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'profile' && <ProfileTab profile={profile as { full_name?: string; email?: string; company?: string; job_title?: string; [key: string]: unknown } | null} role={role} />}
      {activeTab === 'password' && <PasswordTab />}
      {activeTab === 'notifications' && <NotificationsTab />}
    </div>
  );
}

function ProfileTab({ profile, role }: { profile: { full_name?: string; email?: string; company?: string; job_title?: string; [key: string]: unknown } | null; role: string }) {
  const supabase = createClient();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [company, setCompany] = useState(profile?.company || '');
  const [jobTitle, setJobTitle] = useState(profile?.job_title || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('profiles').update({
        full_name: fullName,
        company,
        job_title: jobTitle,
      }).eq('user_id', user.id);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="glass-card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
          <User size={14} className="text-accent" /> Profile Information
        </h2>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5">Email</label>
            <input
              type="email"
              value={profile?.email as string || ''}
              disabled
              className="w-full rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-text-muted cursor-not-allowed"
            />
            <p className="text-[10px] text-text-muted mt-1">Contact support to change your email</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5">Company</label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Your company"
                className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5">Job Title</label>
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="Your role"
                className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5">Role</label>
            <div className="rounded-lg border border-border bg-bg-elevated px-3 py-2">
              <p className="text-sm text-text-primary">
                {role && ROLES[role as keyof typeof ROLES] ? ROLES[role as keyof typeof ROLES].label : role || '—'}
              </p>
              <p className="text-[10px] text-text-muted mt-0.5">
                {role && ROLES[role as keyof typeof ROLES] ? ROLES[role as keyof typeof ROLES].description : ''}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-bg-primary hover:bg-accent-hover transition-colors disabled:opacity-50"
          >
            {saved ? <CheckCircle2 size={13} /> : <Save size={13} />}
            {saving ? 'Saving...' : saved ? 'Saved' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="glass-card p-5 border-danger/20">
        <h2 className="text-sm font-semibold text-danger flex items-center gap-2 mb-2">
          <Trash2 size={14} /> Danger Zone
        </h2>
        <p className="text-xs text-text-muted mb-3">
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>
        <button className="flex items-center gap-2 rounded-lg border border-danger/30 px-3 py-1.5 text-xs font-medium text-danger hover:bg-danger/5 transition-colors">
          <Trash2 size={12} />
          Delete Account
        </button>
      </div>
    </motion.div>
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
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <form onSubmit={handleChange} className="glass-card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
          <Lock size={14} className="text-accent" /> Change Password
        </h2>

        {message && (
          <div className={cn(
            'flex items-center gap-2 rounded-lg px-3 py-2 text-xs',
            message.type === 'success' ? 'bg-accent/5 border border-accent/20 text-accent' : 'bg-danger/5 border border-danger/20 text-danger',
          )}>
            {message.type === 'success' ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
            {message.text}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5">Current Password</label>
            <input
              type="password"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              required
              className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5">New Password</label>
            <input
              type="password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              required
              minLength={8}
              className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <p className="text-[10px] text-text-muted mt-1">Minimum 8 characters</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5">Confirm New Password</label>
            <input
              type="password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              required
              className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-bg-primary hover:bg-accent-hover transition-colors disabled:opacity-50"
        >
          <Lock size={13} />
          {saving ? 'Updating...' : 'Update Password'}
        </button>
      </form>
    </motion.div>
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
      supabase.from('profiles').select('notification_preferences').eq('user_id', authUser.id).single()
        .then(({ data }: { data: { notification_preferences: Record<string, boolean> } | null }) => {
          if (data?.notification_preferences) {
            setPrefs((prev) => ({ ...prev, ...data.notification_preferences }));
          }
        });
    });
  }, [supabase]);

  const handleSave = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('profiles').update({ notification_preferences: prefs }).eq('user_id', user.id);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const Toggle = ({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) => (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-xs text-text-secondary">{label}</span>
      <button
        onClick={() => onChange(!checked)}
        className="relative h-5 w-9 rounded-full transition-colors"
        style={{ backgroundColor: checked ? 'rgba(0,212,170,0.3)' : 'rgba(255,255,255,0.08)' }}
      >
        <div
          className="absolute top-0.5 h-4 w-4 rounded-full transition-all"
          style={{
            left: checked ? 18 : 2,
            backgroundColor: checked ? '#00D4AA' : '#4A5568',
          }}
        />
      </button>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="glass-card p-5 space-y-3">
        <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
          <Bell size={14} className="text-accent" /> Email Notifications
        </h2>
        <Toggle checked={prefs.email_new_work_orders} onChange={(v) => setPrefs({ ...prefs, email_new_work_orders: v })} label="New work order notifications" />
        <Toggle checked={prefs.email_lease_renewals} onChange={(v) => setPrefs({ ...prefs, email_lease_renewals: v })} label="Lease renewal reminders" />
        <Toggle checked={prefs.email_maintenance_updates} onChange={(v) => setPrefs({ ...prefs, email_maintenance_updates: v })} label="Maintenance status updates" />
        <Toggle checked={prefs.email_weekly_digest} onChange={(v) => setPrefs({ ...prefs, email_weekly_digest: v })} label="Weekly portfolio digest" />
      </div>

      <div className="glass-card p-5 space-y-3">
        <h2 className="text-sm font-semibold text-text-primary">In-App Notifications</h2>
        <Toggle checked={prefs.inapp_ai_conversations} onChange={(v) => setPrefs({ ...prefs, inapp_ai_conversations: v })} label="AI conversation activity" />
        <Toggle checked={prefs.inapp_work_order_status} onChange={(v) => setPrefs({ ...prefs, inapp_work_order_status: v })} label="Work order status changes" />
        <Toggle checked={prefs.inapp_showing_reminders} onChange={(v) => setPrefs({ ...prefs, inapp_showing_reminders: v })} label="Upcoming showing reminders" />
        <Toggle checked={prefs.inapp_vacancy_alerts} onChange={(v) => setPrefs({ ...prefs, inapp_vacancy_alerts: v })} label="Vacancy alerts" />
        <Toggle checked={prefs.inapp_financial_alerts} onChange={(v) => setPrefs({ ...prefs, inapp_financial_alerts: v })} label="Financial variance alerts" />
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-bg-primary hover:bg-accent-hover transition-colors disabled:opacity-50"
      >
        {saved ? <CheckCircle2 size={13} /> : <Save size={13} />}
        {saving ? 'Saving...' : saved ? 'Saved' : 'Save Preferences'}
      </button>
    </motion.div>
  );
}
