'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, MicOff, Volume2, Loader2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { textToSpeech, playAudioBuffer } from '@/lib/outreach/elevenlabs';

type VoiceState = 'idle' | 'listening' | 'thinking' | 'speaking';

interface Message {
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

const STATE_COLORS: Record<VoiceState, string> = {
  idle: 'bg-[#2a2a2a] hover:bg-[#3a3a3a]',
  listening: 'bg-blue-600',
  thinking: 'bg-amber-500',
  speaking: 'bg-emerald-500',
};

const STATE_LABELS: Record<VoiceState, string> = {
  idle: 'Push to talk',
  listening: 'Listening...',
  thinking: 'Thinking...',
  speaking: 'Speaking...',
};

const MAX_HISTORY = 5;
const AUTO_COLLAPSE_MS = 10_000;
const MAX_RECORD_MS = 10_000;

export default function VoiceAgent() {
  const [state, setState] = useState<VoiceState>('idle');
  const [messages, setMessages] = useState<Message[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');

  const recognitionRef = useRef<any>(null);
  const collapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const spaceHeldRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  // ------------------------------------------------------------------
  // Auto-collapse after inactivity
  // ------------------------------------------------------------------
  const resetCollapseTimer = useCallback(() => {
    if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
    collapseTimerRef.current = setTimeout(() => {
      setExpanded(false);
    }, AUTO_COLLAPSE_MS);
  }, []);

  // ------------------------------------------------------------------
  // Add a message (keep last MAX_HISTORY exchanges = 2*MAX_HISTORY msgs)
  // ------------------------------------------------------------------
  const addMessage = useCallback((role: 'user' | 'assistant', text: string) => {
    setMessages((prev) => {
      const next = [...prev, { role, text, timestamp: new Date() }];
      return next.slice(-(MAX_HISTORY * 2));
    });
  }, []);

  // ------------------------------------------------------------------
  // Send transcript to the voice API and handle TTS response
  // ------------------------------------------------------------------
  const processCommand = useCallback(
    async (transcript: string) => {
      if (!transcript.trim()) {
        setState('idle');
        return;
      }

      addMessage('user', transcript);
      setState('thinking');
      setExpanded(true);
      resetCollapseTimer();

      try {
        abortRef.current = new AbortController();

        // 1. Send transcript to the voice command API
        const res = await fetch('/api/outreach/voice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcript }),
          signal: abortRef.current.signal,
        });

        if (!res.ok) throw new Error(`API error ${res.status}`);

        const data: { action: string; params: Record<string, unknown>; spoken_response: string } =
          await res.json();

        addMessage('assistant', data.spoken_response);

        // 2. Convert response to speech via ElevenLabs
        setState('speaking');

        try {
          const audioBuffer = await textToSpeech(data.spoken_response);
          await playAudioBuffer(audioBuffer);
        } catch {
          // TTS failed — silently fall back (text is still shown)
          console.warn('ElevenLabs TTS unavailable, response shown as text only');
        }

        setState('idle');
        resetCollapseTimer();
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        console.error('Voice command failed:', err);
        addMessage('assistant', 'Sorry, something went wrong. Please try again.');
        setState('idle');
        resetCollapseTimer();
      }
    },
    [addMessage, resetCollapseTimer]
  );

  // ------------------------------------------------------------------
  // Start listening via Web Speech API
  // ------------------------------------------------------------------
  const startListening = useCallback(() => {
    if (state !== 'idle') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      addMessage('assistant', 'Speech recognition is not supported in this browser.');
      return;
    }

    setState('listening');
    setExpanded(true);
    setLiveTranscript('');
    resetCollapseTimer();

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognitionRef.current = recognition;

    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      setLiveTranscript(final || interim);
    };

    recognition.onend = () => {
      const transcript = liveTranscriptRef.current;
      setLiveTranscript('');
      if (transcript) {
        processCommand(transcript);
      } else {
        setState('idle');
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error !== 'no-speech') {
        addMessage('assistant', `Mic error: ${event.error}`);
      }
      setState('idle');
    };

    recognition.start();

    // Auto-stop after MAX_RECORD_MS
    recordTimeoutRef.current = setTimeout(() => {
      stopListening();
    }, MAX_RECORD_MS);
  }, [state, addMessage, resetCollapseTimer, processCommand]);

  // We need a ref for liveTranscript so the onend callback reads the latest value
  const liveTranscriptRef = useRef('');
  useEffect(() => {
    liveTranscriptRef.current = liveTranscript;
  }, [liveTranscript]);

  // ------------------------------------------------------------------
  // Stop listening
  // ------------------------------------------------------------------
  const stopListening = useCallback(() => {
    if (recordTimeoutRef.current) {
      clearTimeout(recordTimeoutRef.current);
      recordTimeoutRef.current = null;
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  }, []);

  // ------------------------------------------------------------------
  // Toggle: click to start / click again to stop
  // ------------------------------------------------------------------
  const handleButtonClick = useCallback(() => {
    if (state === 'idle') {
      startListening();
    } else if (state === 'listening') {
      stopListening();
    }
    // If thinking/speaking, ignore click
  }, [state, startListening, stopListening]);

  // ------------------------------------------------------------------
  // Keyboard: hold Space to talk
  // ------------------------------------------------------------------
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.code === 'Space' &&
        !spaceHeldRef.current &&
        state === 'idle' &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement) &&
        !(e.target instanceof HTMLSelectElement) &&
        !((e.target as HTMLElement).isContentEditable)
      ) {
        e.preventDefault();
        spaceHeldRef.current = true;
        startListening();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && spaceHeldRef.current) {
        spaceHeldRef.current = false;
        if (state === 'listening') {
          stopListening();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [state, startListening, stopListening]);

  // ------------------------------------------------------------------
  // Cleanup on unmount
  // ------------------------------------------------------------------
  useEffect(() => {
    return () => {
      if (recognitionRef.current) recognitionRef.current.abort();
      if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
      if (recordTimeoutRef.current) clearTimeout(recordTimeoutRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Chat bubble */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="w-80 max-h-96 rounded-2xl shadow-2xl border overflow-hidden flex flex-col"
            style={{
              background: 'var(--bg-primary)',
              borderColor: 'var(--border)',
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3 border-b"
              style={{ borderColor: 'var(--border)' }}
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Voice Agent
                </span>
              </div>
              <button
                onClick={() => setExpanded(false)}
                className="p-1 rounded-md transition-colors hover:bg-[var(--bg-hover)]"
              >
                <X size={14} style={{ color: 'var(--text-tertiary)' }} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-none">
              {messages.length === 0 && state === 'idle' && (
                <p className="text-xs text-center py-4" style={{ color: 'var(--text-tertiary)' }}>
                  Press the mic button or hold Space to speak a command.
                </p>
              )}

              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-xl px-3 py-2 text-[13px] leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white rounded-br-sm'
                        : 'rounded-bl-sm'
                    }`}
                    style={
                      msg.role === 'assistant'
                        ? { background: 'var(--bg-secondary)', color: 'var(--text-primary)' }
                        : undefined
                    }
                  >
                    {msg.text}
                  </div>
                </div>
              ))}

              {/* Live transcript while listening */}
              {state === 'listening' && liveTranscript && (
                <div className="flex justify-end">
                  <div className="max-w-[85%] rounded-xl rounded-br-sm px-3 py-2 text-[13px] leading-relaxed bg-blue-600/60 text-white/80 italic">
                    {liveTranscript}
                  </div>
                </div>
              )}

              {/* Thinking indicator */}
              {state === 'thinking' && (
                <div className="flex justify-start">
                  <div
                    className="rounded-xl rounded-bl-sm px-3 py-2 flex items-center gap-2"
                    style={{ background: 'var(--bg-secondary)' }}
                  >
                    <Loader2 size={14} className="animate-spin" style={{ color: 'var(--text-tertiary)' }} />
                    <span className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>
                      Processing...
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Status bar */}
            <div
              className="px-4 py-2 border-t text-[11px] flex items-center gap-2"
              style={{ borderColor: 'var(--border)', color: 'var(--text-tertiary)' }}
            >
              <span>{STATE_LABELS[state]}</span>
              <span className="ml-auto opacity-50">Space to talk</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating mic button */}
      <motion.button
        onClick={handleButtonClick}
        whileTap={{ scale: 0.92 }}
        className={`relative w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-colors ${STATE_COLORS[state]} cursor-pointer`}
        aria-label={STATE_LABELS[state]}
      >
        {/* Pulse ring for listening */}
        {state === 'listening' && (
          <motion.span
            className="absolute inset-0 rounded-full bg-blue-500"
            initial={{ opacity: 0.5, scale: 1 }}
            animate={{ opacity: 0, scale: 1.8 }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeOut' }}
          />
        )}

        {/* Spin animation for thinking */}
        {state === 'thinking' && (
          <motion.span
            className="absolute inset-0 rounded-full border-2 border-amber-300 border-t-transparent"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
        )}

        {/* Wave animation for speaking */}
        {state === 'speaking' && (
          <>
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="absolute inset-0 rounded-full border border-emerald-300/40"
                initial={{ scale: 1, opacity: 0.6 }}
                animate={{ scale: 1.4 + i * 0.2, opacity: 0 }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.3,
                  ease: 'easeOut',
                }}
              />
            ))}
          </>
        )}

        {/* Icon */}
        <span className="relative z-10 text-white">
          {state === 'idle' && <Mic size={22} />}
          {state === 'listening' && <Mic size={22} />}
          {state === 'thinking' && <Loader2 size={22} className="animate-spin" />}
          {state === 'speaking' && <Volume2 size={22} />}
        </span>
      </motion.button>
    </div>
  );
}
