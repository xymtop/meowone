"use client";

import { useEffect, useCallback } from "react";
import type { A2UIAction } from "@a2ui-sdk/react/0.8";
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
  const fetchSessions = useSessionStore((s) => s.fetchSessions);
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
          void fetchSessions();
          break;
        case "error":
          setLoading(false);
          setThinking(null);
          void fetchMessages(sessionId);
          void fetchSessions();
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
      fetchSessions,
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

  const handleA2UIAction = useCallback(
    (action: A2UIAction) => {
      const line = `[A2UI 用户操作] ${JSON.stringify(action)}`;
      sendMessage(line);
    },
    [sendMessage],
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
        onA2UIAction={handleA2UIAction}
      />
      <InputBar onSend={sendMessage} disabled={isLoading} />
    </>
  );
}
