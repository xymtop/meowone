"use client";

import type { A2UIAction } from "@a2ui-sdk/react/0.8";
import { useShallow } from "zustand/react/shallow";
import { useMessageStore } from "@/stores/message";
import { useAutoScroll } from "@/hooks/useAutoScroll";
import { UserBubble } from "./UserBubble";
import { AssistantBubble } from "./AssistantBubble";
import { StreamingText } from "./StreamingText";
import { ThinkingIndicator } from "./ThinkingIndicator";
import { ToolCallStrip } from "./ToolCallStrip";
import type { Message } from "@/types/message";

/** Stable fallback — `|| []` inside a Zustand selector returns a new array every snapshot and breaks useSyncExternalStore (React 19). */
const EMPTY_MESSAGES: Message[] = [];

interface MessageListProps {
  sessionId: string;
  onCardAction?: (actionId: string, payload: Record<string, unknown>) => void;
  onFormSubmit?: (cardId: string, data: Record<string, string>) => void;
  onA2UIAction?: (action: A2UIAction) => void;
}

export function MessageList({ sessionId, onCardAction, onFormSubmit, onA2UIAction }: MessageListProps) {
  const { messages, streamingContent, thinkingStep, streamingTools } = useMessageStore(
    useShallow((s) => ({
      messages: s.messages[sessionId] ?? EMPTY_MESSAGES,
      streamingContent: s.streamingContent,
      thinkingStep: s.thinkingStep,
      streamingTools: s.streamingTools,
    })),
  );

  const lastMsg = messages[messages.length - 1];
  const bottomRef = useAutoScroll({
    messageCount: messages.length,
    lastMessageId: lastMsg?.id,
    streamingLen: (streamingContent?.length ?? 0) + streamingTools.length,
    thinkingStep,
  });

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-background">
      <div className="mx-auto flex max-w-4xl flex-col gap-5 px-4 py-8 md:px-8 md:py-10">
        {messages.map((msg) =>
          msg.role === "user" ? (
            <UserBubble key={msg.id} message={msg} />
          ) : (
            <AssistantBubble
              key={msg.id}
              message={msg}
              onCardAction={onCardAction}
              onFormSubmit={onFormSubmit}
              onA2UIAction={onA2UIAction}
            />
          ),
        )}
        {thinkingStep && <ThinkingIndicator description={thinkingStep} />}
        <ToolCallStrip tools={streamingTools} />
        {streamingContent !== null && (
          <StreamingText content={streamingContent} onA2UIAction={onA2UIAction} />
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
