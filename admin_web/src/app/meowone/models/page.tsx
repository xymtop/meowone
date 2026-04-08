"use client";

import { useEffect, useState } from "react";
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

function ModelIcon() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
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
    <svg className="size-4 fill-yellow-400 text-yellow-400" viewBox="0 0 24 24">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

function Modal({ open, onClose, title, children }: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-dark-2">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

type Model = {
  id?: string;
  name: string;
  provider?: string;
  base_url?: string;
  is_default?: number;
  enabled?: number;
};

export default function ModelsConfigPage() {
  const [data, setData] = useState<{ count: number; models: Record<string, unknown>[] } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState({ name: "", provider: "openai-compatible", base_url: "", api_key: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      setData(await meowoneApi.listModels());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleCreate = async () => {
    if (!form.name.trim() || !form.base_url.trim()) {
      setError("名称和 Base URL 必填");
      return;
    }
    setSaving(true);
    try {
      await meowoneApi.upsertModel({
        name: form.name.trim(),
        provider: form.provider,
        base_url: form.base_url.trim(),
        api_key: form.api_key,
      });
      setShowCreateModal(false);
      setForm({ name: "", provider: "openai-compatible", base_url: "", api_key: "" });
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (name: string) => {
    try {
      await meowoneApi.setDefaultModel(name);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleDelete = async (name: string) => {
    if (!confirm(`确定要删除模型「${name}」吗？`)) return;
    try {
      await meowoneApi.deleteModel(name);
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">模型配置</h1>
          <p className="mt-1 text-sm text-gray-500">配置大语言模型（LLM），为智能体提供推理能力</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-5 py-2.5 font-medium text-white">
          <PlusIcon />
          添加模型
        </button>
      </div>

      <button onClick={() => void load()} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 dark:border-dark-3 dark:bg-dark-2">
        <RefreshIcon />
        刷新
      </button>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">{error}</div>}

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="size-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          <span className="ml-3 text-gray-500">加载中...</span>
        </div>
      )}

      {!loading && models.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {models.map((m, i) => {
            const modelName = (m as {name?:string}).name || `model-${i}`;
            const modelProvider = (m as {provider?:string}).provider || "openai-compatible";
            const modelBaseUrl = (m as {base_url?:string}).base_url;
            const modelIsDefault = (m as {is_default?:number}).is_default;
            const modelEnabled = (m as {enabled?:number}).enabled;
            return (
              <div key={modelName} className="rounded-xl border border-gray-200 bg-white p-5 dark:border-dark-3 dark:bg-dark-2">
                <div className="flex items-start gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-orange-100 text-orange-600 dark:bg-orange-900/30">
                    <ModelIcon />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{modelName}</h3>
                      {modelIsDefault ? <StarIcon /> : null}
                    </div>
                    <p className="mt-1 text-sm text-gray-500">{modelProvider}</p>
                  </div>
                </div>
                {modelBaseUrl && (
                  <div className="mt-3 rounded bg-gray-50 p-2 font-mono text-xs dark:bg-dark">
                    <div className="truncate">{modelBaseUrl}</div>
                  </div>
                )}
                <div className="mt-3 flex items-center justify-between">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${modelEnabled ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-500"}`}>
                    {modelEnabled ? "启用" : "禁用"}
                  </span>
                  <div className="flex items-center gap-2">
                    {!modelIsDefault && (
                      <button onClick={() => handleSetDefault(modelName)} className="text-xs text-blue-500 hover:text-blue-600">
                        设为默认
                      </button>
                    )}
                    <button onClick={() => handleDelete(modelName)} className="text-red-500 hover:text-red-600">
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : !loading ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 py-16">
          <div className="flex size-16 items-center justify-center rounded-full bg-gray-100">
            <ModelIcon />
          </div>
          <h3 className="mt-4 text-lg font-medium text-gray-900">还没有模型</h3>
          <p className="mt-2 text-sm text-gray-500">添加模型配置，让智能体具备推理能力</p>
          <button onClick={() => setShowCreateModal(true)} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-3 font-medium text-white">
            <PlusIcon />
            添加第一个模型
          </button>
        </div>
      ) : null}

      <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)} title="添加模型">
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">模型名称</label>
            <input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} placeholder="gpt-4o, claude-3, deepseek-chat" className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm dark:border-dark-3 dark:bg-dark" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">提供商</label>
            <select value={form.provider} onChange={(e) => setForm({...form, provider: e.target.value})} className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm dark:border-dark-3 dark:bg-dark">
              <option value="openai-compatible">OpenAI 兼容</option>
              <option value="anthropic">Anthropic</option>
              <option value="google">Google</option>
              <option value="azure">Azure OpenAI</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Base URL</label>
            <input value={form.base_url} onChange={(e) => setForm({...form, base_url: e.target.value})} placeholder="https://api.openai.com/v1" className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm dark:border-dark-3 dark:bg-dark" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">API Key（可选）</label>
            <input type="password" value={form.api_key} onChange={(e) => setForm({...form, api_key: e.target.value})} placeholder="sk-..." className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm dark:border-dark-3 dark:bg-dark" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowCreateModal(false)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600">取消</button>
            <button onClick={() => void handleCreate()} disabled={saving} className="rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
              {saving ? "保存中..." : "保存"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
