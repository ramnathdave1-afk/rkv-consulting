import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import twilio from 'twilio';
import { generateOutboundScript } from '@/lib/twilio/voice';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { tenant_id, purpose, details, org_id } = await request.json();

    if (!tenant_id || !purpose || !org_id) {
      return NextResponse.json({ error: 'tenant_id, purpose, and org_id required' }, { status: 400 });
    }

    // Get tenant info
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('name, phone, email')
      .eq('id', tenant_id)
      .single();

    if (!tenant?.phone) {
      return NextResponse.json({ error: 'Tenant has no phone number' }, { status: 400 });
    }

    // Get org phone number
    const { data: orgPhone } = await supabaseAdmin
      .from('org_phone_numbers')
      .select('phone_number')
      .eq('org_id', org_id)
      .limit(1)
      .single();

    const fromNumber = orgPhone?.phone_number || process.env.TWILIO_PHONE_NUMBER;
    if (!fromNumber) {
      return NextResponse.json({ error: 'No outbound phone number configured' }, { status: 400 });
    }

    const webhookBase = process.env.TWILIO_WEBHOOK_BASE_URL || 'https://rkv-consulting.vercel.app';
    const twiml = generateOutboundScript(purpose, tenant.name, details || '', webhookBase);

    // Create conversation record
    const { data: conversation } = await supabaseAdmin.from('conversations').insert({
      org_id,
      channel: 'voice',
      participant_phone: tenant.phone,
      status: 'ai_handling',
      metadata: { direction: 'outbound', purpose, tenant_id },
    }).select('id').single();

    // Initiate call
    const client = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);
    const call = await client.calls.create({
      to: tenant.phone,
      from: fromNumber,
      twiml,
      statusCallback: `${webhookBase}/api/twilio/status`,
      statusCallbackMethod: 'POST',
    });

    // Log outbound call
    if (conversation) {
      await supabaseAdmin.from('messages').insert({
        conversation_id: conversation.id,
        org_id,
        sender_type: 'ai',
        content: `Outbound ${purpose} call initiated to ${tenant.name}`,
        channel: 'voice',
        metadata: { call_sid: call.sid, purpose },
      });
    }

    return NextResponse.json({
      success: true,
      call_sid: call.sid,
      conversation_id: conversation?.id,
    });
  } catch (error: any) {
    console.error('Outbound call error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
