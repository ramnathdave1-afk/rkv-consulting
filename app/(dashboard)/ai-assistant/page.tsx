'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { FeatureGate } from '@/components/paywall/FeatureGate';
import { ChatInterface } from '@/components/ai/ChatInterface';
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
/*  Helper: generate a UUID-like id                                    */
/* ------------------------------------------------------------------ */

function generateId(): string {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/* ------------------------------------------------------------------ */
/*  Helper: derive conversation title from first message               */
/* ------------------------------------------------------------------ */

function deriveTitle(content: string): string {
  const cleaned = content.replace(/\n/g, ' ').trim();
  return cleaned.length > 50 ? cleaned.slice(0, 50) + '...' : cleaned;
}

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

export default function AIAssistantPage() {
  const supabase = createClient();
  const { getLimit } = useSubscription();

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

  const abortControllerRef = useRef<AbortController | null>(null);

  /* ---------------------------------------------------------------- */
  /*  Fetch user and conversations on mount                            */
  /* ---------------------------------------------------------------- */

  const fetchInitialData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setUserId(user.id);

    // Get profile for initials
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

    // Fetch conversations
    const { data: convos } = await supabase
      .from('ai_conversations')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (convos) {
      setConversations(convos as Conversation[]);
    }

    // Fetch usage for current month
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
      // Use plan limit
      const limit = getLimit('aiMessagesLimit');
      setUsageLimit(limit === Infinity ? 9999 : limit);
    }
  }, [supabase, getLimit]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  /* ---------------------------------------------------------------- */
  /*  Select a conversation                                            */
  /* ---------------------------------------------------------------- */

  function handleSelectConversation(id: string) {
    const conv = conversations.find((c) => c.id === id);
    if (conv) {
      setActiveConversationId(id);
      setMessages(conv.messages || []);
    }
  }

  /* ---------------------------------------------------------------- */
  /*  New conversation                                                 */
  /* ---------------------------------------------------------------- */

  function handleNewConversation() {
    setActiveConversationId(null);
    setMessages([]);
    setStreamingContent('');
    setIsStreaming(false);
  }

  /* ---------------------------------------------------------------- */
  /*  Delete conversation                                              */
  /* ---------------------------------------------------------------- */

  async function handleDeleteConversation(id: string) {
    await supabase.from('ai_conversations').delete().eq('id', id);

    setConversations((prev) => prev.filter((c) => c.id !== id));

    if (activeConversationId === id) {
      setActiveConversationId(null);
      setMessages([]);
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Build system prompt with user context                            */
  /* ---------------------------------------------------------------- */

  async function buildSystemPrompt(): Promise<string> {
    if (!userId) return 'You are a helpful real estate investment assistant.';

    // Fetch user context in parallel
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

    const totalValue = properties.reduce((s, p) => s + (p.current_value || 0), 0);
    const totalRent = properties.reduce((s, p) => s + (p.monthly_rent || 0), 0);
    const totalExpenses = properties.reduce((s, p) => s + (p.monthly_expenses || 0), 0);

    return `You are RKV AI Assistant, a professional real estate investment advisor for RKV Consulting.

CONTEXT ABOUT THE USER'S PORTFOLIO:
- Properties owned: ${properties.length}
- Total portfolio value: $${totalValue.toLocaleString()}
- Monthly rental income: $${totalRent.toLocaleString()}
- Monthly expenses: $${totalExpenses.toLocaleString()}
- Monthly cash flow: $${(totalRent - totalExpenses).toLocaleString()}
- Active tenants: ${tenants.length}
- Active deals: ${deals.filter((d) => d.stage !== 'closed').length}
- Open maintenance requests: ${maintenance.length}

PROPERTIES:
${properties.map((p) => `- ${p.address}, ${p.city}, ${p.state} (${p.property_type}, ${p.status}) - Value: $${(p.current_value || 0).toLocaleString()}, Rent: $${(p.monthly_rent || 0).toLocaleString()}/mo`).join('\n')}

ACTIVE DEALS:
${deals.map((d) => `- ${d.address} - Asking: $${d.asking_price.toLocaleString()} - Stage: ${d.stage}`).join('\n') || 'None'}

ACTIVE TENANTS:
${tenants.map((t) => `- ${t.first_name} ${t.last_name} - Rent: $${t.monthly_rent.toLocaleString()}/mo - Lease ends: ${t.lease_end || 'N/A'}`).join('\n') || 'None'}

OPEN MAINTENANCE:
${maintenance.map((m) => `- ${m.title} (${m.priority} priority, ${m.category}) - Status: ${m.status}`).join('\n') || 'None'}

GUIDELINES:
- Provide specific, actionable advice based on the user's actual portfolio data.
- Reference specific properties, tenants, or deals when relevant.
- Use financial metrics (cap rate, cash-on-cash, NOI) appropriately.
- Be concise but thorough. Use bullet points for clarity.
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

    // Track whether this is a new conversation
    let convId = activeConversationId;
    const isNewConversation = !convId;

    try {
      // Build system prompt with context
      const systemPrompt = await buildSystemPrompt();

      // Prepare messages for API
      const apiMessages = [
        { role: 'system' as const, content: systemPrompt },
        ...updatedMessages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      ];

      // Abort any previous request
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      // POST to streaming endpoint
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

      // Read streaming response
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
        // Fallback: non-streaming response
        const data = await response.json();
        fullContent = data.content || data.message || 'I apologize, but I was unable to generate a response.';
        setStreamingContent(fullContent);
      }

      // Create assistant message
      const assistantMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: fullContent,
        timestamp: new Date().toISOString(),
      };

      const finalMessages = [...updatedMessages, assistantMessage];
      setMessages(finalMessages);

      // Save or create conversation in Supabase
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

      // Update usage
      setUsageCount((prev) => prev + 1);

      if (userId) {
        const now = new Date();
        const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

        // Try to update existing usage row
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

      // Show error message
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
            {/* Usage counter */}
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
            </div>
          </div>
        </div>

        {/* Chat interface */}
        <div className="flex-1 overflow-hidden">
          <ChatInterface
            conversationId={activeConversationId || undefined}
            onNewConversation={handleNewConversation}
            conversations={conversations.map((c) => ({
              id: c.id,
              title: c.title,
              created_at: c.created_at,
              updated_at: c.updated_at,
            }))}
            messages={messages}
            activeConversationId={activeConversationId}
            onSelectConversation={handleSelectConversation}
            onDeleteConversation={handleDeleteConversation}
            onSendMessage={handleSendMessage}
            isStreaming={isStreaming}
            streamingContent={streamingContent}
            userInitials={userInitials}
          />
        </div>
      </div>
    </FeatureGate>
  );
}
