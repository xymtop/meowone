"use client";

import { useEffect } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSessionStore } from "@/stores/session";
import { useUIStore } from "@/stores/ui";
import { cn } from "@/lib/utils";

/** SQLite / API 返回的 `YYYY-MM-DD HH:MM:SS` 按 UTC 解析（与后端 datetime('now') 一致） */
function parseDbDate(dateStr: string): Date {
  const s = dateStr.trim();
  if (!s) return new Date();
  if (s.includes("T")) return new Date(s);
  return new Date(s.replace(" ", "T") + "Z");
}

/** 中文相对时间，避免误解析本地时区导致「差 8 小时」 */
function formatTime(dateStr: string) {
  const d = parseDbDate(dateStr);
  const now = Date.now();
  const diffMs = now - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 0) return "刚刚";
  if (diffSec < 60) return "刚刚";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} 分钟前`;
  const diffHr = Math.floor(diffSec / 3600);
  if (diffHr < 24) return `${diffHr} 小时前`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay} 天前`;
  return d.toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function Sidebar() {
  const router = useRouter();
  const { sessions, currentSessionId, fetchSessions, createSession, deleteSession, setCurrentSession } =
    useSessionStore();
  const { sidebarOpen, toggleSidebar, sidebarCollapsed } = useUIStore();

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
    <div className="flex h-full w-[240px] flex-col border-r border-gray-100 bg-[#f7f8fa]">
      <div className="p-2.5">
        <Button onClick={handleNewChat} className="h-9 w-full gap-1.5 text-sm font-normal" variant="outline">
          <Plus className="h-4 w-4" />
          新对话
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-0.5 px-2 pb-2">
          {sessions.map((session) => (
            <button
              key={session.id}
              onClick={() => handleSelect(session.id)}
              className={cn(
                "group flex w-full flex-col items-start gap-0.5 rounded-lg px-2.5 py-2 text-left text-[13px] font-normal leading-snug transition-colors hover:bg-gray-200/80",
                currentSessionId === session.id && "bg-white shadow-sm ring-1 ring-gray-200/80",
              )}
            >
              <div className="flex w-full items-center justify-between">
                <span className="truncate text-gray-800">
                  {session.title?.trim() || "新对话"}
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
      {/* 桌面端：可折叠侧栏，折叠时宽度为 0 以让出中间对话区 */}
      <aside
        className={cn(
          "hidden shrink-0 overflow-hidden transition-[width] duration-200 ease-out md:block",
          sidebarCollapsed ? "w-0 border-transparent" : "w-[240px]",
        )}
      >
        <div className="h-full w-[240px]">{sidebarContent}</div>
      </aside>

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
