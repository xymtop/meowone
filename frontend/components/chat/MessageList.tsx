"use client";

import { useShallow } from "zustand/react/shallow";
import { useMessageStore } from "@/stores/message";
import { useAutoScroll } from "@/hooks/useAutoScroll";
import { UserBubble } from "./UserBubble";
import { AssistantBubble } from "./AssistantBubble";
import { StreamingText } from "./StreamingText";
import { ThinkingIndicator } from "./ThinkingIndicator";
import type { Message } from "@/types/message";

/** Stable fallback — `|| []` inside a Zustand selector returns a new array every snapshot and breaks useSyncExternalStore (React 19). */
const EMPTY_MESSAGES: Message[] = [];

interface MessageListProps {
  sessionId: string;
  onCardAction?: (actionId: string, payload: Record<string, unknown>) => void;
  onFormSubmit?: (cardId: string, data: Record<string, string>) => void;
}

export function MessageList({ sessionId, onCardAction, onFormSubmit }: MessageListProps) {
  const { messages, streamingContent, thinkingStep } = useMessageStore(
    useShallow((s) => ({
      messages: s.messages[sessionId] ?? EMPTY_MESSAGES,
      streamingContent: s.streamingContent,
      thinkingStep: s.thinkingStep,
    })),
  );

  const lastMsg = messages[messages.length - 1];
  const bottomRef = useAutoScroll({
    messageCount: messages.length,
    lastMessageId: lastMsg?.id,
    streamingLen: streamingContent?.length ?? 0,
    thinkingStep,
  });

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6">
        {messages.map((msg) =>
          msg.role === "user" ? (
            <UserBubble key={msg.id} message={msg} />
          ) : (
            <AssistantBubble
              key={msg.id}
              message={msg}
              onCardAction={onCardAction}
              onFormSubmit={onFormSubmit}
            />
          ),
        )}
        {thinkingStep && <ThinkingIndicator description={thinkingStep} />}
        {streamingContent !== null && <StreamingText content={streamingContent} />}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
