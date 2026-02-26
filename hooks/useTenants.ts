'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Tenant, RentPayment } from '@/types'

// ---------------------------------------------------------------------------
//  Types
// ---------------------------------------------------------------------------

/** Tenant row joined with the property address */
export interface TenantWithProperty extends Tenant {
  property?: {
    id: string
    address: string
    city: string
    state: string
    zip: string
  } | null
}

interface RentCollectionStats {
  collectionRate: number
  overdueCount: number
  totalDue: number
  totalCollected: number
}

type CreateTenantInput = Omit<Tenant, 'id' | 'user_id' | 'created_at' | 'updated_at'>
type UpdateTenantInput = Partial<CreateTenantInput> & { id: string }

// ---------------------------------------------------------------------------
//  useTenants — fetch tenants, optionally filtered by property
// ---------------------------------------------------------------------------

export function useTenants(propertyId?: string) {
  const supabase = createClient()

  const {
    data: tenants = [],
    isLoading,
    error,
    refetch,
  } = useQuery<TenantWithProperty[]>({
    queryKey: propertyId ? ['tenants', { propertyId }] : ['tenants'],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) throw new Error('Not authenticated')

      let query = supabase
        .from('tenants')
        .select('*, property:properties(id, address, city, state, zip)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (propertyId) {
        query = query.eq('property_id', propertyId)
      }

      const { data, error } = await query

      if (error) throw error
      return (data ?? []) as TenantWithProperty[]
    },
    staleTime: 1000 * 60 * 2,
    refetchOnWindowFocus: true,
  })

  return { tenants, isLoading, error, refetch }
}

// ---------------------------------------------------------------------------
//  useTenant — fetch a single tenant with property info
// ---------------------------------------------------------------------------

export function useTenant(id: string) {
  const supabase = createClient()

  const {
    data: tenant = null,
    isLoading,
    error,
  } = useQuery<TenantWithProperty | null>({
    queryKey: ['tenant', id],
    queryFn: async () => {
      if (!id) return null

      const { data, error } = await supabase
        .from('tenants')
        .select('*, property:properties(id, address, city, state, zip)')
        .eq('id', id)
        .single()

      if (error) throw error
      return data as TenantWithProperty
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 2,
    refetchOnWindowFocus: true,
  })

  return { tenant, isLoading, error }
}

// ---------------------------------------------------------------------------
//  useCreateTenant — create a new tenant
// ---------------------------------------------------------------------------

export function useCreateTenant() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateTenantInput) => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('tenants')
        .insert({ ...input, user_id: user.id })
        .select()
        .single()

      if (error) throw error
      return data as Tenant
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
      if (variables.property_id) {
        queryClient.invalidateQueries({ queryKey: ['tenants', { propertyId: variables.property_id }] })
      }
    },
  })
}

// ---------------------------------------------------------------------------
//  useUpdateTenant — update a tenant
// ---------------------------------------------------------------------------

export function useUpdateTenant() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateTenantInput) => {
      const { data, error } = await supabase
        .from('tenants')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as Tenant
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
      queryClient.invalidateQueries({ queryKey: ['tenant', variables.id] })
    },
  })
}

// ---------------------------------------------------------------------------
//  useDeleteTenant — delete a tenant
// ---------------------------------------------------------------------------

export function useDeleteTenant() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tenants').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
    },
  })
}

// ---------------------------------------------------------------------------
//  useTenantPayments — fetch rent payments for a specific tenant
// ---------------------------------------------------------------------------

export function useTenantPayments(tenantId: string) {
  const supabase = createClient()

  const {
    data: payments = [],
    isLoading,
    error,
    refetch,
  } = useQuery<RentPayment[]>({
    queryKey: ['tenant-payments', tenantId],
    queryFn: async () => {
      if (!tenantId) return []

      const { data, error } = await supabase
        .from('rent_payments')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('due_date', { ascending: false })

      if (error) throw error
      return (data ?? []) as RentPayment[]
    },
    enabled: !!tenantId,
    staleTime: 1000 * 60 * 2,
    refetchOnWindowFocus: true,
  })

  return { payments, isLoading, error, refetch }
}

// ---------------------------------------------------------------------------
//  useRentCollectionStats — computed rent collection statistics
// ---------------------------------------------------------------------------

export function useRentCollectionStats() {
  const supabase = createClient()

  return useQuery<RentCollectionStats>({
    queryKey: ['rent-collection-stats'],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) throw new Error('Not authenticated')

      // Fetch all rent payments for the current month
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

      const { data, error } = await supabase
        .from('rent_payments')
        .select('*')
        .eq('user_id', user.id)
        .gte('due_date', monthStart)
        .lte('due_date', monthEnd)

      if (error) throw error

      const payments = (data ?? []) as RentPayment[]

      if (payments.length === 0) {
        return {
          collectionRate: 0,
          overdueCount: 0,
          totalDue: 0,
          totalCollected: 0,
        }
      }

      let totalDue = 0
      let totalCollected = 0
      let overdueCount = 0

      for (const p of payments) {
        totalDue += p.amount + (p.late_fee ?? 0)

        if (p.status === 'paid') {
          totalCollected += p.amount
        } else if (p.status === 'partial') {
          // Partial payments: count what was actually paid (amount recorded)
          totalCollected += p.amount
        }

        if (p.status === 'late' || p.status === 'pending') {
          const dueDate = new Date(p.due_date)
          if (dueDate < now) {
            overdueCount++
          }
        }
      }

      const collectionRate = totalDue > 0 ? (totalCollected / totalDue) * 100 : 0

      return {
        collectionRate,
        overdueCount,
        totalDue,
        totalCollected,
      }
    },
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: true,
  })
}
