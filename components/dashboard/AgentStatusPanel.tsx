'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Bot, CheckCircle2, Loader2, Clock } from 'lucide-react';
import { AGENTS } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface AgentStatus {
  name: string;
  status: 'running' | 'idle' | 'completed';
  last_run: string | null;
  actions_24h: number;
}

interface AgentStatusPanelProps {
  agents: AgentStatus[];
}

export function AgentStatusPanel({ agents }: AgentStatusPanelProps) {
  const statusIcon = {
    running: <Loader2 size={14} className="text-accent animate-spin" />,
    completed: <CheckCircle2 size={14} className="text-success" />,
    idle: <Clock size={14} className="text-text-muted" />,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className="glass-card p-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <Bot size={16} className="text-accent" />
        <h3 className="text-sm font-semibold text-text-primary">Agent Status</h3>
      </div>
      <div className="space-y-2">
        {AGENTS.map((agentDef) => {
          const status = agents.find((a) => a.name === agentDef.name);
          return (
            <div
              key={agentDef.name}
              className="flex items-center justify-between rounded-lg bg-bg-primary/50 px-3 py-2"
            >
              <div className="flex items-center gap-2">
                {statusIcon[status?.status || 'idle']}
                <div>
                  <p className="text-xs font-medium text-text-primary">{agentDef.label}</p>
                  <p className="text-[10px] text-text-muted">{agentDef.description.split('—')[0].trim()}</p>
                </div>
              </div>
              <span className="text-xs font-mono text-text-secondary">
                {status?.actions_24h || 0} actions
              </span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
