'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useReducedMotion } from '@/lib/motion';
import {
  BarChart3,
  DollarSign,
  TrendingUp,
  Calculator,
  FileText,
  LineChart,
  Plus,
  MessageSquare,
  Trash2,
  PanelLeftClose,
  PanelLeftOpen,
  Copy,
  Check,
  Activity,
  Building2,
  Users,
  Globe2,
  ChevronRight,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { FeatureGate } from '@/components/paywall/FeatureGate';
import { useSubscription } from '@/hooks/useSubscription';
import { useAnimatedText } from '@/components/ui/animated-text';
import { AIChatRevealPanel } from '@/components/ai/AIChatRevealPanel';

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
/*  Quick Action prompts (ATLAS: 4 outlined pills, hide after first message) */
/* ------------------------------------------------------------------ */

const QUICK_ACTIONS = [
  { icon: BarChart3, label: 'Market Analysis', prompt: 'Run a market analysis for my target markets. Include cap rates, rent growth, absorption, and supply pipeline.' },
  { icon: Calculator, label: 'Deal Underwriting', prompt: 'Underwrite this deal: provide DSCR, cash-on-cash, IRR scenarios, and risk-adjusted return.' },
  { icon: DollarSign, label: 'Cash Flow Model', prompt: 'Build a 10-year cash flow model with base, upside, and downside scenarios. Include debt service and capex reserves.' },
  { icon: TrendingUp, label: 'Opportunity Scan', prompt: 'Scan for opportunities matching my criteria. Prioritize by risk-adjusted return and market momentum.' },
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
/*  AI Input suggestion actions (themed for RKV)                       */
/* ------------------------------------------------------------------ */

const _AI_SUGGESTION_ACTIONS = [
  {
    text: 'Analyze Portfolio',
    icon: Building2,
    colors: {
      icon: 'text-emerald-500',
      border: 'border-emerald-500/30',
      bg: 'bg-emerald-500/10',
    },
  },
  {
    text: 'Market Report',
    icon: LineChart,
    colors: {
      icon: 'text-sky-500',
      border: 'border-sky-500/30',
      bg: 'bg-sky-500/10',
    },
  },
  {
    text: 'Review Deals',
    icon: TrendingUp,
    colors: {
      icon: 'text-amber-500',
      border: 'border-amber-500/30',
      bg: 'bg-amber-500/10',
    },
  },
  {
    text: 'Draft Notice',
    icon: FileText,
    colors: {
      icon: 'text-purple-500',
      border: 'border-purple-500/30',
      bg: 'bg-purple-500/10',
    },
  },
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
            <tr className="border-b border-[#00B4D8]/30">
              {headerRow.map((cell, ci) => (
                <th
                  key={ci}
                  className={cn(
                    'px-3 py-2 text-[11px] font-mono font-semibold text-[#48CAE4] whitespace-nowrap uppercase tracking-wider',
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
              <tr key={ri} className="border-b border-white/[0.06]">
                {row.map((cell, ci) => (
                  <td
                    key={ci}
                    className={cn(
                      'px-3 py-2 text-white/90 font-mono text-[12px]',
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
          <div key={`code-${i}`} className="my-3 rounded-sm overflow-hidden border border-white/[0.08]">
            {codeLang && (
              <div className="px-3 py-1.5 bg-[#0A0A0F] border-b border-white/[0.06] text-[10px] text-[#48CAE4] uppercase tracking-wider font-mono">
                {codeLang}
              </div>
            )}
            <pre className="px-4 py-3 bg-[#0A0A0F] border border-white/[0.06] overflow-x-auto font-mono">
              <code className="text-[12px] text-[#48CAE4] leading-relaxed">
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

    // Headers (mono for high-tech ATLAS look)
    if (line.startsWith('### ')) {
      elements.push(
        <h3 key={i} className="text-xs font-mono font-semibold text-[#48CAE4] mt-4 mb-1.5 uppercase tracking-wider">
          {formatInline(line.slice(4))}
        </h3>
      );
    } else if (line.startsWith('## ')) {
      elements.push(
        <h2 key={i} className="text-sm font-mono font-semibold text-[#48CAE4] mt-4 mb-2 uppercase tracking-wider">
          {formatInline(line.slice(3))}
        </h2>
      );
    } else if (line.startsWith('# ')) {
      elements.push(
        <h1 key={i} className="text-base font-mono font-semibold text-white mt-4 mb-2 tracking-tight">
          {formatInline(line.slice(2))}
        </h1>
      );
    }
    // Bullet points
    else if (line.trimStart().startsWith('- ') || line.trimStart().startsWith('* ')) {
      const indent = line.length - line.trimStart().length;
      const bulletText = line.trimStart().slice(2);
      elements.push(
        <div key={i} className="flex items-start gap-2 my-0.5 font-mono" style={{ marginLeft: `${Math.min(indent, 6) * 8 + 8}px` }}>
          <span className="text-[#00B4D8]/80 mt-1.5 flex-shrink-0">&#62;</span>
          <span>{formatInline(bulletText)}</span>
        </div>
      );
    }
    // Numbered list
    else if (/^\d+\.\s/.test(line.trimStart())) {
      const match = line.trimStart().match(/^(\d+)\.\s(.*)$/);
      if (match) {
        elements.push(
          <div key={i} className="flex items-start gap-2.5 ml-2 my-0.5 font-mono">
            <span className="text-[#48CAE4] font-semibold text-[11px] mt-0.5 w-5 text-right flex-shrink-0 tabular-nums">{match[1]}.</span>
            <span>{formatInline(match[2])}</span>
          </div>
        );
      }
    }
    // Horizontal rule
    else if (/^---+$/.test(line.trim())) {
      elements.push(<hr key={i} className="border-white/[0.08] my-3" />);
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
        <strong key={match.index} className="font-semibold text-[#48CAE4]">
          {match[2]}
        </strong>
      );
    } else if (match[3]) {
      parts.push(
        <code
          key={match.index}
          className="px-1.5 py-0.5 rounded-sm bg-[#00B4D8]/10 border border-[#00B4D8]/20 text-[#48CAE4] text-[0.85em] font-mono"
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

/* eslint-disable-next-line @typescript-eslint/no-unused-vars -- kept for reference, panel uses MessageBubble */
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
          <div className="flex items-center justify-end gap-2 mb-1.5 px-1">
            <span className="font-mono text-[11px] text-white/40">{formattedTime}</span>
            <span className="font-body text-[11px] text-[#00B4D8] uppercase tracking-wider">
              {userInitials}
            </span>
          </div>
          <div className="relative">
            <div
              className="px-4 py-3 text-sm leading-relaxed font-body text-white rounded sharp-lg border-r-2 border-r-transparent group-hover:border-r-[#00B4D8] transition-colors duration-150"
              style={{
                background: 'rgba(0,180,216,0.12)',
                border: '1px solid rgba(0,180,216,0.35)',
              }}
            >
              {/* Copy button */}
              <button
                type="button"
                onClick={handleCopy}
                className={cn(
                  'absolute -top-2 left-0 opacity-0 group-hover:opacity-100',
                  'transition-opacity duration-150',
                  'p-1.5 rounded sharp bg-[#12121A] border border-white/[0.08]',
                  'hover:border-[#00B4D8]/30 text-white/60 hover:text-[#00B4D8]',
                )}
                title="Copy message"
              >
                {copied ? <Check className="h-3 w-3 text-[#52B788]" /> : <Copy className="h-3 w-3" />}
              </button>
              <p>{content}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Assistant message: monospace, terminal-style left accent
  return (
    <div className="group w-full">
      <div className="flex items-center gap-2 mb-1.5 px-1">
        <span className="w-5 h-5 rounded-sm flex items-center justify-center bg-[#00B4D8]/15 border border-[#00B4D8]/50 text-[#48CAE4] font-mono text-[10px] font-bold tracking-wider">
          A
        </span>
        <span className="font-mono text-[10px] text-[#48CAE4] uppercase tracking-[0.2em]">
          AI
        </span>
        <span className="font-mono text-[10px] text-white/30 tabular-nums">{formattedTime}</span>
      </div>
      <div className="relative">
        <div
          className="atlas-bubble font-mono text-[13px] leading-[1.7] tracking-tight text-white/95 rounded-sm border border-white/[0.06] bg-[#08080C] pl-5 pr-4 py-3.5 border-l-2 border-l-[#00B4D8]/70 group-hover:border-l-[#00B4D8] transition-colors duration-150"
        >
          <button
            type="button"
            onClick={handleCopy}
            className={cn(
              'absolute top-2 right-2 opacity-0 group-hover:opacity-100',
              'transition-opacity duration-150',
              'p-1.5 rounded-sm bg-[#0A0A0F] border border-white/[0.08]',
              'hover:border-[#00B4D8]/40 text-white/50 hover:text-[#48CAE4] font-mono text-[10px]',
            )}
            title="Copy message"
          >
            {copied ? <Check className="h-3 w-3 text-[#52B788]" /> : <Copy className="h-3 w-3" />}
          </button>
          <div className="space-y-0 pr-8">{renderMarkdown(content)}</div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Streaming Response                                                 */
/* ------------------------------------------------------------------ */

/* eslint-disable-next-line @typescript-eslint/no-unused-vars -- kept for reference, panel uses StreamingResponse */
function StreamingBubble({ content, isStreaming }: { content: string; isStreaming: boolean }) {
  const animatedContent = useAnimatedText(content, ' ');

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-1.5 px-1">
        <span className="w-5 h-5 rounded-sm flex items-center justify-center bg-[#00B4D8]/15 border border-[#00B4D8]/50 text-[#48CAE4] font-mono text-[10px] font-bold tracking-wider">
          A
        </span>
        <span className="font-mono text-[10px] text-[#48CAE4] uppercase tracking-[0.2em]">
          AI
        </span>
        {isStreaming && !content && (
          <span className="font-mono text-[10px] text-white/40 tracking-wider">PROCESSING</span>
        )}
      </div>
      <div className="relative">
        <div className="atlas-bubble font-mono text-[13px] leading-[1.7] tracking-tight text-white/95 rounded-sm border border-white/[0.06] bg-[#08080C] pl-5 pr-4 py-3.5 border-l-2 border-l-[#00B4D8]/70">
          {content ? (
            <div className="space-y-0 pr-8">
              {renderMarkdown(animatedContent)}
              {isStreaming && (
                <span className="inline-block w-0.5 h-4 bg-[#48CAE4] animate-pulse ml-0.5 align-middle" />
              )}
            </div>
          ) : isStreaming ? (
            <p className="font-mono text-[12px] text-white/40 tracking-wide">Processing...</p>
          ) : null}
        </div>
      </div>
      {!isStreaming && content && (
        <p className="font-mono text-[10px] text-white/30 mt-1.5 pl-5 tabular-nums">Just now</p>
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
      <div className="flex-shrink-0 px-4 py-3 border-b border-[#1e1e1e]">
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
              <span className="font-mono text-[11px] text-[#f5f5f5]">
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
            <div className="flex items-center justify-between border-t border-[#1e1e1e] pt-1.5 mt-1">
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
  const [confidence, setConfidence] = useState(94);
  const [confidenceFlash, setConfidenceFlash] = useState(false);
  const [welcomeText, setWelcomeText] = useState('');
  const [_welcomeDone, setWelcomeDone] = useState(false);
  const reduced = useReducedMotion();
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const _isEmpty = messages.length === 0 && !isStreaming;

  /* ---- Plan-based usage label ---- */
  const usageLabelMap: Record<string, string> = {
    basic: '25/mo',
    pro: '200/mo',
    elite: 'Unlimited',
  };
  const _usagePlanLabel = usageLabelMap[planName] || '200/mo';

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
        .select('address, city, state, property_type, current_value, monthly_rent, mortgage_payment, insurance_annual, tax_annual, hoa_monthly, status')
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
        .select('address, asking_price, status, analysis')
        .eq('user_id', user.id)
        .neq('status', 'dead')
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
    const totalExpenses = properties.reduce((s: number, p: Record<string, any>) => s + (p.mortgage_payment || 0) + (p.insurance_annual || 0)/12 + (p.tax_annual || 0)/12 + (p.hoa_monthly || 0), 0);

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

  useEffect(() => {
    const WELCOME_MSG = 'Institutional-grade real estate analysis. Ask for market analysis, deal underwriting, or opportunity scan.';
    if (welcomeText.length >= WELCOME_MSG.length) {
      setWelcomeDone(true);
      return;
    }
    const t = setTimeout(() => setWelcomeText((prev) => WELCOME_MSG.slice(0, prev.length + 1)), reduced ? 0 : 20);
    return () => clearTimeout(t);
  }, [welcomeText, reduced]);

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
    setWelcomeText('');
    setWelcomeDone(false);
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

  async function _buildSystemPrompt(): Promise<string> {
    if (!userId) return 'You are a helpful real estate investment assistant.';

    const [propertiesRes, dealsRes, tenantsRes, maintenanceRes] = await Promise.all([
      supabase
        .from('properties')
        .select('address, city, state, property_type, current_value, monthly_rent, mortgage_payment, insurance_annual, tax_annual, hoa_monthly, status')
        .eq('user_id', userId)
        .limit(20),
      supabase
        .from('deals')
        .select('address, asking_price, status, analysis')
        .eq('user_id', userId)
        .neq('status', 'dead')
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
    const totalExpenses = properties.reduce((s: number, p: Record<string, any>) => s + (p.mortgage_payment || 0) + (p.insurance_annual || 0)/12 + (p.tax_annual || 0)/12 + (p.hoa_monthly || 0), 0);

    return `You are RKV AI Assistant, a professional real estate investment advisor for RKV Consulting.

CONTEXT ABOUT THE USER'S PORTFOLIO:
- Properties owned: ${properties.length}
- Total portfolio value: $${totalValue.toLocaleString()}
- Monthly rental income: $${totalRent.toLocaleString()}
- Monthly expenses: $${totalExpenses.toLocaleString()}
- Monthly cash flow: $${(totalRent - totalExpenses).toLocaleString()}
- Active tenants: ${tenants.length}
- Active deals: ${deals.filter((d: Record<string, any>) => d.status !== 'closed').length}
- Open maintenance requests: ${maintenance.length}

PROPERTIES:
${properties.map((p: Record<string, any>) => `- ${p.address}, ${p.city}, ${p.state} (${p.property_type}, ${p.status}) - Value: $${(p.current_value || 0).toLocaleString()}, Rent: $${(p.monthly_rent || 0).toLocaleString()}/mo`).join('\n')}

ACTIVE DEALS:
${deals.map((d: Record<string, any>) => `- ${d.address} - Asking: $${d.asking_price.toLocaleString()} - Status: ${d.status}`).join('\n') || 'None'}

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

    let convId = activeConversationId;
    const isNewConversation = !convId;

    try {
      // Use ATLAS system prompt from API (default); only send user/assistant messages
      const apiMessages = updatedMessages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }));

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
      setConfidence((c) => Math.min(99.99, c + 0.01 + Math.random() * 0.02));
      setConfidenceFlash(true);
      setTimeout(() => setConfidenceFlash(false), 300);

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

      <div className="-m-8 flex flex-col bg-[#050508]" style={{ height: 'calc(100vh - 4rem)', backgroundImage: 'linear-gradient(rgba(0,180,216,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(0,180,216,0.02) 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
        {/* ============================================================ */}
        {/*  TOP BAR - HEADER (slide down 300ms)                          */}
        {/* ============================================================ */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="flex-shrink-0 flex items-center justify-between px-6 py-2.5 border-b border-white/[0.08] bg-[#111118]"
        >
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="p-1.5 rounded sharp text-white/60 hover:text-white hover:bg-white/5 transition-colors font-body text-[11px] uppercase tracking-wider"
            >
              Back
            </Link>
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded sharp text-white/60 hover:text-[#00B4D8] hover:bg-[#00B4D8]/5 transition-colors"
            >
              {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
            </button>

            <div className="flex items-center gap-2">
              <span className="font-body font-semibold text-[13px] text-white uppercase tracking-wider">
                AI Assistant
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className={cn('w-1.5 h-1.5 rounded-full', isStreaming ? 'bg-[#E63946]' : 'bg-[#52B788]')} />
              <span className="font-body text-[10px] text-white/60 uppercase tracking-wider">
                {isStreaming ? 'Processing' : 'Online'}
              </span>
            </div>

            <p className="font-mono text-[10px] text-white/40">
              {messages.length} queries this session
            </p>
          </div>

          <div className="flex items-center gap-4">
            <p className="font-mono text-[10px] text-white/40">
              Data loaded: {portfolioContext.properties.length} props, {portfolioContext.tenants.length} tenants
            </p>
            <div className="flex items-center gap-2 px-3 py-1 rounded sharp border border-white/[0.08] bg-[#12121A]">
              <span className="font-body text-[10px] text-white/40 uppercase tracking-wider">Confidence</span>
              <span
                className={cn(
                  'font-mono text-[10px] tabular-nums transition-colors duration-300',
                  confidenceFlash ? 'text-[#48CAE4]' : 'text-[#00B4D8]'
                )}
              >
                {confidence.toFixed(2)}%
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-16 h-1.5 bg-white/10 rounded overflow-hidden">
                <div
                  className={cn('h-full rounded transition-all', usageCount / usageLimit > 0.9 ? 'bg-[#C1121F]' : 'bg-[#00B4D8]')}
                  style={{ width: `${Math.min((usageCount / usageLimit) * 100, 100)}%` }}
                />
              </div>
              <span className="font-mono text-[10px] text-white/40 tabular-nums">
                {usageCount}/{usageLimit === 9999 ? 'UNL' : usageLimit}
              </span>
            </div>
          </div>
        </motion.div>

        {/* ============================================================ */}
        {/*  MAIN 3-PANEL LAYOUT                                         */}
        {/* ============================================================ */}
        <div className="flex-1 flex overflow-hidden">

          {/* ========================================================== */}
          {/*  LEFT PANEL (260px) - SESSION HISTORY + QUICK COMMANDS      */}
          {/* ========================================================== */}
          <div
            className={cn(
              'flex-shrink-0 bg-[#111111] border-r border-[#1e1e1e] transition-all duration-300 overflow-hidden flex flex-col',
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
                  <MessageSquare className="h-6 w-6 text-[#1e1e1e] mb-3" />
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
                      activeConversationId === conv.id ? 'text-gold' : 'text-[#1e1e1e]'
                    )} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] text-[#f5f5f5] truncate leading-snug font-body">
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
            <div className="flex-shrink-0 border-t border-[#1e1e1e]">
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
          {/*  CENTER PANEL - CHAT (AI. Chat. Experience. + canvas)      */}
          {/* ========================================================== */}
          <div className="flex-1 flex flex-col min-w-0 bg-[#080808]">
            <AIChatRevealPanel
              messages={messages}
              streamingContent={streamingContent}
              isStreaming={isStreaming}
              onSendMessage={handleSendMessage}
              onNewConversation={handleNewConversation}
              userInitials={userInitials}
              emptyState={
                <div className="flex flex-wrap justify-center gap-2 w-full">
                  {QUICK_ACTIONS.map((action, idx) => {
                    const Icon = action.icon as React.ComponentType<{ className?: string; strokeWidth?: number }>;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSendMessage(action.prompt)}
                        disabled={isStreaming}
                        className={cn(
                          'flex items-center gap-2 px-4 py-2 rounded-sm border border-white/[0.1]',
                          'text-[12px] font-mono text-white/70 hover:text-[#48CAE4] hover:border-[#00B4D8]/40 hover:bg-[#00B4D8]/5',
                          'transition-colors duration-150 tracking-tight',
                          isStreaming && 'opacity-50 cursor-not-allowed',
                        )}
                      >
                        <Icon className="h-3.5 w-3.5 text-[#00B4D8]" strokeWidth={1.5} />
                        {action.label}
                      </button>
                    );
                  })}
                </div>
              }
            />
          </div>

          {/* ========================================================== */}
          {/*  RIGHT PANEL (280px) - LIVE CONTEXT                         */}
          {/* ========================================================== */}
          <div className="hidden xl:flex flex-shrink-0 w-[280px] bg-[#111111] border-l border-[#1e1e1e] flex-col">
            <LiveContextPanel context={portfolioContext} />
          </div>

        </div>
      </div>
    </FeatureGate>
  );
}
