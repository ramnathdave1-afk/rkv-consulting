/**
 * ElevenLabs TTS (Text-to-Speech) Wrapper
 *
 * Provides both buffered and streaming TTS using the ElevenLabs v1 API.
 * Default voice: Rachel (21m00Tcm4TlvDq8ikWAM) — professional female.
 * Uses eleven_turbo_v2_5 model for lowest latency.
 *
 * Output format: pcm_16000 (16-bit signed LE, 16kHz mono) for easy
 * conversion to mu-law 8kHz for Twilio.
 */

const ELEVENLABS_API_BASE = 'https://api.elevenlabs.io/v1';

interface TTSOptions {
  apiKey?: string;
  voiceId?: string;
  model?: string;
  stability?: number;
  similarityBoost?: number;
  style?: number;
}

function getConfig(opts?: TTSOptions) {
  return {
    apiKey: opts?.apiKey || process.env.ELEVENLABS_API_KEY!,
    voiceId: opts?.voiceId || process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM',
    model: opts?.model || 'eleven_turbo_v2_5',
    stability: opts?.stability ?? 0.5,
    similarityBoost: opts?.similarityBoost ?? 0.75,
    style: opts?.style ?? 0,
  };
}

/**
 * Convert text to speech and return the full audio buffer.
 * Returns PCM 16-bit signed LE at 16kHz mono.
 */
export async function textToSpeech(
  text: string,
  opts?: TTSOptions,
): Promise<Buffer> {
  const config = getConfig(opts);

  const url = `${ELEVENLABS_API_BASE}/text-to-speech/${config.voiceId}?output_format=pcm_16000`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': config.apiKey,
    },
    body: JSON.stringify({
      text,
      model_id: config.model,
      voice_settings: {
        stability: config.stability,
        similarity_boost: config.similarityBoost,
        style: config.style,
        use_speaker_boost: true,
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'Unknown error');
    throw new Error(`ElevenLabs TTS error ${response.status}: ${errorBody}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Convert text to speech with streaming output.
 * Returns a ReadableStream of PCM 16-bit signed LE at 16kHz mono chunks.
 * Use this for lower time-to-first-byte — start sending audio to Twilio
 * before the full TTS response is generated.
 */
export async function textToSpeechStream(
  text: string,
  opts?: TTSOptions,
): Promise<ReadableStream<Uint8Array>> {
  const config = getConfig(opts);

  const url = `${ELEVENLABS_API_BASE}/text-to-speech/${config.voiceId}/stream?output_format=pcm_16000`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': config.apiKey,
    },
    body: JSON.stringify({
      text,
      model_id: config.model,
      voice_settings: {
        stability: config.stability,
        similarity_boost: config.similarityBoost,
        style: config.style,
        use_speaker_boost: true,
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'Unknown error');
    throw new Error(`ElevenLabs TTS stream error ${response.status}: ${errorBody}`);
  }

  if (!response.body) {
    throw new Error('ElevenLabs returned no response body');
  }

  return response.body;
}

/**
 * Split text into sentence-level chunks for incremental TTS.
 * This allows starting playback sooner by sending the first sentence
 * to TTS while Claude is still generating the rest.
 */
export function splitIntoSentences(text: string): string[] {
  // Split on sentence boundaries while preserving the delimiter
  const sentences = text.match(/[^.!?]+[.!?]+\s*/g);
  if (!sentences) return [text];

  // Filter out empty/whitespace-only entries
  return sentences.map((s) => s.trim()).filter((s) => s.length > 0);
}
