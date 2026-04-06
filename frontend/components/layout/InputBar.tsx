"use client";

import { useRef, useState, useCallback } from "react";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InputBarProps {
  onSend: (content: string) => void;
  disabled: boolean;
}

export function InputBar({ onSend, disabled }: InputBarProps) {
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
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [value, disabled, onSend]);

  return (
    <div className="border-t border-gray-100 bg-white/95 px-3 py-4 backdrop-blur md:px-6 md:py-5">
      <div className="mx-auto flex max-w-4xl items-end gap-3">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            adjustHeight();
          }}
          placeholder="输入消息（回车换行）；仅点击按钮发送"
          disabled={disabled}
          rows={2}
          className="min-h-[52px] flex-1 resize-none rounded-2xl border border-gray-200 bg-gray-50 px-5 py-3.5 text-[15px] leading-relaxed outline-none placeholder:text-gray-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 disabled:opacity-50 md:min-h-[56px] md:text-base"
        />
        <Button
          onClick={handleSend}
          disabled={disabled || !value.trim()}
          size="icon"
          className="h-12 w-12 shrink-0 rounded-2xl md:h-14 md:w-14"
        >
          {disabled ? (
            <Loader2 className="h-5 w-5 animate-spin md:h-6 md:w-6" />
          ) : (
            <Send className="h-5 w-5 md:h-6 md:w-6" />
          )}
        </Button>
      </div>
    </div>
  );
}
