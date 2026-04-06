"use client";

import { useCallback, useRef } from "react";
import { useMessageStore } from "@/stores/message";
import { createSSEConnection } from "@/lib/api";
import type { Card } from "@/types/card";

export function useChat(sessionId: string) {
  const controllerRef = useRef<AbortController | null>(null);
  const addUserMessage = useMessageStore((s) => s.addUserMessage);
  const setLoading = useMessageStore((s) => s.setLoading);
  const setThinking = useMessageStore((s) => s.setThinking);
  const setStreamingMessageId = useMessageStore((s) => s.setStreamingMessageId);
  const appendStreamDelta = useMessageStore((s) => s.appendStreamDelta);
  const finalizeStream = useMessageStore((s) => s.finalizeStream);
  const addCardMessage = useMessageStore((s) => s.addCardMessage);
  const resetStreaming = useMessageStore((s) => s.resetStreaming);
  const fetchMessages = useMessageStore((s) => s.fetchMessages);
  const isLoading = useMessageStore((s) => s.isLoading);

  const sendMessage = useCallback(
    (content: string) => {
      if (!content.trim() || !sessionId) return;

      controllerRef.current?.abort();
      resetStreaming();

      addUserMessage(sessionId, content);
      setLoading(true);
      setThinking(null);


      controllerRef.current = createSSEConnection(
        `/api/sessions/${sessionId}/chat`,
        { content, type: "text" },
        (event) => {
          const { data } = event;
          switch (event.event) {
            case "thinking":
              setThinking(data.description as string);
              break;
            case "delta": {
              const messageId = data.messageId as string;
              const deltaContent = data.content as string;
              const done = data.done as boolean;
              if (!useMessageStore.getState().streamingMessageId) {
                setStreamingMessageId(messageId);
              }
              appendStreamDelta(deltaContent);
              if (done) setThinking(null);
              break;
            }
            case "card":
              addCardMessage(sessionId, data.messageId as string, data.card as Card);
              break;
            case "done":
              finalizeStream(sessionId, data.messageId as string);
              setLoading(false);
              setThinking(null);
              void fetchMessages(sessionId);
              break;
            case "error":
              setLoading(false);
              setThinking(null);
              void fetchMessages(sessionId);
              break;
          }
        },
        () => {
          setLoading(false);
          void fetchMessages(sessionId);
        },
        () => {
          setLoading(false);
          setThinking(null);
          void fetchMessages(sessionId);
        },
      );
    },
    [
      sessionId,
      addUserMessage,
      setLoading,
      setThinking,
      setStreamingMessageId,
      appendStreamDelta,
      finalizeStream,
      addCardMessage,
      resetStreaming,
      fetchMessages,
    ],
  );

  return { sendMessage, isLoading };
}
