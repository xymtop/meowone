"use client";

import type { ReactNode } from "react";
import type { A2UIAction } from "@a2ui-sdk/react/0.8";
import type { Message } from "@/types/message";
import type { Card } from "@/types/card";
import { CardRenderer } from "@/components/cards/CardRenderer";
import { MarkdownContent } from "@/components/markdown/MarkdownContent";
import { CopyButton } from "@/components/chat/CopyButton";
import { A2UISurfaceBlock } from "@/components/a2ui/A2UISurfaceBlock";
import { splitAssistantSegments, splitA2UIBlocks } from "@/lib/splitMessageSegments";

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
  const hasCards = Boolean(message.card_data);
  const cardsFirst = message.cards_before_text === true;

  const rawText = message.content ?? "";
  const hasText = Boolean(rawText.trim());

  const segments: string[] = hasText
    ? (() => {
        const s = splitAssistantSegments(rawText);
        return s.length > 0 ? s : [rawText];
      })()
    : [];

  const cardsBlock = hasCards && (
    <CardRenderer
      cards={Array.isArray(message.card_data) ? message.card_data : [message.card_data as Card]}
      onAction={onCardAction}
      onFormSubmit={onFormSubmit}
    />
  );

  let partKey = 0;
  const messageParts: ReactNode[] = [];
  const markdownChunks: string[] = [];

  for (const seg of segments) {
    const parts = splitA2UIBlocks(seg);
    for (const part of parts) {
      const key = `${message.id}-part-${partKey++}`;
      if (part.type === "markdown") {
        if (!part.content.trim()) continue;
        markdownChunks.push(part.content);
        messageParts.push(
          <div key={key} className="markdown-body min-w-0 text-[15px] leading-relaxed md:text-base">
            <MarkdownContent embedA2UI={false} onA2UIAction={onA2UIAction}>
              {part.content}
            </MarkdownContent>
          </div>,
        );
      } else {
        messageParts.push(
          <div key={key} className="min-w-0">
            <A2UISurfaceBlock variant="inline" source={part.source} onAction={onA2UIAction} />
          </div>,
        );
      }
    }
  }

  const copyText = markdownChunks.join("\n\n---\n\n");

  const proseAndA2UIBlock =
    messageParts.length > 0 ? (
      <div className="relative rounded-2xl border border-border bg-muted/50 px-5 py-3.5 pr-12 text-foreground shadow-sm">
        <div className="absolute right-1 top-1">
          <CopyButton text={copyText || rawText} />
        </div>
        <div className="flex w-full flex-col gap-3">{messageParts}</div>
      </div>
    ) : null;

  return (
    <div className="flex w-full justify-start">
      <div className="flex w-full max-w-[min(92%,48rem)] flex-col">
        {cardsFirst ? (
          <>
            {hasCards ? (
              <section aria-label="交互卡片" className="w-full">
                {cardsBlock}
              </section>
            ) : null}
            {proseAndA2UIBlock ? <div className={hasCards ? "mt-4" : ""}>{proseAndA2UIBlock}</div> : null}
          </>
        ) : (
          <>
            {proseAndA2UIBlock}
            {hasCards ? (
              <section
                aria-label="交互卡片"
                className="mt-5 w-full border-t border-border/70 pt-5 dark:border-border/50"
              >
                {cardsBlock}
              </section>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
