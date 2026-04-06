"use client";

import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import type { InfoCard as InfoCardType } from "@/types/card";
import { cn } from "@/lib/utils";

interface InfoCardProps {
  card: InfoCardType;
}

function StatusIcon({ status }: { status?: "loading" | "success" | "error" }) {
  if (!status) return null;
  switch (status) {
    case "loading":
      return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
    case "success":
      return <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />;
    case "error":
      return <XCircle className="h-4 w-4 text-destructive" />;
  }
}

export function InfoCardComponent({ card }: InfoCardProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border/90 bg-card text-card-foreground shadow-lg",
        "ring-1 ring-border/30 dark:border-border/70 dark:shadow-black/30 dark:ring-white/[0.06]",
      )}
    >
      <div className="border-b border-border/60 bg-muted/30 px-5 py-3.5 dark:bg-muted/20">
        <div className="flex items-center gap-2.5">
          {card.icon && <span className="text-xl leading-none">{card.icon}</span>}
          <h3 className="text-base font-semibold tracking-tight text-foreground">{card.title}</h3>
          <StatusIcon status={card.status} />
        </div>
      </div>
      <div className="space-y-2.5 p-5">
        {card.fields.map((field) => (
          <div key={field.label} className="flex justify-between gap-4 text-sm">
            <span className="shrink-0 text-muted-foreground">{field.label}</span>
            <span className="min-w-0 text-right font-medium text-foreground">{field.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
