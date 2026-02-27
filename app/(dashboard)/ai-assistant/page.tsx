'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
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
  Activity,
  Building2,
  Users,
  Globe2,
  ChevronRight,
  Zap,
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

interface PortfolioContext {
  properties: any[];
  tenants: any[];
  deals: any[];
  maintenance: any[];
  totalValue: number;
  totalRent: number;
  totalExpenses: number;
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
/*  Quick Commands for left sidebar                                    */
/* ------------------------------------------------------------------ */

const QUICK_COMMANDS = [
  { label: 'ANALYZE PORTFOLIO', prompt: 'Analyze my portfolio performance and give me key insights on cash flow, equity growth, and areas for improvement.' },
  { label: 'SCAN MARKET CONDITIONS', prompt: 'Scan current market conditions for all areas where I own properties and identify trends.' },
  { label: 'REVIEW DEAL PIPELINE', prompt: 'Review my current deal pipeline and advise on next steps for each deal.' },
  { label: 'CALCULATE TAX EXPOSURE', prompt: 'Review my portfolio and calculate my current tax exposure, including depreciation and potential deductions.' },
  { label: 'IDENTIFY OPPORTUNITIES', prompt: 'Based on my portfolio and current market conditions, identify the best investment opportunities for me.' },
  { label: 'GENERATE MARKET BRIEF', prompt: 'Generate a market trend report for the areas where I own properties, including pricing trends, rent growth, and demand indicators.' },
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
              <div className="px-3 py-1.5 bg-[#0C1018]/80 border-b border-border text-[10px] text-muted uppercase tracking-wider font-mono">
                {codeLang}
              </div>
            )}
            <pre className="px-4 py-3 bg-[#0C1018]/50 overflow-x-auto">
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

  if (isUser) {
    return (
      <div className="flex justify-end group">
        <div className="max-w-[75%]">
          {/* User label */}
          <div className="flex items-center justify-end gap-2 mb-1.5 px-1">
            <span className="font-mono text-[11px] text-muted-deep">{formattedTime}</span>
            <span className="font-body text-[11px] text-gold uppercase tracking-wider">
              {userInitials}
            </span>
          </div>
          {/* User message */}
          <div className="relative">
            <div
              className="px-4 py-3 text-sm leading-relaxed font-body text-[#E2E8F0] rounded-lg"
              style={{
                background: 'rgba(5,150,105,0.07)',
                border: '1px solid rgba(5,150,105,0.25)',
              }}
            >
              {/* Copy button */}
              <button
                type="button"
                onClick={handleCopy}
                className={cn(
                  'absolute -top-2 left-0 opacity-0 group-hover:opacity-100',
                  'transition-opacity duration-150',
                  'p-1.5 rounded-lg bg-[#0C1018] border border-[#161E2A]',
                  'hover:border-gold/20 text-muted hover:text-gold',
                )}
                title="Copy message"
              >
                {copied ? <Check className="h-3 w-3 text-green" /> : <Copy className="h-3 w-3" />}
              </button>
              <p>{content}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Assistant message
  return (
    <div className="group w-full">
      {/* AI label */}
      <div className="flex items-center gap-2 mb-1.5 px-1">
        <span className="font-body text-[11px] text-gold uppercase tracking-wider">
          RKV
        </span>
        <span className="font-mono text-[11px] text-muted-deep">{formattedTime}</span>
      </div>
      {/* AI message */}
      <div className="relative">
        {/* Animated gradient left border */}
        <div
          className="absolute left-0 top-0 bottom-0 w-[2px] rounded-full"
          style={{
            background: 'linear-gradient(180deg, #059669 0%, #0EA5E9 50%, #059669 100%)',
            backgroundSize: '100% 200%',
            animation: 'gradientShift 3s ease infinite',
          }}
        />
        <div className="pl-4 pr-2 py-3 text-sm leading-relaxed font-body text-[#E2E8F0]">
          {/* Copy button */}
          <button
            type="button"
            onClick={handleCopy}
            className={cn(
              'absolute -top-2 right-0 opacity-0 group-hover:opacity-100',
              'transition-opacity duration-150',
              'p-1.5 rounded-lg bg-[#0C1018] border border-[#161E2A]',
              'hover:border-gold/20 text-muted hover:text-gold',
            )}
            title="Copy message"
          >
            {copied ? <Check className="h-3 w-3 text-green" /> : <Copy className="h-3 w-3" />}
          </button>
          <div className="space-y-0">{renderMarkdown(content)}</div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Streaming Response                                                 */
/* ------------------------------------------------------------------ */

function StreamingBubble({ content, isStreaming }: { content: string; isStreaming: boolean }) {
  return (
    <div className="w-full">
      {/* AI label */}
      <div className="flex items-center gap-2 mb-1.5 px-1">
        <span className="font-body text-[11px] text-gold uppercase tracking-wider">
          RKV {content ? '' : '// Processing'}
        </span>
        {!content && (
          <span className="font-mono text-[11px] text-gold animate-pulse">...</span>
        )}
      </div>
      {/* Message body */}
      <div className="relative">
        {/* Animated gradient left border */}
        <div
          className="absolute left-0 top-0 bottom-0 w-[2px] rounded-full"
          style={{
            background: 'linear-gradient(180deg, #059669 0%, #0EA5E9 50%, #059669 100%)',
            backgroundSize: '100% 200%',
            animation: 'gradientShift 3s ease infinite',
          }}
        />
        <div className="pl-4 pr-2 py-3 text-sm leading-relaxed font-body text-[#E2E8F0]">
          {content ? (
            <div className="space-y-0">
              {renderMarkdown(content)}
              {isStreaming && (
                <span className="inline-block w-0.5 h-5 bg-gold animate-pulse ml-0.5 align-middle" />
              )}
            </div>
          ) : isStreaming ? (
            /* Scanning progress bar */
            <div className="space-y-2">
              <div className="h-[2px] w-48 bg-[#161E2A] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-transparent via-gold to-transparent rounded-full"
                  style={{
                    width: '40%',
                    animation: 'scanLine 1.5s ease-in-out infinite',
                  }}
                />
              </div>
            </div>
          ) : null}
        </div>
      </div>
      {!isStreaming && content && (
        <p className="text-xs text-muted mt-1.5 px-5 font-mono">Just now</p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Live Context Panel (Right sidebar)                                 */
/* ------------------------------------------------------------------ */

function LiveContextPanel({ context }: { context: PortfolioContext }) {
  const { properties, tenants, deals, totalValue, totalRent, totalExpenses } = context;
  const cities = Array.from(new Set(properties.map((p: any) => p.city).filter(Boolean)));

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-[#161E2A]">
        <p className="font-body uppercase tracking-wider text-[10px] text-gold">
          LIVE CONTEXT
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-5">
        {/* Portfolio Snapshot */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="h-3 w-3 text-gold" />
            <p className="font-body uppercase tracking-wider text-[10px] text-gold">
              PORTFOLIO
            </p>
          </div>
          <div className="space-y-1.5">
            {properties.length > 0 ? (
              properties.slice(0, 6).map((p: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="font-body text-[10px] text-muted truncate max-w-[130px]">
                    {p.address || p.city || 'Property'}
                  </span>
                  <span className={cn(
                    'font-mono text-[10px]',
                    p.status === 'occupied' ? 'text-green' : p.status === 'vacant' ? 'text-red' : 'text-muted'
                  )}>
                    {(p.status || 'N/A').toUpperCase()}
                  </span>
                </div>
              ))
            ) : (
              <p className="font-body text-[10px] text-muted-deep">No properties loaded</p>
            )}
            {properties.length > 6 && (
              <p className="font-body text-[10px] text-muted-deep">
                +{properties.length - 6} more
              </p>
            )}
          </div>
        </div>

        {/* Market Data */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Globe2 className="h-3 w-3 text-gold" />
            <p className="font-body uppercase tracking-wider text-[10px] text-gold">
              MARKETS
            </p>
          </div>
          <div className="space-y-1.5">
            {cities.length > 0 ? (
              cities.slice(0, 5).map((city: string, idx: number) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="font-body text-[10px] text-muted">
                    {city}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="pulse-dot" />
                    <span className="font-body text-[10px] text-green">Live</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="font-body text-[10px] text-muted-deep">No markets tracked</p>
            )}
          </div>
        </div>

        {/* Tenant Status */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-3 w-3 text-gold" />
            <p className="font-body uppercase tracking-wider text-[10px] text-gold">
              TENANTS
            </p>
          </div>
          <div className="space-y-1.5">
            {tenants.length > 0 ? (
              tenants.slice(0, 5).map((t: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="font-body text-[10px] text-muted truncate max-w-[120px]">
                    {t.first_name} {t.last_name?.[0]}.
                  </span>
                  <span className={cn(
                    'font-mono text-[10px]',
                    t.status === 'active' ? 'text-green' : 'text-red'
                  )}>
                    {(t.status || 'N/A').toUpperCase()}
                  </span>
                </div>
              ))
            ) : (
              <p className="font-body text-[10px] text-muted-deep">No tenants loaded</p>
            )}
          </div>
        </div>

        {/* Financial Context */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-3 w-3 text-gold" />
            <p className="font-body uppercase tracking-wider text-[10px] text-gold">
              FINANCIALS
            </p>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-body text-[10px] text-muted-deep">Portfolio</span>
              <span className="font-mono text-[11px] text-[#E2E8F0]">
                ${totalValue > 0 ? totalValue.toLocaleString() : '--'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-body text-[10px] text-muted-deep">Income/Mo</span>
              <span className="font-mono text-[11px] text-green">
                ${totalRent > 0 ? totalRent.toLocaleString() : '--'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-body text-[10px] text-muted-deep">Expenses/Mo</span>
              <span className="font-mono text-[11px] text-red">
                ${totalExpenses > 0 ? totalExpenses.toLocaleString() : '--'}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-[#161E2A] pt-1.5 mt-1">
              <span className="font-body text-[10px] text-muted-deep">Cash Flow</span>
              <span className={cn(
                'font-mono text-[11px] font-bold',
                (totalRent - totalExpenses) >= 0 ? 'text-green' : 'text-red'
              )}>
                ${(totalRent - totalExpenses) > 0 ? (totalRent - totalExpenses).toLocaleString() : '--'}/mo
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-body text-[10px] text-muted-deep">Deals</span>
              <span className="font-mono text-[11px] text-gold">
                {deals.length} Active
              </span>
            </div>
          </div>
        </div>
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
  const [portfolioContext, setPortfolioContext] = useState<PortfolioContext>({
    properties: [],
    tenants: [],
    deals: [],
    maintenance: [],
    totalValue: 0,
    totalRent: 0,
    totalExpenses: 0,
  });

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

    // Fetch portfolio context for right panel
    const [propertiesRes, tenantsRes, dealsRes, maintenanceRes] = await Promise.all([
      supabase
        .from('properties')
        .select('address, city, state, property_type, current_value, monthly_rent, monthly_expenses, status')
        .eq('user_id', user.id)
        .limit(20),
      supabase
        .from('tenants')
        .select('first_name, last_name, status, monthly_rent, lease_end')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .limit(20),
      supabase
        .from('deals')
        .select('address, asking_price, stage, analysis')
        .eq('user_id', user.id)
        .neq('stage', 'dead')
        .limit(10),
      supabase
        .from('maintenance_requests')
        .select('title, status, priority, category')
        .eq('user_id', user.id)
        .in('status', ['open', 'in_progress', 'scheduled'])
        .limit(10),
    ]);

    const properties = propertiesRes.data || [];
    const tenants = tenantsRes.data || [];
    const deals = dealsRes.data || [];
    const maintenance = maintenanceRes.data || [];

    const totalValue = properties.reduce((s: number, p: Record<string, any>) => s + (p.current_value || 0), 0);
    const totalRent = properties.reduce((s: number, p: Record<string, any>) => s + (p.monthly_rent || 0), 0);
    const totalExpenses = properties.reduce((s: number, p: Record<string, any>) => s + (p.monthly_expenses || 0), 0);

    setPortfolioContext({
      properties,
      tenants,
      deals,
      maintenance,
      totalValue,
      totalRent,
      totalExpenses,
    });
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
      {/* Keyframe animations */}
      <style jsx global>{`
        @keyframes gradientShift {
          0%, 100% { background-position: 0% 0%; }
          50% { background-position: 0% 100%; }
        }
        @keyframes scanLine {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
        @keyframes hexRotate {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="-m-8 flex flex-col bg-[#080B0F]" style={{ height: 'calc(100vh - 4rem)' }}>
        {/* ============================================================ */}
        {/*  TOP BAR - HEADER                                            */}
        {/* ============================================================ */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-2.5 border-b border-[#161E2A] bg-[#0C1018]">
          <div className="flex items-center gap-3">
            {/* Sidebar toggle */}
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-lg text-muted hover:text-gold hover:bg-gold/5 transition-colors"
            >
              {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
            </button>

            <div>
              <h2 className="font-display font-bold text-xl text-[#E2E8F0] leading-none">
                RKV Intelligence
              </h2>
              <p className="font-body text-[11px] text-gold mt-0.5">
                {portfolioContext.properties.length} Properties // {portfolioContext.tenants.length} Tenants // {Array.from(new Set(portfolioContext.properties.map((p: any) => p.city).filter(Boolean))).length} Markets
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Model badge */}
            <div className="flex items-center gap-2 px-3 py-1 rounded-md border border-[#161E2A] bg-[#0C1018]">
              <span className="font-body text-[10px] text-muted uppercase tracking-wider">Claude Sonnet</span>
              <div className="flex items-center gap-1.5">
                <span className="pulse-dot" />
                <span className="font-body text-[10px] text-green">Active</span>
              </div>
            </div>

            {/* Usage meter */}
            <div className="flex items-center gap-2">
              <div className="w-20 h-1.5 bg-[#161E2A] rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    usageCount / usageLimit > 0.9
                      ? 'bg-[#DC2626]'
                      : usageCount / usageLimit > 0.7
                      ? 'bg-gold'
                      : 'bg-[#059669]'
                  )}
                  style={{ width: `${Math.min((usageCount / usageLimit) * 100, 100)}%` }}
                />
              </div>
              <span className="font-mono text-[10px] text-muted tabular-nums">
                {usageCount}/{usageLimit === 9999 ? 'UNL' : usageLimit}
              </span>
              <span className="font-body text-[10px] text-muted-deep">
                ({usagePlanLabel})
              </span>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/*  MAIN 3-PANEL LAYOUT                                         */}
        {/* ============================================================ */}
        <div className="flex-1 flex overflow-hidden">

          {/* ========================================================== */}
          {/*  LEFT PANEL (260px) - SESSION HISTORY + QUICK COMMANDS      */}
          {/* ========================================================== */}
          <div
            className={cn(
              'flex-shrink-0 bg-[#0C1018] border-r border-[#161E2A] transition-all duration-300 overflow-hidden flex flex-col',
              sidebarOpen ? 'w-[260px]' : 'w-0'
            )}
          >
            {/* Session History Header */}
            <div className="px-4 pt-4 pb-2 flex-shrink-0">
              <p className="font-body uppercase tracking-wider text-[10px] text-gold mb-3">
                SESSION HISTORY
              </p>

              {/* Initialize New Session button */}
              <button
                type="button"
                onClick={handleNewConversation}
                className={cn(
                  'w-full flex items-center justify-center gap-2',
                  'h-9 px-4 rounded-md text-[11px] font-body font-semibold uppercase tracking-wider',
                  'bg-transparent text-gold',
                  'border border-gold/40 hover:border-gold hover:bg-gold/5',
                  'transition-all duration-200',
                )}
              >
                <Plus className="h-3.5 w-3.5" />
                New Session
              </button>
            </div>

            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
              {conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center px-3">
                  <MessageSquare className="h-6 w-6 text-[#161E2A] mb-3" />
                  <p className="font-body text-[10px] text-muted-deep">No sessions found</p>
                  <p className="font-body text-[10px] text-muted-deep/60 mt-1">
                    Start a new session to begin
                  </p>
                </div>
              ) : (
                conversations.map((conv) => (
                  <div
                    key={conv.id}
                    className={cn(
                      'group relative flex items-start gap-2.5 px-3 py-2.5 rounded-md cursor-pointer',
                      'transition-all duration-150',
                      activeConversationId === conv.id
                        ? 'bg-gold/8 border-l-2 border-gold'
                        : 'hover:bg-white/3 border-l-2 border-transparent'
                    )}
                    onClick={() => handleSelectConversation(conv.id)}
                  >
                    <ChevronRight className={cn(
                      'h-3 w-3 flex-shrink-0 mt-1 transition-colors',
                      activeConversationId === conv.id ? 'text-gold' : 'text-[#161E2A]'
                    )} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] text-[#E2E8F0] truncate leading-snug font-body">
                        {conv.title}
                      </p>
                      <p className="font-mono text-[11px] text-muted-deep mt-0.5">
                        {formatConversationDate(conv.updated_at || conv.created_at)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteConversation(conv.id);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 rounded-md text-muted hover:text-[#DC2626] hover:bg-[#DC2626]/10 transition-all"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Quick Commands section */}
            <div className="flex-shrink-0 border-t border-[#161E2A]">
              <div className="p-3">
                <p className="font-body uppercase tracking-wider text-[10px] text-gold mb-2 px-1">
                  Quick Actions
                </p>
                <div className="space-y-0.5">
                  {QUICK_COMMANDS.map((cmd, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSendMessage(cmd.prompt)}
                      disabled={isStreaming}
                      className={cn(
                        'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-left',
                        'font-body text-[11px] text-muted',
                        'hover:bg-gold/5 hover:text-gold',
                        'transition-all duration-150',
                        isStreaming && 'opacity-50 cursor-not-allowed',
                      )}
                    >
                      <span className="text-gold/40">&gt;</span>
                      <span className="truncate">{cmd.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================== */}
          {/*  CENTER PANEL - CHAT INTERFACE                               */}
          {/* ========================================================== */}
          <div className="flex-1 flex flex-col min-w-0 bg-[#080B0F]">

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              {isEmpty ? (
                /* ---- Empty state ---- */
                <div className="flex flex-col items-center justify-center h-full max-w-xl mx-auto text-center">
                  {/* Hexagonal shape with rotating border concept */}
                  <div className="relative w-24 h-24 mb-6">
                    {/* Rotating hex outline */}
                    <div
                      className="absolute inset-0 flex items-center justify-center"
                      style={{ animation: 'hexRotate 20s linear infinite' }}
                    >
                      <div
                        className="w-20 h-20"
                        style={{
                          clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                          border: '1px solid rgba(5,150,105,0.3)',
                          background: 'rgba(5,150,105,0.05)',
                        }}
                      />
                    </div>
                    {/* Center icon */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Zap className="h-8 w-8 text-gold" />
                    </div>
                  </div>

                  <h2 className="font-display font-bold text-xl text-[#E2E8F0] mb-2">
                    How can I help?
                  </h2>
                  <p className="font-body text-[11px] text-muted-deep mb-8 leading-relaxed max-w-sm">
                    Real-time AI analysis powered by your portfolio data, market conditions, and financial metrics.
                  </p>

                  {/* Suggested prompts in 2x2 grid with left cyan border */}
                  <div className="grid grid-cols-2 gap-3 w-full">
                    {QUICK_ACTIONS.slice(0, 4).map((action, idx) => {
                      const Icon = action.icon;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSendMessage(action.prompt)}
                          className={cn(
                            'flex items-start gap-3 p-3.5 rounded-md text-left',
                            'bg-transparent',
                            'border-l-2 border-gold/30 border-t border-r border-b border-t-[#161E2A] border-r-[#161E2A] border-b-[#161E2A]',
                            'hover:border-l-gold hover:bg-gold/5',
                            'hover:shadow-[0_0_20px_rgba(5,150,105,0.08)]',
                            'transition-all duration-200 group/prompt',
                          )}
                          style={{ animation: `fadeInUp 0.4s ease ${idx * 0.1}s both` }}
                        >
                          <div className="flex-shrink-0 w-7 h-7 rounded-md bg-gold/10 border border-gold/20 flex items-center justify-center group-hover/prompt:bg-gold/20 transition-colors">
                            <Icon className="h-3.5 w-3.5 text-gold" />
                          </div>
                          <span className="text-[12px] text-muted group-hover/prompt:text-[#E2E8F0] transition-colors leading-snug font-body">
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
            <div className="flex-shrink-0 border-t border-[#161E2A] bg-[#0C1018] px-6 py-4">
              <div className="max-w-3xl mx-auto">
                <div className="relative flex items-end gap-3 bg-transparent border border-[#161E2A] rounded-lg px-4 py-3 focus-within:border-gold/30 focus-within:shadow-[0_0_20px_rgba(5,150,105,0.08)] transition-all">
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value.slice(0, MAX_CHARS))}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask a question..."
                    rows={1}
                    className={cn(
                      'flex-1 bg-transparent text-sm text-[#E2E8F0] font-body',
                      'placeholder:font-body placeholder:text-muted-deep',
                      'resize-none outline-none',
                      'min-h-[24px] max-h-[160px]',
                    )}
                    disabled={isStreaming}
                  />

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className={cn(
                        'font-mono text-[10px] tabular-nums',
                        input.length > MAX_CHARS * 0.9
                          ? 'text-[#DC2626]'
                          : 'text-muted-deep'
                      )}
                    >
                      {input.length}/{MAX_CHARS}
                    </span>

                    {/* Hexagonal send button */}
                    <button
                      type="button"
                      onClick={handleSend}
                      disabled={!input.trim() || isStreaming}
                      className={cn(
                        'flex items-center justify-center w-9 h-9',
                        'transition-all duration-200',
                        input.trim() && !isStreaming
                          ? 'text-[#080B0F] hover:shadow-[0_0_15px_rgba(5,150,105,0.4)]'
                          : 'text-muted-deep cursor-not-allowed'
                      )}
                      style={{
                        clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                        background: input.trim() && !isStreaming
                          ? '#059669'
                          : '#161E2A',
                      }}
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <p className="font-body text-[10px] text-muted-deep text-center mt-2">
                  AI responses may contain inaccuracies. Verify critical data independently.
                </p>
              </div>
            </div>
          </div>

          {/* ========================================================== */}
          {/*  RIGHT PANEL (280px) - LIVE CONTEXT                         */}
          {/* ========================================================== */}
          <div className="hidden xl:flex flex-shrink-0 w-[280px] bg-[#0C1018] border-l border-[#161E2A] flex-col">
            <LiveContextPanel context={portfolioContext} />
          </div>

        </div>
      </div>
    </FeatureGate>
  );
}
