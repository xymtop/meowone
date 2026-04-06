"use client";

import ReactMarkdown from "react-markdown";
import type { Message } from "@/types/message";
import type { Card } from "@/types/card";
import { CardRenderer } from "@/components/cards/CardRenderer";

interface AssistantBubbleProps {
  message: Message;
  onCardAction?: (actionId: string, payload: Record<string, unknown>) => void;
  onFormSubmit?: (cardId: string, data: Record<string, string>) => void;
}

export function AssistantBubble({ message, onCardAction, onFormSubmit }: AssistantBubbleProps) {
  const hasText = message.content_type === "text" && message.content;
  const hasCards = (message.content_type === "card" || message.content_type === "cards") && message.card_data;

  return (
    <div className="flex justify-start">
      <div className="max-w-[80%] space-y-2">
        {hasText && (
          <div className="rounded-2xl bg-gray-100 px-4 py-2.5 text-sm">
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown>{message.content!}</ReactMarkdown>
            </div>
          </div>
        )}
        {hasCards && (
          <CardRenderer
            cards={Array.isArray(message.card_data) ? message.card_data : [message.card_data as Card]}
            onAction={onCardAction}
            onFormSubmit={onFormSubmit}
          />
        )}
      </div>
    </div>
  );
}
