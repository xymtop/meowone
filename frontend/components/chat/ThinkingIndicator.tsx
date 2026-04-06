interface ThinkingIndicatorProps {
  description: string;
}

export function ThinkingIndicator({ description }: ThinkingIndicatorProps) {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-2 rounded-2xl border border-gray-100 bg-gray-50 px-5 py-3 text-[15px] text-gray-600 md:text-base">
        <div className="flex gap-1">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:0ms]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:150ms]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:300ms]" />
        </div>
        <span>{description}</span>
      </div>
    </div>
  );
}
