import type { Message } from "@/types/message";

interface UserBubbleProps {
  message: Message;
}

export function UserBubble({ message }: UserBubbleProps) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[70%] rounded-2xl bg-blue-600 px-4 py-2.5 text-sm text-white whitespace-pre-wrap">
        {message.content}
      </div>
    </div>
  );
}
