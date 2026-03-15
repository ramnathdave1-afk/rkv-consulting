'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { UserPlus, Mail, Trash2 } from 'lucide-react';
import { toast } from '@/components/ui/Toast';
import { ROLES } from '@/lib/constants';
import type { UserRole } from '@/lib/types';

interface TeamMember {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  avatar_url: string | null;
}

interface PendingInvite {
  id: string;
  email: string;
  role: UserRole;
  expires_at: string;
}

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
        supabase.from('profiles').select('id, full_name, email, role, avatar_url').eq('org_id', profile.org_id),
        supabase.from('invitations').select('id, email, role, expires_at').eq('org_id', profile.org_id).is('accepted_at', null),
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

  const roleColor: Record<string, string> = { admin: '#00D4AA', analyst: '#3B82F6', viewer: '#8B95A5' };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-text-primary">Team</h1>
          <p className="text-sm text-text-secondary">{members.length} members</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowInvite(!showInvite)}
            className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-bg-primary hover:bg-accent-hover transition-colors"
          >
            <UserPlus size={14} /> Invite
          </button>
        )}
      </div>

      {/* Invite form */}
      {showInvite && isAdmin && (
        <form onSubmit={handleInvite} className="glass-card p-4 flex items-end gap-3 max-w-lg">
          <div className="flex-1">
            <label className="block text-xs font-medium text-text-muted mb-1">Email</label>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
              placeholder="colleague@company.com"
              className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Role</label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as UserRole)}
              className="rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary"
            >
              <option value="analyst">Analyst</option>
              <option value="viewer">Viewer</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={inviting}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-bg-primary hover:bg-accent-hover disabled:opacity-50 transition-colors"
          >
            {inviting ? 'Sending...' : 'Send'}
          </button>
        </form>
      )}

      {/* Members */}
      <div className="glass-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-[10px] font-medium uppercase tracking-wider text-text-muted">
              <th className="px-4 py-3">Member</th>
              <th className="px-4 py-3">Role</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={2} className="p-4"><Skeleton className="h-4 w-full" /></td></tr>}
            {members.map((m) => (
              <tr key={m.id} className="border-b border-border/50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 text-xs font-semibold text-accent">
                      {m.full_name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-text-primary">{m.full_name}</p>
                      <p className="text-xs text-text-muted">{m.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge color={roleColor[m.role]} size="sm">{m.role}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pending invites */}
      {invites.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-text-primary mb-3">Pending Invitations</h2>
          <div className="space-y-2">
            {invites.map((inv) => (
              <div key={inv.id} className="glass-card px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail size={14} className="text-text-muted" />
                  <span className="text-sm text-text-primary">{inv.email}</span>
                  <Badge color={roleColor[inv.role]} size="sm">{inv.role}</Badge>
                </div>
                <span className="text-[10px] text-text-muted">
                  Expires {new Date(inv.expires_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
