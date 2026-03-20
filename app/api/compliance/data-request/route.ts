import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// GDPR/CCPA Data Deletion + Export APIs

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('org_id, role').eq('user_id', user.id).single();
  if (!profile || !['admin', 'owner'].includes(profile.role)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { data } = await supabase
    .from('data_deletion_requests')
    .select('*')
    .eq('org_id', profile.org_id)
    .order('created_at', { ascending: false });

  return NextResponse.json({ requests: data || [] });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('org_id, role').eq('user_id', user.id).single();
  if (!profile || !['admin', 'owner'].includes(profile.role)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const body = await request.json();
  const { action, subject_type, subject_id, regulation } = body;

  if (action === 'export') {
    // Data export (GDPR Article 20 / CCPA right to know)
    return await handleDataExport(profile.org_id, subject_type, subject_id);
  }

  if (action === 'delete') {
    // Data deletion request (GDPR Article 17 / CCPA right to delete)
    const admin = createAdminClient();

    const { data: req, error } = await admin
      .from('data_deletion_requests')
      .insert({
        org_id: profile.org_id,
        requested_by: user.id,
        subject_type,
        subject_id,
        regulation: regulation || 'manual',
        status: 'pending',
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ request: req });
  }

  if (action === 'process_deletion' && body.request_id) {
    return await processDataDeletion(profile.org_id, body.request_id);
  }

  return NextResponse.json({ error: 'Invalid action. Use export, delete, or process_deletion.' }, { status: 400 });
}

async function handleDataExport(orgId: string, subjectType: string, subjectId: string) {
  const admin = createAdminClient();
  const exportData: Record<string, unknown> = {};

  if (subjectType === 'tenant') {
    const [{ data: tenant }, { data: leases }, { data: messages }, { data: workOrders }, { data: payments }] = await Promise.all([
      admin.from('tenants').select('*').eq('id', subjectId).eq('org_id', orgId).single(),
      admin.from('leases').select('*').eq('tenant_id', subjectId).eq('org_id', orgId),
      admin.from('messages').select('*').eq('org_id', orgId),
      admin.from('work_orders').select('*').eq('tenant_id', subjectId).eq('org_id', orgId),
      admin.from('rent_payments').select('*').eq('tenant_id', subjectId).eq('org_id', orgId),
    ]);

    exportData.tenant = tenant;
    exportData.leases = leases;
    exportData.messages = messages;
    exportData.work_orders = workOrders;
    exportData.rent_payments = payments;
  }

  return NextResponse.json({
    export: exportData,
    exported_at: new Date().toISOString(),
    regulation_notice: 'This data export is provided in compliance with GDPR Article 20 and CCPA Section 1798.100.',
  });
}

async function processDataDeletion(orgId: string, requestId: string) {
  const admin = createAdminClient();
  const entitiesDeleted: string[] = [];

  const { data: req } = await admin
    .from('data_deletion_requests')
    .select('*')
    .eq('id', requestId)
    .eq('org_id', orgId)
    .single();

  if (!req) return NextResponse.json({ error: 'Request not found' }, { status: 404 });

  await admin.from('data_deletion_requests')
    .update({ status: 'processing' })
    .eq('id', requestId);

  if (req.subject_type === 'tenant') {
    // Anonymize rather than hard-delete to preserve referential integrity
    await admin.from('tenants').update({
      first_name: 'REDACTED',
      last_name: 'REDACTED',
      email: null,
      phone: null,
      metadata: { gdpr_deleted: true, deleted_at: new Date().toISOString() },
    }).eq('id', req.subject_id).eq('org_id', orgId);
    entitiesDeleted.push('tenant_pii');

    // Delete messages content
    await admin.from('messages')
      .update({ content: '[DELETED PER DATA REQUEST]', metadata: { gdpr_deleted: true } })
      .eq('org_id', orgId);
    entitiesDeleted.push('message_content');
  }

  await admin.from('data_deletion_requests').update({
    status: 'completed',
    completed_at: new Date().toISOString(),
    entities_deleted: entitiesDeleted,
  }).eq('id', requestId);

  return NextResponse.json({ success: true, entities_deleted: entitiesDeleted });
}
