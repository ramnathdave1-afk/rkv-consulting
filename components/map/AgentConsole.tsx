'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Send, Zap, Network, Shield, TrendingUp, Radio, Bot, User } from 'lucide-react';
import type { ChatMessage, SystemLogEntry } from '@/lib/types';

const agentColors: Record<string, string> = {
  alpha: '#00D4AA',
  beta: '#3B82F6',
  gamma: '#F59E0B',
  delta: '#8A00FF',
};

const logTypeColors: Record<string, string> = {
  FETCH: '#3B82F6',
  ANALYSIS: '#F59E0B',
  SUCCESS: '#00D4AA',
  ERROR: '#EF4444',
  SCAN: '#8A00FF',
};

const tools = [
  { label: 'Scan Grid', icon: Zap, prefix: '[SCAN_GRID] ' },
  { label: 'Find Fiber', icon: Network, prefix: '[FIND_FIBER] ' },
  { label: 'Score Site', icon: Shield, prefix: '[SCORE_SITE] ' },
  { label: 'Market Intel', icon: TrendingUp, prefix: '[MARKET_INTEL] ' },
];

interface AgentConsoleProps {
  onSiteSelect?: (siteId: string) => void;
}

export function AgentConsole({ onSiteSelect }: AgentConsoleProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [systemLogs, setSystemLogs] = useState<SystemLogEntry[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Subscribe to agent activity for system logs
  useEffect(() => {
    supabase
      .from('agent_activity_log')
      .select('id, agent_name, action, details, created_at')
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }: { data: { id: string; agent_name: string; action: string; details: Record<string, unknown> | null; created_at: string }[] | null }) => {
        const logs: SystemLogEntry[] = (data || []).map((entry) => ({
          id: entry.id,
          type: inferLogType(entry.action),
          message: `[${entry.agent_name.toUpperCase()}] ${entry.action}`,
          agent: entry.agent_name as SystemLogEntry['agent'],
          timestamp: entry.created_at,
        }));
        setSystemLogs(logs);
      });

    const channel = supabase
      .channel('console_feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'agent_activity_log' },
        (payload: { new: Record<string, unknown> }) => {
          const entry = payload.new;
          const log: SystemLogEntry = {
            id: entry.id as string,
            type: inferLogType(entry.action as string),
            message: `[${(entry.agent_name as string).toUpperCase()}] ${entry.action as string}`,
            agent: entry.agent_name as SystemLogEntry['agent'],
            timestamp: entry.created_at as string,
          };
          setSystemLogs((prev) => [log, ...prev].slice(0, 100));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [systemLogs]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || streaming) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setStreaming(true);
    setStreamingText('');

    // Add simulated system log entries
    addSystemLog('FETCH', 'Initializing query pipeline...');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Chat API error: ${response.status}`);
      }

      addSystemLog('ANALYSIS', 'Processing intelligence response...');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                fullText += parsed.delta.text;
                setStreamingText(fullText);
              }
            } catch {
              // skip malformed lines
            }
          }
        }
      }

      addSystemLog('SUCCESS', 'Response complete.');

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: fullText || 'No response received.',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      addSystemLog('ERROR', `Request failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Error: Unable to process request. Check system logs.',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setStreaming(false);
      setStreamingText('');
    }
  }, [input, streaming, messages]);

  function addSystemLog(type: SystemLogEntry['type'], message: string) {
    const log: SystemLogEntry = {
      id: crypto.randomUUID(),
      type,
      message,
      timestamp: new Date().toISOString(),
    };
    setSystemLogs((prev) => [log, ...prev].slice(0, 100));
  }

  function handleToolClick(prefix: string) {
    setInput((prev) => prefix + prev);
  }

  // Suppress unused variable warning
  void onSiteSelect;

  return (
    <div className="h-full flex flex-col bg-bg-secondary">
      {/* Header */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border shrink-0">
        <Bot size={12} className="text-accent" />
        <span className="text-[10px] font-semibold text-text-primary uppercase tracking-wider">Agent Console</span>
        <span className="ml-auto flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
          <span className="text-[9px] text-text-muted font-mono">ONLINE</span>
        </span>
      </div>

      {/* Chat Section (top 60%) */}
      <div className="flex-[6] min-h-0 flex flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
          {messages.length === 0 && !streaming && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Bot size={24} className="text-text-muted mb-2" />
              <p className="text-[10px] text-text-muted">Meridian Node AI</p>
              <p className="text-[9px] text-text-muted mt-1">Grid intelligence at your command</p>
            </div>
          )}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="shrink-0 h-5 w-5 rounded-full bg-accent/20 flex items-center justify-center mt-0.5">
                  <Bot size={10} className="text-accent" />
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-lg px-2.5 py-1.5 text-[11px] leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-accent/10 border border-accent/20 text-text-primary'
                    : 'bg-bg-elevated text-text-secondary font-mono'
                }`}
              >
                {msg.content}
              </div>
              {msg.role === 'user' && (
                <div className="shrink-0 h-5 w-5 rounded-full bg-bg-elevated flex items-center justify-center mt-0.5">
                  <User size={10} className="text-text-muted" />
                </div>
              )}
            </div>
          ))}
          {streaming && streamingText && (
            <div className="flex gap-2 justify-start">
              <div className="shrink-0 h-5 w-5 rounded-full bg-accent/20 flex items-center justify-center mt-0.5">
                <Bot size={10} className="text-accent animate-pulse" />
              </div>
              <div className="max-w-[85%] rounded-lg px-2.5 py-1.5 text-[11px] leading-relaxed bg-bg-elevated text-text-secondary font-mono">
                {streamingText}
                <span className="inline-block w-1.5 h-3 bg-accent ml-0.5 animate-pulse" />
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Tool selection bar */}
        <div className="flex items-center gap-1 px-3 py-1 border-t border-border shrink-0">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.label}
                onClick={() => handleToolClick(tool.prefix)}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] text-text-muted hover:text-text-primary hover:bg-bg-elevated/50 transition-colors"
                title={tool.label}
              >
                <Icon size={9} />
                {tool.label}
              </button>
            );
          })}
        </div>

        {/* Input */}
        <div className="flex items-center gap-2 px-3 py-2 border-t border-border shrink-0">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Query grid intelligence..."
            disabled={streaming}
            className="flex-1 bg-bg-primary border border-border rounded-lg px-2.5 py-1.5 text-[11px] text-text-primary placeholder:text-text-muted font-mono outline-none focus:border-accent/50 transition-colors disabled:opacity-50"
          />
          <button
            onClick={sendMessage}
            disabled={streaming || !input.trim()}
            className="shrink-0 h-7 w-7 rounded-lg bg-accent/20 hover:bg-accent/30 flex items-center justify-center transition-colors disabled:opacity-30"
          >
            <Send size={11} className="text-accent" />
          </button>
        </div>
      </div>

      {/* System Logs Section (bottom 40%) */}
      <div className="flex-[4] min-h-0 flex flex-col border-t border-border">
        <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-border shrink-0">
          <Radio size={9} className="text-accent animate-pulse" />
          <span className="text-[9px] font-semibold text-text-primary uppercase tracking-wider">System Log</span>
          <span className="text-[8px] text-text-muted ml-auto font-mono">{systemLogs.length}</span>
        </div>
        <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0">
          {systemLogs.map((log) => {
            const ts = new Date(log.timestamp);
            const timeStr = ts.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
            return (
              <div key={log.id} className="flex items-start gap-1.5 px-1 py-0.5 font-mono text-[9px] hover:bg-bg-elevated/10 rounded transition-colors">
                <span className="text-text-muted shrink-0 w-14">{timeStr}</span>
                <span
                  className="shrink-0 font-bold w-16"
                  style={{ color: logTypeColors[log.type] || '#8B95A5' }}
                >
                  [{log.type}]
                </span>
                <span className="text-text-secondary leading-tight">{log.message}</span>
              </div>
            );
          })}
          <div ref={logsEndRef} />
        </div>
      </div>
    </div>
  );
}

function inferLogType(action: string): SystemLogEntry['type'] {
  const lower = action.toLowerCase();
  if (lower.includes('scan') || lower.includes('search')) return 'SCAN';
  if (lower.includes('fetch') || lower.includes('pull') || lower.includes('query')) return 'FETCH';
  if (lower.includes('analyz') || lower.includes('scor') || lower.includes('evaluat')) return 'ANALYSIS';
  if (lower.includes('error') || lower.includes('fail')) return 'ERROR';
  return 'SUCCESS';
}
