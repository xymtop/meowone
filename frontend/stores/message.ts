import { create } from "zustand";
import type { Message } from "@/types/message";
import type { Card } from "@/types/card";
import { fetchApi } from "@/lib/api";

function mergeCardData(
  existing: Message["card_data"],
  incoming: Card,
): Card | Card[] {
  if (existing == null) return incoming;
  if (Array.isArray(existing)) return [...existing, incoming];
  return [existing as Card, incoming];
}

/** Last row wins; keeps input order for first occurrence of each id. */
function dedupeMessagesById(msgs: Message[]): Message[] {
  const out: Message[] = [];
  const indexById = new Map<string, number>();
  for (const m of msgs) {
    const i = indexById.get(m.id);
    if (i !== undefined) {
      out[i] = m;
    } else {
      indexById.set(m.id, out.length);
      out.push(m);
    }
  }
  return out;
}

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
    const deduped = dedupeMessagesById(msgs);
    set((state) => ({ messages: { ...state.messages, [sessionId]: deduped } }));
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

    set((state) => {
      const prevList = state.messages[sessionId] || [];
      const idx = prevList.findIndex((m) => m.id === messageId);
      let nextList: Message[];
      if (idx >= 0) {
        const prev = prevList[idx];
        nextList = [...prevList];
        nextList[idx] = {
          ...prev,
          ...msg,
          content: streamingContent,
          card_data: prev.card_data ?? msg.card_data,
          created_at: prev.created_at,
          cards_before_text: prev.cards_before_text,
        };
      } else {
        nextList = [...prevList, msg];
      }
      return {
        messages: { ...state.messages, [sessionId]: nextList },
        streamingContent: null,
        streamingMessageId: null,
      };
    });
  },

  addCardMessage: (sessionId: string, messageId: string, card: Card) => {
    const textLen = (get().streamingContent || "").length;
    const cardsBeforeText = textLen === 0;

    const msg: Message = {
      id: messageId,
      session_id: sessionId,
      role: "assistant",
      content_type: "card",
      content: null,
      card_data: card,
      created_at: new Date().toISOString(),
      cards_before_text: cardsBeforeText,
    };
    set((state) => {
      const prevList = state.messages[sessionId] || [];
      const idx = prevList.findIndex((m) => m.id === messageId);
      let nextList: Message[];
      if (idx >= 0) {
        const prev = prevList[idx];
        nextList = [...prevList];
        const merged = mergeCardData(prev.card_data, card);
        nextList[idx] = {
          ...prev,
          ...msg,
          card_data: merged,
          content_type: Array.isArray(merged) || prev.content_type === "cards" ? "cards" : "card",
          content: prev.content,
          cards_before_text: prev.cards_before_text ?? cardsBeforeText,
        };
      } else {
        nextList = [...prevList, msg];
      }
      return { messages: { ...state.messages, [sessionId]: nextList } };
    });
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
