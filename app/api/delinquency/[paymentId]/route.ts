import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

const ORG_ID = 'a0000000-0000-0000-0000-000000000001';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  const { paymentId } = await params;
  const supabase = createAdminClient();

  try {
    const body = await request.json();
    const { amount_paid } = body;

    if (amount_paid === undefined || amount_paid === null) {
      return NextResponse.json({ error: 'amount_paid is required' }, { status: 400 });
    }

    // Get current payment
    const { data: current, error: fetchErr } = await supabase
      .from('rent_payments')
      .select('id, amount_due, amount_paid')
      .eq('id', paymentId)
      .eq('org_id', ORG_ID)
      .single();

    if (fetchErr || !current) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    const newAmountPaid = (current.amount_paid || 0) + Number(amount_paid);
    const amountDue = current.amount_due || 0;

    // Determine new status
    let newStatus = 'partial';
    if (newAmountPaid >= amountDue) {
      newStatus = 'paid';
    }

    const updateData: Record<string, any> = {
      amount_paid: newAmountPaid,
      status: newStatus,
    };

    if (newStatus === 'paid') {
      updateData.paid_date = new Date().toISOString();
      updateData.days_late = 0;
    }

    const { data: updated, error: updateErr } = await supabase
      .from('rent_payments')
      .update(updateData)
      .eq('id', paymentId)
      .eq('org_id', ORG_ID)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ payment: updated });
  } catch (err: any) {
    console.error('Record payment error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
