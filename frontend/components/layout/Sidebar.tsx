"use client";

import { useEffect } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSessionStore } from "@/stores/session";
import { useUIStore } from "@/stores/ui";
import { cn } from "@/lib/utils";

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return d.toLocaleDateString();
}

export function Sidebar() {
  const router = useRouter();
  const { sessions, currentSessionId, fetchSessions, createSession, deleteSession, setCurrentSession } =
    useSessionStore();
  const { sidebarOpen, toggleSidebar } = useUIStore();

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleNewChat = async () => {
    const session = await createSession();
    router.push(`/chat/${session.id}`);
    if (sidebarOpen) toggleSidebar();
  };

  const handleSelect = (id: string) => {
    setCurrentSession(id);
    router.push(`/chat/${id}`);
    if (sidebarOpen) toggleSidebar();
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await deleteSession(id);
    if (currentSessionId === id) {
      router.push("/chat");
    }
  };

  const sidebarContent = (
    <div className="flex h-full w-[280px] flex-col border-r bg-gray-50">
      <div className="p-3">
        <Button onClick={handleNewChat} className="w-full gap-2" variant="outline">
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-0.5 px-2 pb-2">
          {sessions.map((session) => (
            <button
              key={session.id}
              onClick={() => handleSelect(session.id)}
              className={cn(
                "group flex w-full flex-col items-start gap-0.5 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-gray-100",
                currentSessionId === session.id && "bg-blue-50 hover:bg-blue-50",
              )}
            >
              <div className="flex w-full items-center justify-between">
                <span className="truncate font-medium">
                  {session.title || "New Chat"}
                </span>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => handleDelete(e, session.id)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleDelete(e as unknown as React.MouseEvent, session.id); }}
                  className="hidden shrink-0 rounded p-0.5 text-gray-400 hover:text-red-500 group-hover:block"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </span>
              </div>
              {session.summary && (
                <span className="truncate text-xs text-gray-500">{session.summary}</span>
              )}
              <span className="text-[11px] text-gray-400">
                {formatTime(session.updated_at)}
              </span>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:block">{sidebarContent}</aside>

      {/* Mobile drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={toggleSidebar} />
          <div className="absolute left-0 top-0 h-full animate-in slide-in-from-left">
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-2 z-10"
                onClick={toggleSidebar}
              >
                <X className="h-4 w-4" />
              </Button>
              {sidebarContent}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
