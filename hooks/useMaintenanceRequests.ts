'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { MaintenanceRequest } from '@/types';

interface UseMaintenanceOptions {
  propertyId?: string;
  tenantId?: string;
  status?: string;
}

export function useMaintenanceRequests(options: UseMaintenanceOptions = {}) {
  const supabase = createClient();
  const queryClient = useQueryClient();

  const { data: requests = [], isLoading } = useQuery<MaintenanceRequest[]>({
    queryKey: ['maintenance_requests', options],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      let query = supabase
        .from('maintenance_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (options.propertyId) query = query.eq('property_id', options.propertyId);
      if (options.tenantId) query = query.eq('tenant_id', options.tenantId);
      if (options.status) query = query.eq('status', options.status);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as MaintenanceRequest[];
    },
    staleTime: 1000 * 60 * 2,
  });

  const addRequest = useMutation({
    mutationFn: async (request: Partial<MaintenanceRequest>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('maintenance_requests')
        .insert({ ...request, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance_requests'] });
    },
  });

  const updateRequest = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MaintenanceRequest> & { id: string }) => {
      const { data, error } = await supabase
        .from('maintenance_requests')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance_requests'] });
    },
  });

  // Kanban grouping
  const openRequests = requests.filter((r) => r.status === 'open');
  const inProgressRequests = requests.filter((r) => r.status === 'in_progress' || r.status === 'scheduled');
  const completedRequests = requests.filter((r) => r.status === 'completed');
  const assignedRequests = requests.filter((r) => r.status === 'awaiting_parts');

  const totalSpendThisMonth = requests
    .filter((r) => {
      if (!r.actual_cost || !r.completed_date) return false;
      const now = new Date();
      const completed = new Date(r.completed_date);
      return completed.getMonth() === now.getMonth() && completed.getFullYear() === now.getFullYear();
    })
    .reduce((s, r) => s + (r.actual_cost || 0), 0);

  return {
    requests,
    isLoading,
    addRequest,
    updateRequest,
    openRequests,
    inProgressRequests,
    completedRequests,
    assignedRequests,
    totalSpendThisMonth,
  };
}

export default useMaintenanceRequests;
