import { create } from "zustand";
import type { Message } from "@/types/message";
import type { Card } from "@/types/card";
import { fetchApi } from "@/lib/api";

interface MessageState {
  messages: Record<string, Message[]>;
  streamingContent: string | null;
  streamingMessageId: string | null;
  isLoading: boolean;
  thinkingStep: string | null;
  fetchMessages: (sessionId: string) => Promise<void>;
  addUserMessage: (sessionId: string, content: string) => void;
  appendStreamDelta: (content: string) => void;
  setStreamingMessageId: (id: string) => void;
  finalizeStream: (sessionId: string, messageId: string) => void;
  addCardMessage: (sessionId: string, messageId: string, card: Card) => void;
  setThinking: (step: string | null) => void;
  setLoading: (loading: boolean) => void;
  /** Clear streaming state before a new chat request (avoids stale ids from the previous turn). */
  resetStreaming: () => void;
}

export const useMessageStore = create<MessageState>((set, get) => ({
  messages: {},
  streamingContent: null,
  streamingMessageId: null,
  isLoading: false,
  thinkingStep: null,

  fetchMessages: async (sessionId: string) => {
    const msgs = await fetchApi<Message[]>(`/api/sessions/${sessionId}/messages`);
    set((state) => ({ messages: { ...state.messages, [sessionId]: msgs } }));
  },

  addUserMessage: (sessionId: string, content: string) => {
    const msg: Message = {
      id: crypto.randomUUID(),
      session_id: sessionId,
      role: "user",
      content_type: "text",
      content,
      card_data: null,
      created_at: new Date().toISOString(),
    };
    set((state) => ({
      messages: {
        ...state.messages,
        [sessionId]: [...(state.messages[sessionId] || []), msg],
      },
    }));
  },

  appendStreamDelta: (content: string) => {
    set((state) => ({
      streamingContent: (state.streamingContent || "") + content,
    }));
  },

  setStreamingMessageId: (id: string) => {
    set({ streamingMessageId: id, streamingContent: "" });
  },

  finalizeStream: (sessionId: string, messageId: string) => {
    const { streamingContent } = get();
    // Treat null as nothing to flush; empty string is valid (model returned only tool/cards client-side)
    if (streamingContent === null) return;

    const msg: Message = {
      id: messageId,
      session_id: sessionId,
      role: "assistant",
      content_type: "text",
      content: streamingContent,
      card_data: null,
      created_at: new Date().toISOString(),
    };

    set((state) => ({
      messages: {
        ...state.messages,
        [sessionId]: [...(state.messages[sessionId] || []), msg],
      },
      streamingContent: null,
      streamingMessageId: null,
    }));
  },

  addCardMessage: (sessionId: string, messageId: string, card: Card) => {
    const msg: Message = {
      id: messageId,
      session_id: sessionId,
      role: "assistant",
      content_type: "card",
      content: null,
      card_data: card,
      created_at: new Date().toISOString(),
    };
    set((state) => ({
      messages: {
        ...state.messages,
        [sessionId]: [...(state.messages[sessionId] || []), msg],
      },
    }));
  },

  setThinking: (step: string | null) => {
    set({ thinkingStep: step });
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },

  resetStreaming: () => {
    set({ streamingContent: null, streamingMessageId: null, thinkingStep: null });
  },
}));
