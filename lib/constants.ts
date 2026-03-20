// ── Roles ──
export const ROLES = {
  admin: { label: 'Admin', description: 'Full access — manage team, integrations, and all property data' },
  analyst: { label: 'Manager', description: 'Manage properties, tenants, work orders, and reports' },
  viewer: { label: 'Viewer', description: 'Read-only access to all data' },
} as const;

// ── Work Order Categories ──
export const WORK_ORDER_CATEGORIES = [
  { value: 'plumbing', label: 'Plumbing', color: '#3B82F6' },
  { value: 'electrical', label: 'Electrical', color: '#F59E0B' },
  { value: 'hvac', label: 'HVAC', color: '#8B5CF6' },
  { value: 'appliance', label: 'Appliance', color: '#06B6D4' },
  { value: 'pest', label: 'Pest Control', color: '#EF4444' },
  { value: 'structural', label: 'Structural', color: '#78716C' },
  { value: 'cosmetic', label: 'Cosmetic', color: '#EC4899' },
  { value: 'safety', label: 'Safety', color: '#DC2626' },
  { value: 'general', label: 'General', color: '#6B7280' },
  { value: 'turnover', label: 'Turnover', color: '#22C55E' },
] as const;

// ── Work Order Priorities ──
export const WORK_ORDER_PRIORITIES = [
  { value: 'emergency', label: 'Emergency', color: '#DC2626' },
  { value: 'high', label: 'High', color: '#F97316' },
  { value: 'medium', label: 'Medium', color: '#F59E0B' },
  { value: 'low', label: 'Low', color: '#22C55E' },
] as const;

// ── Work Order Statuses ──
export const WORK_ORDER_STATUSES = [
  { value: 'open', label: 'Open', color: '#EF4444' },
  { value: 'assigned', label: 'Assigned', color: '#F59E0B' },
  { value: 'in_progress', label: 'In Progress', color: '#3B82F6' },
  { value: 'parts_needed', label: 'Parts Needed', color: '#8B5CF6' },
  { value: 'completed', label: 'Completed', color: '#22C55E' },
  { value: 'closed', label: 'Closed', color: '#6B7280' },
  { value: 'cancelled', label: 'Cancelled', color: '#9CA3AF' },
] as const;

// ── Tenant Statuses ──
export const TENANT_STATUSES = [
  { value: 'prospect', label: 'Prospect', color: '#3B82F6' },
  { value: 'applicant', label: 'Applicant', color: '#F59E0B' },
  { value: 'approved', label: 'Approved', color: '#10B981' },
  { value: 'active', label: 'Active', color: '#22C55E' },
  { value: 'notice', label: 'Notice', color: '#F97316' },
  { value: 'past', label: 'Past', color: '#6B7280' },
  { value: 'denied', label: 'Denied', color: '#EF4444' },
] as const;

// ── Property Types ──
export const PROPERTY_TYPES = [
  { value: 'multifamily', label: 'Multifamily' },
  { value: 'single_family', label: 'Single Family' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'mixed_use', label: 'Mixed Use' },
  { value: 'hoa', label: 'HOA' },
] as const;
