"use client";

/**
 * ```a2ui``` 或 ---A2UI-START/END--- 内的 JSON → A2UI v0.8 消息流，见 https://a2ui.org
 */
import { useCallback, useMemo, useState } from "react";
import {
  A2UIProvider,
  A2UIRenderer,
  type A2UIAction,
} from "@a2ui-sdk/react/0.8";
import type { A2UIMessage } from "@a2ui-sdk/types/0.8";
import { parseAndNormalizeA2UISource } from "@/lib/a2uiNormalize";
import { cn } from "@/lib/utils";
import { meowoneCatalog } from "@/components/a2ui/meowoneCatalog";

function stripOuterCodeFence(raw: string): string {
  let t = raw.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```[a-zA-Z0-9_-]*\s*\n?/, "").replace(/\n?```\s*$/, "").trim();
  }
  return t;
}

function firstSurfaceId(messages: A2UIMessage[]): string | null {
  for (const m of messages) {
    const id =
      m.beginRendering?.surfaceId ??
      m.surfaceUpdate?.surfaceId ??
      m.dataModelUpdate?.surfaceId ??
      m.deleteSurface?.surfaceId;
    if (id) return id;
  }
  return null;
}

function looksLikeJsonStreaming(s: string): boolean {
  const t = s.trim();
  if (!t) return false;
  return t.startsWith("{") || t.startsWith("[");
}

export interface A2UISurfaceBlockProps {
  source: string;
  onAction?: (action: A2UIAction) => void;
  /**
   * `inline`：与助手正文同一条气泡，无额外「卡片」头尾（默认）。
   * `card`：独立卡片容器（设置页等可用）。
   */
  variant?: "inline" | "card";
}

export function A2UISurfaceBlock({
  source,
  onAction,
  variant = "inline",
}: A2UISurfaceBlockProps) {
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const messages: A2UIMessage[] = useMemo(() => {
    try {
      return parseAndNormalizeA2UISource(stripOuterCodeFence(source));
    } catch {
      return [];
    }
  }, [source]);

  const surfaceId = useMemo(() => firstSurfaceId(messages), [messages]);

  const handleAction = useCallback(
    (action: A2UIAction) => {
      setActionFeedback("已发送到对话，等待回复…");
      window.setTimeout(() => setActionFeedback(null), 4000);
      onAction?.(action);
    },
    [onAction],
  );

  if (messages.length === 0) {
    const raw = stripOuterCodeFence(source);
    if (!raw.trim()) {
      return null;
    }
    if (looksLikeJsonStreaming(raw)) {
      return (
        <div
          className={cn(
            "flex min-h-[3rem] items-center gap-3 rounded-xl border border-dashed border-border/80 bg-muted/30 px-4 py-3 text-sm text-muted-foreground",
            variant === "inline" && "border-transparent bg-transparent px-0 py-2",
          )}
          aria-busy
          aria-label="A2UI 加载中"
        >
          <span className="inline-block size-4 animate-pulse rounded-full bg-primary/40" />
          <span>正在渲染界面…</span>
        </div>
      );
    }
    return (
      <div className="rounded-xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-50">
        无法解析为 A2UI v0.8 消息。请使用完整 JSON（含 beginRendering、surfaceUpdate 等）。
      </div>
    );
  }

  const inner = (
    <>
      <A2UIProvider messages={messages} catalog={meowoneCatalog}>
        <A2UIRenderer onAction={handleAction} />
      </A2UIProvider>
      {actionFeedback ? (
        <p className="mt-2 text-xs font-medium text-primary" role="status" aria-live="polite">
          {actionFeedback}
        </p>
      ) : null}
    </>
  );

  if (variant === "inline") {
    return (
      <div
        className="relative z-20 w-full overflow-visible py-1"
        data-a2ui-surface={surfaceId ?? undefined}
      >
        {inner}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "not-prose my-0 min-h-[4rem] overflow-visible rounded-2xl",
        "border border-border/80 bg-gradient-to-b from-card to-muted/25",
        "shadow-[0_8px_30px_-12px_rgba(0,0,0,0.18)] ring-1 ring-border/50",
        "dark:from-card dark:to-muted/15 dark:shadow-black/40 dark:ring-white/[0.07]",
      )}
      data-a2ui-surface={surfaceId ?? undefined}
    >
      <div className="overflow-visible px-4 py-4 sm:px-5">{inner}</div>
    </div>
  );
}
