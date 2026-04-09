"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { meowoneApi } from "@/lib/meowone-api";

type StrategyConfig = {
  id: string;
  name: string;
  description?: string;
  strategy_id?: string;
  config?: Record<string, unknown>;
  template_type?: string;
  is_system?: boolean;
  enabled?: boolean;
  created_at?: string;
  updated_at?: string;
};

type Strategy = { id: string; name: string; description?: string };

export default function StrategyConfigsPage() {
  const router = useRouter();
  const [configs, setConfigs] = useState<StrategyConfig[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editingConfig, setEditingConfig] = useState<StrategyConfig | null>(null);

  // 创建/编辑表单
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formStrategyId, setFormStrategyId] = useState("");
  const [formTemplateType, setFormTemplateType] = useState("custom");
  const [formConfig, setFormConfig] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [configData, strategyData] = await Promise.all([
        meowoneApi.listStrategyConfigs(),
        meowoneApi.listStrategies(),
      ]);
      setConfigs((configData.configs || []) as StrategyConfig[]);
      setStrategies((strategyData.strategies || []) as Strategy[]);
    } catch (e) {
      setError((e as Error).message);
    }
    setLoading(false);
  };

  const openCreate = () => {
    setFormName("");
    setFormDescription("");
    setFormStrategyId("");
    setFormTemplateType("custom");
    setFormConfig("{}");
    setEditingConfig(null);
    setShowCreate(true);
  };

  const openEdit = (config: StrategyConfig) => {
    setFormName(config.name);
    setFormDescription(config.description || "");
    setFormStrategyId(config.strategy_id || "");
    setFormTemplateType(config.template_type || "custom");
    setFormConfig(JSON.stringify(config.config || {}, null, 2));
    setEditingConfig(config);
    setShowCreate(true);
  };

  const handleSubmit = async () => {
    if (!formName.trim()) {
      setError("请输入配置名称");
      return;
    }
    
    let configJson = {};
    try {
      configJson = JSON.parse(formConfig || "{}");
    } catch {
      setError("配置 JSON 格式错误");
      return;
    }

    setSaving(true);
    setError("");

    try {
      if (editingConfig) {
        await meowoneApi.updateStrategyConfig(editingConfig.id, {
          name: formName.trim(),
          description: formDescription.trim(),
          strategy_id: formStrategyId || undefined,
          template_type: formTemplateType,
          config: configJson,
        });
      } else {
        await meowoneApi.createStrategyConfig({
          name: formName.trim(),
          description: formDescription.trim(),
          strategy_id: formStrategyId || undefined,
          template_type: formTemplateType,
          config: configJson,
        });
      }
      setShowCreate(false);
      await loadData();
    } catch (e) {
      setError((e as Error).message);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除这个调度配置吗？")) return;
    try {
      await meowoneApi.deleteStrategyConfig(id);
      await loadData();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const formatConfig = (config: Record<string, unknown> | undefined) => {
    if (!config) return "{}";
    return JSON.stringify(config, null, 2);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="size-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        <span className="ml-3 text-gray-500">加载中...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">调度配置管理</h1>
          <p className="mt-1 text-sm text-gray-500">管理调度配置文件，定义主从、层级、蜂群等调度拓扑</p>
        </div>
        <button
          onClick={() => router.push("/meowone/scheduler/strategies")}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 dark:border-dark-3 dark:text-gray-300"
        >
          调度策略
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* 配置列表 */}
      <div className="rounded-xl border border-gray-200 bg-white dark:border-dark-3 dark:bg-dark-2">
        <div className="flex items-center justify-between border-b border-gray-100 p-4 dark:border-dark-3">
          <h2 className="text-lg font-semibold">调度配置列表</h2>
          <button
            onClick={openCreate}
            className="rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-2 text-sm font-medium text-white"
          >
            创建配置
          </button>
        </div>

        {configs.length > 0 ? (
          <div className="divide-y divide-gray-100 dark:divide-dark-3">
            {configs.map((config) => (
              <div key={config.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white">{config.name}</h3>
                      {config.is_system && (
                        <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-dark-3">
                          系统
                        </span>
                      )}
                      {config.enabled === false && (
                        <span className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-600">
                          已禁用
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-gray-500">{config.description || "无描述"}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {config.template_type && config.template_type !== "custom" && (
                        <span className="rounded bg-purple-100 px-2 py-0.5 text-xs text-purple-600">
                          {config.template_type}
                        </span>
                      )}
                      {config.strategy_id && (
                        <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-600">
                          策略: {strategies.find(s => s.id === config.strategy_id)?.name || config.strategy_id}
                        </span>
                      )}
                    </div>
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs text-gray-400 hover:text-gray-600">
                        查看配置内容
                      </summary>
                      <pre className="mt-1 overflow-x-auto rounded bg-gray-50 p-2 text-xs dark:bg-dark">
                        {formatConfig(config.config)}
                      </pre>
                    </details>
                  </div>
                  <div className="ml-4 flex items-center gap-2">
                    <button
                      onClick={() => openEdit(config)}
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 dark:border-dark-3"
                    >
                      编辑
                    </button>
                    {!config.is_system && (
                      <button
                        onClick={() => handleDelete(config.id)}
                        className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                      >
                        删除
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center">
            <p className="text-gray-500">还没有调度配置</p>
            <button
              onClick={openCreate}
              className="mt-2 text-blue-500 hover:underline"
            >
              创建一个
            </button>
          </div>
        )}
      </div>

      {/* 创建/编辑模态框 */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 dark:bg-dark-2">
            <h2 className="mb-4 text-xl font-bold">
              {editingConfig ? "编辑调度配置" : "创建调度配置"}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  配置名称 <span className="text-red-500">*</span>
                </label>
                <input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="例如：主从配置-开发团队"
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm dark:border-dark-3 dark:bg-dark"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  描述
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="描述这个配置的用途..."
                  rows={2}
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm dark:border-dark-3 dark:bg-dark"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  关联策略
                </label>
                <select
                  value={formStrategyId}
                  onChange={(e) => setFormStrategyId(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm dark:border-dark-3 dark:bg-dark"
                >
                  <option value="">无</option>
                  {strategies.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.description ? `- ${s.description}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  模板类型
                </label>
                <select
                  value={formTemplateType}
                  onChange={(e) => setFormTemplateType(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm dark:border-dark-3 dark:bg-dark"
                >
                  <option value="custom">自定义</option>
                  <option value="master_slave">主从结构</option>
                  <option value="hierarchical">层级结构</option>
                  <option value="swarm">蜂群结构</option>
                  <option value="parallel">并行结构</option>
                  <option value="sequential">串行结构</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  调度配置 (JSON)
                </label>
                <textarea
                  value={formConfig}
                  onChange={(e) => setFormConfig(e.target.value)}
                  placeholder='{"topology": "master_slave", "master": "agent_id", "slaves": ["id1", "id2"]}'
                  rows={8}
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-mono dark:border-dark-3 dark:bg-dark"
                />
                <p className="mt-1 text-xs text-gray-400">
                  根据模板类型填写对应的配置 JSON
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowCreate(false)}
                className="rounded-lg border border-gray-200 px-6 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-dark-3"
              >
                取消
              </button>
              <button
                onClick={() => void handleSubmit()}
                disabled={saving}
                className="rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-2.5 text-sm font-medium text-white disabled:opacity-50"
              >
                {saving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
