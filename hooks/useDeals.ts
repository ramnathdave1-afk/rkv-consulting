'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Deal, DealAnalysisResult, AIUsage } from '@/types'

// ---------------------------------------------------------------------------
//  Types
// ---------------------------------------------------------------------------

type CreateDealInput = Omit<Deal, 'id' | 'user_id' | 'created_at' | 'updated_at'>
type UpdateDealInput = Partial<CreateDealInput> & { id: string }

interface DealAnalysisRequest {
  dealId: string
  address: string
  city: string
  state: string
  zip: string
  property_type: Deal['property_type']
  asking_price: number
  offer_price?: number | null
  arv?: number | null
  repair_cost?: number | null
  monthly_rent_estimate?: number | null
}

interface AIUsageReturn {
  dealAnalysesUsed: number
  aiMessagesUsed: number
  isLoading: boolean
}

// ---------------------------------------------------------------------------
//  useDeals — fetch all deals for the current user
// ---------------------------------------------------------------------------

export function useDeals() {
  const supabase = createClient()

  const {
    data: deals = [],
    isLoading,
    error,
    refetch,
  } = useQuery<Deal[]>({
    queryKey: ['deals'],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('deals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data ?? []) as Deal[]
    },
    staleTime: 1000 * 60 * 2,
    refetchOnWindowFocus: true,
  })

  return { deals, isLoading, error, refetch }
}

// ---------------------------------------------------------------------------
//  useDeal — fetch a single deal by id
// ---------------------------------------------------------------------------

export function useDeal(id: string) {
  const supabase = createClient()

  const {
    data: deal = null,
    isLoading,
    error,
  } = useQuery<Deal | null>({
    queryKey: ['deal', id],
    queryFn: async () => {
      if (!id) return null

      const { data, error } = await supabase
        .from('deals')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return data as Deal
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 2,
    refetchOnWindowFocus: true,
  })

  return { deal, isLoading, error }
}

// ---------------------------------------------------------------------------
//  useCreateDeal — create a new deal
// ---------------------------------------------------------------------------

export function useCreateDeal() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateDealInput) => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('deals')
        .insert({ ...input, user_id: user.id })
        .select()
        .single()

      if (error) throw error
      return data as Deal
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] })
    },
  })
}

// ---------------------------------------------------------------------------
//  useUpdateDeal — update a deal
// ---------------------------------------------------------------------------

export function useUpdateDeal() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateDealInput) => {
      const { data, error } = await supabase
        .from('deals')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as Deal
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['deals'] })
      queryClient.invalidateQueries({ queryKey: ['deal', variables.id] })
    },
  })
}

// ---------------------------------------------------------------------------
//  useDeleteDeal — delete a deal
// ---------------------------------------------------------------------------

export function useDeleteDeal() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('deals').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] })
    },
  })
}

// ---------------------------------------------------------------------------
//  useDealAnalysis — AI-powered deal analysis via API
// ---------------------------------------------------------------------------

export function useDealAnalysis() {
  const queryClient = useQueryClient()

  const mutation = useMutation<DealAnalysisResult, Error, DealAnalysisRequest>({
    mutationFn: async (request: DealAnalysisRequest) => {
      const res = await fetch('/api/ai/deal-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Failed to analyze deal')
      }

      return res.json() as Promise<DealAnalysisResult>
    },
    onSuccess: (_data, variables) => {
      // Refresh the specific deal (analysis is stored on it) and the deals list
      queryClient.invalidateQueries({ queryKey: ['deal', variables.dealId] })
      queryClient.invalidateQueries({ queryKey: ['deals'] })
      // Also refresh AI usage since we consumed a query
      queryClient.invalidateQueries({ queryKey: ['ai-usage'] })
    },
  })

  return {
    analyze: mutation.mutate,
    analyzeAsync: mutation.mutateAsync,
    isAnalyzing: mutation.isPending,
    analysis: mutation.data ?? null,
    error: mutation.error,
    reset: mutation.reset,
  }
}

// ---------------------------------------------------------------------------
//  useAIUsage — fetch current month's AI usage for the user
// ---------------------------------------------------------------------------

export function useAIUsage(): AIUsageReturn {
  const supabase = createClient()

  const { data, isLoading } = useQuery<{ dealAnalysesUsed: number; aiMessagesUsed: number }>({
    queryKey: ['ai-usage'],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        return { dealAnalysesUsed: 0, aiMessagesUsed: 0 }
      }

      // Get current billing period (first to last day of current month)
      const now = new Date()
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

      const { data, error } = await supabase
        .from('ai_usage')
        .select('*')
        .eq('user_id', user.id)
        .gte('period_start', periodStart)
        .lte('period_end', periodEnd)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) throw error

      const usage = data as AIUsage | null

      if (!usage) {
        return { dealAnalysesUsed: 0, aiMessagesUsed: 0 }
      }

      // queries_used tracks deal analyses; tokens_used is a proxy for AI messages
      // We derive message count from agent_logs for more accuracy
      const { count: messageCount } = await supabase
        .from('agent_logs')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('agent_type', 'assistant')
        .gte('created_at', periodStart)

      return {
        dealAnalysesUsed: usage.queries_used,
        aiMessagesUsed: messageCount ?? 0,
      }
    },
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: true,
  })

  return {
    dealAnalysesUsed: data?.dealAnalysesUsed ?? 0,
    aiMessagesUsed: data?.aiMessagesUsed ?? 0,
    isLoading,
  }
}
