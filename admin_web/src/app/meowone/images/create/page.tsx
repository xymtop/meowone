"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { meowoneApi } from "@/lib/meowone-api";

type Agent = {
  id: string;
  name: string;
  description?: string;
  agent_type: string;
  mcp_servers?: string[];
  agent_skills?: string[];
  prompt_key?: string;
};

type Strategy = { id: string; name: string; description?: string };
type Environment = { id: string; name: string; description?: string };

export default function CreateImagePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // 基础信息
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  // 数据
  const [agents, setAgents] = useState<Agent[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [strategyConfigs, setStrategyConfigs] = useState<{id: string; name: string; config_json?: Record<string, unknown>}[]>([]);

  // 选择的值
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState("");
  const [selectedStrategyConfig, setSelectedStrategyConfig] = useState("");
  const [selectedEnv, setSelectedEnv] = useState("");

  useEffect(() => {
    void loadOptions();
  }, []);

  const loadOptions = async () => {
    setLoading(true);
    setError("");
    
    // 分步加载，每个 API 独立处理
    try {
      const agentData = await meowoneApi.listAgents();
      setAgents((agentData.agents || []) as Agent[]);
    } catch (e) {
      console.error("加载智能体失败:", e);
    }

    try {
      const strategyData = await meowoneApi.listStrategies();
      setStrategies((strategyData as {strategies: Strategy[]}).strategies || []);
    } catch (e) {
      console.error("加载策略失败:", e);
    }

    try {
      const configData = await meowoneApi.listStrategyConfigs();
      setStrategyConfigs((configData as {configs: {id: string; name: string; config_json?: Record<string, unknown>}[]}).configs || []);
    } catch (e) {
      console.error("加载策略配置失败:", e);
    }

    try {
      const envData = await meowoneApi.listEnvironments();
      setEnvironments((envData as {environments: Environment[]}).environments || []);
    } catch (e) {
      console.error("加载环境失败:", e);
    }

    setLoading(false);
  };

  const toggleAgent = (agentId: string) => {
    if (selectedAgents.includes(agentId)) {
      setSelectedAgents(selectedAgents.filter((id) => id !== agentId));
    } else {
      setSelectedAgents([...selectedAgents, agentId]);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("请输入镜像名称");
      return;
    }
    if (selectedAgents.length === 0) {
      setError("请至少选择一个智能体");
      return;
    }

    setSaving(true);
    setError("");

    try {
      // 如果选择了预配置的策略配置，使用其 JSON；否则使用自定义 JSON
      let parsedConfig: Record<string, unknown> | undefined;
      if (selectedStrategyConfig) {
        const selected = strategyConfigs.find((c) => c.id === selectedStrategyConfig);
        if (selected?.config_json) {
          parsedConfig = selected.config_json;
        }
      }

      await meowoneApi.createAgentImage({
        name: name.trim(),
        description: description.trim(),
        agent_ids: selectedAgents,
        strategy_id: selectedStrategy || undefined,
        strategy_config: parsedConfig,
        environment_id: selectedEnv || undefined,
      });
      router.push("/meowone/images");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="size-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        <span className="ml-3 text-gray-500">加载配置选项...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">创建智能体镜像</h1>
        <p className="mt-1 text-sm text-gray-500">选择多个智能体，并可选绑定调度策略与执行环境，组合成镜像</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {/* 基础信息 */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
          <h2 className="mb-4 text-lg font-semibold">基础信息</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                镜像名称 <span className="text-red-500">*</span>
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：我的助手镜像"
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm dark:border-dark-3 dark:bg-dark"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                描述
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="描述这个镜像的用途..."
                rows={2}
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm dark:border-dark-3 dark:bg-dark"
              />
            </div>
          </div>
        </div>

        {/* 智能体选择 */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
          <h2 className="mb-4 text-lg font-semibold">
            选择智能体 <span className="text-red-500">*</span>
          </h2>
          {agents.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {agents.map((agent) => {
                const isSelected = selectedAgents.includes(agent.id);
                return (
                  <button
                    key={agent.id}
                    onClick={() => toggleAgent(agent.id)}
                    className={`rounded-lg border p-4 text-left transition-all ${
                      isSelected
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                        : "border-gray-200 hover:border-blue-300 dark:border-dark-3"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleAgent(agent.id)}
                        className="mt-1 h-4 w-4 rounded border-gray-300"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-gray-900 dark:text-white">{agent.name}</div>
                        <div className="mt-1 text-sm text-gray-500">{agent.description || "无描述"}</div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600 dark:bg-dark-3">
                            {agent.agent_type}
                          </span>
                          {Array.isArray(agent.mcp_servers) && agent.mcp_servers.length > 0 && (
                            <span className="rounded bg-purple-100 px-1.5 py-0.5 text-xs text-purple-600">
                              {agent.mcp_servers.length} MCP
                            </span>
                          )}
                          {Array.isArray(agent.agent_skills) && agent.agent_skills.length > 0 && (
                            <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-600">
                              {agent.agent_skills.length} 技能
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-lg border-2 border-dashed border-gray-200 p-8 text-center">
              <p className="text-gray-500">还没有智能体</p>
              <a
                href="/meowone/agents/create"
                className="mt-2 inline-block text-blue-500 hover:underline"
              >
                创建一个智能体
              </a>
            </div>
          )}
          <p className="mt-3 text-sm text-gray-500">已选择 {selectedAgents.length} 个智能体</p>
        </div>

        {/* 调度配置 */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* 调度策略 */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
            <h2 className="mb-4 text-lg font-semibold flex items-center gap-2">
              <span className="size-2 rounded-full bg-blue-500"></span>
              调度策略
            </h2>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-dark transition-colors">
                <input
                  type="radio"
                  name="strategy"
                  checked={selectedStrategy === ""}
                  onChange={() => setSelectedStrategy("")}
                  className="h-4 w-4"
                />
                <div>
                  <div className="text-sm font-medium">默认策略</div>
                  <div className="text-xs text-gray-500">系统自动选择</div>
                </div>
              </label>
              {strategies.map((strategy) => (
                <label key={strategy.id} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedStrategy === strategy.id
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                    : "border-gray-200 hover:border-blue-300 hover:bg-gray-50 dark:border-dark-3 dark:hover:bg-dark"
                }`}>
                  <input
                    type="radio"
                    name="strategy"
                    checked={selectedStrategy === strategy.id}
                    onChange={() => setSelectedStrategy(strategy.id)}
                    className="mt-1 h-4 w-4"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{strategy.name}</div>
                    <div className="text-xs text-gray-500 truncate">{strategy.description || ""}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* 策略配置 */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
            <h2 className="mb-4 text-lg font-semibold flex items-center gap-2">
              <span className="size-2 rounded-full bg-amber-500"></span>
              策略配置
            </h2>

            {selectedStrategy ? (
              strategyConfigs.length > 0 ? (
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-dark transition-colors">
                    <input
                      type="radio"
                      name="strategyConfig"
                      checked={selectedStrategyConfig === ""}
                      onChange={() => setSelectedStrategyConfig("")}
                      className="h-4 w-4"
                    />
                    <div>
                      <div className="text-sm font-medium">不使用配置</div>
                      <div className="text-xs text-gray-500">留空，使用策略默认值</div>
                    </div>
                  </label>
                  {strategyConfigs.map((cfg) => (
                    <label key={cfg.id} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedStrategyConfig === cfg.id
                        ? "border-amber-500 bg-amber-50 dark:bg-amber-900/20"
                        : "border-gray-200 hover:border-amber-300 hover:bg-gray-50 dark:border-dark-3 dark:hover:bg-dark"
                    }`}>
                      <input
                        type="radio"
                        name="strategyConfig"
                        checked={selectedStrategyConfig === cfg.id}
                        onChange={() => setSelectedStrategyConfig(cfg.id)}
                        className="mt-1 h-4 w-4"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{cfg.name}</div>
                        {cfg.config_json && Object.keys(cfg.config_json).length > 0 ? (
                          <pre className="mt-1.5 text-xs font-mono text-gray-500 bg-gray-100 dark:bg-dark p-2 rounded overflow-x-auto max-h-20">
                            {JSON.stringify(cfg.config_json, null, 2)}
                          </pre>
                        ) : (
                          <div className="text-xs text-gray-400 mt-1">空配置</div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="size-12 rounded-full bg-amber-100 flex items-center justify-center mb-3">
                    <svg className="size-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-500 mb-3">还没有策略配置</p>
                  <a
                    href="/meowone/scheduler/strategy-configs/create"
                    className="inline-flex items-center gap-1 text-sm text-blue-500 hover:text-blue-600"
                  >
                    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v15m7.5-7.5h-15" />
                    </svg>
                    去创建
                  </a>
                </div>
              )
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="size-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                  <svg className="size-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                  </svg>
                </div>
                <p className="text-sm text-gray-500">请先选择调度策略</p>
                <p className="text-xs text-gray-400 mt-1">策略配置依赖于选中的调度策略</p>
              </div>
            )}
          </div>

          {/* 执行环境 */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
            <h2 className="mb-4 text-lg font-semibold flex items-center gap-2">
              <span className="size-2 rounded-full bg-green-500"></span>
              执行环境
            </h2>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-dark transition-colors">
                <input
                  type="radio"
                  name="env"
                  checked={selectedEnv === ""}
                  onChange={() => setSelectedEnv("")}
                  className="h-4 w-4"
                />
                <div>
                  <div className="text-sm font-medium">默认环境</div>
                  <div className="text-xs text-gray-500">本地原生环境</div>
                </div>
              </label>
              {environments.map((env) => (
                <label key={env.id} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedEnv === env.id
                    ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                    : "border-gray-200 hover:border-green-300 hover:bg-gray-50 dark:border-dark-3 dark:hover:bg-dark"
                }`}>
                  <input
                    type="radio"
                    name="env"
                    checked={selectedEnv === env.id}
                    onChange={() => setSelectedEnv(env.id)}
                    className="mt-1 h-4 w-4"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{env.name}</div>
                    <div className="text-xs text-gray-500 truncate">{env.description || ""}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* 提交按钮 */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-6 dark:border-dark-3">
          <button
            onClick={() => router.back()}
            className="rounded-lg border border-gray-200 px-6 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-dark-3 dark:text-gray-300"
          >
            取消
          </button>
          <button
            onClick={() => void handleSubmit()}
            disabled={saving || !name.trim() || selectedAgents.length === 0}
            className="rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? "创建中..." : "创建镜像"}
          </button>
        </div>
      </div>
    </div>
  );
}
