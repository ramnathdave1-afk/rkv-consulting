'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  User,
  CreditCard,
  Bell,
  Plug,
  Shield,
  Sliders,
  Save,
  Eye,
  EyeOff,
  LogOut,
  Trash2,
  AlertTriangle,
  Check,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Modal, ModalContent, ModalHeader, ModalFooter } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { toast } from '@/components/ui/Toast';
import { UpgradeModal } from '@/components/paywall/UpgradeModal';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ProfileData {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  notification_preferences: NotificationPrefs;
  ai_tone_preference: string | null;
  calling_hours_start: string | null;
  calling_hours_end: string | null;
  autopilot_enabled: boolean;
}

interface NotificationPrefs {
  email: boolean;
  sms: boolean;
  push: boolean;
  rent_reminders?: boolean;
  lease_expiration?: boolean;
  maintenance_updates?: boolean;
  market_alerts?: boolean;
  ai_summaries?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Toggle Switch Component                                            */
/* ------------------------------------------------------------------ */

function ToggleSwitch({
  checked,
  onCheckedChange,
  label,
  description,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm font-medium text-white">{label}</p>
        {description && (
          <p className="text-xs text-muted mt-0.5">{description}</p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 items-center rounded-full',
          'transition-colors duration-200 ease-out',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black',
          checked ? 'bg-gold' : 'bg-border',
        )}
      >
        <span
          className={cn(
            'inline-block h-4 w-4 rounded-full bg-white shadow-sm',
            'transition-transform duration-200 ease-out',
            checked ? 'translate-x-6' : 'translate-x-1',
          )}
        />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Progress Bar Component                                             */
/* ------------------------------------------------------------------ */

function UsageMeter({
  label,
  used,
  limit,
}: {
  label: string;
  used: number;
  limit: number;
}) {
  const pct = limit === 0 ? 0 : Math.min((used / limit) * 100, 100);
  const isUnlimited = limit === Infinity || limit > 99999;
  const displayLimit = isUnlimited ? 'Unlimited' : limit.toLocaleString();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-white font-medium">{label}</span>
        <span className="text-xs text-muted">
          {used.toLocaleString()} / {displayLimit}
        </span>
      </div>
      <div className="h-2 bg-border rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500 ease-out',
            pct >= 90 ? 'bg-red' : pct >= 70 ? 'bg-gold-light' : 'bg-gold',
          )}
          style={{ width: isUnlimited ? '10%' : `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Integration Card Component                                         */
/* ------------------------------------------------------------------ */

function IntegrationCard({
  name,
  description,
  connected,
  onAction,
}: {
  name: string;
  description: string;
  connected: boolean;
  onAction: () => void;
}) {
  return (
    <Card className="flex items-center gap-4">
      {/* Logo placeholder */}
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-deep border border-border shrink-0">
        <Plug className="h-5 w-5 text-muted" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold text-white">{name}</h4>
          <Badge
            variant={connected ? 'success' : 'info'}
            size="sm"
            dot
          >
            {connected ? 'Connected' : 'Not Connected'}
          </Badge>
        </div>
        <p className="text-xs text-muted mt-0.5">{description}</p>
      </div>

      <Button
        variant={connected ? 'ghost' : 'secondary'}
        size="sm"
        onClick={onAction}
      >
        {connected ? 'Configure' : 'Connect'}
      </Button>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Settings Page                                                 */
/* ------------------------------------------------------------------ */

export default function SettingsPage() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') === 'billing' ? 'subscription' : 'profile';

  const {
    subscription,
    planName,
    plan,
    isLoading: subLoading,
    isActive,
    getLimit,
    trialDaysRemaining,
  } = useSubscription();

  // Profile state
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Profile form
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');

  // Notification prefs
  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>({
    email: true,
    sms: true,
    push: true,
    rent_reminders: true,
    lease_expiration: true,
    maintenance_updates: true,
    market_alerts: true,
    ai_summaries: true,
  });

  // Preferences
  const [aiTone, setAiTone] = useState('professional');
  const [callingStart, setCallingStart] = useState('09:00');
  const [callingEnd, setCallingEnd] = useState('19:00');
  const [autopilot, setAutopilot] = useState(false);
  const [dateFormat, setDateFormat] = useState('MM/DD/YYYY');
  const [currency, setCurrency] = useState('USD');

  // Security
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  // Modals
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [cancelSubOpen, setCancelSubOpen] = useState(false);
  const [cancelingSub, setCancelingSub] = useState(false);

  // Usage data
  const [usageData, setUsageData] = useState({
    properties: 0,
    dealAnalyses: 0,
    aiMessages: 0,
  });

  /* ---- Fetch profile data --------------------------------------- */

  const fetchProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileData) {
      const p = profileData as ProfileData;
      setProfile(p);
      setFullName(p.full_name || '');
      setPhone(p.phone || '');
      setAiTone(p.ai_tone_preference || 'professional');
      setCallingStart(p.calling_hours_start || '09:00');
      setCallingEnd(p.calling_hours_end || '19:00');
      setAutopilot(p.autopilot_enabled || false);

      // Parse notification preferences
      const np = p.notification_preferences || {};
      setNotifPrefs({
        email: np.email !== false,
        sms: np.sms !== false,
        push: np.push !== false,
        rent_reminders: np.rent_reminders !== false,
        lease_expiration: np.lease_expiration !== false,
        maintenance_updates: np.maintenance_updates !== false,
        market_alerts: np.market_alerts !== false,
        ai_summaries: np.ai_summaries !== false,
      });
    }

    // Fetch usage counts
    const [propsCount, aiUsageRes] = await Promise.all([
      supabase
        .from('properties')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id),
      supabase
        .from('ai_usage')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single(),
    ]);

    setUsageData({
      properties: propsCount.count || 0,
      dealAnalyses: (aiUsageRes.data as { deal_analyses_used?: number } | null)?.deal_analyses_used || 0,
      aiMessages: (aiUsageRes.data as { ai_messages_used?: number } | null)?.ai_messages_used || 0,
    });

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  /* ---- Save profile --------------------------------------------- */

  async function handleSaveProfile() {
    if (!profile) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          phone: phone,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id);

      if (error) throw error;
      toast.success('Profile updated successfully');
    } catch (err) {
      console.error('Save profile error:', err);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  }

  /* ---- Save notification preferences ----------------------------- */

  async function handleSaveNotifications() {
    if (!profile) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          notification_preferences: notifPrefs,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id);

      if (error) throw error;
      toast.success('Notification preferences saved');
    } catch (err) {
      console.error('Save notifications error:', err);
      toast.error('Failed to save notification preferences');
    } finally {
      setSaving(false);
    }
  }

  /* ---- Save preferences ----------------------------------------- */

  async function handleSavePreferences() {
    if (!profile) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          ai_tone_preference: aiTone,
          calling_hours_start: callingStart,
          calling_hours_end: callingEnd,
          autopilot_enabled: autopilot,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id);

      if (error) throw error;
      toast.success('Preferences saved');
    } catch (err) {
      console.error('Save preferences error:', err);
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  }

  /* ---- Change password ------------------------------------------ */

  async function handleChangePassword() {
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setChangingPassword(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast.success('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error('Change password error:', err);
      toast.error('Failed to update password');
    } finally {
      setChangingPassword(false);
    }
  }

  /* ---- Manage billing (Stripe portal) --------------------------- */

  async function handleManageBilling() {
    try {
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Manage billing error:', err);
      toast.error('Failed to open billing portal');
    }
  }

  /* ---- Cancel subscription -------------------------------------- */

  async function handleCancelSubscription() {
    setCancelingSub(true);

    try {
      const res = await fetch('/api/stripe/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Subscription canceled. You will retain access until the end of your billing period.');
        setCancelSubOpen(false);
        fetchProfile();
      } else {
        throw new Error(data.error || 'Failed to cancel');
      }
    } catch (err) {
      console.error('Cancel subscription error:', err);
      toast.error('Failed to cancel subscription');
    } finally {
      setCancelingSub(false);
    }
  }

  /* ---- Delete account ------------------------------------------- */

  async function handleDeleteAccount() {
    if (deleteConfirmText !== 'DELETE') return;
    setDeletingAccount(true);

    try {
      const { error } = await supabase.auth.admin.deleteUser(profile!.id);
      if (error) {
        // Fallback: sign out and let user contact support
        await supabase.auth.signOut();
        window.location.href = '/login';
      } else {
        window.location.href = '/login';
      }
    } catch {
      toast.error('Failed to delete account. Please contact support.');
      setDeletingAccount(false);
    }
  }

  /* ---- Sign out all sessions ------------------------------------ */

  async function handleSignOutAll() {
    try {
      await supabase.auth.signOut({ scope: 'global' });
      window.location.href = '/login';
    } catch (err) {
      console.error('Sign out all error:', err);
      toast.error('Failed to sign out all sessions');
    }
  }

  /* ---- Initials ------------------------------------------------- */

  const initials = fullName
    ? fullName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : profile?.email?.charAt(0).toUpperCase() || '?';

  /* ---- Loading skeleton ----------------------------------------- */

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-32 bg-border/50 rounded animate-pulse" />
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-10 w-24 bg-border/50 rounded-lg animate-pulse" />
          ))}
        </div>
        <Skeleton variant="card" height="400px" />
      </div>
    );
  }

  /* ---- Billing date formatting ---------------------------------- */

  const nextBillingDate = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : '--';

  const statusLabel = subscription?.status || 'inactive';
  const statusVariant: 'success' | 'warning' | 'danger' | 'default' =
    statusLabel === 'active' || statusLabel === 'trialing'
      ? 'success'
      : statusLabel === 'past_due'
        ? 'warning'
        : statusLabel === 'canceled'
          ? 'danger'
          : 'default';

  /* ---- Main render ---------------------------------------------- */

  return (
    <div className="space-y-6">
      {/* ============================================================ */}
      {/*  HEADER                                                       */}
      {/* ============================================================ */}
      <h1 className="font-display font-bold text-2xl text-white">Settings</h1>

      {/* ============================================================ */}
      {/*  TABS                                                         */}
      {/* ============================================================ */}
      <Tabs defaultValue={initialTab}>
        <TabsList>
          <TabsTrigger value="profile" icon={<User className="h-4 w-4" />}>
            Profile
          </TabsTrigger>
          <TabsTrigger value="subscription" icon={<CreditCard className="h-4 w-4" />}>
            Subscription
          </TabsTrigger>
          <TabsTrigger value="notifications" icon={<Bell className="h-4 w-4" />}>
            Notifications
          </TabsTrigger>
          <TabsTrigger value="integrations" icon={<Plug className="h-4 w-4" />}>
            Integrations
          </TabsTrigger>
          <TabsTrigger value="security" icon={<Shield className="h-4 w-4" />}>
            Security
          </TabsTrigger>
          <TabsTrigger value="preferences" icon={<Sliders className="h-4 w-4" />}>
            Preferences
          </TabsTrigger>
        </TabsList>

        {/* ========================================================== */}
        {/*  TAB 1: PROFILE                                             */}
        {/* ========================================================== */}
        <TabsContent value="profile">
          <Card padding="lg" className="max-w-2xl">
            {/* Avatar */}
            <div className="flex items-center gap-5 mb-8">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gold/15 text-gold font-display font-bold text-xl border border-gold/20">
                {initials}
              </div>
              <div>
                <p className="text-sm font-semibold text-white">
                  {fullName || 'Your Name'}
                </p>
                <p className="text-xs text-muted mt-0.5">{profile?.email}</p>
                <button className="text-xs font-medium text-gold hover:text-gold-light transition-colors mt-1">
                  Change Avatar
                </button>
              </div>
            </div>

            {/* Form */}
            <div className="space-y-4">
              <Input
                label="Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
              />

              <Input
                label="Email"
                value={profile?.email || ''}
                readOnly
                className="opacity-60 cursor-not-allowed"
                helperText="Email cannot be changed"
              />

              <Input
                label="Phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
              />
            </div>

            <div className="mt-6">
              <Button
                onClick={handleSaveProfile}
                loading={saving}
                icon={<Save className="w-4 h-4" />}
              >
                Save Changes
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* ========================================================== */}
        {/*  TAB 2: SUBSCRIPTION                                        */}
        {/* ========================================================== */}
        <TabsContent value="subscription">
          <div className="space-y-6 max-w-3xl">
            {/* Current plan card */}
            <Card padding="lg">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <p className="text-xs text-muted uppercase tracking-wider font-semibold mb-1">
                    Current Plan
                  </p>
                  <h2 className="font-display font-bold text-3xl text-gold">
                    {subLoading ? '...' : plan.name}
                  </h2>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-lg font-bold text-white">
                      ${plan.price}
                      <span className="text-sm text-muted font-normal">/month</span>
                    </span>
                    <Badge variant={statusVariant} size="sm" dot>
                      {statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1)}
                    </Badge>
                  </div>
                </div>
              </div>

              <p className="text-sm text-muted mb-6">
                Next billing date:{' '}
                <span className="text-white font-medium">{nextBillingDate}</span>
              </p>

              {/* Trial info */}
              {trialDaysRemaining !== null && trialDaysRemaining > 0 && (
                <div className="flex items-center gap-2 mb-6 p-3 rounded-lg bg-gold/10 border border-gold/20">
                  <AlertTriangle className="h-4 w-4 text-gold shrink-0" />
                  <p className="text-sm text-gold">
                    <span className="font-semibold">{trialDaysRemaining} days</span> remaining in trial
                  </p>
                </div>
              )}

              {/* Usage meters */}
              <div className="space-y-4 mb-8">
                <UsageMeter
                  label="Properties"
                  used={usageData.properties}
                  limit={getLimit('propertyLimit')}
                />
                <UsageMeter
                  label="Deal Analyses"
                  used={usageData.dealAnalyses}
                  limit={getLimit('dealAnalysisLimit')}
                />
                <UsageMeter
                  label="AI Messages"
                  used={usageData.aiMessages}
                  limit={getLimit('aiMessagesLimit')}
                />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 flex-wrap">
                {planName !== 'elite' && (
                  <Button onClick={() => setUpgradeOpen(true)}>
                    Change Plan
                  </Button>
                )}
                <Button variant="secondary" onClick={handleManageBilling}>
                  Manage Billing
                </Button>
                {isActive && planName !== 'basic' && (
                  <Button
                    variant="ghost"
                    className="text-red hover:text-red hover:bg-red/5"
                    onClick={() => setCancelSubOpen(true)}
                  >
                    Cancel Subscription
                  </Button>
                )}
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* ========================================================== */}
        {/*  TAB 3: NOTIFICATIONS                                       */}
        {/* ========================================================== */}
        <TabsContent value="notifications">
          <Card padding="lg" className="max-w-2xl">
            <h3 className="font-display font-semibold text-lg text-white mb-4">
              Notification Preferences
            </h3>

            <div className="divide-y divide-border">
              <ToggleSwitch
                label="Email Notifications"
                description="Receive notifications via email"
                checked={notifPrefs.email}
                onCheckedChange={(v) => setNotifPrefs((prev) => ({ ...prev, email: v }))}
              />
              <ToggleSwitch
                label="SMS Notifications"
                description="Receive notifications via text message"
                checked={notifPrefs.sms}
                onCheckedChange={(v) => setNotifPrefs((prev) => ({ ...prev, sms: v }))}
              />
              <ToggleSwitch
                label="Push Notifications"
                description="Browser push notifications"
                checked={notifPrefs.push}
                onCheckedChange={(v) => setNotifPrefs((prev) => ({ ...prev, push: v }))}
              />

              <div className="pt-4 pb-2">
                <p className="text-xs text-muted uppercase tracking-wider font-semibold">
                  Alert Types
                </p>
              </div>

              <ToggleSwitch
                label="Rent Payment Reminders"
                description="Get notified about upcoming and overdue rent payments"
                checked={notifPrefs.rent_reminders !== false}
                onCheckedChange={(v) => setNotifPrefs((prev) => ({ ...prev, rent_reminders: v }))}
              />
              <ToggleSwitch
                label="Lease Expiration Alerts"
                description="Alerts when leases are expiring within 90 days"
                checked={notifPrefs.lease_expiration !== false}
                onCheckedChange={(v) => setNotifPrefs((prev) => ({ ...prev, lease_expiration: v }))}
              />
              <ToggleSwitch
                label="Maintenance Updates"
                description="Status updates on maintenance requests"
                checked={notifPrefs.maintenance_updates !== false}
                onCheckedChange={(v) => setNotifPrefs((prev) => ({ ...prev, maintenance_updates: v }))}
              />
              <ToggleSwitch
                label="Market Alerts"
                description="Price changes and market trends in watched areas"
                checked={notifPrefs.market_alerts !== false}
                onCheckedChange={(v) => setNotifPrefs((prev) => ({ ...prev, market_alerts: v }))}
              />
              <ToggleSwitch
                label="AI Agent Summaries"
                description="Daily digests of AI agent actions and insights"
                checked={notifPrefs.ai_summaries !== false}
                onCheckedChange={(v) => setNotifPrefs((prev) => ({ ...prev, ai_summaries: v }))}
              />
            </div>

            <div className="mt-6">
              <Button
                onClick={handleSaveNotifications}
                loading={saving}
                icon={<Save className="w-4 h-4" />}
              >
                Save Preferences
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* ========================================================== */}
        {/*  TAB 4: INTEGRATIONS                                        */}
        {/* ========================================================== */}
        <TabsContent value="integrations">
          <div className="max-w-3xl space-y-4">
            <h3 className="font-display font-semibold text-lg text-white mb-2">
              Connected Services
            </h3>
            <p className="text-sm text-muted mb-4">
              Manage your third-party integrations and API connections.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <IntegrationCard
                name="Plaid"
                description="Connect your bank accounts for automatic transaction imports"
                connected={false}
                onAction={() => toast.info('Plaid integration coming soon')}
              />
              <IntegrationCard
                name="Stripe"
                description="Payment processing for rent collection"
                connected={!!subscription?.stripe_subscription_id}
                onAction={handleManageBilling}
              />
              <IntegrationCard
                name="SendGrid"
                description="Email delivery for notifications and AI agents"
                connected={false}
                onAction={() => toast.info('Configure SendGrid in environment variables')}
              />
              <IntegrationCard
                name="Twilio"
                description="SMS and voice calling for AI agents"
                connected={false}
                onAction={() => toast.info('Configure Twilio in environment variables')}
              />
              <IntegrationCard
                name="Google Maps"
                description="Property mapping and location intelligence"
                connected={false}
                onAction={() => toast.info('Configure Google Maps in environment variables')}
              />
            </div>

            {/* API Keys section */}
            <Card padding="lg" className="mt-6">
              <h4 className="text-sm font-semibold text-white mb-4">API Keys</h4>
              <p className="text-xs text-muted mb-4">
                API keys are configured through environment variables for security. Contact your administrator to update these values.
              </p>
              <div className="space-y-3">
                {[
                  { name: 'SENDGRID_API_KEY', masked: 'SG.****...****' },
                  { name: 'TWILIO_AUTH_TOKEN', masked: '****...****' },
                  { name: 'GOOGLE_MAPS_API_KEY', masked: 'AIza****...****' },
                  { name: 'STRIPE_SECRET_KEY', masked: 'sk_****...****' },
                ].map((key) => (
                  <div
                    key={key.name}
                    className="flex items-center justify-between py-2 px-3 bg-deep rounded-lg border border-border"
                  >
                    <span className="text-xs text-muted font-mono">{key.name}</span>
                    <span className="text-xs text-muted/60 font-mono">{key.masked}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* ========================================================== */}
        {/*  TAB 5: SECURITY                                            */}
        {/* ========================================================== */}
        <TabsContent value="security">
          <div className="max-w-2xl space-y-6">
            {/* Change Password */}
            <Card padding="lg">
              <h3 className="font-display font-semibold text-lg text-white mb-4">
                Change Password
              </h3>
              <div className="space-y-4">
                <div className="relative">
                  <Input
                    label="Current Password"
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-[34px] text-muted hover:text-white transition-colors"
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>

                <div className="relative">
                  <Input
                    label="New Password"
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    helperText="Must be at least 8 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-[34px] text-muted hover:text-white transition-colors"
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>

                <Input
                  label="Confirm New Password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  error={
                    confirmPassword && newPassword !== confirmPassword
                      ? 'Passwords do not match'
                      : undefined
                  }
                />
              </div>
              <div className="mt-4">
                <Button
                  onClick={handleChangePassword}
                  loading={changingPassword}
                  disabled={!currentPassword || !newPassword || !confirmPassword}
                >
                  Update Password
                </Button>
              </div>
            </Card>

            {/* Two-Factor Authentication */}
            <Card padding="lg">
              <h3 className="font-display font-semibold text-lg text-white mb-2">
                Two-Factor Authentication
              </h3>
              <p className="text-sm text-muted mb-4">
                Add an extra layer of security to your account.
              </p>
              <ToggleSwitch
                label="Enable 2FA"
                description="Use an authenticator app for two-factor authentication"
                checked={twoFactorEnabled}
                onCheckedChange={(v) => {
                  setTwoFactorEnabled(v);
                  toast.info('Two-factor authentication setup coming soon');
                }}
              />
            </Card>

            {/* Active Sessions */}
            <Card padding="lg">
              <h3 className="font-display font-semibold text-lg text-white mb-4">
                Active Sessions
              </h3>
              <div className="flex items-center justify-between p-3 bg-deep rounded-lg border border-border">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green/10">
                    <div className="h-2 w-2 rounded-full bg-green" />
                  </div>
                  <div>
                    <p className="text-sm text-white font-medium">Current Session</p>
                    <p className="text-xs text-muted">
                      {typeof navigator !== 'undefined' ? navigator.userAgent.split('(')[1]?.split(')')[0] || 'Unknown browser' : 'Unknown browser'}
                    </p>
                  </div>
                </div>
                <Badge variant="success" size="sm">Active</Badge>
              </div>
              <div className="mt-4">
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<LogOut className="w-3.5 h-3.5" />}
                  onClick={handleSignOutAll}
                >
                  Sign Out All Other Devices
                </Button>
              </div>
            </Card>

            {/* Danger Zone */}
            <Card padding="lg" className="border-red/20">
              <h3 className="font-display font-semibold text-lg text-red mb-2">
                Danger Zone
              </h3>
              <p className="text-sm text-muted mb-4">
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>
              <Button
                variant="danger"
                icon={<Trash2 className="w-4 h-4" />}
                onClick={() => setDeleteAccountOpen(true)}
              >
                Delete Account
              </Button>
            </Card>
          </div>
        </TabsContent>

        {/* ========================================================== */}
        {/*  TAB 6: PREFERENCES                                         */}
        {/* ========================================================== */}
        <TabsContent value="preferences">
          <Card padding="lg" className="max-w-2xl">
            <h3 className="font-display font-semibold text-lg text-white mb-6">
              Application Preferences
            </h3>

            <div className="space-y-6">
              {/* AI Tone */}
              <div>
                <label className="block text-sm text-muted font-body mb-1.5">
                  AI Tone
                </label>
                <select
                  value={aiTone}
                  onChange={(e) => setAiTone(e.target.value)}
                  className={cn(
                    'w-full h-10 px-3 pr-8 text-sm appearance-none',
                    'bg-deep text-white border border-border rounded-lg font-body',
                    'focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/40',
                    'transition-all duration-200',
                  )}
                >
                  <option value="professional">Professional</option>
                  <option value="casual">Casual</option>
                  <option value="technical">Technical</option>
                  <option value="concise">Concise</option>
                </select>
              </div>

              {/* Calling Hours */}
              <div>
                <p className="text-sm text-muted font-body mb-1.5">
                  Calling Hours (for AI Voice Agent)
                </p>
                <div className="flex items-center gap-3">
                  <Input
                    type="time"
                    value={callingStart}
                    onChange={(e) => setCallingStart(e.target.value)}
                    className="flex-1"
                  />
                  <span className="text-sm text-muted">to</span>
                  <Input
                    type="time"
                    value={callingEnd}
                    onChange={(e) => setCallingEnd(e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>

              {/* Autopilot */}
              <div className="border-t border-border pt-4">
                <ToggleSwitch
                  label="Autopilot Approval Mode"
                  description={
                    autopilot
                      ? 'Full autopilot - AI agents act without approval'
                      : 'Require approval for AI actions'
                  }
                  checked={autopilot}
                  onCheckedChange={setAutopilot}
                />
              </div>

              {/* Theme */}
              <div className="border-t border-border pt-4">
                <label className="block text-sm text-muted font-body mb-1.5">
                  Theme
                </label>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-gold/10 border border-gold/20 rounded-lg">
                    <div className="w-4 h-4 rounded-full bg-black border border-border" />
                    <span className="text-sm text-gold font-medium">Dark</span>
                    <Check className="h-3.5 w-3.5 text-gold" />
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border rounded-lg opacity-40 cursor-not-allowed">
                    <div className="w-4 h-4 rounded-full bg-white border border-border" />
                    <span className="text-sm text-muted font-medium">Light</span>
                  </div>
                </div>
                <p className="text-xs text-muted mt-1.5">Light theme coming soon</p>
              </div>

              {/* Date Format */}
              <div className="border-t border-border pt-4">
                <label className="block text-sm text-muted font-body mb-1.5">
                  Date Format
                </label>
                <div className="flex items-center gap-2">
                  {['MM/DD/YYYY', 'DD/MM/YYYY'].map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => setDateFormat(fmt)}
                      className={cn(
                        'px-4 py-2 rounded-lg text-sm font-medium font-body',
                        'transition-all duration-200',
                        dateFormat === fmt
                          ? 'bg-gold/10 text-gold border border-gold/20'
                          : 'bg-card border border-border text-muted hover:text-white hover:border-gold/30',
                      )}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Currency */}
              <div className="border-t border-border pt-4">
                <label className="block text-sm text-muted font-body mb-1.5">
                  Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className={cn(
                    'w-full max-w-[200px] h-10 px-3 pr-8 text-sm appearance-none',
                    'bg-deep text-white border border-border rounded-lg font-body',
                    'focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/40',
                    'transition-all duration-200',
                  )}
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="CAD">CAD</option>
                </select>
              </div>
            </div>

            <div className="mt-8">
              <Button
                onClick={handleSavePreferences}
                loading={saving}
                icon={<Save className="w-4 h-4" />}
              >
                Save Preferences
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ============================================================ */}
      {/*  UPGRADE MODAL                                                */}
      {/* ============================================================ */}
      <UpgradeModal
        isOpen={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
      />

      {/* ============================================================ */}
      {/*  CANCEL SUBSCRIPTION MODAL                                    */}
      {/* ============================================================ */}
      <Modal open={cancelSubOpen} onOpenChange={setCancelSubOpen}>
        <ModalContent maxWidth="sm">
          <ModalHeader
            title="Cancel Subscription"
            description="Are you sure you want to cancel your subscription? You will retain access until the end of your current billing period."
          />
          <ModalFooter>
            <Button variant="ghost" onClick={() => setCancelSubOpen(false)}>
              Keep Subscription
            </Button>
            <Button
              variant="danger"
              onClick={handleCancelSubscription}
              loading={cancelingSub}
            >
              Cancel Subscription
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* ============================================================ */}
      {/*  DELETE ACCOUNT MODAL                                         */}
      {/* ============================================================ */}
      <Modal open={deleteAccountOpen} onOpenChange={setDeleteAccountOpen}>
        <ModalContent maxWidth="sm">
          <ModalHeader
            title="Delete Account"
            description="This will permanently delete your account and all associated data including properties, tenants, deals, documents, and transaction history. This action cannot be undone."
          />
          <div className="px-6 pb-2">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red/10 border border-red/20 mb-4">
              <AlertTriangle className="h-4 w-4 text-red shrink-0" />
              <p className="text-xs text-red">
                All data will be permanently destroyed.
              </p>
            </div>
            <Input
              label='Type "DELETE" to confirm'
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE"
            />
          </div>
          <ModalFooter>
            <Button variant="ghost" onClick={() => setDeleteAccountOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteAccount}
              loading={deletingAccount}
              disabled={deleteConfirmText !== 'DELETE'}
            >
              Delete My Account
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
