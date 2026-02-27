'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Sparkles,
  BarChart3,
  DollarSign,
  TrendingUp,
  Calculator,
  FileText,
  Wrench,
  LineChart,
  RefreshCw,
  Plus,
  MessageSquare,
  Trash2,
  PanelLeftClose,
  PanelLeftOpen,
  Send,
  Copy,
  Check,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { FeatureGate } from '@/components/paywall/FeatureGate';
import { useSubscription } from '@/hooks/useSubscription';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages: Message[];
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function generateId(): string {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function deriveTitle(content: string): string {
  const cleaned = content.replace(/\n/g, ' ').trim();
  return cleaned.length > 50 ? cleaned.slice(0, 50) + '...' : cleaned;
}

/* ------------------------------------------------------------------ */
/*  Quick Action prompts (8 total)                                     */
/* ------------------------------------------------------------------ */

const QUICK_ACTIONS = [
  { icon: BarChart3, label: 'Analyze my portfolio', prompt: 'Analyze my portfolio performance and give me key insights on cash flow, equity growth, and areas for improvement.' },
  { icon: DollarSign, label: 'Review rent prices', prompt: 'Review the current rent prices across my properties and suggest adjustments based on market conditions.' },
  { icon: TrendingUp, label: 'Find investment opportunities', prompt: 'Based on my portfolio and current market conditions, identify the best investment opportunities for me.' },
  { icon: Calculator, label: 'Optimize tax strategy', prompt: 'Review my portfolio and suggest tax optimization strategies including depreciation, 1031 exchanges, and deductions.' },
  { icon: FileText, label: 'Draft tenant notice', prompt: 'Help me draft a professional tenant notice. What type of notice do you need? (Late rent, lease violation, move-out, etc.)' },
  { icon: Wrench, label: 'Maintenance cost analysis', prompt: 'Analyze my maintenance costs across all properties and identify trends, high-cost items, and cost-saving opportunities.' },
  { icon: LineChart, label: 'Market trend report', prompt: 'Generate a market trend report for the areas where I own properties, including pricing trends, rent growth, and demand indicators.' },
  { icon: RefreshCw, label: 'Lease renewal advice', prompt: 'Review my upcoming lease renewals and advise on rent adjustments, renewal terms, and retention strategies.' },
];

/* ------------------------------------------------------------------ */
/*  Rich Markdown Renderer                                             */
/* ------------------------------------------------------------------ */

function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];
  let codeLang = '';
  let inTable = false;
  let tableRows: string[][] = [];
  let tableAlignments: ('left' | 'center' | 'right')[] = [];

  function flushTable(startIdx: number) {
    if (tableRows.length === 0) return;
    const headerRow = tableRows[0];
    const dataRows = tableRows.slice(1);
    elements.push(
      <div key={`table-${startIdx}`} className="overflow-x-auto my-3">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-gold/20">
              {headerRow.map((cell, ci) => (
                <th
                  key={ci}
                  className={cn(
                    'px-3 py-2 text-xs font-semibold text-gold whitespace-nowrap',
                    tableAlignments[ci] === 'center' ? 'text-center' : tableAlignments[ci] === 'right' ? 'text-right' : 'text-left',
                  )}
                >
                  {formatInline(cell.trim())}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataRows.map((row, ri) => (
              <tr key={ri} className="border-b border-border/50">
                {row.map((cell, ci) => (
                  <td
                    key={ci}
                    className={cn(
                      'px-3 py-2 text-text',
                      tableAlignments[ci] === 'center' ? 'text-center' : tableAlignments[ci] === 'right' ? 'text-right' : 'text-left',
                    )}
                  >
                    {formatInline(cell.trim())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    tableRows = [];
    tableAlignments = [];
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code block toggle
    if (line.trimStart().startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeLang = line.trimStart().slice(3).trim();
        codeLines = [];
      } else {
        inCodeBlock = false;
        elements.push(
          <div key={`code-${i}`} className="my-3 rounded-lg overflow-hidden border border-border">
            {codeLang && (
              <div className="px-3 py-1.5 bg-deep/80 border-b border-border text-[10px] text-muted uppercase tracking-wider font-mono">
                {codeLang}
              </div>
            )}
            <pre className="px-4 py-3 bg-deep/50 overflow-x-auto">
              <code className="text-xs text-gold-light font-mono leading-relaxed">
                {codeLines.join('\n')}
              </code>
            </pre>
          </div>
        );
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    // Table detection
    const isTableRow = line.trim().startsWith('|') && line.trim().endsWith('|');
    const isSeparator = /^\|[\s\-:|]+\|$/.test(line.trim());

    if (isTableRow || isSeparator) {
      if (!inTable) {
        inTable = true;
        tableRows = [];
        tableAlignments = [];
      }

      if (isSeparator) {
        // Parse alignments
        const cells = line.trim().slice(1, -1).split('|');
        tableAlignments = cells.map((c) => {
          const trimmed = c.trim();
          if (trimmed.startsWith(':') && trimmed.endsWith(':')) return 'center';
          if (trimmed.endsWith(':')) return 'right';
          return 'left';
        });
      } else {
        const cells = line.trim().slice(1, -1).split('|');
        tableRows.push(cells);
      }
      continue;
    } else if (inTable) {
      inTable = false;
      flushTable(i);
    }

    // Headers
    if (line.startsWith('### ')) {
      elements.push(
        <h3 key={i} className="text-sm font-display font-bold text-white mt-4 mb-1.5">
          {formatInline(line.slice(4))}
        </h3>
      );
    } else if (line.startsWith('## ')) {
      elements.push(
        <h2 key={i} className="text-base font-display font-bold text-white mt-4 mb-2">
          {formatInline(line.slice(3))}
        </h2>
      );
    } else if (line.startsWith('# ')) {
      elements.push(
        <h1 key={i} className="text-lg font-display font-bold text-white mt-4 mb-2">
          {formatInline(line.slice(2))}
        </h1>
      );
    }
    // Bullet points
    else if (line.trimStart().startsWith('- ') || line.trimStart().startsWith('* ')) {
      const indent = line.length - line.trimStart().length;
      const bulletText = line.trimStart().slice(2);
      elements.push(
        <div key={i} className="flex items-start gap-2 my-0.5" style={{ marginLeft: `${Math.min(indent, 6) * 8 + 8}px` }}>
          <span className="w-1.5 h-1.5 rounded-full bg-gold mt-1.5 flex-shrink-0" />
          <span>{formatInline(bulletText)}</span>
        </div>
      );
    }
    // Numbered list
    else if (/^\d+\.\s/.test(line.trimStart())) {
      const match = line.trimStart().match(/^(\d+)\.\s(.*)$/);
      if (match) {
        elements.push(
          <div key={i} className="flex items-start gap-2.5 ml-2 my-0.5">
            <span className="text-gold font-semibold text-xs mt-0.5 w-5 text-right flex-shrink-0">{match[1]}.</span>
            <span>{formatInline(match[2])}</span>
          </div>
        );
      }
    }
    // Horizontal rule
    else if (/^---+$/.test(line.trim())) {
      elements.push(<hr key={i} className="border-border my-3" />);
    }
    // Empty line
    else if (line.trim() === '') {
      elements.push(<div key={i} className="h-2" />);
    }
    // Normal paragraph
    else {
      elements.push(
        <p key={i} className="my-0.5">
          {formatInline(line)}
        </p>
      );
    }
  }

  // Flush remaining table
  if (inTable) {
    flushTable(lines.length);
  }

  return elements;
}

function formatInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*(.+?)\*\*|`(.+?)`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[2]) {
      parts.push(
        <strong key={match.index} className="font-semibold text-white">
          {match[2]}
        </strong>
      );
    } else if (match[3]) {
      parts.push(
        <code
          key={match.index}
          className="px-1.5 py-0.5 rounded bg-white/5 text-gold-light text-[0.85em] font-mono"
        >
          {match[3]}
        </code>
      );
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

/* ------------------------------------------------------------------ */
/*  Message Bubble (inline)                                            */
/* ------------------------------------------------------------------ */

function ChatBubble({
  role,
  content,
  timestamp,
  userInitials,
}: {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  userInitials: string;
}) {
  const [copied, setCopied] = useState(false);
  const isUser = role === 'user';

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* */ }
  }

  const formattedTime = (() => {
    try {
      return new Date(timestamp).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return timestamp;
    }
  })();

  return (
    <div
      className={cn(
        'flex gap-3 group max-w-[85%]',
        isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'
      )}
    >
      {/* Avatar */}
      <div className="flex-shrink-0 flex items-start">
        <div className="w-8 h-8 rounded-full bg-gold/15 border border-gold/20 flex items-center justify-center">
          <span className={cn('font-bold', isUser ? 'text-xs text-gold' : 'text-[10px] text-gold')}>
            {isUser ? userInitials : 'AI'}
          </span>
        </div>
      </div>

      {/* Bubble */}
      <div className="relative">
        <div
          className={cn(
            'px-4 py-3 text-sm leading-relaxed font-body',
            isUser
              ? 'bg-gold/20 border border-gold/30 rounded-2xl rounded-br-sm text-white'
              : 'bg-card border border-border rounded-2xl rounded-bl-sm text-text'
          )}
        >
          {/* Copy button */}
          <button
            type="button"
            onClick={handleCopy}
            className={cn(
              'absolute -top-2 opacity-0 group-hover:opacity-100',
              'transition-opacity duration-150',
              'p-1.5 rounded-lg bg-deep border border-border',
              'hover:bg-card hover:border-gold/20',
              'text-muted hover:text-gold',
              isUser ? 'left-0' : 'right-0'
            )}
            title="Copy message"
          >
            {copied ? <Check className="h-3 w-3 text-green" /> : <Copy className="h-3 w-3" />}
          </button>

          <div className="space-y-0">
            {isUser ? <p>{content}</p> : renderMarkdown(content)}
          </div>
        </div>

        <p className={cn('text-xs text-muted mt-1.5 px-1', isUser ? 'text-right' : 'text-left')}>
          {formattedTime}
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Streaming Response                                                 */
/* ------------------------------------------------------------------ */

function StreamingBubble({ content, isStreaming }: { content: string; isStreaming: boolean }) {
  return (
    <div className="flex gap-3 mr-auto max-w-[85%]">
      <div className="flex-shrink-0 flex items-start">
        <div className="w-8 h-8 rounded-full bg-gold/15 border border-gold/20 flex items-center justify-center">
          <span className="text-[10px] font-bold text-gold">AI</span>
        </div>
      </div>
      <div>
        <div className="bg-card border border-border rounded-2xl rounded-bl-sm px-4 py-3 text-sm leading-relaxed font-body text-text">
          {content ? (
            <div className="space-y-0">
              {renderMarkdown(content)}
              {isStreaming && (
                <span className="inline-block w-0.5 h-5 bg-gold animate-pulse ml-0.5 align-middle" />
              )}
            </div>
          ) : isStreaming ? (
            <div className="flex items-center gap-1.5 py-1">
              <span className="w-2 h-2 rounded-full bg-gold/60 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 rounded-full bg-gold/60 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 rounded-full bg-gold/60 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          ) : null}
        </div>
        {!isStreaming && content && (
          <p className="text-xs text-muted mt-1.5 px-1">Just now</p>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

export default function AIAssistantPage() {
  const supabase = createClient();
  const { getLimit, planName } = useSubscription();

  // State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [userInitials, setUserInitials] = useState('U');
  const [usageCount, setUsageCount] = useState(0);
  const [usageLimit, setUsageLimit] = useState(200);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [input, setInput] = useState('');

  const abortControllerRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const MAX_CHARS = 4000;
  const isEmpty = messages.length === 0 && !isStreaming;

  /* ---- Plan-based usage label ---- */
  const usageLabelMap: Record<string, string> = {
    basic: '25/mo',
    pro: '200/mo',
    elite: 'Unlimited',
  };
  const usagePlanLabel = usageLabelMap[planName] || '200/mo';

  /* ---------------------------------------------------------------- */
  /*  Fetch user and conversations on mount                            */
  /* ---------------------------------------------------------------- */

  const fetchInitialData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setUserId(user.id);

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single();

    if (profile) {
      const initials = profile.full_name
        ? profile.full_name
            .split(' ')
            .map((n: string) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2)
        : profile.email?.charAt(0).toUpperCase() || 'U';
      setUserInitials(initials);
    }

    const { data: convos } = await supabase
      .from('ai_conversations')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (convos) {
      setConversations(convos as Conversation[]);
    }

    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

    const { data: usage } = await supabase
      .from('ai_usage')
      .select('queries_used, queries_limit')
      .eq('user_id', user.id)
      .gte('period_start', periodStart)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (usage) {
      setUsageCount(usage.queries_used || 0);
      setUsageLimit(usage.queries_limit || 200);
    } else {
      const limit = getLimit('aiMessagesLimit');
      setUsageLimit(limit === Infinity ? 9999 : limit);
    }
  }, [supabase, getLimit]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  /* ---- Auto-resize textarea ---- */
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 160) + 'px';
  }, [input]);

  /* ---- Scroll to bottom ---- */
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent, scrollToBottom]);

  /* ---------------------------------------------------------------- */
  /*  Select / New / Delete conversation                               */
  /* ---------------------------------------------------------------- */

  function handleSelectConversation(id: string) {
    const conv = conversations.find((c) => c.id === id);
    if (conv) {
      setActiveConversationId(id);
      setMessages(conv.messages || []);
    }
  }

  function handleNewConversation() {
    setActiveConversationId(null);
    setMessages([]);
    setStreamingContent('');
    setIsStreaming(false);
    setInput('');
  }

  async function handleDeleteConversation(id: string) {
    await supabase.from('ai_conversations').delete().eq('id', id);
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeConversationId === id) {
      setActiveConversationId(null);
      setMessages([]);
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Format conversation date                                         */
  /* ---------------------------------------------------------------- */

  function formatConversationDate(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Build system prompt with user context                            */
  /* ---------------------------------------------------------------- */

  async function buildSystemPrompt(): Promise<string> {
    if (!userId) return 'You are a helpful real estate investment assistant.';

    const [propertiesRes, dealsRes, tenantsRes, maintenanceRes] = await Promise.all([
      supabase
        .from('properties')
        .select('address, city, state, property_type, current_value, monthly_rent, monthly_expenses, status')
        .eq('user_id', userId)
        .limit(20),
      supabase
        .from('deals')
        .select('address, asking_price, stage, analysis')
        .eq('user_id', userId)
        .neq('stage', 'dead')
        .limit(10),
      supabase
        .from('tenants')
        .select('first_name, last_name, status, monthly_rent, lease_end')
        .eq('user_id', userId)
        .eq('status', 'active')
        .limit(20),
      supabase
        .from('maintenance_requests')
        .select('title, status, priority, category')
        .eq('user_id', userId)
        .in('status', ['open', 'in_progress', 'scheduled'])
        .limit(10),
    ]);

    const properties = propertiesRes.data || [];
    const deals = dealsRes.data || [];
    const tenants = tenantsRes.data || [];
    const maintenance = maintenanceRes.data || [];

    const totalValue = properties.reduce((s: number, p: Record<string, any>) => s + (p.current_value || 0), 0);
    const totalRent = properties.reduce((s: number, p: Record<string, any>) => s + (p.monthly_rent || 0), 0);
    const totalExpenses = properties.reduce((s: number, p: Record<string, any>) => s + (p.monthly_expenses || 0), 0);

    return `You are RKV AI Assistant, a professional real estate investment advisor for RKV Consulting.

CONTEXT ABOUT THE USER'S PORTFOLIO:
- Properties owned: ${properties.length}
- Total portfolio value: $${totalValue.toLocaleString()}
- Monthly rental income: $${totalRent.toLocaleString()}
- Monthly expenses: $${totalExpenses.toLocaleString()}
- Monthly cash flow: $${(totalRent - totalExpenses).toLocaleString()}
- Active tenants: ${tenants.length}
- Active deals: ${deals.filter((d: Record<string, any>) => d.stage !== 'closed').length}
- Open maintenance requests: ${maintenance.length}

PROPERTIES:
${properties.map((p: Record<string, any>) => `- ${p.address}, ${p.city}, ${p.state} (${p.property_type}, ${p.status}) - Value: $${(p.current_value || 0).toLocaleString()}, Rent: $${(p.monthly_rent || 0).toLocaleString()}/mo`).join('\n')}

ACTIVE DEALS:
${deals.map((d: Record<string, any>) => `- ${d.address} - Asking: $${d.asking_price.toLocaleString()} - Stage: ${d.stage}`).join('\n') || 'None'}

ACTIVE TENANTS:
${tenants.map((t: Record<string, any>) => `- ${t.first_name} ${t.last_name} - Rent: $${t.monthly_rent.toLocaleString()}/mo - Lease ends: ${t.lease_end || 'N/A'}`).join('\n') || 'None'}

OPEN MAINTENANCE:
${maintenance.map((m: Record<string, any>) => `- ${m.title} (${m.priority} priority, ${m.category}) - Status: ${m.status}`).join('\n') || 'None'}

GUIDELINES:
- Provide specific, actionable advice based on the user's actual portfolio data.
- Reference specific properties, tenants, or deals when relevant.
- Use financial metrics (cap rate, cash-on-cash, NOI) appropriately.
- Be concise but thorough. Use bullet points, tables, and headers for clarity.
- If the user asks about something outside your data, acknowledge the limitation.
- Format numbers as currency where appropriate.
- Be professional and knowledgeable about real estate investing.`;
  }

  /* ---------------------------------------------------------------- */
  /*  Send message with streaming                                      */
  /* ---------------------------------------------------------------- */

  async function handleSendMessage(content: string) {
    if (!content.trim() || isStreaming) return;

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setIsStreaming(true);
    setStreamingContent('');
    setInput('');

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    let convId = activeConversationId;
    const isNewConversation = !convId;

    try {
      const systemPrompt = await buildSystemPrompt();

      const apiMessages = [
        { role: 'system' as const, content: systemPrompt },
        ...updatedMessages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      ];

      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      const response = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          conversationId: convId,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          fullContent += chunk;
          setStreamingContent(fullContent);
        }
      } else {
        const data = await response.json();
        fullContent = data.content || data.message || 'I apologize, but I was unable to generate a response.';
        setStreamingContent(fullContent);
      }

      const assistantMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: fullContent,
        timestamp: new Date().toISOString(),
      };

      const finalMessages = [...updatedMessages, assistantMessage];
      setMessages(finalMessages);

      if (isNewConversation && userId) {
        const title = deriveTitle(content);
        const newConvId = generateId();

        const { error } = await supabase.from('ai_conversations').insert({
          id: newConvId,
          user_id: userId,
          title,
          agent_type: 'assistant',
          messages: finalMessages,
          pinned: false,
        });

        if (!error) {
          convId = newConvId;
          setActiveConversationId(newConvId);
          setConversations((prev) => [
            {
              id: newConvId,
              title,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              messages: finalMessages,
            },
            ...prev,
          ]);
        }
      } else if (convId && userId) {
        await supabase
          .from('ai_conversations')
          .update({
            messages: finalMessages,
            updated_at: new Date().toISOString(),
          })
          .eq('id', convId);

        setConversations((prev) =>
          prev.map((c) =>
            c.id === convId
              ? { ...c, messages: finalMessages, updated_at: new Date().toISOString() }
              : c
          )
        );
      }

      setUsageCount((prev) => prev + 1);

      if (userId) {
        const now = new Date();
        const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

        const { data: existing } = await supabase
          .from('ai_usage')
          .select('id, queries_used')
          .eq('user_id', userId)
          .gte('period_start', periodStart)
          .limit(1)
          .single();

        if (existing) {
          await supabase
            .from('ai_usage')
            .update({ queries_used: (existing.queries_used || 0) + 1 })
            .eq('id', existing.id);
        } else {
          await supabase.from('ai_usage').insert({
            user_id: userId,
            period_start: periodStart,
            period_end: periodEnd,
            queries_used: 1,
            queries_limit: usageLimit,
            tokens_used: 0,
            tokens_limit: 100000,
            cost_usd: 0,
          });
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      console.error('AI Assistant error:', err);

      const errorMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content:
          'I apologize, but I encountered an error processing your request. Please try again in a moment.',
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsStreaming(false);
      setStreamingContent('');
    }
  }

  /* ---- Input handlers ---- */
  function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    handleSendMessage(trimmed);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <FeatureGate feature="aiAssistant">
      <div className="-m-8 flex flex-col" style={{ height: 'calc(100vh - 4rem)' }}>
        {/* Usage counter bar */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-2.5 border-b border-border bg-deep/50">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-gold" />
            <h2 className="font-display font-bold text-sm text-white">
              AI Assistant
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-24 h-1.5 bg-border rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    usageCount / usageLimit > 0.9
                      ? 'bg-red'
                      : usageCount / usageLimit > 0.7
                      ? 'bg-gold'
                      : 'bg-green'
                  )}
                  style={{ width: `${Math.min((usageCount / usageLimit) * 100, 100)}%` }}
                />
              </div>
              <span className="text-xs text-muted tabular-nums">
                {usageCount} of {usageLimit === 9999 ? 'Unlimited' : usageLimit.toLocaleString()} messages
              </span>
              <span className="text-[10px] text-muted/60 capitalize">
                ({usagePlanLabel})
              </span>
            </div>
          </div>
        </div>

        {/* Main area: sidebar + chat */}
        <div className="flex-1 flex overflow-hidden">
          {/* ========================================================== */}
          {/*  LEFT SIDEBAR (280px)                                       */}
          {/* ========================================================== */}
          <div
            className={cn(
              'flex-shrink-0 bg-deep border-r border-border transition-all duration-300 overflow-hidden flex flex-col',
              sidebarOpen ? 'w-[280px]' : 'w-0'
            )}
          >
            {/* Sidebar header */}
            <div className="p-4 border-b border-border flex items-center justify-between flex-shrink-0">
              <h3 className="text-sm font-semibold text-white font-display">
                Conversations
              </h3>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 rounded-lg text-muted hover:text-white hover:bg-white/5 transition-colors"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            </div>

            {/* New Chat button */}
            <div className="p-3 flex-shrink-0">
              <button
                type="button"
                onClick={handleNewConversation}
                className={cn(
                  'w-full flex items-center justify-center gap-2',
                  'h-9 px-4 rounded-lg text-sm font-semibold',
                  'bg-gold text-black',
                  'hover:brightness-110 hover:shadow-glow',
                  'transition-all duration-200',
                )}
              >
                <Plus className="h-4 w-4" />
                New Conversation
              </button>
            </div>

            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
              {conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center px-3">
                  <MessageSquare className="h-8 w-8 text-muted/30 mb-3" />
                  <p className="text-xs text-muted">No conversations yet</p>
                  <p className="text-[10px] text-muted/60 mt-1">
                    Start a new chat to begin
                  </p>
                </div>
              ) : (
                conversations.map((conv) => (
                  <div
                    key={conv.id}
                    className={cn(
                      'group relative flex items-start gap-2 px-3 py-2.5 rounded-lg cursor-pointer',
                      'transition-colors duration-150',
                      activeConversationId === conv.id
                        ? 'bg-gold/10 border-l-2 border-gold'
                        : 'hover:bg-white/5'
                    )}
                    onClick={() => handleSelectConversation(conv.id)}
                  >
                    <MessageSquare className="h-3.5 w-3.5 text-muted flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate leading-snug">
                        {conv.title}
                      </p>
                      <p className="text-[10px] text-muted mt-0.5">
                        {formatConversationDate(conv.updated_at || conv.created_at)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteConversation(conv.id);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 rounded-md text-muted hover:text-red hover:bg-red/10 transition-all"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Quick Actions section */}
            <div className="flex-shrink-0 border-t border-border">
              <div className="p-3">
                <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-2 px-1">
                  Quick Actions
                </p>
                <div className="grid grid-cols-1 gap-1 max-h-[280px] overflow-y-auto">
                  {QUICK_ACTIONS.map((action, idx) => {
                    const Icon = action.icon;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSendMessage(action.prompt)}
                        disabled={isStreaming}
                        className={cn(
                          'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left',
                          'text-xs text-muted',
                          'hover:bg-gold/5 hover:text-white',
                          'transition-all duration-150 group/qa',
                          isStreaming && 'opacity-50 cursor-not-allowed',
                        )}
                      >
                        <Icon className="h-3.5 w-3.5 text-gold/60 group-hover/qa:text-gold flex-shrink-0 transition-colors" />
                        <span className="truncate">{action.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================== */}
          {/*  MAIN CHAT AREA                                             */}
          {/* ========================================================== */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Toggle sidebar button when collapsed */}
            {!sidebarOpen && (
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="absolute top-14 left-3 z-10 p-2 rounded-lg bg-card border border-border text-muted hover:text-white hover:bg-white/5 transition-colors"
              >
                <PanelLeftOpen className="h-4 w-4" />
              </button>
            )}

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              {isEmpty ? (
                /* ---- Empty state with suggested prompts ---- */
                <div className="flex flex-col items-center justify-center h-full max-w-xl mx-auto text-center">
                  <div className="w-16 h-16 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center mb-6">
                    <Sparkles className="h-7 w-7 text-gold" />
                  </div>

                  <h2 className="font-display font-bold text-xl text-white mb-2">
                    RKV AI Assistant
                  </h2>
                  <p className="text-sm text-muted mb-8 leading-relaxed">
                    Your personal AI advisor for real estate investment decisions.
                    Ask me anything about your portfolio, market conditions, or property management.
                  </p>

                  {/* Suggested prompts grid */}
                  <div className="grid grid-cols-2 gap-3 w-full">
                    {QUICK_ACTIONS.slice(0, 4).map((action, idx) => {
                      const Icon = action.icon;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSendMessage(action.prompt)}
                          className={cn(
                            'flex items-start gap-3 p-4 rounded-xl text-left',
                            'bg-card border border-border',
                            'hover:border-gold/20 hover:bg-gold/5 hover:shadow-glow-sm',
                            'transition-all duration-200 group/prompt',
                          )}
                        >
                          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center group-hover/prompt:bg-gold/20 transition-colors">
                            <Icon className="h-4 w-4 text-gold" />
                          </div>
                          <span className="text-sm text-muted group-hover/prompt:text-white transition-colors leading-snug">
                            {action.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* ---- Message list ---- */
                <div className="space-y-6 max-w-3xl mx-auto">
                  {messages.map((msg) => (
                    <ChatBubble
                      key={msg.id}
                      role={msg.role}
                      content={msg.content}
                      timestamp={msg.timestamp}
                      userInitials={userInitials}
                    />
                  ))}

                  {isStreaming && (
                    <StreamingBubble
                      content={streamingContent}
                      isStreaming={isStreaming}
                    />
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* ---- Input area ---- */}
            <div className="flex-shrink-0 border-t border-border bg-deep/50 px-6 py-4">
              <div className="max-w-3xl mx-auto">
                <div className="relative flex items-end gap-3 bg-card border border-border rounded-xl px-4 py-3 focus-within:border-gold/30 focus-within:shadow-glow-sm transition-all">
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value.slice(0, MAX_CHARS))}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask anything about your properties..."
                    rows={1}
                    className={cn(
                      'flex-1 bg-transparent text-sm text-white placeholder-muted/60',
                      'resize-none outline-none font-body',
                      'min-h-[24px] max-h-[160px]',
                    )}
                    disabled={isStreaming}
                  />

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className={cn(
                        'text-[10px] tabular-nums',
                        input.length > MAX_CHARS * 0.9
                          ? 'text-red'
                          : 'text-muted/40'
                      )}
                    >
                      {input.length}/{MAX_CHARS}
                    </span>

                    <button
                      type="button"
                      onClick={handleSend}
                      disabled={!input.trim() || isStreaming}
                      className={cn(
                        'flex items-center justify-center w-8 h-8 rounded-lg',
                        'transition-all duration-200',
                        input.trim() && !isStreaming
                          ? 'bg-gold text-black hover:brightness-110 hover:shadow-glow'
                          : 'bg-border/50 text-muted/40 cursor-not-allowed'
                      )}
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <p className="text-[10px] text-muted/40 text-center mt-2">
                  AI can make mistakes. Verify important information independently.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </FeatureGate>
  );
}
