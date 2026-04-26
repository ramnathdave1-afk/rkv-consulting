import { query, ORG_ID } from './db';
import { callHaiku, callSonnet, callHaikuJSON, callSonnetJSON, logAgentCost } from './claude-client';
import type { AgentName, AgentRunResult, AgentInput } from './types';
import type { ClaudeMessage, ClaudeResponse } from './claude-client';

export abstract class BaseAgent {
  abstract name: AgentName;
  abstract description: string;

  protected runId: string | null = null;
  protected startTime: number = 0;
  protected totalTokens: number = 0;
  protected totalCost: number = 0;

  abstract run(input: AgentInput): Promise<AgentRunResult>;

  async execute(input: AgentInput): Promise<AgentRunResult> {
    this.startTime = Date.now();
    this.totalTokens = 0;
    this.totalCost = 0;

    // Create run record
    const runResult = await query<{ id: string }>(
      `INSERT INTO outreach_agent_runs (org_id, agent_name, status, input_summary, campaign_id)
       VALUES ($1, $2, 'running', $3, $4)
       RETURNING id`,
      [ORG_ID, this.name, JSON.stringify(input).slice(0, 500), input.campaign_id || null]
    );
    this.runId = runResult.rows[0].id;

    // Update agent status to running
    await this.updateStatus('running', `Starting: ${JSON.stringify(input).slice(0, 100)}`);

    try {
      const result = await this.run(input);
      const durationMs = Date.now() - this.startTime;

      // Complete run record
      await query(
        `UPDATE outreach_agent_runs
         SET status = 'completed', output_summary = $1, tokens_used = $2,
             cost_usd = $3, duration_ms = $4, completed_at = now()
         WHERE id = $5`,
        [JSON.stringify(result.data || {}).slice(0, 1000), this.totalTokens, this.totalCost, durationMs, this.runId]
      );

      // Update agent status
      await this.updateStatus('idle');
      await this.incrementRunCount();

      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      const durationMs = Date.now() - this.startTime;

      await query(
        `UPDATE outreach_agent_runs
         SET status = 'failed', error_message = $1, duration_ms = $2, completed_at = now()
         WHERE id = $3`,
        [errorMsg.slice(0, 1000), durationMs, this.runId]
      );

      await this.updateStatus('error', undefined, errorMsg);
      await this.log('error', `Agent ${this.name} failed: ${errorMsg}`);

      return { success: false, error: errorMsg };
    }
  }

  protected async updateStatus(
    status: 'idle' | 'running' | 'error',
    currentAction?: string,
    lastError?: string
  ): Promise<void> {
    const setClauses = ['status = $1', 'last_run_at = now()'];
    const params: unknown[] = [status];
    let paramIdx = 2;

    if (currentAction !== undefined) {
      setClauses.push(`current_action = $${paramIdx}`);
      params.push(currentAction);
      paramIdx++;
    } else if (status === 'idle') {
      setClauses.push('current_action = NULL');
    }

    if (lastError !== undefined) {
      setClauses.push(`last_error = $${paramIdx}`);
      params.push(lastError.slice(0, 500));
      paramIdx++;
    }

    params.push(ORG_ID, this.name);
    await query(
      `UPDATE outreach_agent_status SET ${setClauses.join(', ')}
       WHERE org_id = $${paramIdx} AND agent_name = $${paramIdx + 1}`,
      params
    );
  }

  private async incrementRunCount(): Promise<void> {
    await query(
      `UPDATE outreach_agent_status
       SET total_runs = total_runs + 1, runs_today = runs_today + 1
       WHERE org_id = $1 AND agent_name = $2`,
      [ORG_ID, this.name]
    );
  }

  protected async log(
    level: 'info' | 'warning' | 'error' | 'success',
    message: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await query(
      `INSERT INTO outreach_system_log (org_id, agent_name, level, message, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [ORG_ID, this.name, level, message, JSON.stringify(metadata || {})]
    );
  }

  protected async callHaiku(
    messages: ClaudeMessage[],
    systemPrompt: string,
    opts?: { maxTokens?: number; temperature?: number; jsonMode?: boolean }
  ): Promise<ClaudeResponse> {
    const result = await callHaiku(messages, systemPrompt, opts);
    this.totalTokens += result.inputTokens + result.outputTokens;
    this.totalCost += result.costUsd;
    if (this.runId) {
      await logAgentCost(this.name, this.runId, result.inputTokens + result.outputTokens, result.costUsd);
    }
    return result;
  }

  protected async callSonnet(
    messages: ClaudeMessage[],
    systemPrompt: string,
    opts?: { maxTokens?: number; temperature?: number; jsonMode?: boolean }
  ): Promise<ClaudeResponse> {
    const result = await callSonnet(messages, systemPrompt, opts);
    this.totalTokens += result.inputTokens + result.outputTokens;
    this.totalCost += result.costUsd;
    if (this.runId) {
      await logAgentCost(this.name, this.runId, result.inputTokens + result.outputTokens, result.costUsd);
    }
    return result;
  }

  protected async callHaikuJSON<T = Record<string, unknown>>(
    prompt: string,
    systemPrompt: string,
    opts?: { maxTokens?: number }
  ): Promise<{ data: T; costUsd: number; tokens: number }> {
    const result = await callHaikuJSON<T>(prompt, systemPrompt, opts);
    this.totalTokens += result.tokens;
    this.totalCost += result.costUsd;
    if (this.runId) {
      await logAgentCost(this.name, this.runId, result.tokens, result.costUsd);
    }
    return result;
  }

  protected async callSonnetJSON<T = Record<string, unknown>>(
    prompt: string,
    systemPrompt: string,
    opts?: { maxTokens?: number }
  ): Promise<{ data: T; costUsd: number; tokens: number }> {
    const result = await callSonnetJSON<T>(prompt, systemPrompt, opts);
    this.totalTokens += result.tokens;
    this.totalCost += result.costUsd;
    if (this.runId) {
      await logAgentCost(this.name, this.runId, result.tokens, result.costUsd);
    }
    return result;
  }
}
