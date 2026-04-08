"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { meowoneApi } from "@/lib/meowone-api";

// ============ 图标组件 ============
function ArrowLeftIcon() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
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

function CheckIcon() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
    </svg>
  );
}

function SparklesIcon() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
    </svg>
  );
}

// ============ 类型定义 ============
type DiscoveredCard = {
  name: string;
  description: string;
  url: string;
  version?: string;
  capabilities?: Record<string, boolean>;
  skills?: { id: string; name: string; description: string }[];
};

// ============ 主组件 ============
export default function CreateExternalAgentPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">加载中...</div>}>
      <CreateExternalAgentContent />
    </Suspense>
  );
}

function CreateExternalAgentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editName = searchParams.get("edit");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [discovering, setDiscovering] = useState(false);
  const [discoverError, setDiscoverError] = useState("");
  
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [discoveredCard, setDiscoveredCard] = useState<DiscoveredCard | null>(null);

  const isEditing = Boolean(editName);

  // 加载现有数据用于编辑
  const loadExisting = useCallback(async (agentName: string) => {
    try {
      setLoading(true);
      const agent = await meowoneApi.getExternalAgent(agentName) as {
        name: string;
        description?: string;
        base_url?: string;
        metadata_json?: Record<string, unknown>;
      };
      setName(agent.name);
      setDescription(agent.description || "");
      setBaseUrl(agent.base_url || "");
      setAuthToken((agent.metadata_json?.auth_token as string) || "");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (editName) {
      void loadExisting(editName);
    }
  }, [editName, loadExisting]);

  // 发现外部 Agent
  const handleDiscover = async () => {
    if (!baseUrl.trim()) {
      setDiscoverError("请输入 Agent 服务器地址");
      return;
    }
    try {
      setDiscovering(true);
      setDiscoverError("");
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/agents/external/discover`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: baseUrl.trim() }),
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
      } else {
        setDiscoverError("未找到 Agent Card，将以手动配置方式创建");
        setDiscoveredCard(null);
      }
    } catch (e) {
      setDiscoverError(`发现失败: ${(e as Error).message}`);
      setDiscoveredCard(null);
    } finally {
      setDiscovering(false);
    }
  };

  // 创建外部智能体
  const handleCreate = async () => {
    if (!name.trim()) {
      setError("请输入智能体名称");
      return;
    }
    if (!baseUrl.trim()) {
      setError("请输入 A2A 端点地址");
      return;
    }

    try {
      setLoading(true);
      setError("");
      
      await meowoneApi.upsertExternalAgent({
        name: name.trim(),
        description: description.trim(),
        base_url: baseUrl.trim(),
        protocol: "a2a",
        auth_token: authToken.trim() || undefined,
      });
      router.push("/meowone/agents");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-green-50">
      {/* 顶部 */}
      <div className="border-b border-gray-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto max-w-2xl px-4 py-4">
          <div className="flex items-center gap-3">
            <Link href="/meowone/agents/create" className="text-gray-500 hover:text-gray-700">
              <ArrowLeftIcon />
            </Link>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                {isEditing ? "编辑外部智能体" : "连接外部智能体"}
              </h1>
              <p className="text-sm text-gray-500">
                {isEditing ? "修改外部 Agent 连接配置" : "通过 A2A 协议连接远程 Agent"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="mx-auto max-w-2xl px-4 py-8">
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* 自动发现 */}
        <div className="mb-8 rounded-2xl border border-blue-200 bg-blue-50 p-6">
          <div className="mb-4 flex items-center gap-2 text-lg font-medium text-blue-700">
            <SparklesIcon />
            自动发现
          </div>
          <p className="mb-4 text-sm text-blue-600">
            输入外部 Agent 服务器地址，系统会自动发现其 Agent Card 并填充信息。
          </p>
          <div className="flex gap-3">
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => {
                setBaseUrl(e.target.value);
                setDiscoveredCard(null);
              }}
              placeholder="https://agent.example.com"
              className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <button
              onClick={() => void handleDiscover()}
              disabled={discovering}
              className="flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
            >
              {discovering ? (
                <>
                  <div className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  发现中
                </>
              ) : (
                <>
                  <SearchIcon />
                  发现
                </>
              )}
            </button>
          </div>
          {discoverError && (
            <p className={`mt-2 text-sm ${discoverError.includes("成功") ? "text-green-600" : "text-red-500"}`}>
              {discoverError}
            </p>
          )}
        </div>

        {/* 发现的 Agent Card */}
        {discoveredCard && (
          <div className="mb-8 rounded-2xl border border-green-200 bg-green-50 p-6">
            <div className="mb-3 flex items-center gap-2 text-lg font-medium text-green-700">
              <CheckIcon />
              发现成功！
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">名称：</span>
                <span className="font-medium text-gray-900">{discoveredCard.name}</span>
              </div>
              <div>
                <span className="text-gray-500">版本：</span>
                <span className="text-gray-900">{discoveredCard.version || "1.0.0"}</span>
              </div>
            </div>
            {discoveredCard.description && (
              <p className="mt-2 text-sm text-gray-600">{discoveredCard.description}</p>
            )}
            {discoveredCard.skills && discoveredCard.skills.length > 0 && (
              <div className="mt-3">
                <span className="text-sm text-gray-500">支持技能：</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {discoveredCard.skills.map((skill) => (
                    <span
                      key={skill.id}
                      className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700"
                    >
                      {skill.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 手动配置表单 */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-6 flex items-center gap-2 text-lg font-medium text-gray-900">
            <GlobeIcon />
            连接配置
          </h3>

          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Agent 名称 *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例如：Claude Agent"
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">A2A 端点 URL *</label>
                <input
                  type="text"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://agent.example.com/a2a"
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                <LockIcon />
                描述
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="这个 Agent 做什么"
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
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
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
              />
              <p className="mt-1 text-xs text-gray-500">
                如果远程 Agent 需要认证，请输入 Bearer Token 或 API Key
              </p>
            </div>
          </div>
        </div>

        {/* 提示信息 */}
        <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
          <p className="font-medium text-gray-700">💡 关于 A2A 协议</p>
          <ul className="mt-2 space-y-1">
            <li>• <strong>A2A (Agent2Agent)</strong>：Google 推出的开放标准协议</li>
            <li>• <strong>自动发现</strong>：通过 Agent Card 自动发现远程 Agent 的能力</li>
            <li>• <strong>Agent Card</strong>：标准的 JSON 元数据文件</li>
          </ul>
        </div>

        {/* 保存按钮 */}
        <button
          onClick={() => void handleCreate()}
          disabled={loading || !name.trim() || !baseUrl.trim()}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-green-500 to-teal-600 px-6 py-4 font-medium text-white transition-all hover:from-green-600 hover:to-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <>
              <div className="size-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              保存中...
            </>
          ) : (
            <>
              <GlobeIcon />
              {isEditing ? "保存更改" : "连接外部 Agent"}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
