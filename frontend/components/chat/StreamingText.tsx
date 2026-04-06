"use client";

import type { A2UIAction } from "@a2ui-sdk/react/0.8";
import { MarkdownContent } from "@/components/markdown/MarkdownContent";
import { CopyButton } from "@/components/chat/CopyButton";
import { A2UISurfaceBlock } from "@/components/a2ui/A2UISurfaceBlock";
import { splitAssistantSegments, splitA2UIBlocks } from "@/lib/splitMessageSegments";
import type { ReactNode } from "react";

interface StreamingTextProps {
  content: string;
  onA2UIAction?: (action: A2UIAction) => void;
}

export function StreamingText({ content, onA2UIAction }: StreamingTextProps) {
  const segments = splitAssistantSegments(content);
  const blocks = segments.length > 0 ? segments : [content];

  const nodes: ReactNode[] = [];
  const markdownChunks: string[] = [];
  let globalIdx = 0;

  for (let si = 0; si < blocks.length; si++) {
    const seg = blocks[si];
    const parts = splitA2UIBlocks(seg);
    const isLastSegment = si === blocks.length - 1;

    for (let pi = 0; pi < parts.length; pi++) {
      const part = parts[pi];
      const isLastPart = pi === parts.length - 1;
      const showCursor = isLastSegment && isLastPart && part.type === "markdown";
      const key = `stream-${globalIdx++}`;

      if (part.type === "markdown") {
        if (!part.content.trim()) continue;
        markdownChunks.push(part.content);
        nodes.push(
          <div key={key} className="markdown-body min-w-0 text-[15px] leading-relaxed md:text-base">
            <MarkdownContent embedA2UI={false}>{part.content}</MarkdownContent>
            {showCursor ? (
              <span className="ml-0.5 inline-block h-5 w-0.5 animate-pulse bg-foreground/70" />
            ) : null}
          </div>,
        );
      } else {
        nodes.push(
          <div key={key} className="min-w-0">
            <A2UISurfaceBlock variant="inline" source={part.source} onAction={onA2UIAction} />
          </div>,
        );
      }
    }
  }

  if (nodes.length === 0) {
    return null;
  }

  const copyText = markdownChunks.join("\n\n---\n\n") || content;

  return (
    <div className="flex justify-start">
      <div className="relative w-full max-w-[min(92%,48rem)] rounded-2xl border border-border bg-muted/50 px-5 py-3.5 pr-12 text-foreground shadow-sm">
        <div className="absolute right-1 top-1">
          <CopyButton text={copyText} />
        </div>
        <div className="flex flex-col gap-3">{nodes}</div>
      </div>
    </div>
  );
}
