import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fireWebhook } from '@/lib/webhooks/fire'

// ── POST — Record a rent payment ────────────────────────────────────────────

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
    const { tenant_id, amount, payment_method, property_id } = body

    if (!tenant_id || !amount) {
      return NextResponse.json(
        { error: 'tenant_id and amount are required' },
        { status: 400 }
      )
    }

    // Fetch tenant details including lease terms
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

    // Determine the current month's due date
    const now = new Date()
    const rentDueDay = tenant.rent_due_day || 1
    const dueDate = new Date(now.getFullYear(), now.getMonth(), rentDueDay)
    const dueDateStr = dueDate.toISOString().split('T')[0]

    // Check if payment is late
    const graceDays = tenant.late_fee_grace_days || 5
    const graceDeadline = new Date(dueDate)
    graceDeadline.setDate(graceDeadline.getDate() + graceDays)

    let lateFeeCharged = 0
    const isLate = now > graceDeadline

    if (isLate) {
      lateFeeCharged = tenant.late_fee_amount || 50
    }

    // Determine payment status
    const amountDue = tenant.monthly_rent || 0
    const totalDueWithFee = amountDue + lateFeeCharged
    let paymentStatus = 'paid'

    if (amount < totalDueWithFee) {
      paymentStatus = amount > 0 ? 'partial' : 'pending'
    }

    // Check if a rent_payment record already exists for this tenant/month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split('T')[0]
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString()
      .split('T')[0]

    const { data: existingPayment } = await supabase
      .from('rent_payments')
      .select('id, amount_paid')
      .eq('tenant_id', tenant_id)
      .eq('user_id', user.id)
      .gte('due_date', monthStart)
      .lte('due_date', monthEnd)
      .single()

    let rentPayment

    if (existingPayment) {
      // Update existing payment record (accumulate partial payments)
      const newAmountPaid = (existingPayment.amount_paid || 0) + amount
      const updatedStatus = newAmountPaid >= amountDue ? 'paid' : 'partial'

      const { data: updated, error: updateError } = await supabase
        .from('rent_payments')
        .update({
          amount_paid: newAmountPaid,
          paid_date: now.toISOString().split('T')[0],
          payment_method: payment_method || null,
          late_fee_charged: lateFeeCharged,
          status: updatedStatus,
        })
        .eq('id', existingPayment.id)
        .select()
        .single()

      if (updateError) {
        console.error('[Rent POST] Update error:', updateError)
        return NextResponse.json(
          { error: 'Failed to update rent payment' },
          { status: 500 }
        )
      }

      rentPayment = updated
    } else {
      // Create a new rent payment record
      const { data: created, error: createError } = await supabase
        .from('rent_payments')
        .insert({
          user_id: user.id,
          tenant_id,
          property_id: property_id || tenant.property_id,
          amount_due: amountDue,
          amount_paid: amount,
          due_date: dueDateStr,
          paid_date: now.toISOString().split('T')[0],
          payment_method: payment_method || null,
          late_fee_charged: lateFeeCharged,
          status: paymentStatus,
        })
        .select()
        .single()

      if (createError) {
        console.error('[Rent POST] Insert error:', createError)
        return NextResponse.json(
          { error: 'Failed to record rent payment' },
          { status: 500 }
        )
      }

      rentPayment = created
    }

    // Also log as a transaction (income)
    await supabase.from('transactions').insert({
      user_id: user.id,
      property_id: property_id || tenant.property_id,
      tenant_id,
      type: 'income',
      category: 'rent',
      amount,
      description: `Rent payment from ${tenant.first_name} ${tenant.last_name}${isLate ? ' (late)' : ''}`,
      date: now.toISOString().split('T')[0],
    })

    // Fire webhook: rent_received
    fireWebhook(user.id, 'rent_received', {
      tenant_id,
      tenant_name: `${tenant.first_name} ${tenant.last_name}`,
      property_id: property_id || tenant.property_id,
      property_address: tenant.properties?.address || null,
      amount,
      amount_due: amountDue,
      payment_method: payment_method || null,
      is_late: isLate,
      late_fee_charged: lateFeeCharged,
      status: rentPayment.status,
      paid_date: now.toISOString(),
    })

    return NextResponse.json({
      success: true,
      payment: rentPayment,
      is_late: isLate,
      late_fee_charged: lateFeeCharged,
    })
  } catch (error) {
    console.error('[Rent POST] Error:', error)
    return NextResponse.json(
      { error: 'Failed to process rent payment' },
      { status: 500 }
    )
  }
}

