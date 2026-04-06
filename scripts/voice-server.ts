#!/usr/bin/env npx tsx
/**
 * Voice AI WebSocket Server — Entry Point
 *
 * Starts the standalone WebSocket server that handles Twilio Media Streams
 * for the real-time Voice AI pipeline.
 *
 * Usage:
 *   npx tsx scripts/voice-server.ts
 *
 * Environment variables (loaded from .env.local):
 *   DEEPGRAM_API_KEY      — Deepgram API key for STT
 *   ELEVENLABS_API_KEY    — ElevenLabs API key for TTS
 *   ELEVENLABS_VOICE_ID   — ElevenLabs voice ID (default: Rachel)
 *   ANTHROPIC_API_KEY     — Anthropic API key for Claude
 *   VOICE_AI_WS_PORT      — WebSocket port (default: 8080)
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createVoiceWSServer, shutdownServer } from '../lib/voice-ai/ws-server';

// ---- Load .env.local ----
function loadEnvFile() {
  const envPath = resolve(__dirname, '..', '.env.local');
  try {
    const content = readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) continue;
      const key = trimmed.slice(0, eqIndex).trim();
      const value = trimmed.slice(eqIndex + 1).trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
    console.log('[VoiceServer] Loaded .env.local');
  } catch {
    console.warn('[VoiceServer] Could not load .env.local — using existing environment');
  }
}

loadEnvFile();

// ---- Validate required env vars ----
const required = ['DEEPGRAM_API_KEY', 'ELEVENLABS_API_KEY', 'ANTHROPIC_API_KEY'];
const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error(`[VoiceServer] Missing required environment variables: ${missing.join(', ')}`);
  console.error('[VoiceServer] Add them to .env.local and restart.');
  process.exit(1);
}

// ---- Start server ----
const port = parseInt(process.env.VOICE_AI_WS_PORT || '8080', 10);

const wss = createVoiceWSServer({ port });

console.log(`
====================================
  RKV Consulting Voice AI Server
====================================
  WebSocket:  ws://localhost:${port}
  Deepgram:   ${process.env.DEEPGRAM_API_KEY ? 'configured' : 'MISSING'}
  ElevenLabs: ${process.env.ELEVENLABS_API_KEY ? 'configured' : 'MISSING'}
  Claude:     ${process.env.ANTHROPIC_API_KEY ? 'configured' : 'MISSING'}
====================================
  Waiting for Twilio Media Stream connections...
`);

// ---- Graceful shutdown ----
async function onShutdown(signal: string) {
  console.log(`\n[VoiceServer] Received ${signal} — shutting down...`);
  await shutdownServer(wss);
  process.exit(0);
}

process.on('SIGINT', () => onShutdown('SIGINT'));
process.on('SIGTERM', () => onShutdown('SIGTERM'));

process.on('uncaughtException', (err) => {
  console.error('[VoiceServer] Uncaught exception:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[VoiceServer] Unhandled rejection:', reason);
});
