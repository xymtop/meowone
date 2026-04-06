"use client";

import type { A2UIAction } from "@a2ui-sdk/react/0.8";
import type { Message } from "@/types/message";
import type { Card } from "@/types/card";
import { CardRenderer } from "@/components/cards/CardRenderer";
import { MarkdownContent } from "@/components/markdown/MarkdownContent";

interface AssistantBubbleProps {
  message: Message;
  onCardAction?: (actionId: string, payload: Record<string, unknown>) => void;
  onFormSubmit?: (cardId: string, data: Record<string, string>) => void;
  onA2UIAction?: (action: A2UIAction) => void;
}

export function AssistantBubble({
  message,
  onCardAction,
  onFormSubmit,
  onA2UIAction,
}: AssistantBubbleProps) {
  const hasText = Boolean(message.content?.trim());
  const hasCards = Boolean(message.card_data);
  const cardsFirst = message.cards_before_text === true;

  const textBlock = hasText && (
    <div className="rounded-2xl border border-gray-100 bg-gray-50/90 px-5 py-3.5 text-[15px] leading-relaxed text-gray-900 shadow-sm md:text-base md:leading-relaxed">
      <MarkdownContent onA2UIAction={onA2UIAction}>
        {message.content!}
      </MarkdownContent>
    </div>
  );

  const cardsBlock = hasCards && (
    <CardRenderer
      cards={Array.isArray(message.card_data) ? message.card_data : [message.card_data as Card]}
      onAction={onCardAction}
      onFormSubmit={onFormSubmit}
    />
  );

  return (
    <div className="flex justify-start">
      <div className="max-w-[min(92%,48rem)] space-y-3">
        {cardsFirst ? (
          <>
            {cardsBlock}
            {textBlock}
          </>
        ) : (
          <>
            {textBlock}
            {cardsBlock}
          </>
        )}
      </div>
    </div>
  );
}