// ── GET — Rent status for all tenants (current month) ────────────────────────

export async function GET() {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch all active tenants
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('*, properties(id, address, city, state, zip)')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (tenantsError) {
      console.error('[Rent GET] Tenants error:', tenantsError)
      return NextResponse.json(
        { error: 'Failed to fetch tenants' },
        { status: 500 }
      )
    }

    if (!tenants || tenants.length === 0) {
      return NextResponse.json({ rent_status: [] })
    }

    // Determine current month boundaries
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split('T')[0]
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString()
      .split('T')[0]

    // Fetch all rent payments for this month
    const tenantIds = tenants.map((t: { id: string }) => t.id)
    const { data: payments } = await supabase
      .from('rent_payments')
      .select('*')
      .eq('user_id', user.id)
      .in('tenant_id', tenantIds)
      .gte('due_date', monthStart)
      .lte('due_date', monthEnd)

    // Build a lookup: tenant_id -> payment record
    interface PaymentRecord {
      tenant_id: string
      amount_paid: number
      paid_date: string | null
      late_fee_charged: number
      status: string
    }

    const paymentMap = new Map<string, PaymentRecord>()
    if (payments) {
      for (const p of payments as PaymentRecord[]) {
        paymentMap.set(p.tenant_id, p)
      }
    }

    // Tenant shape from Supabase query
    interface TenantRow {
      id: string
      first_name: string
      last_name: string
      email: string | null
      phone: string | null
      property_id: string
      monthly_rent: number
      rent_due_day: number | null
      late_fee_grace_days: number | null
      properties: { address: string; city: string; state: string } | null
    }

    // Build rent status for each tenant
    const rentStatus = (tenants as TenantRow[]).map((tenant: TenantRow) => {
      const payment = paymentMap.get(tenant.id)
      const amountDue = tenant.monthly_rent || 0
      const amountPaid = payment?.amount_paid || 0
      const rentDueDay = tenant.rent_due_day || 1
      const dueDate = new Date(now.getFullYear(), now.getMonth(), rentDueDay)
      const dueDateStr = dueDate.toISOString().split('T')[0]

      // Determine status
      let status = 'pending'
      if (payment) {
        status = payment.status
      } else if (now > dueDate) {
        // Grace period check
        const graceDays = tenant.late_fee_grace_days || 5
        const graceDeadline = new Date(dueDate)
        graceDeadline.setDate(graceDeadline.getDate() + graceDays)
        if (now > graceDeadline) {
          status = 'overdue'
        }
      }

      return {
        tenant_id: tenant.id,
        tenant_name: `${tenant.first_name} ${tenant.last_name}`,
        tenant_email: tenant.email,
        tenant_phone: tenant.phone,
        property_id: tenant.property_id,
        property_address: tenant.properties?.address || null,
        property_city: tenant.properties?.city || null,
        property_state: tenant.properties?.state || null,
        amount_due: amountDue,
        amount_paid: amountPaid,
        due_date: dueDateStr,
        paid_date: payment?.paid_date || null,
        late_fee_charged: payment?.late_fee_charged || 0,
        status,
      }
    })

    // Summary statistics
    const summary = {
      total_tenants: rentStatus.length,
      paid: rentStatus.filter((r: { status: string }) => r.status === 'paid').length,
      partial: rentStatus.filter((r: { status: string }) => r.status === 'partial').length,
      overdue: rentStatus.filter((r: { status: string }) => r.status === 'overdue').length,
      pending: rentStatus.filter((r: { status: string }) => r.status === 'pending').length,
      total_expected: rentStatus.reduce((sum: number, r: { amount_due: number }) => sum + r.amount_due, 0),
      total_collected: rentStatus.reduce((sum: number, r: { amount_paid: number }) => sum + r.amount_paid, 0),
    }

    return NextResponse.json({
      rent_status: rentStatus,
      summary,
      month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
    })
  } catch (error) {
    console.error('[Rent GET] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch rent status' },
      { status: 500 }
    )
  }
}
