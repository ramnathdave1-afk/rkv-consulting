'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Document } from '@/types';

interface UseDocumentsOptions {
  propertyId?: string;
  tenantId?: string;
  dealId?: string;
  category?: string;
}

export function useDocuments(options: UseDocumentsOptions = {}) {
  const supabase = createClient();
  const queryClient = useQueryClient();

  const { data: documents = [], isLoading } = useQuery<Document[]>({
    queryKey: ['documents', options],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      let query = supabase
        .from('documents')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (options.propertyId) query = query.eq('property_id', options.propertyId);
      if (options.tenantId) query = query.eq('tenant_id', options.tenantId);
      if (options.dealId) query = query.eq('deal_id', options.dealId);
      if (options.category) query = query.eq('category', options.category);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Document[];
    },
    staleTime: 1000 * 60 * 2,
  });

  const uploadDocument = useMutation({
    mutationFn: async (doc: Partial<Document>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('documents')
        .insert({ ...doc, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });

  const deleteDocument = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('documents').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });

  // Expiring documents (within 90 days)
  const expiringDocuments = documents.filter((d) => {
    const doc = d as Document & { expiration_date?: string };
    if (!doc.expiration_date) return false;
    const expiry = new Date(doc.expiration_date);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry > 0 && daysUntilExpiry <= 90;
  });

  const totalStorageBytes = documents.reduce((s, d) => s + (d.file_size || 0), 0);

  return {
    documents,
    isLoading,
    uploadDocument,
    deleteDocument,
    expiringDocuments,
    totalStorageBytes,
  };
}

export default useDocuments;
