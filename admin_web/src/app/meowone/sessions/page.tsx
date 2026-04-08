"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { meowoneApi, type Message, type Session } from "@/lib/meowone-api";
import { cn } from "@/lib/utils";

// ============ 图标组件 ============
function RefreshIcon() {
  return (
    <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  );
}

function ChatBubbleIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  );
}

function BotIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
    </svg>
  );
}

function EmptyIcon() {
  return (
    <svg className="size-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}

function SessionsContent() {
  const searchParams = useSearchParams();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState("");
  const [error, setError] = useState("");
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const loadSessions = async () => {
    try {
      setLoadingSessions(true);
      setError("");
      const list = await meowoneApi.listSessions();
      setSessions(list);
      const querySessionId = searchParams.get("session_id") || "";
      if (querySessionId && list.some((x) => x.id === querySessionId)) {
        setSessionId(querySessionId);
      } else if (!sessionId && list[0]) {
        setSessionId(list[0].id);
      } else if (sessionId && !list.some((x) => x.id === sessionId)) {
        setSessionId(list[0]?.id || "");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoadingSessions(false);
    }
  };

  const loadMessages = async (sid: string) => {
    if (!sid) {
      setMessages([]);
      return;
    }
    try {
      setLoadingMessages(true);
      setError("");
      setMessages(await meowoneApi.listMessages(sid));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    void loadSessions();
  }, []);

  useEffect(() => {
    void loadMessages(sessionId);
  }, [sessionId]);

  const currentSession = useMemo(() => sessions.find((s) => s.id === sessionId) || null, [sessions, sessionId]);

  const roleLabel: Record<string, string> = {
    user: "用户",
    assistant: "助手",
    system: "系统",
  };

  return (
    <div className="flex h-screen min-h-0 flex-col overflow-hidden bg-[#f5f6f7]">
      {/* 页面标题栏 */}
      <div className="border-b border-gray-100 bg-white px-6 py-5">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 text-white shadow-md">
              <ChatBubbleIcon />
            </div>
            <div>
              <h1 className="text-[18px] font-semibold text-[#1d2129]">会话管理</h1>
              <p className="text-[12px] text-[#86909c]">统一查看会话列表与消息内容</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* 左侧：会话列表 */}
        <div className="flex w-[300px] shrink-0 flex-col overflow-hidden border-r border-gray-100 bg-white">
          {/* 列表头 */}
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#b0b8c6]">
              会话列表 · {sessions.length}
            </span>
            <button
              onClick={() => void loadSessions()}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] text-[#86909c] transition-all hover:bg-gray-100 hover:text-[#1d2129]"
            >
              <RefreshIcon />
              刷新
            </button>
          </div>

          {/* 列表 */}
          <div className="custom-scrollbar flex-1 overflow-y-auto">
            {loadingSessions ? (
              <div className="space-y-2 p-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100" />
                ))}
              </div>
            ) : sessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-3 text-[#d0d5dd]">
                  <EmptyIcon />
                </div>
                <p className="text-[13px] text-[#86909c]">暂无会话</p>
                <p className="mt-1 text-[12px] text-[#c9cdd4]">在对话页发起新对话</p>
              </div>
            ) : (
              sessions.map((s) => {
                const active = s.id === sessionId;
                return (
                  <div key={s.id} className="group relative px-2 py-1.5">
                    <button
                      type="button"
                      className={cn(
                        "flex w-full items-start gap-2.5 rounded-xl px-3 py-3 text-left transition-all",
                        active
                          ? "bg-white shadow-[0_2px_8px_rgba(0,0,0,0.07)]"
                          : "hover:bg-gray-50",
                      )}
                      onClick={() => setSessionId(s.id)}
                    >
                      <span className={cn("mt-0.5 shrink-0", active ? "text-blue-500" : "text-[#d0d5dd]")}>
                        <ChatBubbleIcon />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={cn("block truncate text-[13px] font-medium", active ? "text-[#1d2129]" : "text-[#4e5969]")}>
                          {s.title || "新对话"}
                        </span>
                        <span className="mt-0.5 block truncate text-[11px] text-[#b0b8c6]">{s.updated_at}</span>
                      </span>
                    </button>
                    {/* 删除按钮 */}
                    <button
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-[#d0d5dd] opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (!confirm("确定删除该会话？")) return;
                        await meowoneApi.deleteSession(s.id);
                        void loadSessions();
                      }}
                      title="删除会话"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 右侧：消息列表 */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {!sessionId ? (
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <div className="mb-4 text-[#d0d5dd]">
                <svg className="size-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={0.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                </svg>
              </div>
              <p className="text-[15px] font-medium text-[#b0b8c6]">选择会话查看详情</p>
              <p className="mt-1 text-[12px] text-[#d0d5dd]">点击左侧会话列表中的项</p>
            </div>
          ) : (
            <>
              {/* 消息区标题 */}
              <div className="border-b border-gray-100 bg-white px-6 py-3">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <h2 className="truncate text-[14px] font-medium text-[#1d2129]">
                      {currentSession?.title || "新对话"}
                    </h2>
                    <p className="text-[11px] text-[#b0b8c6]">
                      {currentSession?.updated_at} · {messages.length} 条消息
                    </p>
                  </div>
                  {loadingMessages && (
                    <div className="flex items-center gap-2 text-[12px] text-[#b0b8c6]">
                      <div className="size-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                      加载中
                    </div>
                  )}
                </div>
              </div>

              {/* 消息列表 */}
              <div className="custom-scrollbar flex-1 overflow-y-auto px-6 py-5">
                {loadingMessages ? (
                  <div className="space-y-3">
                    {[1, 2].map((i) => (
                      <div key={i} className="h-24 animate-pulse rounded-2xl bg-gray-100" />
                    ))}
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="mb-3 text-[#d0d5dd]">
                      <svg className="size-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8-9 8a9.863 9.863 0 01-2.165-.135-.79.79 0 01.183-.683l.35-.875A2.25 2.25 0 0015.75 19.5h-7.5a2.25 2.25 0 01-2.25-2.25V12m15.75 0v.375c0 2.278-3.694 4.125-8.25 4.125S3 14.653 3 12.375V12m18 0V12m-4.31-4.625a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                      </svg>
                    </div>
                    <p className="text-[13px] text-[#86909c]">该会话暂无消息</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((m) => {
                      const isUser = m.role === "user";
                      return (
                        <div key={m.id} className={cn("flex", isUser ? "justify-end" : "justify-start")}>
                          <div
                            className={cn(
                              "group relative max-w-[75%]",
                              isUser
                                ? "rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 px-5 py-3.5 text-[14px] leading-6 text-white shadow-[0_4px_16px_rgba(59,130,246,0.25)]"
                                : "rounded-2xl border border-gray-100 bg-white px-5 py-3.5 text-[14px] leading-6 text-[#1d2129] shadow-[0_2px_10px_rgba(0,0,0,0.06)]",
                            )}
                          >
                            {/* 复制按钮 */}
                            <button
                              className={cn(
                                "absolute top-2.5 rounded-lg p-1.5 text-[#9aa0a6] opacity-0 transition-all hover:bg-black/5 group-hover:opacity-100",
                                isUser ? "right-2 text-white/70 hover:bg-white/10 hover:text-white" : "right-2 hover:bg-gray-100 hover:text-[#1d2129]",
                              )}
                              onClick={() => {
                                navigator.clipboard.writeText(m.content || "").catch(() => {});
                              }}
                              title="复制"
                            >
                              <CopyIcon />
                            </button>

                            {/* 角色标签 */}
                            <div
                              className={cn(
                                "mb-1.5 flex items-center gap-1 text-[11px]",
                                isUser ? "text-white/60" : "text-[#b0b8c6]",
                              )}
                            >
                              {isUser ? <UserIcon /> : <BotIcon />}
                              <span>{roleLabel[m.role] ?? m.role}</span>
                              <span className="mx-1 opacity-40">/</span>
                              <span>{m.content_type}</span>
                              <span className="mx-1 opacity-40">·</span>
                              <span>{m.created_at}</span>
                            </div>

                            {/* 内容 */}
                            <pre className="whitespace-pre-wrap break-all text-[14px] leading-6">{m.content || "(empty)"}</pre>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* 错误提示 */}
      {error ? (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-[13px] text-red-600 shadow-lg">
          {error}
        </div>
      ) : null}
    </div>
  );
}

function SessionsLoading() {
  return (
    <div className="flex h-screen min-h-0 flex-col overflow-hidden bg-[#f5f6f7]">
      <div className="border-b border-gray-100 bg-white px-6 py-5">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <div className="size-10 animate-pulse rounded-xl bg-gray-200" />
          <div className="space-y-1.5">
            <div className="h-5 w-32 animate-pulse rounded bg-gray-200" />
            <div className="h-3.5 w-48 animate-pulse rounded bg-gray-100" />
          </div>
        </div>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="w-[300px] shrink-0 overflow-hidden border-r border-gray-100 bg-white">
          <div className="space-y-2 p-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100" />
            ))}
          </div>
        </div>
        <div className="flex-1 space-y-3 p-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-gray-100" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function MeowSessionsPage() {
  return (
    <Suspense fallback={<SessionsLoading />}>
      <SessionsContent />
    </Suspense>
  );
}
