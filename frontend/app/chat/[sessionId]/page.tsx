"use client";

import { useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { MessageList } from "@/components/chat/MessageList";
import { InputBar } from "@/components/layout/InputBar";
import { useChat } from "@/hooks/useChat";
import { useMessageStore } from "@/stores/message";
import { useSessionStore } from "@/stores/session";
import { createSSEConnection } from "@/lib/api";
import type { Card } from "@/types/card";

export default function SessionPage() {
  const params = useParams<{ sessionId: string | string[] }>();
  const sessionId = typeof params.sessionId === "string" ? params.sessionId : params.sessionId?.[0] ?? "";

  const fetchMessages = useMessageStore((s) => s.fetchMessages);
  const setCurrentSession = useSessionStore((s) => s.setCurrentSession);
  const { sendMessage, isLoading } = useChat(sessionId);

  const setLoading = useMessageStore((s) => s.setLoading);
  const setThinking = useMessageStore((s) => s.setThinking);
  const setStreamingMessageId = useMessageStore((s) => s.setStreamingMessageId);
  const appendStreamDelta = useMessageStore((s) => s.appendStreamDelta);
  const finalizeStream = useMessageStore((s) => s.finalizeStream);
  const addCardMessage = useMessageStore((s) => s.addCardMessage);
  const resetStreaming = useMessageStore((s) => s.resetStreaming);

  useEffect(() => {
    setCurrentSession(sessionId);
    fetchMessages(sessionId);
  }, [sessionId, setCurrentSession, fetchMessages]);

  const handleSSEEvents = useCallback(
    (event: { event: string; data: Record<string, unknown> }) => {
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
    [
      sessionId,
      setThinking,
      setStreamingMessageId,
      appendStreamDelta,
      addCardMessage,
      finalizeStream,
      setLoading,
      fetchMessages,
    ],
  );

  const handleCardAction = useCallback(
    (actionId: string, payload: Record<string, unknown>) => {
      resetStreaming();
      setLoading(true);
      createSSEConnection(
        `/api/sessions/${sessionId}/card-action`,
        { cardId: "unknown", actionId, payload },
        handleSSEEvents,
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
    [sessionId, handleSSEEvents, setLoading, setThinking, resetStreaming, fetchMessages],
  );

  const handleFormSubmit = useCallback(
    (cardId: string, data: Record<string, string>) => {
      resetStreaming();
      setLoading(true);
      createSSEConnection(
        `/api/sessions/${sessionId}/card-action`,
        { cardId, actionId: "form_submit", payload: data },
        handleSSEEvents,
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
    [sessionId, handleSSEEvents, setLoading, setThinking, resetStreaming, fetchMessages],
  );

  return (
    <>
      <MessageList
        sessionId={sessionId}
        onCardAction={handleCardAction}
        onFormSubmit={handleFormSubmit}
      />
      <InputBar onSend={sendMessage} disabled={isLoading} />
    </>
  );
}
