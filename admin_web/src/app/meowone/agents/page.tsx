"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { meowoneApi, type AgentsListResponse } from "@/lib/meowone-api";

// ============ 图标组件 ============
function PlusIcon() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function RobotIcon() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  );
}

// ============ 类型定义 ============
type AgentTypeFilter = "" | "internal" | "external";

type AgentCard = {
  name: string;
  description?: string;
  agent_type?: string;
  protocol?: string;
  mcp_servers?: string[];
  agent_skills?: string[];
  enabled?: boolean;
  prompt_key?: string;
  system_prompt?: string;
};

function AgentsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const param = searchParams.get("agent_type");
  const agentType: AgentTypeFilter = param === "internal" || param === "external" ? param : "";
  const [data, setData] = useState<AgentsListResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState("");

  const setFilter = (v: AgentTypeFilter) => {
    const sp = new URLSearchParams();
    if (v) sp.set("agent_type", v);
    const qs = sp.toString();
    router.replace(qs ? `/meowone/agents?${qs}` : "/meowone/agents");
  };

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      setData(await meowoneApi.listAgents(agentType || undefined));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [agentType]);

  const allAgents = (data?.agents || []) as AgentCard[];
  const filteredAgents = allAgents.filter((a) => {
    const name = String(a.name ?? "");
    const desc = String(a.description ?? "");
    const typ = String(a.agent_type ?? "");
    return keyword.trim()
      ? [name, desc, typ].join(" ").toLowerCase().includes(keyword.trim().toLowerCase())
      : true;
  });

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">我的智能体</h1>
          <p className="mt-1 text-sm text-gray-500">管理你的 AI 智能体，配置其能力和行为</p>
        </div>
        <Link
          href="/meowone/agents/create"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-5 py-2.5 font-medium text-white transition-all hover:from-blue-600 hover:to-purple-700"
        >
          <PlusIcon />
          创建智能体
        </Link>
      </div>

      {/* 筛选和搜索 */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-1 dark:border-dark-3 dark:bg-dark-2">
          <button
            type="button"
            onClick={() => setFilter("")}
            className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
              agentType === "" ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            全部
          </button>
          <button
            type="button"
            onClick={() => setFilter("internal")}
            className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
              agentType === "internal" ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            内部
          </button>
          <button
            type="button"
            onClick={() => setFilter("external")}
            className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
              agentType === "external" ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            外部
          </button>
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
            <SearchIcon />
          </div>
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索智能体..."
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm dark:border-dark-3 dark:bg-dark-2"
          />
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 dark:border-dark-3 dark:bg-dark-2"
        >
          <RefreshIcon />
          刷新
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* 加载状态 */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="size-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          <span className="ml-3 text-gray-500">加载中...</span>
        </div>
      )}

      {/* 智能体列表 */}
      {!loading && filteredAgents.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredAgents.map((a) => {
            const typ = String(a.agent_type ?? "?");
            const nm = String(a.name ?? "");
            const mcpCount = Array.isArray(a.mcp_servers) ? a.mcp_servers.length : 0;
            const skillCount = Array.isArray(a.agent_skills) ? a.agent_skills.length : 0;
            const hasPrompt = Boolean(a.prompt_key || a.system_prompt);
            const isEnabled = a.enabled !== false;

            return (
              <div
                key={`${typ}-${nm}`}
                className="group overflow-hidden rounded-2xl border border-gray-200 bg-white transition-all hover:border-blue-300 hover:shadow-lg hover:shadow-blue-500/10"
              >
                {/* 卡片头部 */}
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-white/20 text-white">
                      <RobotIcon />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-semibold text-white">{nm}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs text-white/90">
                          {typ}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-xs ${
                          isEnabled ? "bg-green-400/30 text-green-100" : "bg-gray-400/30 text-gray-200"
                        }`}>
                          {isEnabled ? "运行中" : "已停用"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 卡片内容 */}
                <div className="p-4">
                  <p className="text-sm text-gray-500 line-clamp-2">
                    {a.description || "暂无描述"}
                  </p>

                  {/* 能力标签 */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {mcpCount > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-1 text-xs text-purple-600">
                        <span className="size-1.5 rounded-full bg-purple-500" />
                        {mcpCount} MCP
                      </span>
                    )}
                    {skillCount > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs text-green-600">
                        <span className="size-1.5 rounded-full bg-green-500" />
                        {skillCount} 技能
                      </span>
                    )}
                    {hasPrompt && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs text-blue-600">
                        <span className="size-1.5 rounded-full bg-blue-500" />
                        提示词
                      </span>
                    )}
                    {!mcpCount && !skillCount && !hasPrompt && (
                      <span className="text-xs text-gray-400">未配置</span>
                    )}
                  </div>

                  {/* 操作按钮 */}
                  <div className="mt-4 flex items-center gap-2">
                    <Link
                      href={`/meowone/chat?agent=${encodeURIComponent(nm)}`}
                      className="flex items-center justify-center gap-1.5 rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-100"
                    >
                      <ChatIcon />
                      聊天
                    </Link>
                    {typ === "external" ? (
                      <Link
                        href={`/meowone/agents/create/external?edit=${encodeURIComponent(nm)}`}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-100"
                      >
                        <SettingsIcon />
                        配置
                      </Link>
                    ) : (
                      <Link
                        href={`/meowone/agents/${typ}/${nm}`}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-100"
                      >
                        <SettingsIcon />
                        配置
                      </Link>
                    )}
                    <Link
                      href={`/meowone/images/create`}
                      className="flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm text-green-600 transition-colors hover:bg-green-50"
                    >
                      创建镜像
                    </Link>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!confirm(`确定要删除「${nm}」吗？`)) return;
                        await meowoneApi.deleteAgent(typ, nm);
                        await load();
                      }}
                      className="flex items-center justify-center rounded-lg border border-gray-200 p-2 text-red-500 transition-colors hover:bg-red-50 hover:border-red-200"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : !loading ? (
        /* 空状态 */
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 py-16">
          <div className="flex size-16 items-center justify-center rounded-full bg-gray-100">
            <RobotIcon />
          </div>
          <h3 className="mt-4 text-lg font-medium text-gray-900">还没有智能体</h3>
          <p className="mt-2 text-sm text-gray-500">创建一个属于你的 AI 智能体，开始对话吧</p>
          <Link
            href="/meowone/agents/create"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-3 font-medium text-white transition-all hover:from-blue-600 hover:to-purple-700"
          >
            <PlusIcon />
            创建第一个智能体
          </Link>
        </div>
      ) : null}

      {/* 说明 */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500 dark:border-dark-3 dark:bg-dark">
        <p className="font-medium text-gray-700 dark:text-gray-300">💡 提示</p>
        <ul className="mt-2 space-y-1">
          <li>• 内部智能体：由系统配置的智能体，支持完整的功能配置</li>
          <li>• 外部智能体：连接外部服务的智能体，通过 API 进行交互</li>
          <li>• 点击「对话」可直接测试智能体效果</li>
        </ul>
      </div>
    </div>
  );
}

function AgentsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="h-8 w-40 animate-pulse rounded bg-gray-200" />
          <div className="mt-1 h-4 w-64 animate-pulse rounded bg-gray-200" />
        </div>
        <div className="h-10 w-32 animate-pulse rounded-xl bg-gray-200" />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="h-9 w-20 animate-pulse rounded-lg bg-gray-200" />
        <div className="h-9 w-20 animate-pulse rounded-lg bg-gray-200" />
        <div className="h-9 w-20 animate-pulse rounded-lg bg-gray-200" />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-64 animate-pulse rounded-2xl bg-gray-200" />
        ))}
      </div>
    </div>
  );
}

export default function AgentsPage() {
  return (
    <Suspense fallback={<AgentsLoading />}>
      <AgentsContent />
    </Suspense>
  );
}
