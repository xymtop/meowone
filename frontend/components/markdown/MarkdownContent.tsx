"use client";

/**
 * 统一 Markdown 渲染：使用 ByteMD Viewer（GFM + Mermaid）并支持 A2UI 代码块拆分渲染。
 */
import { useMemo } from "react";
import type { A2UIAction } from "@a2ui-sdk/react/0.8";
import { A2UISurfaceBlock } from "@/components/a2ui/A2UISurfaceBlock";
import { Viewer } from "@bytemd/react";
import breaks from "@bytemd/plugin-breaks";
import footnotes from "@bytemd/plugin-footnotes";
import frontmatter from "@bytemd/plugin-frontmatter";
import gfm from "@bytemd/plugin-gfm";
import gemoji from "@bytemd/plugin-gemoji";
import highlight from "@bytemd/plugin-highlight";
import importHtml from "@bytemd/plugin-import-html";
import math from "@bytemd/plugin-math";
import mediumZoom from "@bytemd/plugin-medium-zoom";
import mermaid from "@bytemd/plugin-mermaid";
import { cn } from "@/lib/utils";

type Segment = { type: "markdown"; content: string } | { type: "a2ui"; source: string };

export interface MarkdownContentProps {
  children: string;
  /** A2UI 按钮等交互回调，将发回对话继续 Agent Loop */
  onA2UIAction?: (action: A2UIAction) => void;
  className?: string;
  /**
   * 为 false 时不在 Markdown 内联渲染 ```a2ui```（显示为普通代码块）。
   * 由 AssistantBubble 等将 A2UI 拆出单独成卡时使用。
   */
  embedA2UI?: boolean;
}

export function MarkdownContent({
  children,
  onA2UIAction,
  className,
  embedA2UI = true,
}: MarkdownContentProps) {
  const plugins = useMemo(
    () => {
      const darkByClass =
        typeof document !== "undefined" && document.documentElement.classList.contains("dark");
      const darkBySystem =
        typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-color-scheme: dark)")?.matches;
      const isDark = darkByClass || darkBySystem;

      return [
        frontmatter(),
        gfm(),
        breaks(),
        footnotes(),
        gemoji(),
        math(),
        highlight(),
        mermaid({
          startOnLoad: false,
          theme: isDark ? "dark" : "default",
          look: "classic",
          securityLevel: "loose",
          fontFamily: "var(--font-geist-sans), Inter, Arial, sans-serif",
          logLevel: "fatal",
          themeVariables: isDark
            ? {
                primaryColor: "#1f2937",
                primaryTextColor: "#f9fafb",
                primaryBorderColor: "#4b5563",
                lineColor: "#9ca3af",
                secondaryColor: "#111827",
                tertiaryColor: "#0f172a",
                background: "#111827",
                mainBkg: "#1f2937",
                secondBkg: "#111827",
                tertiaryBkg: "#0f172a",
                textColor: "#f3f4f6",
                clusterBkg: "#1f2937",
                clusterBorder: "#6b7280",
                edgeLabelBackground: "#111827",
                actorBkg: "#1f2937",
                actorBorder: "#6b7280",
                actorTextColor: "#f9fafb",
                noteBkgColor: "#1e293b",
                noteTextColor: "#f8fafc",
              }
            : {
                primaryColor: "#f3f4f6",
                primaryTextColor: "#111827",
                primaryBorderColor: "#9ca3af",
                lineColor: "#6b7280",
                secondaryColor: "#ffffff",
                tertiaryColor: "#f9fafb",
                background: "#ffffff",
                mainBkg: "#f3f4f6",
                secondBkg: "#ffffff",
                tertiaryBkg: "#f9fafb",
                textColor: "#111827",
                clusterBkg: "#f3f4f6",
                clusterBorder: "#9ca3af",
                edgeLabelBackground: "#ffffff",
                actorBkg: "#f3f4f6",
                actorBorder: "#9ca3af",
                actorTextColor: "#111827",
                noteBkgColor: "#eff6ff",
                noteTextColor: "#1e293b",
              },
          flowchart: {
            htmlLabels: true,
            useMaxWidth: true,
            curve: "basis",
          },
          sequence: {
            showSequenceNumbers: true,
            useMaxWidth: true,
            wrap: true,
          },
          gantt: {
            axisFormat: "%m/%d",
          },
          journey: {
            useMaxWidth: true,
          },
          pie: {
            useMaxWidth: true,
            textPosition: 0.75,
          },
          er: {
            useMaxWidth: true,
          },
          state: {
            useMaxWidth: true,
          },
        }),
        importHtml(),
        mediumZoom(),
      ];
    },
    [],
  );

  const segments = useMemo<Segment[]>(() => {
    if (!embedA2UI) return [{ type: "markdown", content: children }];
    const out: Segment[] = [];
    const source = children ?? "";
    const re = /```a2ui\s*\n([\s\S]*?)```/gi;
    let pos = 0;
    let match: RegExpExecArray | null;
    while ((match = re.exec(source)) !== null) {
      const before = source.slice(pos, match.index);
      if (before.trim()) out.push({ type: "markdown", content: before });
      const block = match[1]?.trim();
      if (block) out.push({ type: "a2ui", source: block });
      pos = re.lastIndex;
    }
    const rest = source.slice(pos);
    if (rest.trim()) out.push({ type: "markdown", content: rest });
    return out.length > 0 ? out : [{ type: "markdown", content: source }];
  }, [children, embedA2UI]);

  return (
    <div className={cn("markdown-body", className, "space-y-4")}>
      {segments.map((seg, i) =>
        seg.type === "a2ui" ? (
          <A2UISurfaceBlock key={`a2ui-${i}`} source={seg.source} onAction={onA2UIAction} />
        ) : (
          <Viewer key={`md-${i}`} value={seg.content} plugins={plugins} />
        ),
      )}
    </div>
  );
}
