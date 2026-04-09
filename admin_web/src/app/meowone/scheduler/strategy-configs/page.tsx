"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { meowoneApi } from "@/lib/meowone-api";

function PlusIcon() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
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
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 20H5.25A2.25 2.25 0 013 17.75V8.25A2.25 2.25 0 015.25 6H10" />
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

function ConfigIcon() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.149-.894z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

type StrategyConfig = {
  id: string;
  name: string;
  description?: string;
  image_id?: string;
  image_name?: string;
  strategy_id?: string;
  strategy_name?: string;
  config?: Record<string, unknown>;
  enabled: boolean;
  created_at?: string;
};

type Strategy = { id: string; name: string };

export default function StrategyConfigsPage() {
  const [data, setData] = useState<{ count: number; configs: Record<string, unknown>[] } | null>(null);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const [configData, strategyData] = await Promise.all([
        meowoneApi.listStrategyConfigs(),
        meowoneApi.listStrategies(),
      ]);
      setData(configData as { count: number; configs: Record<string, unknown>[] });
      setStrategies((strategyData.strategies || []) as unknown as Strategy[]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleToggle = async (cfg: Record<string, unknown>) => {
    const cfgId = cfg.id as string;
    const cfgEnabled = cfg.enabled as boolean;
    try {
      await meowoneApi.updateStrategyConfig(cfgId, { enabled: !cfgEnabled });
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`确定要删除策略配置「${name}」吗？`)) return;
    try {
      await meowoneApi.deleteStrategyConfig(id);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const getStrategyName = (strategyId?: string, apiName?: string) => {
    if (apiName?.trim()) return apiName.trim();
    if (!strategyId) return "—";
    const s = strategies.find((s) => s.id === strategyId);
    return s?.name ?? "—";
  };

  const getImageDisplay = (imageName?: string, imageId?: string) => {
    if (imageName?.trim()) return imageName.trim();
    if (imageId) return "关联镜像不可用";
    return "—";
  };

  const configs = data?.configs || [];

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">策略配置管理</h1>
          <p className="mt-1 text-sm text-gray-500">预配置的策略参数，基于镜像创建。创建实例时可快速选择</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/meowone/scheduler/strategy-configs/create"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-5 py-2.5 font-medium text-white transition-all hover:from-blue-600 hover:to-purple-700"
          >
            <PlusIcon />
            创建配置
          </Link>
          <button
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-dark-3 dark:bg-dark-2"
          >
            <RefreshIcon />
            刷新
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="size-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          <span className="ml-3 text-gray-500">加载中...</span>
        </div>
      )}

      {/* 配置列表 */}
      {!loading && configs.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-dark-3 dark:bg-dark-2">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-3">
            <thead className="bg-gray-50 dark:bg-dark">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">名称</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">关联镜像</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">关联策略</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">配置内容</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">状态</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-dark-3">
              {configs.map((cfg) => {
                const cfgData = cfg as unknown as StrategyConfig;
                const configJson = cfgData.config || {};
                const configPreview = Object.keys(configJson).length > 0
                  ? JSON.stringify(configJson).slice(0, 50) + "..."
                  : "{}";

                return (
                  <tr key={cfgData.id} className="hover:bg-gray-50 dark:hover:bg-dark">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-8 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/30">
                          <ConfigIcon />
                        </div>
                        <div>
                          <div className="font-medium">{cfgData.name}</div>
                          {cfgData.description && (
                            <div className="text-xs text-gray-500">{cfgData.description}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {getImageDisplay(cfgData.image_name, cfgData.image_id)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {getStrategyName(cfgData.strategy_id, cfgData.strategy_name)}
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-gray-400">
                      {configPreview}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => void handleToggle(cfg)}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                          cfgData.enabled
                            ? "bg-green-50 text-green-600 hover:bg-green-100"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                        }`}
                      >
                        {cfgData.enabled ? <CheckIcon /> : null}
                        {cfgData.enabled ? "启用" : "禁用"}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Link
                          href={`/meowone/scheduler/strategy-configs/${cfgData.id}/edit`}
                          className="inline-flex items-center gap-1 rounded-lg p-2 text-blue-600 hover:bg-blue-50"
                        >
                          <EditIcon />
                        </Link>
                        <button
                          onClick={() => handleDelete(cfgData.id, cfgData.name)}
                          className="inline-flex items-center justify-center rounded-lg border border-gray-200 p-2 text-red-500 hover:bg-red-50 dark:border-dark-3"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : !loading ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 py-16 dark:border-dark-3 dark:bg-dark">
          <div className="flex size-16 items-center justify-center rounded-full bg-gray-100">
            <ConfigIcon />
          </div>
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">还没有策略配置</h3>
          <p className="mt-2 text-sm text-gray-500">创建一个策略配置，创建镜像时可快速选择</p>
          <Link
            href="/meowone/scheduler/strategy-configs/create"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-3 font-medium text-white transition-all hover:from-blue-600 hover:to-purple-700"
          >
            <PlusIcon />
            创建第一个配置
          </Link>
        </div>
      ) : null}

      {/* 说明 */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500 dark:border-dark-3 dark:bg-dark">
        <p className="font-medium text-gray-700 dark:text-gray-300">💡 使用说明</p>
        <ul className="mt-2 space-y-1">
          <li>• 策略配置绑定到镜像，基于镜像的智能体列表</li>
          <li>• 先创建镜像，再为镜像创建策略配置</li>
          <li>• 创建实例时，从镜像的策略配置中选择一个</li>
        </ul>
      </div>
    </div>
  );
}
