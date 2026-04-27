import { query, ORG_ID } from './db';
import { withRetry } from './retry';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

// Pricing per million tokens (as of 2026)
const PRICING = {
  haiku: { input: 0.80, output: 4.00 },
  sonnet: { input: 3.00, output: 15.00 },
} as const;

const MODELS = {
  haiku: 'claude-haiku-4-5-20251001',
  sonnet: 'claude-sonnet-4-6-20250514',
} as const;

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ClaudeResponse {
  content: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  model: string;
}

async function callModel(
  model: 'haiku' | 'sonnet',
  messages: ClaudeMessage[],
  systemPrompt: string,
  opts?: { maxTokens?: number; temperature?: number; jsonMode?: boolean }
): Promise<ClaudeResponse> {
  const maxTokens = opts?.maxTokens ?? (model === 'haiku' ? 2048 : 4096);
  const temperature = opts?.temperature ?? (model === 'haiku' ? 0.3 : 0.7);

  const system = opts?.jsonMode
    ? `${systemPrompt}\n\nIMPORTANT: Respond with valid JSON only. No markdown, no explanation, just JSON.`
    : systemPrompt;

  const data = await withRetry(async () => {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODELS[model],
        max_tokens: maxTokens,
        temperature,
        system,
        messages,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'Unknown error');
      throw new Error(`Claude ${model} API error ${response.status}: ${errorBody}`);
    }

    return response.json();
  });
  const inputTokens = data.usage?.input_tokens ?? 0;
  const outputTokens = data.usage?.output_tokens ?? 0;
  const pricing = PRICING[model];
  const costUsd = (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000;

  const content = data.content?.[0]?.type === 'text'
    ? data.content[0].text
    : '';

  return {
    content,
    inputTokens,
    outputTokens,
    costUsd,
    model: MODELS[model],
  };
}

export async function callHaiku(
  messages: ClaudeMessage[],
  systemPrompt: string,
  opts?: { maxTokens?: number; temperature?: number; jsonMode?: boolean }
): Promise<ClaudeResponse> {
  return callModel('haiku', messages, systemPrompt, opts);
}

export async function callSonnet(
  messages: ClaudeMessage[],
  systemPrompt: string,
  opts?: { maxTokens?: number; temperature?: number; jsonMode?: boolean }
): Promise<ClaudeResponse> {
  return callModel('sonnet', messages, systemPrompt, opts);
}

export async function callHaikuJSON<T = Record<string, unknown>>(
  prompt: string,
  systemPrompt: string,
  opts?: { maxTokens?: number }
): Promise<{ data: T; costUsd: number; tokens: number }> {
  const result = await callHaiku(
    [{ role: 'user', content: prompt }],
    systemPrompt,
    { ...opts, jsonMode: true }
  );
  const data = JSON.parse(result.content) as T;
  return { data, costUsd: result.costUsd, tokens: result.inputTokens + result.outputTokens };
}

export async function callSonnetJSON<T = Record<string, unknown>>(
  prompt: string,
  systemPrompt: string,
  opts?: { maxTokens?: number }
): Promise<{ data: T; costUsd: number; tokens: number }> {
  const result = await callSonnet(
    [{ role: 'user', content: prompt }],
    systemPrompt,
    { ...opts, jsonMode: true }
  );
  const data = JSON.parse(result.content) as T;
  return { data, costUsd: result.costUsd, tokens: result.inputTokens + result.outputTokens };
}

// Log cost to agent_runs table
export async function logAgentCost(
  agentName: string,
  runId: string,
  tokensUsed: number,
  costUsd: number
): Promise<void> {
  await query(
    `UPDATE outreach_agent_runs SET tokens_used = tokens_used + $1, cost_usd = cost_usd + $2 WHERE id = $3`,
    [tokensUsed, costUsd, runId]
  );
  await query(
    `UPDATE outreach_agent_status
     SET total_tokens = total_tokens + $1, total_cost_usd = total_cost_usd + $2,
         tokens_today = tokens_today + $1, cost_today = cost_today + $2
     WHERE org_id = $3 AND agent_name = $4`,
    [tokensUsed, costUsd, ORG_ID, agentName]
  );
}
