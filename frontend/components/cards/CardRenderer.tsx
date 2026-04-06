"use client";

import type { Card } from "@/types/card";
import { InfoCardComponent } from "./InfoCard";
import { ActionCardComponent } from "./ActionCard";
import { FormCardComponent } from "./FormCard";

interface CardRendererProps {
  cards: Card[];
  onAction?: (actionId: string, payload: Record<string, unknown>) => void;
  onFormSubmit?: (cardId: string, data: Record<string, string>) => void;
}

export function CardRenderer({ cards, onAction, onFormSubmit }: CardRendererProps) {
  return (
    <div className="flex flex-col gap-2">
      {cards.map((card) => {
        switch (card.type) {
          case "info":
            return <InfoCardComponent key={card.id} card={card} />;
          case "action":
            return <ActionCardComponent key={card.id} card={card} onAction={onAction} />;
          case "form":
            return <FormCardComponent key={card.id} card={card} onSubmit={onFormSubmit} />;
          default:
            return null;
        }
      })}
    </div>
  );
}
