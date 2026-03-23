import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('user_id', user.id)
    .single();

  if (!profile) return NextResponse.json({ error: 'No profile' }, { status: 403 });

  const { data, error } = await supabase
    .from('conversations')
    .select('*, tenants(first_name, last_name), properties(name)')
    .eq('org_id', profile.org_id)
    .order('last_message_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fetch last message preview for each conversation
  const conversationsWithPreview = await Promise.all(
    (data || []).map(async (conv: Record<string, unknown>) => {
      const { data: lastMsg } = await supabase
        .from('messages')
        .select('content, sender_type, created_at')
        .eq('conversation_id', conv.id as string)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      return {
        ...conv,
        last_message_preview: lastMsg?.content
          ? (lastMsg.content as string).substring(0, 80) + ((lastMsg.content as string).length > 80 ? '...' : '')
          : null,
        last_message_sender_type: lastMsg?.sender_type || null,
      };
    })
  );

  return NextResponse.json({ conversations: conversationsWithPreview });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('user_id', user.id)
    .single();

  if (!profile) return NextResponse.json({ error: 'No profile' }, { status: 403 });

  const body = await request.json();
  const { data, error } = await supabase
    .from('conversations')
    .insert({ ...body, org_id: profile.org_id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ conversation: data }, { status: 201 });
}
