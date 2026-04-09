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
type StrategyConfig = { id: string; name: string; description?: string; config?: Record<string, unknown>; template_type?: string };
type Loop = { id: string; name: string; description?: string };
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
  const [strategyConfigs, setStrategyConfigs] = useState<StrategyConfig[]>([]);
  const [loops, setLoops] = useState<Loop[]>([]);
  const [environments, setEnvironments] = useState<Environment[]>([]);

  // 选择的值
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState("");
  const [selectedStrategyConfig, setSelectedStrategyConfig] = useState("");
  const [selectedLoop, setSelectedLoop] = useState("");
  const [selectedEnv, setSelectedEnv] = useState("");

  // 手动编辑的策略配置（JSON）
  const [strategyConfigJson, setStrategyConfigJson] = useState("");
  const [showConfigEditor, setShowConfigEditor] = useState(false);

  useEffect(() => {
    void loadOptions();
  }, []);

  const loadOptions = async () => {
    setLoading(true);
    setError("");

    try {
      const [agentData, strategyData, strategyConfigData, loopData, envData] = await Promise.all([
        meowoneApi.listAgents().catch(() => ({ agents: [] })),
        meowoneApi.listStrategies().catch(() => ({ strategies: [] })),
        meowoneApi.listStrategyConfigs().catch(() => ({ configs: [] })),
        meowoneApi.listLoops().catch(() => ({ loops: [] })),
        meowoneApi.listEnvironments().catch(() => ({ environments: [] })),
      ]);
      setAgents((agentData.agents || []) as Agent[]);
      setStrategies((strategyData.strategies || []) as Strategy[]);
      setStrategyConfigs((strategyConfigData.configs || []) as StrategyConfig[]);
      setLoops((loopData.loops || []) as Loop[]);
      setEnvironments((envData.environments || []) as Environment[]);
    } catch (e) {
      console.error("加载配置失败:", e);
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

  const handleStrategyConfigChange = (configId: string) => {
    setSelectedStrategyConfig(configId);
    if (configId) {
      const config = strategyConfigs.find(c => c.id === configId);
      if (config?.config) {
        setStrategyConfigJson(JSON.stringify(config.config, null, 2));
      } else {
        // 根据模板类型设置默认配置
        const template = config?.template_type;
        if (template === "master_slave") {
          const defaultConfig = {
            topology: "master_slave",
            master: selectedAgents[0] || "",
            slaves: selectedAgents.slice(1),
            routing: "master_collects"
          };
          setStrategyConfigJson(JSON.stringify(defaultConfig, null, 2));
        } else {
          setStrategyConfigJson("{}");
        }
      }
      setShowConfigEditor(true);
    } else {
      setShowConfigEditor(false);
      setStrategyConfigJson("");
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

    // 解析策略配置 JSON
    let strategyConfig: Record<string, unknown> = {};
    if (strategyConfigJson.trim()) {
      try {
        strategyConfig = JSON.parse(strategyConfigJson);
      } catch {
        setError("策略配置 JSON 格式错误");
        setSaving(false);
        return;
      }
    }

    try {
      await meowoneApi.createAgentImage({
        name: name.trim(),
        description: description.trim(),
        agent_ids: selectedAgents,
        loop_id: selectedLoop || undefined,
        strategy_id: selectedStrategy || undefined,
        strategy_config_id: selectedStrategyConfig || undefined,
        strategy_config: Object.keys(strategyConfig).length > 0 ? strategyConfig : undefined,
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
        <p className="mt-1 text-sm text-gray-500">
          选择多个智能体、Loop 模式、调度策略和配置，构建为一个镜像
        </p>
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
                placeholder="例如：开发团队镜像"
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
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Loop 模式 */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
            <h2 className="mb-4 text-lg font-semibold">Loop 模式</h2>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="loop"
                  checked={selectedLoop === ""}
                  onChange={() => setSelectedLoop("")}
                  className="h-4 w-4"
                />
                <span className="text-sm">默认 (react)</span>
              </label>
              {loops.map((loop) => (
                <label key={loop.id} className="flex items-start gap-2">
                  <input
                    type="radio"
                    name="loop"
                    checked={selectedLoop === loop.id}
                    onChange={() => setSelectedLoop(loop.id)}
                    className="mt-1 h-4 w-4"
                  />
                  <div>
                    <div className="text-sm font-medium">{loop.name}</div>
                    <div className="text-xs text-gray-500">{loop.description || ""}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* 调度策略 */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
            <h2 className="mb-4 text-lg font-semibold">调度策略</h2>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="strategy"
                  checked={selectedStrategy === ""}
                  onChange={() => setSelectedStrategy("")}
                  className="h-4 w-4"
                />
                <span className="text-sm">默认</span>
              </label>
              {strategies.map((strategy) => (
                <label key={strategy.id} className="flex items-start gap-2">
                  <input
                    type="radio"
                    name="strategy"
                    checked={selectedStrategy === strategy.id}
                    onChange={() => setSelectedStrategy(strategy.id)}
                    className="mt-1 h-4 w-4"
                  />
                  <div>
                    <div className="text-sm font-medium">{strategy.name}</div>
                    <div className="text-xs text-gray-500">{strategy.description || ""}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* 调度配置文件 */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
          <div className="flex items-center justify-between">
            <h2 className="mb-4 text-lg font-semibold">调度配置文件</h2>
            <button
              onClick={() => router.push("/meowone/scheduler/strategy-configs")}
              className="text-sm text-blue-500 hover:underline"
            >
              管理配置
            </button>
          </div>
          <div className="space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="strategyConfig"
                checked={selectedStrategyConfig === ""}
                onChange={() => handleStrategyConfigChange("")}
                className="h-4 w-4"
              />
              <span className="text-sm">无（使用默认调度）</span>
            </label>
            {strategyConfigs.map((config) => (
              <label key={config.id} className="flex items-start gap-2">
                <input
                  type="radio"
                  name="strategyConfig"
                  checked={selectedStrategyConfig === config.id}
                  onChange={() => handleStrategyConfigChange(config.id)}
                  className="mt-1 h-4 w-4"
                />
                <div>
                  <div className="text-sm font-medium">
                    {config.name}
                    {config.template_type && config.template_type !== "custom" && (
                      <span className="ml-2 rounded bg-purple-100 px-1.5 py-0.5 text-xs text-purple-600">
                        {config.template_type}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">{config.description || ""}</div>
                </div>
              </label>
            ))}
          </div>

          {/* 配置编辑器 */}
          {showConfigEditor && (
            <div className="mt-4">
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                调度配置 (JSON)
              </label>
              <textarea
                value={strategyConfigJson}
                onChange={(e) => setStrategyConfigJson(e.target.value)}
                rows={6}
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-mono dark:border-dark-3 dark:bg-dark"
                placeholder='{"topology": "master_slave", "master": "agent_id", "slaves": []}'
              />
              <p className="mt-1 text-xs text-gray-400">
                根据选择的配置模板编辑调度参数，如指定主智能体、从智能体等
              </p>
            </div>
          )}
        </div>

        {/* 执行环境 */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
          <h2 className="mb-4 text-lg font-semibold">执行环境</h2>
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="env"
                checked={selectedEnv === ""}
                onChange={() => setSelectedEnv("")}
                className="h-4 w-4"
              />
              <span className="text-sm">默认</span>
            </label>
            {environments.map((env) => (
              <label key={env.id} className="flex items-start gap-2">
                <input
                  type="radio"
                  name="env"
                  checked={selectedEnv === env.id}
                  onChange={() => setSelectedEnv(env.id)}
                  className="mt-1 h-4 w-4"
                />
                <div>
                  <div className="text-sm font-medium">{env.name}</div>
                  <div className="text-xs text-gray-500">{env.description || ""}</div>
                </div>
              </label>
            ))}
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
