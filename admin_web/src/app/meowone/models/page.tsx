"use client";

import { useEffect, useState, useCallback } from "react";
import { meowoneApi, type ModelsListResponse } from "@/lib/meowone-api";
import { cn } from "@/lib/utils";

// ============ 图标组件 ============
function PlusIcon() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function BrainIcon() {
  return (
    <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
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

function StarIcon() {
  return (
    <svg className="size-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
    </svg>
  );
}

// ============ 类型定义 ============
type Model = {
  name: string;
  provider?: string;
  base_url?: string;
  api_key?: string;
  enabled?: boolean;
  is_default?: boolean;
};

export default function ModelsPage() {
  const [data, setData] = useState<ModelsListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  
  // 表单状态
  const [name, setName] = useState("");
  const [provider, setProvider] = useState("openai-compatible");
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [isDefault, setIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const result = await meowoneApi.listModels();
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
    setProvider("openai-compatible");
    setBaseUrl("");
    setApiKey("");
    setEnabled(true);
    setIsDefault(false);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("请输入模型名称");
      return;
    }
    if (!baseUrl.trim()) {
      setError("请输入 API 地址");
      return;
    }

    try {
      setSaving(true);
      setError("");
      await meowoneApi.upsertModel({
        name: name.trim(),
        provider,
        base_url: baseUrl.trim(),
        api_key: apiKey.trim(),
        enabled,
        is_default: isDefault,
        extra: {},
      });
      resetForm();
      setShowForm(false);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (modelName: string) => {
    try {
      await meowoneApi.setDefaultModel(modelName);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleDelete = async (modelName: string) => {
    if (!confirm(`确定要删除模型 "${modelName}" 吗？`)) return;
    try {
      await meowoneApi.deleteModel(modelName);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const models = data?.models || [];

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">模型管理</h1>
          <p className="mt-1 text-sm text-gray-500">配置和管理 AI 大模型</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(!showForm);
          }}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl px-5 py-2.5 font-medium transition-all",
            showForm
              ? "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              : "bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700"
          )}
        >
          {showForm ? "取消" : <><PlusIcon /> 添加模型</>}
        </button>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* 添加模型表单 */}
      {showForm && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">添加新模型</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                模型名称 *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：gpt-4o、claude-3"
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                提供方
              </label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="openai-compatible">OpenAI 兼容</option>
                <option value="anthropic">Anthropic</option>
                <option value="google">Google</option>
                <option value="azure">Azure OpenAI</option>
                <option value="custom">自定义</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API 地址 *
              </label>
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://api.openai.com/v1"
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API Key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="size-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">启用</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="size-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">设为默认模型</span>
              </label>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              取消
            </button>
            <button
              onClick={() => void handleSubmit()}
              disabled={saving}
              className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
            >
              {saving ? "保存中..." : "保存"}
            </button>
          </div>
        </div>
      )}

      {/* 加载状态 */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="size-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          <span className="ml-3 text-gray-500">加载中...</span>
        </div>
      )}

      {/* 模型列表 */}
      {!loading && (
        <>
          {models.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 py-16">
              <div className="flex size-16 items-center justify-center rounded-full bg-gray-100">
                <BrainIcon />
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">还没有配置模型</h3>
              <p className="mt-2 text-sm text-gray-500">添加你的第一个 AI 模型开始使用</p>
              <button
                onClick={() => {
                  resetForm();
                  setShowForm(true);
                }}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-3 font-medium text-white transition-all hover:from-blue-600 hover:to-purple-700"
              >
                <PlusIcon />
                添加第一个模型
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {models.map((model) => {
                const m = model as Model;
                const isDefault = Boolean(m.is_default);
                const isEnabled = m.enabled !== false;

                return (
                  <div
                    key={m.name}
                    className={cn(
                      "group relative overflow-hidden rounded-2xl border transition-all hover:shadow-lg",
                      isDefault
                        ? "border-yellow-300 bg-gradient-to-br from-yellow-50 to-white"
                        : "border-gray-200 bg-white hover:border-blue-300"
                    )}
                  >
                    {/* 卡片头部 */}
                    <div className="p-5">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "flex size-10 items-center justify-center rounded-lg",
                            isDefault ? "bg-yellow-100 text-yellow-600" : "bg-blue-50 text-blue-600"
                          )}>
                            <BrainIcon />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-gray-900">{m.name}</h3>
                              {isDefault && (
                                <span className="flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-700">
                                  <StarIcon />
                                  默认
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 text-sm text-gray-500">{m.provider || "OpenAI 兼容"}</p>
                          </div>
                        </div>
                        <span className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-medium",
                          isEnabled ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                        )}>
                          {isEnabled ? "启用" : "停用"}
                        </span>
                      </div>

                      {/* API 地址 */}
                      <div className="mt-4">
                        <p className="text-xs text-gray-500">API 地址</p>
                        <p className="mt-1 truncate font-mono text-sm text-gray-700">
                          {m.base_url || "未配置"}
                        </p>
                      </div>

                      {/* 操作按钮 */}
                      <div className="mt-4 flex items-center gap-2">
                        {!isDefault && (
                          <button
                            onClick={() => void handleSetDefault(m.name)}
                            className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 transition-colors hover:border-yellow-300 hover:bg-yellow-50 hover:text-yellow-700"
                          >
                            <StarIcon />
                            设为默认
                          </button>
                        )}
                        <button
                          onClick={() => void handleDelete(m.name)}
                          className="flex items-center justify-center rounded-lg border border-gray-200 p-1.5 text-red-500 transition-colors hover:border-red-200 hover:bg-red-50"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </div>

                    {/* 默认标记装饰 */}
                    {isDefault && (
                      <div className="absolute right-0 top-0 size-16 -translate-y-8 translate-x-8 rotate-45 bg-yellow-200/50" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* 提示信息 */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
        <p className="font-medium text-gray-700">💡 提示</p>
        <ul className="mt-2 space-y-1">
          <li>• 默认模型将用于所有未指定模型的对话</li>
          <li>• 支持 OpenAI、Anthropic、Google 等主流 API 格式</li>
          <li>• API Key 会加密存储，不会明文显示</li>
        </ul>
      </div>
    </div>
  );
}
