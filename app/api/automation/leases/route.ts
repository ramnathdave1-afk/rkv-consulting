import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fireWebhook } from '@/lib/webhooks/fire'

// ── GET — Lease renewal queue (expiring within 90 days) ──────────────────────

export async function GET() {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    const today = now.toISOString().split('T')[0]

    const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0]
    const sixtyDays = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0]
    const ninetyDays = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0]

    // Fetch all active tenants with leases expiring within 90 days
    const { data: expiringTenants, error } = await supabase
      .from('tenants')
      .select('*, properties(id, address, city, state, zip, property_type)')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .gte('lease_end', today)
      .lte('lease_end', ninetyDays)
      .order('lease_end', { ascending: true })

    if (error) {
      console.error('[Leases GET] Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch expiring leases' },
        { status: 500 }
      )
    }

    if (!expiringTenants || expiringTenants.length === 0) {
      return NextResponse.json({
        renewal_queue: {
          urgent: [],
          soon: [],
          upcoming: [],
        },
        total: 0,
      })
    }

    // Group by urgency
    const urgent: typeof expiringTenants = [] // 0-30 days
    const soon: typeof expiringTenants = [] // 31-60 days
    const upcoming: typeof expiringTenants = [] // 61-90 days

    for (const tenant of expiringTenants) {
      const leaseEnd = tenant.lease_end
      if (!leaseEnd) continue

      if (leaseEnd <= thirtyDays) {
        urgent.push(tenant)
      } else if (leaseEnd <= sixtyDays) {
        soon.push(tenant)
      } else {
        upcoming.push(tenant)
      }
    }

    // Format each tenant for response
    const formatTenant = (tenant: (typeof expiringTenants)[number]) => {
      const leaseEnd = new Date(tenant.lease_end)
      const daysRemaining = Math.ceil(
        (leaseEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )

      return {
        tenant_id: tenant.id,
        tenant_name: `${tenant.first_name} ${tenant.last_name}`,
        tenant_email: tenant.email,
        tenant_phone: tenant.phone,
        property_id: tenant.property_id,
        property_address: tenant.properties?.address || null,
        property_city: tenant.properties?.city || null,
        property_state: tenant.properties?.state || null,
        property_type: tenant.properties?.property_type || null,
        lease_start: tenant.lease_start,
        lease_end: tenant.lease_end,
        monthly_rent: tenant.monthly_rent,
        security_deposit: tenant.security_deposit,
        days_remaining: daysRemaining,
      }
    }

    return NextResponse.json({
      renewal_queue: {
        urgent: urgent.map(formatTenant),
        soon: soon.map(formatTenant),
        upcoming: upcoming.map(formatTenant),
      },
      total: expiringTenants.length,
      counts: {
        urgent: urgent.length,
        soon: soon.length,
        upcoming: upcoming.length,
      },
    })
  } catch (error) {
    console.error('[Leases GET] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch lease renewal queue' },
      { status: 500 }
    )
  }
}

