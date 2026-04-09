"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { meowoneApi } from "@/lib/meowone-api";

type Strategy = { id: string; name: string; description?: string };
type StrategyConfigDetail = {
  id: string;
  name: string;
  description?: string;
  strategy_id?: string;
  config_json?: Record<string, unknown>;
  enabled: boolean;
};

export default function EditStrategyConfigPage() {
  const router = useRouter();
  const params = useParams();
  const configId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // 表单
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedStrategy, setSelectedStrategy] = useState("");
  const [configRaw, setConfigRaw] = useState("{}");
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    void loadAll();
  }, [configId]);

  const loadAll = async () => {
    setLoading(true);
    setError("");
    try {
      const [configData, strategyData] = await Promise.all([
        meowoneApi.getStrategyConfig(configId).catch(() => null),
        meowoneApi.listStrategies().catch(() => ({ strategies: [] })),
      ]);

      if (!configData) {
        setError("配置不存在");
        setLoading(false);
        return;
      }

      const cfg = configData as StrategyConfigDetail;
      setName(cfg.name || "");
      setDescription(cfg.description || "");
      setSelectedStrategy(cfg.strategy_id || "");
      setConfigRaw(cfg.config_json ? JSON.stringify(cfg.config_json, null, 2) : "{}");
      setEnabled(cfg.enabled);

      setStrategies((strategyData as { strategies: Strategy[] }).strategies || []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("请输入配置名称");
      return;
    }

    setSaving(true);
    setError("");

    try {
      let config: Record<string, unknown> = {};
      if (configRaw.trim() && configRaw.trim() !== "{}") {
        try {
          config = JSON.parse(configRaw);
        } catch {
          setError("配置 JSON 格式错误");
          setSaving(false);
          return;
        }
      }

      await meowoneApi.updateStrategyConfig(configId, {
        name: name.trim(),
        description: description.trim(),
        strategy_id: selectedStrategy || undefined,
        config,
        enabled,
      });
      router.push("/meowone/scheduler/strategy-configs");
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
        <span className="ml-3 text-gray-500">加载中...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">编辑策略配置</h1>
        <p className="mt-1 text-sm text-gray-500">修改策略配置参数</p>
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
                配置名称 <span className="text-red-500">*</span>
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：竞拍策略-快速模式"
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
                placeholder="描述这个配置的用途..."
                rows={2}
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm dark:border-dark-3 dark:bg-dark"
              />
            </div>
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="text-sm">启用此配置</span>
              </label>
            </div>
          </div>
        </div>

        {/* 关联策略 */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
          <h2 className="mb-4 text-lg font-semibold">关联策略</h2>
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="strategy"
                checked={selectedStrategy === ""}
                onChange={() => setSelectedStrategy("")}
                className="h-4 w-4"
              />
              <span className="text-sm">不关联特定策略</span>
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

        {/* 配置内容 */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
          <h2 className="mb-4 text-lg font-semibold">配置内容</h2>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              配置 JSON
            </label>
            <textarea
              value={configRaw}
              onChange={(e) => setConfigRaw(e.target.value)}
              placeholder='{"bidding_timeout": 30, "min_bid_score": 0.5}'
              rows={6}
              className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-mono dark:border-dark-3 dark:bg-dark"
            />
            <p className="mt-1 text-xs text-gray-500">输入有效的 JSON 格式</p>
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
            disabled={saving || !name.trim()}
            className="rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? "保存中..." : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}
