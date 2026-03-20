'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Skeleton } from '@/components/ui/Skeleton';
import { MessageSquare } from 'lucide-react';

interface ConversationRow {
  id: string;
  channel: string;
  participant_phone: string | null;
  participant_name: string | null;
  status: string;
  last_message_at: string | null;
  tenants: { first_name: string; last_name: string } | null;
  properties: { name: string } | null;
}

const statusColors: Record<string, string> = {
  active: 'bg-green-500/10 text-green-500',
  ai_handling: 'bg-blue-500/10 text-blue-500',
  human_handling: 'bg-yellow-500/10 text-yellow-500',
  escalated: 'bg-red-500/10 text-red-500',
  closed: 'bg-gray-500/10 text-gray-500',
};

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetch() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from('profiles').select('org_id').eq('user_id', user.id).single();
      if (!profile) return;

      const { data } = await supabase
        .from('conversations')
        .select('id, channel, participant_phone, participant_name, status, last_message_at, tenants(first_name, last_name), properties(name)')
        .eq('org_id', profile.org_id)
        .order('last_message_at', { ascending: false });

      setConversations((data as ConversationRow[]) || []);
      setLoading(false);
    }
    fetch();
  }, [supabase]);

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold text-text-primary">Conversations</h1>
        <p className="text-sm text-text-secondary">{conversations.length} conversations</p>
      </div>

      {conversations.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <MessageSquare size={48} className="mx-auto text-text-muted mb-4" />
          <h3 className="text-lg font-semibold text-text-primary mb-2">No conversations yet</h3>
          <p className="text-sm text-text-secondary">Conversations will appear here when tenants or prospects message your Twilio numbers.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.map((c) => {
            const name = c.tenants
              ? `${c.tenants.first_name} ${c.tenants.last_name}`
              : c.participant_name || c.participant_phone || 'Unknown';

            return (
              <div key={c.id} className="glass-card p-4 flex items-center justify-between hover:bg-bg-elevated/50 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center">
                    <MessageSquare size={18} className="text-accent" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">{name}</p>
                    <p className="text-xs text-text-muted">
                      {c.channel.toUpperCase()}{c.properties ? ` · ${c.properties.name}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColors[c.status] || ''}`}>
                    {c.status.replace('_', ' ')}
                  </span>
                  {c.last_message_at && (
                    <span className="text-[10px] text-text-muted">
                      {new Date(c.last_message_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
