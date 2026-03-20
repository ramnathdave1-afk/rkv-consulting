/**
 * Pinecone Vector DB Stub
 * FAQ knowledge base, conversation context embeddings, property data.
 * Used for semantic search in the AI leasing agent.
 */

const PINECONE_API_URL = process.env.PINECONE_HOST || 'https://index-xxxxx.svc.environment.pinecone.io';
const OPENAI_EMBEDDINGS_URL = 'https://api.openai.com/v1/embeddings';

export interface VectorRecord {
  id: string;
  values: number[];
  metadata: Record<string, string | number | boolean>;
}

export interface SearchResult {
  id: string;
  score: number;
  metadata: Record<string, string | number | boolean>;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY required for embeddings');

  const response = await fetch(OPENAI_EMBEDDINGS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text,
    }),
  });

  if (!response.ok) throw new Error(`Embedding error: ${response.status}`);
  const data = await response.json();
  return data.data[0].embedding;
}

export async function upsertVectors(
  namespace: string,
  vectors: VectorRecord[]
): Promise<{ upserted_count: number }> {
  const apiKey = process.env.PINECONE_API_KEY;
  if (!apiKey) throw new Error('PINECONE_API_KEY required');

  const response = await fetch(`${PINECONE_API_URL}/vectors/upsert`, {
    method: 'POST',
    headers: {
      'Api-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ vectors, namespace }),
  });

  if (!response.ok) throw new Error(`Pinecone upsert error: ${response.status}`);
  const data = await response.json();
  return { upserted_count: data.upsertedCount || vectors.length };
}

export async function queryVectors(
  namespace: string,
  queryVector: number[],
  topK: number = 5,
  filter?: Record<string, unknown>
): Promise<SearchResult[]> {
  const apiKey = process.env.PINECONE_API_KEY;
  if (!apiKey) throw new Error('PINECONE_API_KEY required');

  const response = await fetch(`${PINECONE_API_URL}/query`, {
    method: 'POST',
    headers: {
      'Api-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      namespace,
      vector: queryVector,
      topK,
      includeMetadata: true,
      filter,
    }),
  });

  if (!response.ok) throw new Error(`Pinecone query error: ${response.status}`);
  const data = await response.json();

  return (data.matches || []).map((m: Record<string, unknown>) => ({
    id: m.id as string,
    score: m.score as number,
    metadata: (m.metadata || {}) as Record<string, string | number | boolean>,
  }));
}

export async function semanticSearch(
  namespace: string,
  query: string,
  topK: number = 5,
  filter?: Record<string, unknown>
): Promise<SearchResult[]> {
  const embedding = await generateEmbedding(query);
  return queryVectors(namespace, embedding, topK, filter);
}

export async function indexFAQ(
  orgId: string,
  faqs: { question: string; answer: string; category: string }[]
): Promise<number> {
  const vectors: VectorRecord[] = [];

  for (const faq of faqs) {
    const embedding = await generateEmbedding(`${faq.question} ${faq.answer}`);
    vectors.push({
      id: `faq_${orgId}_${vectors.length}`,
      values: embedding,
      metadata: {
        org_id: orgId,
        type: 'faq',
        question: faq.question,
        answer: faq.answer,
        category: faq.category,
      },
    });
  }

  const result = await upsertVectors(`org_${orgId}`, vectors);
  return result.upserted_count;
}
