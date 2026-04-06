/**
 * VoiceAIStreamHandler — Core Voice AI Engine
 *
 * Manages a single voice call session end-to-end:
 *   Twilio Media Stream <-> Deepgram STT <-> Claude AI <-> ElevenLabs TTS <-> Twilio
 *
 * Lifecycle:
 *   1. Twilio opens Media Stream WebSocket, sends 'start' event
 *   2. Audio frames arrive as 'media' events (base64 mu-law 8kHz)
 *   3. Audio is forwarded to Deepgram real-time STT
 *   4. On complete utterance, send to Claude AI (leasing agent or maintenance triage)
 *   5. Claude response -> ElevenLabs TTS -> PCM -> mu-law -> back to Twilio
 *   6. If caller interrupts (speaks during TTS playback), stop current playback
 */

import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { DeepgramSTT } from './stt';
import { textToSpeechStream } from './tts';
import { pcmToMulaw, mulawToBase64, base64ToMulaw, splitIntoFrames } from './audio-utils';
import { splitIntoSentences } from './tts';

// ---- AI modules (imported dynamically to avoid Next.js bundling issues in server script) ----
let classifyIntent: ((message: string) => Promise<string>) | null = null;
let generateLeasingResponse: ((context: any, message: string) => Promise<any>) | null = null;
let callClaude: ((messages: { role: string; content: string }[], systemPrompt?: string) => Promise<any>) | null = null;

async function loadAIModules() {
  if (!classifyIntent) {
    try {
      const leasing = await import('@/lib/ai/leasing-agent');
      classifyIntent = leasing.classifyIntent;
      generateLeasingResponse = leasing.generateLeasingResponse;
    } catch {
      // Running outside Next.js — use relative import fallback
      try {
        const leasing = await import('../ai/leasing-agent');
        classifyIntent = leasing.classifyIntent;
        generateLeasingResponse = leasing.generateLeasingResponse;
      } catch (err) {
        console.warn('[VoiceAI] Could not load leasing-agent module:', err);
      }
    }
  }
  if (!callClaude) {
    try {
      const claude = await import('@/lib/ai/claude');
      callClaude = claude.callClaude;
    } catch {
      try {
        const claude = await import('../ai/claude');
        callClaude = claude.callClaude;
      } catch (err) {
        console.warn('[VoiceAI] Could not load claude module:', err);
      }
    }
  }
}

export interface VoiceAISessionConfig {
  /** Twilio WebSocket connection */
  twilioWs: WebSocket;
  /** Call SID from Twilio */
  callSid: string;
  /** Twilio stream SID */
  streamSid?: string;
  /** Organization ID for context */
  orgId?: string;
  /** Organization name for greeting */
  orgName?: string;
  /** Property ID if known */
  propertyId?: string;
  /** Caller phone number */
  callerPhone?: string;
  /** Conversation ID in database */
  conversationId?: string;
}

interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
}

const INACTIVITY_TIMEOUT_MS = 30_000; // 30 seconds
const FINAL_TIMEOUT_MS = 30_000; // 30 more seconds after "are you still there?"

export class VoiceAIStreamHandler extends EventEmitter {
  private config: VoiceAISessionConfig;
  private deepgram: DeepgramSTT | null = null;
  private conversationHistory: ConversationTurn[] = [];
  private streamSid: string = '';

  // State management
  private isSpeaking = false; // AI is currently outputting TTS
  private isProcessing = false; // AI is generating a response
  private interrupted = false; // Caller interrupted AI speech
  private utteranceBuffer = ''; // Accumulates final transcript segments
  private playbackAbort: AbortController | null = null;

  // Inactivity tracking
  private inactivityTimer: ReturnType<typeof setTimeout> | null = null;
  private sentStillThere = false;

  constructor(config: VoiceAISessionConfig) {
    super();
    this.config = config;
    this.streamSid = config.streamSid || '';
  }

