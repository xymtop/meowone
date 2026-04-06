"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { FormCard as FormCardType } from "@/types/card";

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
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        {card.icon && <span className="text-lg">{card.icon}</span>}
        <h3 className="text-[15px] font-normal text-gray-900">{card.title}</h3>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        {card.fields.map((field) => (
          <div key={field.name}>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {field.label}
              {field.required && <span className="ml-0.5 text-red-500">*</span>}
            </label>
            {field.type === "select" ? (
              <select
                value={formData[field.name] || ""}
                onChange={(e) => handleChange(field.name, e.target.value)}
                required={field.required}
                className="w-full rounded-md border bg-white px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-300"
              >
                <option key={`${field.name}-placeholder`} value="">
                  {field.placeholder || "Select..."}
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
              />
            )}
          </div>
        ))}
        <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
          {card.submitLabel}
        </Button>
      </form>
    </div>
  );
}
