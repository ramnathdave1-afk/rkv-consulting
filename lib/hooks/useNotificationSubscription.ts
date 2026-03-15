'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useNotificationStore } from '@/store/notification-store';
import { showNotificationToast } from '@/components/ui/NotificationToast';

const agentLabels: Record<string, string> = {
  alpha: 'Infrastructure Scanner',
  beta: 'Site Discovery',
  gamma: 'Multi-Dimension Scorer',
  delta: 'Market Intelligence',
  epsilon: 'Feasibility Analyzer',
  zeta: 'Data Ingestion',
};

function isImportantEvent(action: string): boolean {
  const keywords = [
    'discovered', 'found', 'complete', 'scored', 'feasible', 'infeasible',
    'new site', 'ingestion complete', 'analysis complete', 'error',
  ];
  const lower = action.toLowerCase();
  return keywords.some((kw) => lower.includes(kw));
}

function getNotificationType(agentName: string): 'agent' | 'ingestion' | 'feasibility' | 'system' {
  if (agentName === 'epsilon') return 'feasibility';
  if (agentName === 'zeta') return 'ingestion';
  return 'agent';
}

export function useNotificationSubscription() {
  const addNotification = useNotificationStore((s) => s.addNotification);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const supabase = createClient();

    // Load recent activity on mount
    supabase
      .from('agent_activity_log')
      .select('id, agent_name, action, details, created_at')
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }: { data: Array<{ id: string; agent_name: string; action: string; details: Record<string, unknown> | null; created_at: string }> | null }) => {
        if (data) {
          data.reverse().forEach((entry: { agent_name: string; action: string }) => {
            if (isImportantEvent(entry.action)) {
              addNotification({
                type: getNotificationType(entry.agent_name),
                title: agentLabels[entry.agent_name] || entry.agent_name,
                message: entry.action,
                agentName: entry.agent_name,
              });
            }
          });
        }
      });

    // Subscribe to real-time inserts
    const channel = supabase
      .channel('agent-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'agent_activity_log' },
        (payload: { new: Record<string, unknown> }) => {
          const entry = payload.new as {
            agent_name: string;
            action: string;
            details?: Record<string, unknown>;
          };

          if (!isImportantEvent(entry.action)) return;

          const type = getNotificationType(entry.agent_name);
          const title = agentLabels[entry.agent_name] || entry.agent_name;

          addNotification({
            type,
            title,
            message: entry.action,
            agentName: entry.agent_name,
          });

          showNotificationToast({
            type,
            title,
            message: entry.action,
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [addNotification]);
}
