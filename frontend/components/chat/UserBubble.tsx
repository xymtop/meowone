import type { Message } from "@/types/message";
import { CopyButton } from "@/components/chat/CopyButton";

interface UserBubbleProps {
  message: Message;
}

export function UserBubble({ message }: UserBubbleProps) {
  const text = message.content ?? "";
  return (
    <div className="flex justify-end">
      <div className="relative max-w-[min(85%,42rem)] rounded-2xl bg-primary px-5 py-3 pr-12 text-[15px] leading-relaxed text-primary-foreground shadow-sm md:text-base md:leading-relaxed whitespace-pre-wrap">
        <div className="absolute right-1 top-1">
          <CopyButton text={text} className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground" />
        </div>
        {text}
      </div>
    </div>
  );
}
