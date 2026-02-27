'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Transaction } from '@/types';

interface UseTransactionsOptions {
  propertyId?: string;
  type?: 'income' | 'expense';
  dateFrom?: string;
  dateTo?: string;
  category?: string;
}

export function useTransactions(options: UseTransactionsOptions = {}) {
  const supabase = createClient();
  const queryClient = useQueryClient();

  const { data: transactions = [], isLoading } = useQuery<Transaction[]>({
    queryKey: ['transactions', options],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      let query = supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (options.propertyId) query = query.eq('property_id', options.propertyId);
      if (options.type) query = query.eq('type', options.type);
      if (options.category) query = query.eq('category', options.category);
      if (options.dateFrom) query = query.gte('date', options.dateFrom);
      if (options.dateTo) query = query.lte('date', options.dateTo);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Transaction[];
    },
    staleTime: 1000 * 60 * 2,
  });

  const addTransaction = useMutation({
    mutationFn: async (transaction: Partial<Transaction>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('transactions')
        .insert({ ...transaction, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });

  const updateTransaction = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Transaction> & { id: string }) => {
      const { data, error } = await supabase
        .from('transactions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });

  const deleteTransaction = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });

  // Aggregate stats
  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((s, t) => s + t.amount, 0);
  const totalExpenses = transactions
    .filter((t) => t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0);
  const netIncome = totalIncome - totalExpenses;

  return {
    transactions,
    isLoading,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    totalIncome,
    totalExpenses,
    netIncome,
  };
}

export default useTransactions;
