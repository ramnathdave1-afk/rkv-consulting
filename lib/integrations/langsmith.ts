/**
 * LangSmith Prompt Management Stub
 * Prompt versioning, A/B testing, and evaluation traces.
 */

const LANGSMITH_API_URL = 'https://api.smith.langchain.com/api/v1';

function langsmithHeaders() {
  return {
    'X-API-Key': process.env.LANGSMITH_API_KEY || '',
    'Content-Type': 'application/json',
  };
}

export interface PromptVersion {
  id: string;
  name: string;
  version: number;
  template: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface TraceRun {
  id: string;
  name: string;
  run_type: 'llm' | 'chain' | 'tool';
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown> | null;
  error: string | null;
  start_time: string;
  end_time: string | null;
  latency_ms: number | null;
  feedback_scores: Record<string, number>;
}

export async function logTrace(params: {
  name: string;
  run_type: 'llm' | 'chain' | 'tool';
  inputs: Record<string, unknown>;
  outputs?: Record<string, unknown>;
  error?: string;
  start_time: string;
  end_time?: string;
  extra?: Record<string, unknown>;
}): Promise<{ id: string }> {
  const projectName = process.env.LANGSMITH_PROJECT || 'meridiannode-pm';

  const response = await fetch(`${LANGSMITH_API_URL}/runs`, {
    method: 'POST',
    headers: langsmithHeaders(),
    body: JSON.stringify({
      name: params.name,
      run_type: params.run_type,
      inputs: params.inputs,
      outputs: params.outputs,
      error: params.error,
      start_time: params.start_time,
      end_time: params.end_time,
      extra: params.extra,
      session_name: projectName,
    }),
  });

  if (!response.ok) {
    // LangSmith logging is non-critical — don't throw
    console.error(`LangSmith trace error: ${response.status}`);
    return { id: '' };
  }

  const data = await response.json();
  return { id: data.id || '' };
}

export async function addFeedback(runId: string, key: string, score: number, comment?: string): Promise<void> {
  await fetch(`${LANGSMITH_API_URL}/feedback`, {
    method: 'POST',
    headers: langsmithHeaders(),
    body: JSON.stringify({
      run_id: runId,
      key,
      score,
      comment,
    }),
  });
}

export async function getPrompt(promptName: string): Promise<PromptVersion | null> {
  const response = await fetch(
    `${LANGSMITH_API_URL}/prompts/${encodeURIComponent(promptName)}`,
    { headers: langsmithHeaders() }
  );

  if (!response.ok) return null;
  const data = await response.json();
  return {
    id: data.id,
    name: data.name,
    version: data.version,
    template: data.template,
    metadata: data.metadata || {},
    created_at: data.created_at,
  };
}
