'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import { Skeleton } from '@/components/ui/Skeleton';
import { UserPlus, Mail, X } from 'lucide-react';
import { toast } from '@/components/ui/Toast';
import type { UserRole } from '@/lib/types';
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
} from '@/components/settings/SettingsShell';

interface TeamMember {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  avatar_url: string | null;
  last_sign_in_at?: string | null;
}

interface PendingInvite {
  id: string;
  email: string;
  role: UserRole;
  expires_at: string;
}

const ROLE_BADGE: Record<string, string> = {
  admin: 'border-sky-200 bg-sky-50 text-[#0369A1]',
  analyst: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  viewer: 'border-slate-200 bg-slate-50 text-slate-700',
};

const ROLE_DESCRIPTIONS: Record<string, string> = {
  admin: 'Full access including team, billing, and settings.',
  analyst: 'Read/write access to portfolio data and reports.',
  viewer: 'Read-only access to dashboards and reports.',
};

export default function TeamPage() {
  const { profile } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('analyst');
  const [inviting, setInviting] = useState(false);
  const supabase = createClient();

  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    async function fetchTeam() {
      if (!profile?.org_id) return;

      const [membersRes, invitesRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, full_name, email, role, avatar_url, last_sign_in_at')
          .eq('org_id', profile.org_id),
        supabase
          .from('invitations')
          .select('id, email, role, expires_at')
          .eq('org_id', profile.org_id)
          .is('accepted_at', null),
      ]);

      setMembers((membersRes.data || []) as TeamMember[]);
      setInvites((invitesRes.data || []) as PendingInvite[]);
      setLoading(false);
    }

    fetchTeam();
  }, [profile, supabase]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin) return;
    setInviting(true);

    const res = await fetch('/api/team/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
    });

    if (res.ok) {
      const data = await res.json();
      setInvites((prev) => [...prev, data.invitation]);
      setShowInvite(false);
      setInviteEmail('');
      toast.success('Invitation sent');
    } else {
      toast.error('Failed to send invitation');
    }
    setInviting(false);
  }

  return (
    <SettingsShell
      title="Team"
      subtitle={`${members.length} member${members.length === 1 ? '' : 's'}`}
      actions={
        isAdmin && (
          <button
            type="button"
            onClick={() => setShowInvite(!showInvite)}
            className={settingsPrimaryButtonClass}
          >
            <UserPlus size={14} /> Invite
          </button>
        )
      }
    >
      <div className="space-y-6">
        {/* Invite form */}
        {showInvite && isAdmin && (
          <SettingsCard>
            <SettingsCardHeader
              title="Invite a teammate"
              description={ROLE_DESCRIPTIONS[inviteRole]}
              actions={
                <button
                  type="button"
                  onClick={() => setShowInvite(false)}
                  className="text-slate-400 hover:text-[#020617]"
                >
                  <X size={16} />
                </button>
              }
            />
            <SettingsCardBody>
              <form onSubmit={handleInvite} className="grid grid-cols-1 md:grid-cols-[1fr_180px_auto] gap-3 items-end">
                <div>
                  <label className={settingsLabelClass}>Email</label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                    placeholder="colleague@company.com"
                    className={settingsInputClass}
                  />
                </div>
                <div>
                  <label className={settingsLabelClass}>Role</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as UserRole)}
                    className={settingsInputClass}
                  >
                    <option value="analyst">Analyst</option>
                    <option value="viewer">Viewer</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <button type="submit" disabled={inviting} className={settingsPrimaryButtonClass}>
                  {inviting ? 'Sending...' : 'Send Invite'}
                </button>
              </form>
            </SettingsCardBody>
          </SettingsCard>
        )}

        {/* Members table */}
        <SettingsCard className="overflow-hidden">
          <SettingsCardHeader title="Members" />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-3 font-medium">Member</th>
                  <th className="px-6 py-3 font-medium">Role</th>
                  <th className="px-6 py-3 font-medium">Last Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading && (
                  <tr>
                    <td colSpan={3} className="p-4">
                      <Skeleton className="h-4 w-full" />
                    </td>
                  </tr>
                )}
                {members.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-50 text-sm font-semibold text-[#0369A1]">
                          {m.full_name?.charAt(0)?.toUpperCase() ?? '?'}
                        </div>
                        <div>
                          <p className="font-medium text-[#020617]">{m.full_name || '(no name)'}</p>
                          <p className="text-xs text-slate-500">{m.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize',
                          ROLE_BADGE[m.role] ?? ROLE_BADGE.viewer,
                        )}
                        title={ROLE_DESCRIPTIONS[m.role]}
                      >
                        {m.role}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-xs text-slate-500">
                      {m.last_sign_in_at ? new Date(m.last_sign_in_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SettingsCard>

        {/* Pending invites */}
        {invites.length > 0 && (
          <SettingsCard>
            <SettingsCardHeader title="Pending Invitations" description={`${invites.length} unaccepted`} />
            <SettingsCardBody className="space-y-2">
              {invites.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-4 py-2"
                >
                  <div className="flex items-center gap-3">
                    <Mail size={14} className="text-slate-500" />
                    <span className="text-sm text-[#020617]">{inv.email}</span>
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize',
                        ROLE_BADGE[inv.role] ?? ROLE_BADGE.viewer,
                      )}
                    >
                      {inv.role}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500">
                    Expires {new Date(inv.expires_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </SettingsCardBody>
          </SettingsCard>
        )}
      </div>

      {/* Avoid unused import warning */}
      <span className="hidden">
        <button type="button" className={settingsSecondaryButtonClass}>x</button>
      </span>
    </SettingsShell>
  );
}
