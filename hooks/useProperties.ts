'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Property } from '@/types'

// ---------------------------------------------------------------------------
//  Types
// ---------------------------------------------------------------------------

interface PortfolioMetrics {
  totalValue: number
  totalEquity: number
  totalCashFlow: number
  avgCapRate: number
  occupancyRate: number
  propertyCount: number
}

type CreatePropertyInput = Omit<Property, 'id' | 'user_id' | 'created_at' | 'updated_at'>
type UpdatePropertyInput = Partial<CreatePropertyInput> & { id: string }

// ---------------------------------------------------------------------------
//  useProperties — fetch all properties for the current user
// ---------------------------------------------------------------------------

export function useProperties() {
  const supabase = createClient()

  const {
    data: properties = [],
    isLoading,
    error,
    refetch,
  } = useQuery<Property[]>({
    queryKey: ['properties'],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data ?? []) as Property[]
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnWindowFocus: true,
  })

  return { properties, isLoading, error, refetch }
}

// ---------------------------------------------------------------------------
//  useProperty — fetch a single property by id
// ---------------------------------------------------------------------------

export function useProperty(id: string) {
  const supabase = createClient()

  const {
    data: property = null,
    isLoading,
    error,
  } = useQuery<Property | null>({
    queryKey: ['property', id],
    queryFn: async () => {
      if (!id) return null

      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return data as Property
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 2,
    refetchOnWindowFocus: true,
  })

  return { property, isLoading, error }
}

// ---------------------------------------------------------------------------
//  useCreateProperty — create a new property via API route
// ---------------------------------------------------------------------------

export function useCreateProperty() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreatePropertyInput) => {
      const res = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Failed to create property')
      }

      return res.json() as Promise<Property>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] })
    },
  })
}

// ---------------------------------------------------------------------------
//  useUpdateProperty — update a property directly in Supabase
// ---------------------------------------------------------------------------

export function useUpdateProperty() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdatePropertyInput) => {
      const { data, error } = await supabase
        .from('properties')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as Property
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['properties'] })
      queryClient.invalidateQueries({ queryKey: ['property', variables.id] })
    },
  })
}

// ---------------------------------------------------------------------------
//  useDeleteProperty — delete a property from Supabase
// ---------------------------------------------------------------------------

export function useDeleteProperty() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('properties').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] })
    },
  })
}

// ---------------------------------------------------------------------------
//  usePortfolioMetrics — computed metrics across all user properties
// ---------------------------------------------------------------------------

export function usePortfolioMetrics() {
  const supabase = createClient()

  return useQuery<PortfolioMetrics>({
    queryKey: ['properties', 'portfolio-metrics'],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('user_id', user.id)

      if (error) throw error

      const properties = (data ?? []) as Property[]
      const propertyCount = properties.length

      if (propertyCount === 0) {
        return {
          totalValue: 0,
          totalEquity: 0,
          totalCashFlow: 0,
          avgCapRate: 0,
          occupancyRate: 0,
          propertyCount: 0,
        }
      }

      let totalValue = 0
      let totalEquity = 0
      let totalMonthlyCashFlow = 0
      let capRateSum = 0
      let capRateCount = 0
      let occupiedCount = 0

      for (const p of properties) {
        const value = p.current_value ?? p.purchase_price ?? 0
        const mortgage = p.mortgage_balance ?? 0
        const rent = p.monthly_rent ?? 0
        const expenses = (p.mortgage_payment ?? 0) + (p.insurance_annual ?? 0) / 12 + (p.tax_annual ?? 0) / 12 + (p.hoa_monthly ?? 0)

        totalValue += value
        totalEquity += value - mortgage
        totalMonthlyCashFlow += rent - expenses

        // Cap rate = NOI / value
        if (value > 0) {
          const annualNOI = (rent - expenses) * 12
          capRateSum += (annualNOI / value) * 100
          capRateCount++
        }

        // Occupied = any status that isn't 'vacant'
        if (p.status !== 'vacant') {
          occupiedCount++
        }
      }

      return {
        totalValue,
        totalEquity,
        totalCashFlow: totalMonthlyCashFlow,
        avgCapRate: capRateCount > 0 ? capRateSum / capRateCount : 0,
        occupancyRate: (occupiedCount / propertyCount) * 100,
        propertyCount,
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
  })
}
