'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import { hasPermission, type Permission } from '@/lib/auth/permissions';
import type { UserRole } from '@/lib/types';

interface RoleGateProps {
  children: React.ReactNode;
  permission?: Permission;
  roles?: UserRole[];
  fallback?: React.ReactNode;
}

export function RoleGate({ children, permission, roles, fallback = null }: RoleGateProps) {
  const { profile, loading } = useAuth();

  if (loading) return null;
  if (!profile) return null;

  const role = profile.role as UserRole;

  if (permission && !hasPermission(role, permission)) {
    return <>{fallback}</>;
  }

  if (roles && !roles.includes(role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
