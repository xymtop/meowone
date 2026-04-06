"use client";

import ReactMarkdown from "react-markdown";

interface StreamingTextProps {
  content: string;
}

export function StreamingText({ content }: StreamingTextProps) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[80%] rounded-2xl bg-gray-100 px-4 py-2.5 text-sm">
        <div className="prose prose-sm max-w-none">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
        <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-gray-800" />
      </div>
    </div>
  );
}
