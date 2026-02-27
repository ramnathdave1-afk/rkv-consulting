'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Contractor } from '@/types';

export function useContractors(specialty?: string) {
  const supabase = createClient();
  const queryClient = useQueryClient();

  const { data: contractors = [], isLoading } = useQuery<Contractor[]>({
    queryKey: ['contractors', specialty],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      let query = supabase
        .from('contractors')
        .select('*')
        .eq('user_id', user.id)
        .order('is_preferred', { ascending: false })
        .order('created_at', { ascending: false });

      if (specialty) query = query.eq('specialty', specialty);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Contractor[];
    },
    staleTime: 1000 * 60 * 5,
  });

  const addContractor = useMutation({
    mutationFn: async (contractor: Partial<Contractor>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('contractors')
        .insert({ ...contractor, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractors'] });
    },
  });

  const updateContractor = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Contractor> & { id: string }) => {
      const { data, error } = await supabase
        .from('contractors')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractors'] });
    },
  });

  const deleteContractor = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('contractors').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractors'] });
    },
  });

  const preferredContractors = contractors.filter((c) => c.is_preferred);

  return {
    contractors,
    isLoading,
    addContractor,
    updateContractor,
    deleteContractor,
    preferredContractors,
  };
}

export default useContractors;
