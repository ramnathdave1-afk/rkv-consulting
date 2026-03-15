import { create } from 'zustand';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatContext {
  page?: string;
  siteId?: string;
  vertical?: string;
}

interface ChatState {
  messages: ChatMessage[];
  isStreaming: boolean;
  streamingText: string;
  context: ChatContext;

  addMessage: (role: 'user' | 'assistant', content: string) => void;
  setStreaming: (streaming: boolean) => void;
  setStreamingText: (text: string) => void;
  appendStreamingText: (chunk: string) => void;
  finalizeStreaming: () => void;
  setContext: (context: ChatContext) => void;
  clearHistory: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isStreaming: false,
  streamingText: '',
  context: {},

  addMessage: (role, content) =>
    set((s) => ({
      messages: [
        ...s.messages,
        { id: crypto.randomUUID(), role, content, timestamp: new Date() },
      ],
    })),

  setStreaming: (streaming) => set({ isStreaming: streaming }),
  setStreamingText: (text) => set({ streamingText: text }),
  appendStreamingText: (chunk) => set((s) => ({ streamingText: s.streamingText + chunk })),

  finalizeStreaming: () => {
    const { streamingText } = get();
    if (streamingText) {
      set((s) => ({
        messages: [
          ...s.messages,
          { id: crypto.randomUUID(), role: 'assistant', content: streamingText, timestamp: new Date() },
        ],
        streamingText: '',
        isStreaming: false,
      }));
    }
  },

  setContext: (context) => set({ context }),
  clearHistory: () => set({ messages: [], streamingText: '', isStreaming: false }),
}));
