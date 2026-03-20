/**
 * Whisper API Voice Transcription
 * Converts voicemail/phone maintenance requests to text.
 * Uses OpenAI Whisper API for transcription.
 */

const OPENAI_API_URL = 'https://api.openai.com/v1/audio/transcriptions';

export interface TranscriptionResult {
  text: string;
  duration_seconds: number | null;
  language: string;
}

export async function transcribeAudio(
  audioBuffer: ArrayBuffer,
  filename: string = 'audio.mp3',
  language: string = 'en'
): Promise<TranscriptionResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is required for voice transcription');
  }

  const formData = new FormData();
  const blob = new Blob([new Uint8Array(audioBuffer)], { type: getMimeType(filename) });
  formData.append('file', blob, filename);
  formData.append('model', 'whisper-1');
  formData.append('language', language);
  formData.append('response_format', 'verbose_json');

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Whisper API error: ${response.status} — ${error}`);
  }

  const data = await response.json();

  return {
    text: data.text || '',
    duration_seconds: data.duration || null,
    language: data.language || language,
  };
}

function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    mp3: 'audio/mpeg',
    mp4: 'audio/mp4',
    mpeg: 'audio/mpeg',
    mpga: 'audio/mpeg',
    m4a: 'audio/mp4',
    wav: 'audio/wav',
    webm: 'audio/webm',
    ogg: 'audio/ogg',
    flac: 'audio/flac',
  };
  return mimeTypes[ext || ''] || 'audio/mpeg';
}

export async function transcribeFromUrl(audioUrl: string): Promise<TranscriptionResult> {
  const response = await fetch(audioUrl);
  if (!response.ok) throw new Error(`Failed to fetch audio: ${response.status}`);

  const buffer = await response.arrayBuffer();
  const filename = audioUrl.split('/').pop() || 'audio.mp3';
  return transcribeAudio(buffer, filename);
}