// ── POST — Trigger a renewal action ──────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { tenant_id, action } = body

    if (!tenant_id) {
      return NextResponse.json(
        { error: 'tenant_id is required' },
        { status: 400 }
      )
    }

    const validActions = ['send_renewal', 'send_reminder', 'mark_renewed']
    if (!action || !validActions.includes(action)) {
      return NextResponse.json(
        {
          error: `action is required and must be one of: ${validActions.join(', ')}`,
        },
        { status: 400 }
      )
    }

    // Fetch tenant details
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('*, properties(id, address, city, state, zip)')
      .eq('id', tenant_id)
      .eq('user_id', user.id)
      .single()

    if (tenantError || !tenant) {
      return NextResponse.json(
        { error: 'Tenant not found or does not belong to you' },
        { status: 404 }
      )
    }

    let result: Record<string, unknown> = {}

    switch (action) {
      // ── Send Renewal Offer via Email Agent ──────────────────────────
      case 'send_renewal': {
        const baseUrl = process.env.NEXT_PUBLIC_URL || process.env.NEXT_PUBLIC_APP_URL || req.headers.get('origin') || ''
        const emailResponse = await fetch(`${baseUrl}/api/agents/email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Cookie: req.headers.get('cookie') || '',
          },
          body: JSON.stringify({
            tenantId: tenant_id,
            templateType: 'lease_renewal',
            customContent: `The current lease for ${tenant.first_name} ${tenant.last_name} at ${tenant.properties?.address || 'the property'} expires on ${tenant.lease_end}. Current monthly rent is $${tenant.monthly_rent}. Please generate a professional lease renewal offer.`,
          }),
        })

        const emailResult = await emailResponse.json()

        result = {
          action: 'send_renewal',
          email_sent: emailResult.success || false,
          email_result: emailResult,
        }
        break
      }

      // ── Send Reminder via SMS Agent ─────────────────────────────────
      case 'send_reminder': {
        if (!tenant.phone) {
          return NextResponse.json(
            { error: 'Tenant does not have a phone number on file' },
            { status: 400 }
          )
        }

        const baseUrl = process.env.NEXT_PUBLIC_URL || process.env.NEXT_PUBLIC_APP_URL || req.headers.get('origin') || ''
        const daysRemaining = tenant.lease_end
          ? Math.ceil(
              (new Date(tenant.lease_end).getTime() - Date.now()) /
                (1000 * 60 * 60 * 24)
            )
          : 0

        const smsResponse = await fetch(`${baseUrl}/api/agents/sms`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Cookie: req.headers.get('cookie') || '',
          },
          body: JSON.stringify({
            tenantId: tenant_id,
            message: `Hi ${tenant.first_name}, this is a friendly reminder that your lease at ${tenant.properties?.address || 'your property'} expires in ${daysRemaining} days (${tenant.lease_end}). Please reach out to discuss renewal options. Thank you!`,
            automated: true,
          }),
        })

        const smsResult = await smsResponse.json()

        result = {
          action: 'send_reminder',
          sms_sent: smsResult.success || false,
          sms_result: smsResult,
        }
        break
      }

      // ── Mark Lease as Renewed ───────────────────────────────────────
      case 'mark_renewed': {
        const { new_lease_end, new_monthly_rent } = body

        if (!new_lease_end) {
          return NextResponse.json(
            { error: 'new_lease_end is required when marking a lease as renewed' },
            { status: 400 }
          )
        }

        const updateData: Record<string, unknown> = {
          lease_end: new_lease_end,
          updated_at: new Date().toISOString(),
        }

        // Optionally update rent if provided
        if (new_monthly_rent !== undefined) {
          updateData.monthly_rent = new_monthly_rent
        }

        const { data: updatedTenant, error: updateError } = await supabase
          .from('tenants')
          .update(updateData)
          .eq('id', tenant_id)
          .select('*, properties(id, address, city, state, zip)')
          .single()

        if (updateError) {
          console.error('[Leases POST] Update error:', updateError)
          return NextResponse.json(
            { error: 'Failed to update lease' },
            { status: 500 }
          )
        }

        result = {
          action: 'mark_renewed',
          tenant: updatedTenant,
          previous_lease_end: tenant.lease_end,
          new_lease_end,
          new_monthly_rent: new_monthly_rent || tenant.monthly_rent,
        }
        break
      }
    }

    // Fire webhook: lease_expiring
    fireWebhook(user.id, 'lease_expiring', {
      tenant_id,
      tenant_name: `${tenant.first_name} ${tenant.last_name}`,
      property_id: tenant.property_id,
      property_address: tenant.properties?.address || null,
      lease_end: tenant.lease_end,
      action,
      result,
    })

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error('[Leases POST] Error:', error)
    return NextResponse.json(
      { error: 'Failed to process lease action' },
      { status: 500 }
    )
  }
}
