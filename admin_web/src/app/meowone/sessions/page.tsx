"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { meowoneApi, type Message, type Session } from "@/lib/meowone-api";

function SessionsContent() {
  const searchParams = useSearchParams();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState("");
  const [title, setTitle] = useState("");
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-title-md2 font-semibold text-dark dark:text-white">会话记录</h1>
        <p className="mt-1 text-sm text-body dark:text-dark-6">统一查看会话列表与消息内容，替代分离的 sessions/messages 页面。</p>
      </div>

      <div className="flex gap-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="输入会话标题（可选）"
          className="w-full max-w-md rounded-lg border border-stroke bg-white px-4 py-2 dark:border-dark-3 dark:bg-dark-2"
        />
        <button
          className="rounded-lg bg-primary px-4 py-2 text-white"
          onClick={async () => {
            await meowoneApi.createSession(title);
            setTitle("");
            await loadSessions();
          }}
        >
          新建会话
        </button>
      </div>

      {error ? <p className="text-sm text-red">{error}</p> : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <section className="rounded-xl border border-stroke bg-white dark:border-dark-3 dark:bg-dark-2">
          <div className="flex items-center justify-between border-b border-stroke px-4 py-3 dark:border-dark-3">
            <h2 className="text-sm font-semibold">会话列表</h2>
            <button className="text-xs text-primary" onClick={() => void loadSessions()}>
              刷新
            </button>
          </div>
          <div className="max-h-[70vh] overflow-auto">
            {loadingSessions ? <p className="p-4 text-sm text-body dark:text-dark-6">加载中...</p> : null}
            {!loadingSessions && sessions.length === 0 ? <p className="p-4 text-sm text-body dark:text-dark-6">暂无会话</p> : null}
            {sessions.map((s) => {
              const active = s.id === sessionId;
              return (
                <button
                  type="button"
                  key={s.id}
                  className={`block w-full border-b border-stroke px-4 py-3 text-left dark:border-dark-3 ${active ? "bg-blue-50 dark:bg-dark" : ""}`}
                  onClick={() => setSessionId(s.id)}
                >
                  <p className="truncate text-sm font-medium text-dark dark:text-white">{s.title || "新对话"}</p>
                  <p className="mt-1 text-xs text-body dark:text-dark-6">{s.updated_at}</p>
                  <div className="mt-2">
                    <span
                      className="text-xs text-red"
                      onClick={async (e) => {
                        e.stopPropagation();
                        await meowoneApi.deleteSession(s.id);
                        await loadSessions();
                      }}
                    >
                      删除
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-xl border border-stroke bg-white dark:border-dark-3 dark:bg-dark-2">
          <div className="border-b border-stroke px-4 py-3 dark:border-dark-3">
            <h2 className="text-sm font-semibold">{currentSession ? `消息记录 · ${currentSession.title || currentSession.id}` : "消息记录"}</h2>
          </div>
          <div className="max-h-[70vh] space-y-3 overflow-auto p-4">
            {!sessionId ? <p className="text-sm text-body dark:text-dark-6">请先选择会话</p> : null}
            {loadingMessages ? <p className="text-sm text-body dark:text-dark-6">加载消息中...</p> : null}
            {!loadingMessages && sessionId && messages.length === 0 ? <p className="text-sm text-body dark:text-dark-6">该会话暂无消息</p> : null}
            {messages.map((m) => (
              <article key={m.id} className="rounded-xl border border-stroke bg-white p-4 dark:border-dark-3 dark:bg-dark">
                <div className="mb-2 flex items-center justify-between text-xs text-body dark:text-dark-6">
                  <span>
                    {m.role} / {m.content_type}
                  </span>
                  <span>{m.created_at}</span>
                </div>
                <pre className="whitespace-pre-wrap break-all text-sm text-dark dark:text-white">{m.content || "(empty)"}</pre>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function SessionsLoading() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-8 w-40 animate-pulse rounded bg-gray-200" />
        <div className="mt-1 h-4 w-80 animate-pulse rounded bg-gray-200" />
      </div>
      <div className="flex gap-3">
        <div className="h-10 w-full max-w-md animate-pulse rounded-lg bg-gray-200" />
        <div className="h-10 w-24 animate-pulse rounded-lg bg-gray-200" />
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="h-96 animate-pulse rounded-xl bg-gray-200" />
        <div className="h-96 animate-pulse rounded-xl bg-gray-200" />
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

