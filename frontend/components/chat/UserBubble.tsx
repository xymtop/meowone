import type { Message } from "@/types/message";

interface UserBubbleProps {
  message: Message;
}

export function UserBubble({ message }: UserBubbleProps) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[min(85%,42rem)] rounded-2xl bg-blue-600 px-5 py-3 text-[15px] leading-relaxed text-white shadow-sm md:text-base md:leading-relaxed whitespace-pre-wrap">
        {message.content}
      </div>
    </div>
  );
}
