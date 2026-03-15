import type { UserRole } from '@/lib/types';

type Permission =
  | 'sites.view'
  | 'sites.create'
  | 'sites.edit'
  | 'sites.delete'
  | 'pipeline.view'
  | 'pipeline.move'
  | 'reports.view'
  | 'reports.generate'
  | 'agents.view'
  | 'agents.trigger'
  | 'agents.configure'
  | 'team.view'
  | 'team.invite'
  | 'team.manage'
  | 'settings.view'
  | 'settings.edit';

const PERMISSION_MATRIX: Record<UserRole, Permission[]> = {
  admin: [
    'sites.view', 'sites.create', 'sites.edit', 'sites.delete',
    'pipeline.view', 'pipeline.move',
    'reports.view', 'reports.generate',
    'agents.view', 'agents.trigger', 'agents.configure',
    'team.view', 'team.invite', 'team.manage',
    'settings.view', 'settings.edit',
  ],
  analyst: [
    'sites.view', 'sites.create', 'sites.edit',
    'pipeline.view', 'pipeline.move',
    'reports.view', 'reports.generate',
    'agents.view',
    'team.view',
    'settings.view',
  ],
  viewer: [
    'sites.view',
    'pipeline.view',
    'reports.view',
    'agents.view',
    'team.view',
    'settings.view',
  ],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return PERMISSION_MATRIX[role]?.includes(permission) ?? false;
}

export function getPermissions(role: UserRole): Permission[] {
  return PERMISSION_MATRIX[role] ?? [];
}

export type { Permission };
