"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { meowoneApi } from "@/lib/meowone-api";
import { useRouter } from "next/navigation";

// ============ 图标组件 ============
function RobotIcon() {
  return (
    <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672z" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
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

function SparkleIcon() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
    </svg>
  );
}

function BrainIcon() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
    </svg>
  );
}

function PlugIcon() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
    </svg>
  );
}

function ToolIcon() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function WorkflowIcon() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
    </svg>
  );
}

function TaskIcon() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.801 0A2.251 2.251 0 0113.5 2.25H5c-.324 0-.599.259-.75.5v17.25c0 .414.336.75.75.75h.75m2.25 0a2.251 2.251 0 00-2.25 2.25h13.5m-13.5 0H3a2.25 2.25 0 01-2.25-2.25V6.108c0-1.135.845-2.098 1.976-2.192a48.424 48.424 0 001.123-.08m5.801 0c.065.21.1.433.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.801 0A2.251 2.251 0 0113.5 2.25H5c-.324 0-.599.259-.75.5v.258c0 .414.336.75.75.75h.75" />
    </svg>
  );
}

function MonitorIcon() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg className="size-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg className="size-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  );
}

function XCircleIcon() {
  return (
    <svg className="size-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

// ============ 类型定义 ============
type Agent = {
  name: string;
  description?: string;
  agent_type?: string;
  mcp_servers?: string[];
  agent_skills?: string[];
};

type SystemStatus = {
  health: string;
  modelCount: number;
  defaultModel: string;
  mcpCount: number;
  skillCount: number;
  agentCount: number;
  agents: Agent[];
  hasWarning: boolean;
  warnings: string[];
};

// ============ 主组件 ============
export default function QuickStartPage() {
  const router = useRouter();
  const [status, setStatus] = useState<SystemStatus>({
    health: "checking",
    modelCount: 0,
    defaultModel: "",
    mcpCount: 0,
    skillCount: 0,
    agentCount: 0,
    agents: [],
    hasWarning: false,
    warnings: [],
  });
  const [loading, setLoading] = useState(true);

  const loadStatus = useCallback(async () => {
    try {
      setLoading(true);
      const warnings: string[] = [];
      
      const [health, models, mcps, skills, agents] = await Promise.all([
        meowoneApi.health().catch(() => ({ status: "error" })),
        meowoneApi.listModels().catch(() => ({ count: 0, models: [] })),
        meowoneApi.listMcp().catch(() => ({ count: 0, servers: [] })),
        meowoneApi.listSkills().catch(() => ({ count: 0, skills: [] })),
        meowoneApi.listAgents().catch(() => ({ count: 0, agents: [] })),
      ]);

      const healthStatus = (health as { status?: string }).status || "error";
      const modelList = (models as { models?: Record<string, unknown>[] }).models || [];
      const defaultModel = modelList.find((m) => (m as Record<string, unknown>).is_default) as Record<string, unknown> | undefined;
      const agentList = (agents as { agents?: Agent[] }).agents || [];

      if (healthStatus !== "ok" && healthStatus !== "ok") {
        warnings.push("后端服务未连接");
      }
      if (!defaultModel) {
        warnings.push("未配置默认模型");
      }
      if (modelList.length === 0) {
        warnings.push("还没有添加任何模型");
      }

      setStatus({
        health: healthStatus,
        modelCount: (models as { count: number }).count || 0,
        defaultModel: String(defaultModel?.name || ""),
        mcpCount: (mcps as { count: number }).count || 0,
        skillCount: (skills as { count: number }).count || 0,
        agentCount: (agents as { count: number }).count || 0,
        agents: agentList.slice(0, 3), // 只显示前3个
        hasWarning: warnings.length > 0,
        warnings,
      });
    } catch (e) {
      console.error("加载状态失败:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const isSystemReady = status.modelCount > 0 && status.health === "ok";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      {/* 顶部导航 */}
      <div className="border-b border-gray-200/50 bg-white/80 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">MeowOne</h1>
              <p className="mt-0.5 text-sm text-gray-500">构建你的 AI 智能体</p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/meowone/chat"
                className="flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600"
              >
                <ChatIcon />
                开始对话
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* 系统状态提示 */}
        {status.hasWarning && (
          <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <WarningIcon />
              <div>
                <h3 className="font-medium text-amber-800">系统尚未就绪</h3>
                <p className="mt-1 text-sm text-amber-700">
                  为了获得最佳体验，建议先完成以下配置：
                </p>
                <ul className="mt-2 space-y-1">
                  {status.warnings.map((w, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-amber-700">
                      <span className="size-1.5 rounded-full bg-amber-500" />
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* 快速开始卡片 */}
        <div className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">🚀 快速开始</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* 创建智能体 */}
            <button
              onClick={() => router.push("/meowone/agents/create")}
              className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 text-left shadow-sm transition-all hover:border-blue-300 hover:shadow-md hover:shadow-blue-500/10"
            >
              <div className="absolute right-4 top-4 opacity-0 transition-opacity group-hover:opacity-100">
                <ArrowRightIcon />
              </div>
              <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                <PlusIcon />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">创建智能体</h3>
              <p className="mt-2 text-sm text-gray-500">
                通过简单的步骤，配置模型、数据源和技能，构建属于你的 AI 助手
              </p>
              {status.agentCount > 0 && (
                <p className="mt-3 text-xs text-blue-600">
                  已创建 {status.agentCount} 个智能体
                </p>
              )}
            </button>

            {/* 开始对话 */}
            <Link
              href="/meowone/chat"
              className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 text-left shadow-sm transition-all hover:border-green-300 hover:shadow-md hover:shadow-green-500/10"
            >
              <div className="absolute right-4 top-4 opacity-0 transition-opacity group-hover:opacity-100">
                <ArrowRightIcon />
              </div>
              <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-teal-600 text-white">
                <ChatIcon />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">开始对话</h3>
              <p className="mt-2 text-sm text-gray-500">
                与智能体进行对话，测试其能力，体验 AI 带来的便利
              </p>
            </Link>

            {/* 查看教程 */}
            <button
              onClick={() => {
                // TODO: 打开教程/引导
                alert("教程功能开发中...");
              }}
              className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 text-left shadow-sm transition-all hover:border-purple-300 hover:shadow-md hover:shadow-purple-500/10"
            >
              <div className="absolute right-4 top-4 opacity-0 transition-opacity group-hover:opacity-100">
                <ArrowRightIcon />
              </div>
              <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 text-white">
                <SparkleIcon />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">使用教程</h3>
              <p className="mt-2 text-sm text-gray-500">
                了解如何使用 MeowOne，从基础概念到高级配置
              </p>
            </button>
          </div>
        </div>

        {/* 我的智能体 */}
        {status.agents.length > 0 && (
          <div className="mb-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">🎯 我的智能体</h2>
              <Link
                href="/meowone/agents"
                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
              >
                查看全部
                <ArrowRightIcon />
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {status.agents.map((agent) => (
                <Link
                  key={agent.name}
                  href={`/meowone/agents/internal/${encodeURIComponent(agent.name)}`}
                  className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-100">
                      <RobotIcon />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-medium text-gray-900">{agent.name}</h3>
                      <p className="mt-1 truncate text-sm text-gray-500">
                        {agent.description || "暂无描述"}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {agent.mcp_servers && agent.mcp_servers.length > 0 && (
                          <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-700">
                            {agent.mcp_servers.length} MCP
                          </span>
                        )}
                        {agent.agent_skills && agent.agent_skills.length > 0 && (
                          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
                            {agent.agent_skills.length} 技能
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* 能力中心 */}
        <div className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">⚙️ 能力中心</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* 模型 */}
            <Link
              href="/meowone/models"
              className="group rounded-xl border border-gray-200 bg-white p-4 transition-all hover:border-gray-300 hover:shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className={`rounded-lg p-2 ${status.modelCount > 0 ? "bg-blue-50 text-blue-600" : "bg-gray-50 text-gray-400"}`}>
                  <BrainIcon />
                </div>
                <div>
                  <p className="font-medium text-gray-900">模型</p>
                  <p className="text-sm text-gray-500">
                    {status.modelCount} 个可用
                    {status.defaultModel && (
                      <span className="ml-1 text-blue-600">({status.defaultModel})</span>
                    )}
                  </p>
                </div>
              </div>
            </Link>

            {/* MCP */}
            <Link
              href="/meowone/capabilities-mcp"
              className="group rounded-xl border border-gray-200 bg-white p-4 transition-all hover:border-gray-300 hover:shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className={`rounded-lg p-2 ${status.mcpCount > 0 ? "bg-purple-50 text-purple-600" : "bg-gray-50 text-gray-400"}`}>
                  <PlugIcon />
                </div>
                <div>
                  <p className="font-medium text-gray-900">MCP 数据源</p>
                  <p className="text-sm text-gray-500">
                    {status.mcpCount} 个已连接
                  </p>
                </div>
              </div>
            </Link>

            {/* 技能 */}
            <Link
              href="/meowone/capabilities-skills"
              className="group rounded-xl border border-gray-200 bg-white p-4 transition-all hover:border-gray-300 hover:shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className={`rounded-lg p-2 ${status.skillCount > 0 ? "bg-green-50 text-green-600" : "bg-gray-50 text-gray-400"}`}>
                  <ToolIcon />
                </div>
                <div>
                  <p className="font-medium text-gray-900">技能</p>
                  <p className="text-sm text-gray-500">
                    {status.skillCount} 个可用
                  </p>
                </div>
              </div>
            </Link>

    

            {/* 任务 */}
            <Link
              href="/meowone/tasks"
              className="group rounded-xl border border-gray-200 bg-white p-4 transition-all hover:border-gray-300 hover:shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-teal-50 p-2 text-teal-600 group-hover:bg-teal-100">
                  <TaskIcon />
                </div>
                <div>
                  <p className="font-medium text-gray-900">任务管理</p>
                  <p className="text-sm text-gray-500">监控任务执行</p>
                </div>
              </div>
            </Link>

            {/* 监控 */}
            <Link
              href="/meowone/monitoring"
              className="group rounded-xl border border-gray-200 bg-white p-4 transition-all hover:border-gray-300 hover:shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600 group-hover:bg-indigo-100">
                  <MonitorIcon />
                </div>
                <div>
                  <p className="font-medium text-gray-900">系统监控</p>
                  <p className="text-sm text-gray-500">查看运行状态</p>
                </div>
              </div>
            </Link>

            {/* 历史记录 */}
            <Link
              href="/meowone/sessions"
              className="group rounded-xl border border-gray-200 bg-white p-4 transition-all hover:border-gray-300 hover:shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-gray-50 p-2 text-gray-400 group-hover:bg-gray-100">
                  <HistoryIcon />
                </div>
                <div>
                  <p className="font-medium text-gray-900">历史记录</p>
                  <p className="text-sm text-gray-500">查看对话历史</p>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* 系统状态 */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">📊 系统状态</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            <div className="rounded-xl bg-gray-50 p-4 text-center">
              <div className="flex justify-center">
                {status.health === "ok" ? (
                  <CheckCircleIcon />
                ) : (
                  <XCircleIcon />
                )}
              </div>
              <p className="mt-2 text-sm font-medium text-gray-900">后端服务</p>
              <p className={`text-xs ${status.health === "ok" ? "text-green-600" : "text-red-500"}`}>
                {status.health === "ok" ? "运行正常" : "连接失败"}
              </p>
            </div>
            <div className="rounded-xl bg-gray-50 p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{status.modelCount}</p>
              <p className="mt-1 text-sm text-gray-500">模型</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-4 text-center">
              <p className="text-2xl font-bold text-purple-600">{status.mcpCount}</p>
              <p className="mt-1 text-sm text-gray-500">MCP</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{status.skillCount}</p>
              <p className="mt-1 text-sm text-gray-500">技能</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-4 text-center">
              <p className="text-2xl font-bold text-orange-600">{status.agentCount}</p>
              <p className="mt-1 text-sm text-gray-500">智能体</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-4 text-center">
              <p className="text-2xl font-bold text-gray-600">{isSystemReady ? "✓" : "✗"}</p>
              <p className="mt-1 text-sm text-gray-500">就绪状态</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