  /**
   * Initialize the voice AI session: connect to Deepgram and set up event handlers.
   */
  async start(): Promise<void> {
    await loadAIModules();

    // Connect to Deepgram STT
    const apiKey = process.env.DEEPGRAM_API_KEY;
    if (!apiKey) {
      console.error('[VoiceAI] DEEPGRAM_API_KEY not set');
      this.emit('error', new Error('DEEPGRAM_API_KEY not configured'));
      return;
    }

    this.deepgram = new DeepgramSTT({ apiKey });

    // Wire up Deepgram events
    this.deepgram.on('transcript', (data) => this.onTranscript(data));
    this.deepgram.on('utterance', (data) => this.onUtterance(data));
    this.deepgram.on('utterance_end', () => this.onUtteranceEnd());
    this.deepgram.on('error', (err) => {
      console.error('[VoiceAI] Deepgram error:', err);
      this.emit('error', err);
    });

    try {
      await this.deepgram.connect();
      console.log(`[VoiceAI] Session started for call ${this.config.callSid}`);
      this.resetInactivityTimer();
    } catch (err) {
      console.error('[VoiceAI] Failed to connect to Deepgram:', err);
      this.emit('error', err);
    }
  }

  /**
   * Handle a Twilio Media Stream message.
   */
  handleTwilioMessage(message: string): void {
    let msg: { event: string; streamSid?: string; media?: { payload: string }; start?: { streamSid: string; callSid: string } };
    try {
      msg = JSON.parse(message);
    } catch {
      return;
    }

    switch (msg.event) {
      case 'start':
        this.streamSid = msg.start?.streamSid || msg.streamSid || '';
        console.log(`[VoiceAI] Media stream started: ${this.streamSid}`);
        break;

      case 'media':
        if (msg.media?.payload) {
          this.onAudioReceived(msg.media.payload);
        }
        break;

      case 'stop':
        console.log(`[VoiceAI] Media stream stopped: ${this.streamSid}`);
        this.cleanup();
        break;

      default:
        break;
    }
  }

  /**
   * Process incoming audio from Twilio (base64 mu-law).
   */
  private onAudioReceived(base64Audio: string): void {
    const audioBuffer = base64ToMulaw(base64Audio);

    // If AI is currently speaking and we receive caller audio, handle interruption
    if (this.isSpeaking) {
      // Only treat as interruption if we're getting substantial audio
      // (Twilio sends silence frames too)
      this.handleInterruption();
    }

    // Forward to Deepgram
    if (this.deepgram?.connected) {
      this.deepgram.sendAudio(audioBuffer);
    }
  }

  /**
   * Handle interim transcript events from Deepgram.
   */
  private onTranscript(data: { transcript: string; confidence: number; isFinal: boolean }): void {
    if (!data.transcript.trim()) return;

    this.resetInactivityTimer();

    if (data.isFinal) {
      // Accumulate final transcript segments
      this.utteranceBuffer += (this.utteranceBuffer ? ' ' : '') + data.transcript.trim();
      console.log(`[VoiceAI] Final segment: "${data.transcript.trim()}"`);
    }

    this.emit('transcript', data);
  }

  /**
   * Handle complete utterance (speaker paused — Deepgram speech_final).
   */
  private onUtterance(data: { transcript: string; confidence: number }): void {
    // Add this last segment to the buffer
    const fullUtterance = this.utteranceBuffer
      ? this.utteranceBuffer
      : data.transcript.trim();

    if (!fullUtterance) return;

    console.log(`[VoiceAI] Complete utterance: "${fullUtterance}"`);
    this.utteranceBuffer = '';
    this.processUtterance(fullUtterance);
  }

  /**
   * Handle Deepgram's utterance_end event (silence threshold).
   * This fires even if speech_final didn't. Flush whatever we have.
   */
  private onUtteranceEnd(): void {
    if (this.utteranceBuffer) {
      const text = this.utteranceBuffer;
      this.utteranceBuffer = '';
      console.log(`[VoiceAI] Utterance end flush: "${text}"`);
      this.processUtterance(text);
    }
  }

