'use client';

import React from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { Skeleton } from '@/components/ui/Skeleton';
import { ROLES } from '@/lib/constants';

export default function SettingsPage() {
  const { profile, loading } = useAuth();

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
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold text-text-primary">Settings</h1>
        <p className="text-sm text-text-secondary">Account and organization settings</p>
      </div>

      <div className="max-w-lg space-y-4">
        <div className="glass-card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-text-primary">Profile</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Full Name</label>
              <p className="text-sm text-text-primary">{profile?.full_name || '—'}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Email</label>
              <p className="text-sm text-text-primary">{profile?.email || '—'}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Role</label>
              <p className="text-sm text-text-primary">
                {role && ROLES[role] ? ROLES[role].label : profile?.role || '—'}
              </p>
              <p className="text-xs text-text-muted mt-0.5">
                {role && ROLES[role] ? ROLES[role].description : ''}
              </p>
            </div>
          </div>
        </div>

        <div className="glass-card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-text-primary">Organization</h2>
          <p className="text-xs text-text-muted">Organization settings are managed by administrators.</p>
        </div>
      </div>
    </div>
  );
}
