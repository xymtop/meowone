"use client";

import { useEffect, useState, useCallback } from "react";
import { meowoneApi, type AgentsListResponse } from "@/lib/meowone-api";
import { cn } from "@/lib/utils";

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

function SearchIcon() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
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

function GlobeIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
    </svg>
  );
}

function SparklesIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
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

function EditIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
    </svg>
  );
}

// ============ 类型定义 ============
type ExternalAgent = {
  name: string;
  description?: string;
  agent_type?: string;
  protocol?: string;
  base_url?: string;
  enabled?: boolean;
  metadata_json?: Record<string, unknown>;
};

type DiscoveredCard = {
  name: string;
  description: string;
  url: string;
  version?: string;
  capabilities?: Record<string, boolean>;
  skills?: { id: string; name: string; description: string }[];
};

type AddMode = "manual" | "discover" | "preset";

export default function ExternalAgentsPage() {
  const [data, setData] = useState<AgentsListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [addMode, setAddMode] = useState<AddMode>("manual");
  const [editingAgent, setEditingAgent] = useState<string | null>(null);
  const [syncingCard, setSyncingCard] = useState<string | null>(null);
  const [agentCards, setAgentCards] = useState<Record<string, DiscoveredCard | null>>({});

  // 手动配置表单
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [authToken, setAuthToken] = useState("");

  // 发现功能
  const [discoverUrl, setDiscoverUrl] = useState("");
  const [discovering, setDiscovering] = useState(false);
  const [discoveredCard, setDiscoveredCard] = useState<DiscoveredCard | null>(null);

  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const result = await meowoneApi.listAgents("external");
      setData(result);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const resetForm = () => {
    setName("");
    setDescription("");
    setBaseUrl("");
    setAuthToken("");
    setDiscoverUrl("");
    setDiscoveredCard(null);
    setAddMode("manual");
  };

  const handleDiscover = async () => {
    if (!discoverUrl.trim()) {
      setError("请输入 Agent 服务器地址");
      return;
    }

    try {
      setDiscovering(true);
      setError("");
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/agents/external/discover`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: discoverUrl.trim() }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "发现失败");
      }

      const result = await response.json();
      if (result.found) {
        setDiscoveredCard(result.card);
        setName(result.card.name);
        setDescription(result.card.description || "");
        setBaseUrl(result.card.url);
      } else {
        setError("未找到 Agent Card，请确认服务器地址是否正确");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDiscovering(false);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("请输入 Agent 名称");
      return;
    }
    if (!baseUrl.trim()) {
      setError("请输入 A2A 端点地址");
      return;
    }

    try {
      setSaving(true);
      setError("");
      await meowoneApi.upsertExternalAgent({
        name: name.trim(),
        description: description.trim(),
        base_url: baseUrl.trim(),
        protocol: "a2a",
        auth_token: authToken.trim() || undefined,
      });
      resetForm();
      setShowForm(false);
      setEditingAgent(null);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (agentName: string) => {
    if (!confirm(`确定要删除外部 Agent "${agentName}" 吗？`)) return;
    try {
      await meowoneApi.deleteAgent("external", agentName);
      setAgentCards((prev) => {
        const next = { ...prev };
        delete next[agentName];
        return next;
      });
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleSyncCard = async (agentName: string, baseUrl: string) => {
    try {
      setSyncingCard(agentName);
      setError("");
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/agents/external/discover`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: baseUrl }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "同步失败");
      }

      const result = await response.json();
      if (result.found) {
        setAgentCards((prev) => ({ ...prev, [agentName]: result.card }));
      } else {
        setAgentCards((prev) => ({ ...prev, [agentName]: null }));
      }
    } catch (e) {
      setError(`同步 Agent Card 失败: ${(e as Error).message}`);
    } finally {
      setSyncingCard(null);
    }
  };

  const handleEditAgent = (agent: ExternalAgent) => {
    setName(agent.name);
    setDescription(agent.description || "");
    setBaseUrl(agent.base_url || "");
    // 从 metadata_json 中获取 auth_token
    const metadata = agent.metadata_json as Record<string, unknown> | undefined;
    setAuthToken((metadata?.auth_token as string) || "");
    setEditingAgent(agent.name);
    setShowForm(true);
    setAddMode("manual");
  };

  const agents = (data?.agents || []) as ExternalAgent[];

  // 预设模板
  const presetTemplates = [
    {
      name: "Claude Agent",
      description: "Anthropic Claude AI Assistant",
      baseUrl: "https://claude.example.com/a2a",
    },
    {
      name: "Gemini Agent",
      description: "Google Gemini AI Assistant",
      baseUrl: "https://gemini.example.com/a2a",
    },
  ];

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">外部智能体 (A2A)</h1>
          <p className="mt-1 text-sm text-gray-500">通过 A2A 协议连接和管理外部 AI 智能体</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setEditingAgent(null);
            setShowForm(!showForm);
          }}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl px-5 py-2.5 font-medium transition-all",
            showForm
              ? "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              : "bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700"
          )}
        >
          {showForm ? "取消" : <><PlusIcon /> 添加外部 Agent</>}
        </button>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* 添加表单 */}
      {showForm && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            {editingAgent ? `编辑外部 Agent: ${editingAgent}` : "添加外部 Agent"}
          </h3>

          {/* 添加方式切换 */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setAddMode("manual")}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                addMode === "manual"
                  ? "bg-indigo-100 text-indigo-700"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              手动配置
            </button>
            <button
              onClick={() => setAddMode("discover")}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                addMode === "discover"
                  ? "bg-indigo-100 text-indigo-700"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              <SparklesIcon /> 自动发现
            </button>
            <button
              onClick={() => setAddMode("preset")}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                addMode === "preset"
                  ? "bg-indigo-100 text-indigo-700"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              预设模板
            </button>
          </div>

          {/* 手动配置 */}
          {addMode === "manual" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Agent 名称 *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="例如：My Claude"
                    className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    A2A 端点 URL *
                  </label>
                  <input
                    type="text"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder="https://agent.example.com/a2a"
                    className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  描述
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="这个 Agent 做什么"
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  <LockIcon />
                  认证令牌 (可选)
                </label>
                <input
                  type="password"
                  value={authToken}
                  onChange={(e) => setAuthToken(e.target.value)}
                  placeholder="Bearer Token 或 API Key"
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                <p className="mt-1 text-xs text-gray-500">
                  如果远程 Agent 需要认证，请输入 Bearer Token 或 API Key
                </p>
              </div>
            </div>
          )}

          {/* 自动发现 */}
          {addMode === "discover" && (
            <div className="space-y-4">
              <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4">
                <p className="text-sm text-indigo-700">
                  输入外部 Agent 服务器地址，系统会自动发现其 Agent Card 并填充信息。
                </p>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Agent 服务器地址
                  </label>
                  <input
                    type="text"
                    value={discoverUrl}
                    onChange={(e) => setDiscoverUrl(e.target.value)}
                    placeholder="https://agent.example.com"
                    className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={() => void handleDiscover()}
                    disabled={discovering}
                    className="rounded-lg bg-indigo-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-indigo-600 disabled:opacity-50"
                  >
                    {discovering ? "发现中..." : "发现"}
                  </button>
                </div>
              </div>

              {/* 发现结果 */}
              {discoveredCard && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-green-700 mb-2">
                    <SparklesIcon /> 发现成功！
                  </div>
                  <div className="space-y-1 text-sm text-green-600">
                    <p><strong>名称：</strong>{discoveredCard.name}</p>
                    <p><strong>描述：</strong>{discoveredCard.description}</p>
                    {discoveredCard.skills && discoveredCard.skills.length > 0 && (
                      <p><strong>技能：</strong>{discoveredCard.skills.map(s => s.name).join(", ")}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 预设模板 */}
          {addMode === "preset" && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {presetTemplates.map((template) => (
                <button
                  key={template.name}
                  onClick={() => {
                    setName(template.name);
                    setDescription(template.description);
                    setBaseUrl(template.baseUrl);
                    setAuthToken("");
                  }}
                  className="rounded-lg border border-gray-200 bg-white p-4 text-left transition-all hover:border-indigo-300 hover:bg-indigo-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                      <RobotIcon />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{template.name}</h4>
                      <p className="text-sm text-gray-500">{template.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={() => {
                resetForm();
                setShowForm(false);
                setEditingAgent(null);
              }}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              取消
            </button>
            <button
              onClick={() => void handleSubmit()}
              disabled={saving}
              className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-600 disabled:opacity-50"
            >
              {saving ? "保存中..." : editingAgent ? "保存修改" : "添加"}
            </button>
          </div>
        </div>
      )}

      {/* 加载状态 */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="size-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          <span className="ml-3 text-gray-500">加载中...</span>
        </div>
      )}

      {/* 外部 Agent 列表 */}
      {!loading && (
        <>
          {agents.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 py-16">
              <div className="flex size-16 items-center justify-center rounded-full bg-indigo-50">
                <RobotIcon />
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">还没有外部 Agent</h3>
              <p className="mt-2 text-sm text-gray-500">
                通过 A2A 协议连接外部 AI 智能体
              </p>
              <button
                onClick={() => {
                  resetForm();
                  setShowForm(true);
                }}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-3 font-medium text-white transition-all hover:from-indigo-600 hover:to-purple-700"
              >
                <PlusIcon />
                添加第一个外部 Agent
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {agents.map((agent) => {
                const card = agentCards[agent.name];
                return (
                  <div
                    key={agent.name}
                    className="group overflow-hidden rounded-2xl border border-gray-200 bg-white transition-all hover:border-indigo-300 hover:shadow-lg"
                  >
                    <div className="p-5">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex size-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                            <RobotIcon />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{agent.name}</h3>
                            <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                              <GlobeIcon /> A2A
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 transition-all group-hover:opacity-100">
                          <button
                            onClick={() => void handleSyncCard(agent.name, agent.base_url || "")}
                            disabled={syncingCard === agent.name}
                            title="同步 Agent Card"
                            className="flex items-center justify-center rounded-lg p-1.5 text-gray-400 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-500"
                          >
                            <RefreshIcon />
                          </button>
                          <button
                            onClick={() => void handleEditAgent(agent)}
                            title="编辑"
                            className="flex items-center justify-center rounded-lg p-1.5 text-gray-400 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-500"
                          >
                            <EditIcon />
                          </button>
                          <button
                            onClick={() => void handleDelete(agent.name)}
                            title="删除"
                            className="flex items-center justify-center rounded-lg p-1.5 text-gray-400 hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      </div>

                      {/* 描述 */}
                      {agent.description && (
                        <p className="mt-3 text-sm text-gray-600 line-clamp-2">
                          {agent.description}
                        </p>
                      )}

                      {/* Agent Card 技能信息 */}
                      {card && card.skills && card.skills.length > 0 && (
                        <div className="mt-3">
                          <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                            <SparklesIcon />
                            技能 ({card.skills.length})
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {card.skills.slice(0, 3).map((skill) => (
                              <span
                                key={skill.id}
                                className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-600"
                                title={skill.description}
                              >
                                {skill.name}
                              </span>
                            ))}
                            {card.skills.length > 3 && (
                              <span className="inline-flex items-center rounded-full bg-gray-50 px-2 py-0.5 text-xs text-gray-500">
                                +{card.skills.length - 3}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* 同步中状态 */}
                      {syncingCard === agent.name && (
                        <div className="mt-3 flex items-center gap-2 text-xs text-blue-500">
                          <div className="size-3 animate-spin rounded-full border border-blue-500 border-t-transparent" />
                          同步中...
                        </div>
                      )}

                      {/* 端点地址 */}
                      {agent.base_url && (
                        <div className="mt-4 rounded-lg bg-gray-50 p-3">
                          <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                            <GlobeIcon />
                            A2A 端点
                          </div>
                          <code className="block truncate font-mono text-xs text-gray-700">
                            {agent.base_url}
                          </code>
                        </div>
                      )}

                      {/* 协议 */}
                      <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                        <LockIcon />
                        协议：{agent.protocol || "a2a"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* 提示信息 */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
        <p className="font-medium text-gray-700">关于 A2A 协议</p>
        <ul className="mt-2 space-y-1">
          <li><strong>A2A (Agent2Agent)</strong>：Google 推出的开放标准协议，用于 AI 智能体之间的互联互通</li>
          <li><strong>自动发现</strong>：通过 Agent Card 自动发现远程 Agent 的能力</li>
          <li><strong>Agent Card</strong>：标准的 JSON 元数据文件，包含名称、描述、技能列表等</li>
          <li><strong>连接方式</strong>：支持手动配置 URL 或通过标准路径发现</li>
        </ul>
      </div>
    </div>
  );
}