  /**
   * Process a complete user utterance: classify intent, generate AI response, speak it.
   */
  private async processUtterance(text: string): Promise<void> {
    if (this.isProcessing) {
      // Queue this — but for simplicity, just append to buffer
      this.utteranceBuffer += (this.utteranceBuffer ? ' ' : '') + text;
      return;
    }

    this.isProcessing = true;
    this.interrupted = false;

    try {
      // Add user message to history
      this.conversationHistory.push({ role: 'user', content: text });

      // Generate AI response
      const responseText = await this.generateResponse(text);

      if (this.interrupted) {
        console.log('[VoiceAI] Response generation interrupted by caller');
        this.isProcessing = false;
        return;
      }

      // Add AI response to history
      this.conversationHistory.push({ role: 'assistant', content: responseText });

      // Speak the response
      await this.speakResponse(responseText);
    } catch (err) {
      console.error('[VoiceAI] Error processing utterance:', err);
      // Fallback response
      await this.speakResponse("I'm sorry, I'm having trouble right now. Let me transfer you to our team.");
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Generate an AI response using Claude via the existing leasing agent or maintenance triage.
   */
  private async generateResponse(userText: string): Promise<string> {
    // Classify intent
    let intent = 'general_inquiry';
    if (classifyIntent) {
      try {
        intent = await classifyIntent(userText);
      } catch (err) {
        console.warn('[VoiceAI] Intent classification failed:', err);
      }
    }

    console.log(`[VoiceAI] Intent: ${intent}`);

    // For maintenance requests, we can use the triage system
    if (intent === 'maintenance_request' && this.config.orgId) {
      try {
        const { triageMaintenanceRequest } = await import('../ai/maintenance-triage').catch(() =>
          import('@/lib/ai/maintenance-triage')
        );
        const triage = await triageMaintenanceRequest(userText);
        return `I understand you have a ${triage.category} issue. I've categorized this as ${triage.priority} priority. ${triage.summary}. ${
          triage.requires_immediate_dispatch
            ? "This sounds urgent. I'm dispatching a technician right away."
            : "I'll create a work order and our maintenance team will follow up with you shortly."
        } Is there anything else I can help with?`;
      } catch {
        // Fall through to general Claude response
      }
    }

    // For leasing-related intents, use the leasing agent if we have org context
    if (
      generateLeasingResponse &&
      this.config.orgId &&
      this.config.conversationId &&
      ['tour_scheduling', 'availability_inquiry', 'lease_question', 'lease_renewal'].includes(intent)
    ) {
      try {
        const result = await generateLeasingResponse(
          {
            orgId: this.config.orgId,
            conversationId: this.config.conversationId,
            participantPhone: this.config.callerPhone || '',
            propertyId: this.config.propertyId,
          },
          userText,
        );
        return result.response;
      } catch {
        // Fall through to general Claude response
      }
    }

    // General response via Claude with conversation history
    if (callClaude) {
      const orgName = this.config.orgName || 'RKV Consulting';
      const systemPrompt = `You are the AI voice assistant for ${orgName} property management. You are speaking on a phone call, so keep responses concise and conversational (2-3 sentences max). You help with:
- Answering questions about available units and lease terms
- Taking maintenance requests and triaging urgency
- Scheduling property showings
- General property management inquiries
- Rent payment questions

Be warm, professional, and helpful. Speak naturally as if on a phone call. Never use bullet points, markdown, or formatting — just natural spoken language. If you can't help with something, offer to transfer to a human team member.`;

      const messages = this.conversationHistory.map((turn) => ({
        role: turn.role,
        content: turn.content,
      }));

      try {
        const result = await callClaude(messages, systemPrompt);
        const aiText = Array.isArray(result?.content)
          ? result.content.map((block: { text?: string }) => block.text || '').join('')
          : typeof result?.content === 'string'
            ? result.content
            : '';

        if (aiText) return aiText;
      } catch (err) {
        console.error('[VoiceAI] Claude API error:', err);
      }
    }

    // Last resort fallback
    return "I appreciate your question. Let me connect you with a team member who can help. Please hold for a moment.";
  }

  /**
   * Convert text to speech and stream audio back to Twilio.
   */
  private async speakResponse(text: string): Promise<void> {
    if (!text.trim()) return;

    this.isSpeaking = true;
    this.playbackAbort = new AbortController();

    try {
      // Split into sentences for lower latency — send first sentence to TTS
      // while the rest are queued
      const sentences = splitIntoSentences(text);

      for (const sentence of sentences) {
        if (this.interrupted || this.playbackAbort.signal.aborted) {
          console.log('[VoiceAI] Playback interrupted');
          break;
        }

        try {
          const pcmStream = await textToSpeechStream(sentence);
          await this.streamPcmToTwilio(pcmStream);
        } catch (err) {
          console.error('[VoiceAI] TTS error for sentence:', err);
          // Continue with next sentence
        }
      }
    } catch (err) {
      console.error('[VoiceAI] TTS pipeline error:', err);
    } finally {
      this.isSpeaking = false;
      this.playbackAbort = null;
    }
  }

  /**
   * Read PCM chunks from the TTS stream, convert to mu-law, and send to Twilio.
   */
  private async streamPcmToTwilio(pcmStream: ReadableStream<Uint8Array>): Promise<void> {
    const reader = pcmStream.getReader();
    let pcmAccumulator = Buffer.alloc(0);

    try {
      while (true) {
        if (this.interrupted || this.playbackAbort?.signal.aborted) break;

        const { done, value } = await reader.read();
        if (done) break;

        // Accumulate PCM data
        pcmAccumulator = Buffer.concat([pcmAccumulator, Buffer.from(value)]);

        // Process in chunks — convert when we have at least 3200 bytes
        // (100ms at 16kHz 16-bit = 3200 bytes -> 800 bytes mu-law at 8kHz)
        while (pcmAccumulator.length >= 3200) {
          if (this.interrupted || this.playbackAbort?.signal.aborted) break;

          const chunk = pcmAccumulator.subarray(0, 3200);
          pcmAccumulator = pcmAccumulator.subarray(3200);

          // PCM 16kHz -> mu-law 8kHz
          const mulaw = pcmToMulaw(Buffer.from(chunk), 16000);

          // Split into 160-byte frames (20ms each) and send
          const frames = splitIntoFrames(mulaw, 160);
          for (const frame of frames) {
            if (this.interrupted) break;
            this.sendAudioToTwilio(frame);
          }
        }
      }

      // Flush remaining PCM data
      if (pcmAccumulator.length > 0 && !this.interrupted) {
        const mulaw = pcmToMulaw(pcmAccumulator, 16000);
        const frames = splitIntoFrames(mulaw, 160);
        for (const frame of frames) {
          if (this.interrupted) break;
          this.sendAudioToTwilio(frame);
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Send a mu-law audio frame to Twilio via the Media Stream WebSocket.
   */
  private sendAudioToTwilio(mulawFrame: Buffer): void {
    if (!this.streamSid) return;
    if (this.config.twilioWs.readyState !== WebSocket.OPEN) return;

    const message = JSON.stringify({
      event: 'media',
      streamSid: this.streamSid,
      media: {
        payload: mulawToBase64(mulawFrame),
      },
    });

    this.config.twilioWs.send(message);
  }

  /**
   * Handle caller interruption — stop current TTS playback.
   */
  private handleInterruption(): void {
    if (!this.isSpeaking) return;

    this.interrupted = true;
    this.playbackAbort?.abort();

    // Send clear message to Twilio to stop buffered audio
    if (this.streamSid && this.config.twilioWs.readyState === WebSocket.OPEN) {
      this.config.twilioWs.send(JSON.stringify({
        event: 'clear',
        streamSid: this.streamSid,
      }));
    }

    console.log('[VoiceAI] Interruption: stopped TTS playback');
  }

  /**
   * Reset the inactivity timer. Called whenever we receive speech.
   */
  private resetInactivityTimer(): void {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
    }
    this.sentStillThere = false;

    this.inactivityTimer = setTimeout(() => {
      if (!this.sentStillThere) {
        this.sentStillThere = true;
        console.log('[VoiceAI] Inactivity detected — prompting caller');
        this.speakResponse('Are you still there? I\'m here to help if you have any questions.');

        // Set final timeout
        this.inactivityTimer = setTimeout(() => {
          console.log('[VoiceAI] Final inactivity timeout — ending call');
          this.speakResponse('It seems like you may have stepped away. Thank you for calling. Goodbye!')
            .then(() => {
              this.emit('timeout');
              this.cleanup();
            });
        }, FINAL_TIMEOUT_MS);
      }
    }, INACTIVITY_TIMEOUT_MS);
  }

  /**
   * Send the initial greeting to the caller via TTS.
   */
  async sendGreeting(): Promise<void> {
    const orgName = this.config.orgName || 'RKV Consulting';
    const greeting = `Hi, this is the ${orgName} AI assistant. How can I help you today?`;

    this.conversationHistory.push({ role: 'assistant', content: greeting });
    await this.speakResponse(greeting);
  }

  /**
   * Clean up all resources for this session.
   */
  async cleanup(): Promise<void> {
    console.log(`[VoiceAI] Cleaning up session for call ${this.config.callSid}`);

    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }

    this.playbackAbort?.abort();

    if (this.deepgram) {
      await this.deepgram.close().catch(() => {});
      this.deepgram = null;
    }

    this.emit('end', {
      callSid: this.config.callSid,
      turns: this.conversationHistory.length,
    });
  }

  /**
   * Get the conversation history for logging/debugging.
   */
  getHistory(): ConversationTurn[] {
    return [...this.conversationHistory];
  }
}
