import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { tenant_id, property_id, amount_due, due_date, is_recurring } = await req.json();

    if (!tenant_id || !property_id || !amount_due) {
      return NextResponse.json({ error: 'tenant_id, property_id, and amount_due are required' }, { status: 400 });
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const { data, error } = await supabase
      .from('rent_payment_tokens')
      .insert({
        user_id: user.id,
        tenant_id,
        property_id,
        token,
        amount_due,
        due_date: due_date || null,
        is_recurring: is_recurring || false,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('[Payment Link] Insert error:', error);
      return NextResponse.json({ error: 'Failed to create payment link' }, { status: 500 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_URL || req.nextUrl.origin;
    const paymentLink = `${baseUrl}/pay/${token}`;

    return NextResponse.json({
      token: data,
      link: paymentLink,
    });
  } catch (error) {
    console.error('[Payment Link]', error);
    return NextResponse.json({ error: 'Failed to create payment link' }, { status: 500 });
  }
}
