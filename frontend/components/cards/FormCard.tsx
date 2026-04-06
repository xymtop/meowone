"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { FormCard as FormCardType } from "@/types/card";
import { cn } from "@/lib/utils";

interface FormCardProps {
  card: FormCardType;
  onSubmit?: (cardId: string, data: Record<string, string>) => void;
}

export function FormCardComponent({ card, onSubmit }: FormCardProps) {
  const [formData, setFormData] = useState<Record<string, string>>({});

  const handleChange = useCallback((name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      onSubmit?.(card.id, formData);
    },
    [card.id, formData, onSubmit],
  );

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
        </div>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4 p-5">
        {card.fields.map((field) => (
          <div key={field.name}>
            <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
              {field.label}
              {field.required && <span className="ml-0.5 text-destructive">*</span>}
            </label>
            {field.type === "select" ? (
              <select
                value={formData[field.name] || ""}
                onChange={(e) => handleChange(field.name, e.target.value)}
                required={field.required}
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option key={`${field.name}-placeholder`} value="">
                  {field.placeholder || "请选择…"}
                </option>
                {field.options?.map((opt, idx) => (
                  <option
                    key={`${field.name}-opt-${idx}-${String(opt.value)}`}
                    value={opt.value}
                  >
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : (
              <Input
                type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                placeholder={field.placeholder}
                required={field.required}
                value={formData[field.name] || ""}
                onChange={(e) => handleChange(field.name, e.target.value)}
                className="h-10 border-input bg-background"
              />
            )}
          </div>
        ))}
        <Button type="submit" className="h-10 w-full font-medium shadow-sm">
          {card.submitLabel}
        </Button>
      </form>
    </div>
  );
}
