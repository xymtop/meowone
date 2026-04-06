"use client";

import { useRouter } from "next/navigation";
import { MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSessionStore } from "@/stores/session";

export default function ChatWelcomePage() {
  const router = useRouter();
  const createSession = useSessionStore((s) => s.createSession);

  const handleNewChat = async () => {
    const session = await createSession();
    router.push(`/chat/${session.id}`);
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4">
      <div className="flex flex-col items-center gap-2">
        <span className="text-5xl">🐱</span>
        <h1 className="text-2xl font-bold tracking-tight">Welcome to MeowOne</h1>
        <p className="text-center text-gray-500">
          Your AI operating system. Start a conversation to get things done.
        </p>
      </div>
      <Button onClick={handleNewChat} size="lg" className="gap-2 bg-blue-600 hover:bg-blue-700">
        <MessageSquarePlus className="h-5 w-5" />
        Start a new chat
      </Button>
    </div>
  );
}
