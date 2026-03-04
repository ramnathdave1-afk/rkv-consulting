export async function callClaude(messages: { role: string; content: string }[], systemPrompt?: string) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: systemPrompt || 'You are an expert real estate investment analyst for RKV Consulting.',
      messages,
    }),
  })
  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'Unknown error')
    console.error(`[Claude API] ${response.status}: ${errorBody}`)
    return { error: `Claude API error: ${response.status}`, content: null }
  }
  return response.json()
}

export async function streamClaude(messages: { role: string; content: string }[], systemPrompt?: string) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      stream: true,
      system: systemPrompt || 'You are an expert real estate investment analyst for RKV Consulting.',
      messages,
    }),
  })
  return response
}
