/**
 * Voice AI WebSocket Server
 *
 * Standalone WebSocket server that handles Twilio Media Stream connections.
 * Runs alongside the Next.js app on a separate port (default 8080).
 *
 * For each incoming Twilio Media Stream connection:
 *   1. Creates a VoiceAIStreamHandler
 *   2. Pipes Twilio audio to Deepgram STT
 *   3. Pipes AI responses through ElevenLabs TTS back to Twilio
 *
 * Start with: npx tsx scripts/voice-server.ts
 */

import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { VoiceAIStreamHandler, VoiceAISessionConfig } from './stream-handler';

export interface VoiceWSServerOptions {
  port: number;
  host?: string;
}

// Track active sessions by stream SID
const activeSessions = new Map<string, VoiceAIStreamHandler>();

/**
 * Create and start the Voice AI WebSocket server.
 */
export function createVoiceWSServer(options: VoiceWSServerOptions): WebSocketServer {
  const { port, host = '0.0.0.0' } = options;

  const wss = new WebSocketServer({ port, host });

  console.log(`[VoiceWS] WebSocket server listening on ws://${host}:${port}`);

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    console.log(`[VoiceWS] New connection from ${req.socket.remoteAddress}`);

    let handler: VoiceAIStreamHandler | null = null;
    let sessionStreamSid = '';

    ws.on('message', async (data) => {
      const message = data.toString();
      let parsed: Record<string, any>;

      try {
        parsed = JSON.parse(message);
      } catch {
        console.warn('[VoiceWS] Received non-JSON message');
        return;
      }

      // Handle Twilio Media Stream events
      switch (parsed.event) {
        case 'connected':
          console.log('[VoiceWS] Twilio Media Stream connected');
          break;

        case 'start': {
          const { streamSid, callSid, customParameters, accountSid } = parsed.start || {};
          sessionStreamSid = streamSid || '';

          console.log(`[VoiceWS] Stream started — callSid: ${callSid}, streamSid: ${streamSid}`);

          // Extract custom parameters passed via TwiML <Parameter>
          const orgId = customParameters?.orgId || '';
          const orgName = customParameters?.orgName || 'RKV Consulting';
          const propertyId = customParameters?.propertyId || '';
          const callerPhone = customParameters?.callerPhone || '';
          const conversationId = customParameters?.conversationId || '';

          const config: VoiceAISessionConfig = {
            twilioWs: ws,
            callSid: callSid || 'unknown',
            streamSid: sessionStreamSid,
            orgId,
            orgName,
            propertyId,
            callerPhone,
            conversationId,
          };

          handler = new VoiceAIStreamHandler(config);

          handler.on('error', (err) => {
            console.error(`[VoiceWS] Session error for ${callSid}:`, err);
          });

          handler.on('end', (info) => {
            console.log(`[VoiceWS] Session ended for ${info.callSid} — ${info.turns} turns`);
            activeSessions.delete(sessionStreamSid);
          });

          handler.on('timeout', () => {
            console.log(`[VoiceWS] Session timed out for ${callSid}`);
          });

          activeSessions.set(sessionStreamSid, handler);

          // Start the handler (connects to Deepgram)
          await handler.start();

          // Send initial greeting via TTS
          await handler.sendGreeting();
          break;
        }

        case 'media':
          // Forward the raw message to the handler
          if (handler) {
            handler.handleTwilioMessage(message);
          }
          break;

        case 'stop':
          console.log(`[VoiceWS] Stream stopped: ${sessionStreamSid}`);
          if (handler) {
            await handler.cleanup();
            handler = null;
          }
          activeSessions.delete(sessionStreamSid);
          break;

        default:
          // Forward any other events to handler
          if (handler) {
            handler.handleTwilioMessage(message);
          }
          break;
      }
    });

    ws.on('close', async () => {
      console.log(`[VoiceWS] Connection closed: ${sessionStreamSid}`);
      if (handler) {
        await handler.cleanup();
        handler = null;
      }
      activeSessions.delete(sessionStreamSid);
    });

    ws.on('error', (err) => {
      console.error(`[VoiceWS] Connection error:`, err);
    });
  });

  wss.on('error', (err) => {
    console.error('[VoiceWS] Server error:', err);
  });

  return wss;
}

/**
 * Get the number of active voice sessions.
 */
export function getActiveSessionCount(): number {
  return activeSessions.size;
}

/**
 * Get a specific session by stream SID.
 */
export function getSession(streamSid: string): VoiceAIStreamHandler | undefined {
  return activeSessions.get(streamSid);
}

/**
 * Gracefully shut down all active sessions and the server.
 */
export async function shutdownServer(wss: WebSocketServer): Promise<void> {
  console.log(`[VoiceWS] Shutting down — ${activeSessions.size} active sessions`);

  // Clean up all sessions
  for (const [sid, handler] of activeSessions) {
    await handler.cleanup().catch(() => {});
    activeSessions.delete(sid);
  }

  // Close the WebSocket server
  return new Promise((resolve) => {
    wss.close(() => {
      console.log('[VoiceWS] Server shut down');
      resolve();
    });
  });
}
