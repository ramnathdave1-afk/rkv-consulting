'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { WatchedMarket, MarketData } from '@/types'

// ---------------------------------------------------------------------------
//  Types
// ---------------------------------------------------------------------------

type AddMarketInput = {
  city: string
  state: string
  zip?: string | null
  county?: string | null
  alert_on_change?: boolean
}

// ---------------------------------------------------------------------------
//  useWatchedMarkets — fetch all watched markets for the user
// ---------------------------------------------------------------------------

export function useWatchedMarkets() {
  const supabase = createClient()

  const {
    data: markets = [],
    isLoading,
    error,
    refetch,
  } = useQuery<WatchedMarket[]>({
    queryKey: ['watched-markets'],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('watched_markets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data ?? []) as WatchedMarket[]
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
  })

  return { markets, isLoading, error, refetch }
}

// ---------------------------------------------------------------------------
//  useAddMarket — add a new watched market
// ---------------------------------------------------------------------------

export function useAddMarket() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: AddMarketInput) => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('watched_markets')
        .insert({
          user_id: user.id,
          city: input.city,
          state: input.state,
          zip: input.zip ?? null,
          county: input.county ?? null,
          alert_on_change: input.alert_on_change ?? true,
        })
        .select()
        .single()

      if (error) throw error
      return data as WatchedMarket
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watched-markets'] })
    },
  })
}

// ---------------------------------------------------------------------------
//  useRemoveMarket — remove a watched market
// ---------------------------------------------------------------------------

export function useRemoveMarket() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('watched_markets').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watched-markets'] })
    },
  })
}

// ---------------------------------------------------------------------------
//  useMarketData — fetch market data for a zip code via API
// ---------------------------------------------------------------------------

export function useMarketData(zip: string) {
  const {
    data = null,
    isLoading,
    error,
  } = useQuery<MarketData | null>({
    queryKey: ['market', zip],
    queryFn: async () => {
      if (!zip) return null

      const res = await fetch(`/api/market?zip=${encodeURIComponent(zip)}`)

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Failed to fetch market data')
      }

      return res.json() as Promise<MarketData>
    },
    enabled: !!zip && zip.length >= 5,
    staleTime: 1000 * 60 * 30, // 30 minutes — market data doesn't change frequently
    refetchOnWindowFocus: false,
  })

  return { data, isLoading, error }
}
