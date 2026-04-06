/**
 * Deepgram Real-Time STT (Speech-to-Text) Wrapper
 *
 * Opens a persistent WebSocket to Deepgram's streaming API.
 * Accepts mu-law 8kHz audio chunks from Twilio and emits transcription events.
 *
 * Events:
 *   'transcript' — interim transcript (partial, may change)
 *   'utterance'  — final transcript after speaker pause (endpointing)
 *   'error'      — connection or processing error
 */

import { EventEmitter } from 'events';
import WebSocket from 'ws';

export interface DeepgramSTTOptions {
  apiKey: string;
  model?: string;
  language?: string;
  encoding?: string;
  sampleRate?: number;
  /** Endpointing threshold in ms — how long silence before utterance is final */
  endpointing?: number;
  interimResults?: boolean;
  utteranceEndMs?: number;
}

export class DeepgramSTT extends EventEmitter {
  private ws: WebSocket | null = null;
  private apiKey: string;
  private options: Required<Omit<DeepgramSTTOptions, 'apiKey'>>;
  private isOpen = false;
  private keepAliveInterval: ReturnType<typeof setInterval> | null = null;

  constructor(opts: DeepgramSTTOptions) {
    super();
    this.apiKey = opts.apiKey;
    this.options = {
      model: opts.model ?? 'nova-2',
      language: opts.language ?? 'en-US',
      encoding: opts.encoding ?? 'mulaw',
      sampleRate: opts.sampleRate ?? 8000,
      endpointing: opts.endpointing ?? 700,
      interimResults: opts.interimResults ?? true,
      utteranceEndMs: opts.utteranceEndMs ?? 1000,
    };
  }

  /**
   * Connect to Deepgram's streaming STT WebSocket.
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const params = new URLSearchParams({
        model: this.options.model,
        language: this.options.language,
        encoding: this.options.encoding,
        sample_rate: String(this.options.sampleRate),
        channels: '1',
        endpointing: String(this.options.endpointing),
        interim_results: String(this.options.interimResults),
        utterance_end_ms: String(this.options.utteranceEndMs),
        punctuate: 'true',
        smart_format: 'true',
      });

      const url = `wss://api.deepgram.com/v1/listen?${params.toString()}`;

      this.ws = new WebSocket(url, {
        headers: {
          Authorization: `Token ${this.apiKey}`,
        },
      });

      this.ws.on('open', () => {
        this.isOpen = true;
        console.log('[DeepgramSTT] Connected');

        // Send keep-alive every 10s to prevent timeout
        this.keepAliveInterval = setInterval(() => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'KeepAlive' }));
          }
        }, 10_000);

        resolve();
      });

      this.ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString());
          this.handleMessage(msg);
        } catch (err) {
          console.error('[DeepgramSTT] Failed to parse message:', err);
        }
      });

      this.ws.on('error', (err) => {
        console.error('[DeepgramSTT] WebSocket error:', err);
        this.emit('error', err);
        if (!this.isOpen) reject(err);
      });

      this.ws.on('close', (code, reason) => {
        console.log(`[DeepgramSTT] Connection closed: ${code} ${reason.toString()}`);
        this.isOpen = false;
        this.cleanup();
      });
    });
  }

  /**
   * Handle incoming Deepgram messages.
   */
  private handleMessage(msg: Record<string, unknown>): void {
    const type = msg.type as string;

    if (type === 'Results') {
      const channel = msg.channel as {
        alternatives?: Array<{ transcript: string; confidence: number }>;
      };
      const isFinal = msg.is_final as boolean;
      const speechFinal = msg.speech_final as boolean;
      const transcript = channel?.alternatives?.[0]?.transcript || '';
      const confidence = channel?.alternatives?.[0]?.confidence || 0;

      if (!transcript) return;

      if (isFinal) {
        // This is a final transcript segment
        this.emit('transcript', { transcript, confidence, isFinal: true });

        if (speechFinal) {
          // Speaker has paused — this is a complete utterance
          this.emit('utterance', { transcript, confidence });
        }
      } else {
        // Interim / partial result
        this.emit('transcript', { transcript, confidence, isFinal: false });
      }
    } else if (type === 'UtteranceEnd') {
      // Deepgram's utterance_end event: silence threshold reached
      this.emit('utterance_end');
    } else if (type === 'Metadata') {
      // Connection metadata — ignore
    } else if (type === 'Error') {
      console.error('[DeepgramSTT] API error:', msg);
      this.emit('error', new Error(`Deepgram error: ${JSON.stringify(msg)}`));
    }
  }

  /**
   * Send raw audio bytes to Deepgram for transcription.
   * Expects mu-law 8kHz audio from Twilio.
   */
  sendAudio(audioBuffer: Buffer): void {
    if (!this.isOpen || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }
    this.ws.send(audioBuffer);
  }

  /**
   * Gracefully close the Deepgram connection.
   * Sends a CloseStream message first to get any pending transcripts.
   */
  async close(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      // Tell Deepgram to flush final results
      this.ws.send(JSON.stringify({ type: 'CloseStream' }));

      // Give it a moment to send final results before closing
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          this.ws?.close();
          resolve();
        }, 500);

        this.ws?.once('close', () => {
          clearTimeout(timeout);
          resolve();
        });
      });
    }

    this.cleanup();
  }

  private cleanup(): void {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
    this.isOpen = false;
    this.ws = null;
  }

  get connected(): boolean {
    return this.isOpen;
  }
}
