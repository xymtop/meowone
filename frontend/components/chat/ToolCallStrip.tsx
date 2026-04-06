"use client";

import type { StreamingToolRow } from "@/types/tool-activity";

interface ToolCallStripProps {
  tools: StreamingToolRow[];
}

export function ToolCallStrip({ tools }: ToolCallStripProps) {
  if (!tools.length) return null;
  return (
    <div className="flex justify-start">
      <div className="flex max-w-[min(92%,48rem)] flex-wrap gap-2 rounded-2xl border border-blue-100 bg-blue-50/80 px-4 py-2.5 text-[13px] text-blue-900">
        <span className="font-medium text-blue-800/90">工具</span>
        {tools.map((t, idx) => (
          <span
            key={`${t.toolCallId}-${idx}`}
            className="rounded-lg bg-white/90 px-2.5 py-0.5 shadow-sm ring-1 ring-blue-100"
            title={t.toolCallId}
          >
            {t.name}
            {t.status === "running" && (
              <span className="ml-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500 align-middle" />
            )}
            {t.status === "ok" && <span className="ml-1 text-emerald-600">✓</span>}
            {t.status === "error" && <span className="ml-1 text-red-600">✗</span>}
          </span>
        ))}
      </div>
    </div>
  );
}
