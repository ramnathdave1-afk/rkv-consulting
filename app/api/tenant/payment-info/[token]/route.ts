import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Fetch the payment token with tenant and property info
    const { data: tokenData, error } = await supabase
      .from('rent_payment_tokens')
      .select(`
        id, token, amount_due, due_date, is_recurring, expires_at, created_at,
        tenant_id, property_id, user_id
      `)
      .eq('token', token)
      .single();

    if (error || !tokenData) {
      return NextResponse.json({ error: 'Payment link not found or expired' }, { status: 404 });
    }

    // Check expiration
    if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Payment link has expired' }, { status: 410 });
    }

    // Fetch tenant info
    const { data: tenant } = await supabase
      .from('tenants')
      .select('first_name, last_name, email, monthly_rent')
      .eq('id', tokenData.tenant_id)
      .single();

    // Fetch property info
    const { data: property } = await supabase
      .from('properties')
      .select('address, city, state, zip')
      .eq('id', tokenData.property_id)
      .single();

    // Fetch recent payment history for this tenant
    const { data: payments } = await supabase
      .from('rent_payments')
      .select('amount, payment_date, status, late_fee')
      .eq('tenant_id', tokenData.tenant_id)
      .order('payment_date', { ascending: false })
      .limit(6);

    return NextResponse.json({
      tenantName: tenant ? `${tenant.first_name} ${tenant.last_name}` : 'Tenant',
      tenantEmail: tenant?.email || null,
      amountDue: tokenData.amount_due,
      dueDate: tokenData.due_date,
      propertyAddress: property
        ? `${property.address}${property.city ? `, ${property.city}` : ''}${property.state ? `, ${property.state}` : ''} ${property.zip || ''}`
        : 'Property',
      isRecurring: tokenData.is_recurring,
      paymentHistory: payments || [],
      landlordUserId: tokenData.user_id,
      tenantId: tokenData.tenant_id,
      propertyId: tokenData.property_id,
    });
  } catch (error) {
    console.error('[Payment Info]', error);
    return NextResponse.json({ error: 'Failed to fetch payment info' }, { status: 500 });
  }
}
