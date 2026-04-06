"use client";

import { useRef, useState, useCallback } from "react";
import { Send, Square } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InputBarProps {
  onSend: (content: string) => void;
  /** True while an SSE reply is in progress (chat / card / A2UI). */
  isStreaming: boolean;
  /** Stop the current stream (AbortController). */
  onCancel: () => void;
}

export function InputBar({ onSend, isStreaming, onCancel }: InputBarProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 280)}px`;
  }, []);

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || isStreaming) return;
    onSend(trimmed);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [value, isStreaming, onSend]);

  const handlePrimaryClick = useCallback(() => {
    if (isStreaming) {
      onCancel();
    } else {
      handleSend();
    }
  }, [isStreaming, onCancel, handleSend]);

  return (
    <div className="border-t border-border bg-background/95 px-3 py-4 backdrop-blur md:px-6 md:py-5">
      <div className="mx-auto flex max-w-4xl items-end gap-3">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            adjustHeight();
          }}
          placeholder="输入消息（回车换行）；仅点击按钮发送"
          disabled={isStreaming}
          rows={2}
          className="min-h-[52px] flex-1 resize-none rounded-2xl border border-border bg-muted/40 px-5 py-3.5 text-[15px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground focus:border-ring focus:bg-background focus:ring-2 focus:ring-ring/30 disabled:opacity-50 md:min-h-[56px] md:text-base"
        />
        <Button
          type="button"
          onClick={handlePrimaryClick}
          disabled={!isStreaming && !value.trim()}
          size="icon"
          className="h-12 w-12 shrink-0 rounded-2xl md:h-14 md:w-14"
          aria-label={isStreaming ? "停止生成" : "发送"}
        >
          {isStreaming ? (
            <Square className="h-5 w-5 fill-current md:h-6 md:w-6" />
          ) : (
            <Send className="h-5 w-5 md:h-6 md:w-6" />
          )}
        </Button>
      </div>
    </div>
  );
}
