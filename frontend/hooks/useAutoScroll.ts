"use client";

import { useLayoutEffect, useRef } from "react";

/**
 * Scroll to bottom when content grows. Uses primitives as deps so we never
 * depend on unstable array references (avoids effect thrashing with Zustand).
 */
export function useAutoScroll(deps: {
  messageCount: number;
  lastMessageId: string | undefined;
  streamingLen: number;
  thinkingStep: string | null;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const { messageCount, lastMessageId, streamingLen, thinkingStep } = deps;

  useLayoutEffect(() => {
    const id = requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
    });
    return () => cancelAnimationFrame(id);
  }, [messageCount, lastMessageId, streamingLen, thinkingStep]);

  return bottomRef;
}
