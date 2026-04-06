"use client";

import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ActionCard as ActionCardType } from "@/types/card";
import { cn } from "@/lib/utils";

interface ActionCardProps {
  card: ActionCardType;
  onAction?: (actionId: string, payload: Record<string, unknown>) => void;
}

function StatusIcon({ status }: { status?: "loading" | "success" | "error" }) {
  if (!status) return null;
  switch (status) {
    case "loading":
      return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
    case "success":
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case "error":
      return <XCircle className="h-4 w-4 text-red-500" />;
  }
}

export function ActionCardComponent({ card, onAction }: ActionCardProps) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        {card.icon && <span className="text-lg">{card.icon}</span>}
        <h3 className="text-[15px] font-normal text-gray-900">{card.title}</h3>
        <StatusIcon status={card.status} />
      </div>
      <div className="mb-3 space-y-1.5">
        {card.fields.map((field) => (
          <div key={field.label} className="flex justify-between text-sm">
            <span className="text-gray-500">{field.label}</span>
            <span className="font-medium">{field.value}</span>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {card.actions.map((action) => (
          <Button
            key={action.id}
            variant={action.style === "danger" ? "destructive" : action.style === "secondary" ? "outline" : "default"}
            size="sm"
            onClick={() => onAction?.(action.id, action.payload)}
            className={cn(
              action.style === "primary" && "bg-blue-600 hover:bg-blue-700",
            )}
          >
            {action.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
