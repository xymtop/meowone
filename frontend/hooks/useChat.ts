"use client";

import { useCallback } from "react";
import { useMessageStore } from "@/stores/message";
import { useSessionStore } from "@/stores/session";
import { createSSEConnection } from "@/lib/api";
import type { Card } from "@/types/card";
import type { OutgoingAttachment } from "@/types/attachment";

export function useChat(sessionId: string) {
  const addUserMessage = useMessageStore((s) => s.addUserMessage);
  const setLoading = useMessageStore((s) => s.setLoading);
  const setThinking = useMessageStore((s) => s.setThinking);
  const setStreamingMessageId = useMessageStore((s) => s.setStreamingMessageId);
  const appendStreamDelta = useMessageStore((s) => s.appendStreamDelta);
  const finalizeStream = useMessageStore((s) => s.finalizeStream);
  const addCardMessage = useMessageStore((s) => s.addCardMessage);
  const resetStreaming = useMessageStore((s) => s.resetStreaming);
  const pushToolCall = useMessageStore((s) => s.pushToolCall);
  const settleToolResult = useMessageStore((s) => s.settleToolResult);
  const fetchMessages = useMessageStore((s) => s.fetchMessages);
  const fetchSessions = useSessionStore((s) => s.fetchSessions);
  const startStream = useMessageStore((s) => s.startStream);
  const detachActiveStreamController = useMessageStore((s) => s.detachActiveStreamController);
  const isLoading = useMessageStore((s) => s.isLoading);

  const sendMessage = useCallback(
    (content: string, attachments?: OutgoingAttachment[]) => {
      if (!content.trim() && !(attachments && attachments.length)) return;
      if (!sessionId) return;

      detachActiveStreamController();
      resetStreaming();

      const display =
        content.trim() ||
        (attachments?.length ? `[${attachments.length} attachment(s)]` : "");
      addUserMessage(sessionId, display);
      setLoading(true);
      setThinking(null);

      const controller = createSSEConnection(
        `/api/sessions/${sessionId}/chat`,
        {
          content: content.trim(),
          type: "text",
          attachments: attachments ?? [],
        },
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
            case "tool_call": {
              const toolCallId = data.toolCallId as string;
              const name = data.name as string;
              pushToolCall(toolCallId, name);
              break;
            }
            case "tool_result": {
              const toolCallId = data.toolCallId as string;
              const ok = data.ok as boolean;
              settleToolResult(toolCallId, ok);
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
        () => {
          if (useMessageStore.getState().activeStreamController === controller) {
            useMessageStore.setState({ activeStreamController: null });
          }
          setLoading(false);
          void fetchMessages(sessionId);
          void fetchSessions();
        },
        () => {
          if (useMessageStore.getState().activeStreamController === controller) {
            useMessageStore.setState({ activeStreamController: null });
          }
          setLoading(false);
          setThinking(null);
          void fetchMessages(sessionId);
          void fetchSessions();
        },
        () => {
          if (useMessageStore.getState().activeStreamController !== controller) return;
          useMessageStore.setState({ activeStreamController: null });
          setLoading(false);
          setThinking(null);
          resetStreaming();
        },
      );

      startStream(controller);
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
      pushToolCall,
      settleToolResult,
      fetchMessages,
      fetchSessions,
      startStream,
      detachActiveStreamController,
    ],
  );

  return { sendMessage, isLoading };
}
