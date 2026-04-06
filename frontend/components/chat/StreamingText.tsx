"use client";

import { MarkdownContent } from "@/components/markdown/MarkdownContent";

interface StreamingTextProps {
  content: string;
}

export function StreamingText({ content }: StreamingTextProps) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[min(92%,48rem)] rounded-2xl border border-gray-100 bg-gray-50/90 px-5 py-3.5 text-[15px] shadow-sm md:text-base">
        <MarkdownContent>{content}</MarkdownContent>
        <span className="ml-0.5 inline-block h-5 w-0.5 animate-pulse bg-gray-700" />
      </div>
    </div>
  );
}
