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

function EditIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 20H5.25A2.25 2.25 0 013 17.75V8.25A2.25 2.25 0 015.25 6H10" />
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

function PromptIcon() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
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

function Modal({ open, onClose, title, children }: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-dark-2">
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

type Prompt = {
  id?: string;
  prompt_key: string;
  name: string;
  description?: string;
  content_md?: string;
  enabled?: boolean;
};

export default function PromptsConfigPage() {
  const [data, setData] = useState<{ count: number; prompts: Prompt[] } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [form, setForm] = useState({ prompt_key: "", name: "", description: "", content_md: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      setData(await meowoneApi.listPrompts());
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
    if (!form.prompt_key.trim() || !form.name.trim()) {
      setError("键名和名称必填");
      return;
    }
    setSaving(true);
    try {
      await meowoneApi.upsertPrompt({
        prompt_key: form.prompt_key.trim(),
        name: form.name.trim(),
        description: form.description.trim(),
        content_md: form.content_md.trim(),
      });
      setShowCreateModal(false);
      setForm({ prompt_key: "", name: "", description: "", content_md: "" });
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (promptKey: string) => {
    if (!confirm(`确定要删除提示词「${promptKey}」吗？`)) return;
    try {
      await meowoneApi.deletePrompt(promptKey);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const openEditModal = (prompt: Prompt) => {
    setEditingPrompt(prompt);
    setForm({
      prompt_key: prompt.prompt_key,
      name: prompt.name,
      description: prompt.description || "",
      content_md: prompt.content_md || "",
    });
    setShowCreateModal(true);
  };

  const handleCreateOrUpdate = async () => {
    if (!form.prompt_key.trim() || !form.name.trim()) {
      setError("键名和名称必填");
      return;
    }
    setSaving(true);
    try {
      await meowoneApi.upsertPrompt({
        prompt_key: form.prompt_key.trim(),
        name: form.name.trim(),
        description: form.description.trim(),
        content_md: form.content_md.trim(),
      });
      setShowCreateModal(false);
      setEditingPrompt(null);
      setForm({ prompt_key: "", name: "", description: "", content_md: "" });
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const prompts = data?.prompts || [];

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">提示词管理</h1>
          <p className="mt-1 text-sm text-gray-500">管理智能体的提示词模板，定义智能体的行为和角色</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-5 py-2.5 font-medium text-white">
          <PlusIcon />
          添加提示词
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

      {!loading && prompts.length > 0 ? (
        <div className="space-y-4">
          {prompts.map((p) => (
            <div key={p.prompt_key} className="rounded-xl border border-gray-200 bg-white p-5 dark:border-dark-3 dark:bg-dark-2">
              <div className="flex items-start gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30">
                  <PromptIcon />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{p.name}</h3>
                    <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs dark:bg-dark">{p.prompt_key}</code>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">{p.description || "无描述"}</p>
                </div>
              </div>
              {p.content_md && (
                <div className="mt-3 rounded bg-gray-50 p-3 text-sm text-gray-600 dark:bg-dark">
                  <pre className="whitespace-pre-wrap">{p.content_md.slice(0, 200)}{p.content_md.length > 200 ? "..." : ""}</pre>
                </div>
              )}
              <div className="mt-3 flex items-center justify-between">
                <span className={`rounded-full px-2 py-0.5 text-xs ${p.enabled ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-500"}`}>
                  {p.enabled ? "启用" : "禁用"}
                </span>
                <div className="flex items-center gap-2">
                  <button onClick={() => openEditModal(p)} className="text-blue-500 hover:text-blue-600">
                    <EditIcon />
                  </button>
                  <button onClick={() => handleDelete(p.prompt_key)} className="text-red-500 hover:text-red-600">
                    <TrashIcon />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : !loading ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 py-16">
          <div className="flex size-16 items-center justify-center rounded-full bg-gray-100">
            <PromptIcon />
          </div>
          <h3 className="mt-4 text-lg font-medium text-gray-900">还没有提示词</h3>
          <p className="mt-2 text-sm text-gray-500">添加提示词模板，定义智能体的行为</p>
          <button onClick={() => setShowCreateModal(true)} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-3 font-medium text-white">
            <PlusIcon />
            添加第一个提示词
          </button>
        </div>
      ) : null}

      <Modal open={showCreateModal} onClose={() => { setShowCreateModal(false); setEditingPrompt(null); setForm({ prompt_key: "", name: "", description: "", content_md: "" }); }} title={editingPrompt ? "编辑提示词" : "添加提示词"}>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">键名</label>
            <input value={form.prompt_key} onChange={(e) => setForm({...form, prompt_key: e.target.value})} placeholder="prompt_key" disabled={!!editingPrompt} className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm dark:border-dark-3 dark:bg-dark disabled:opacity-50" />
            {editingPrompt && <p className="mt-1 text-xs text-gray-500">键名不可修改</p>}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">名称</label>
            <input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} placeholder="提示词名称" className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm dark:border-dark-3 dark:bg-dark" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">描述</label>
            <input value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} placeholder="描述这个提示词的用途" className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm dark:border-dark-3 dark:bg-dark" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">内容</label>
            <textarea value={form.content_md} onChange={(e) => setForm({...form, content_md: e.target.value})} placeholder="提示词内容..." rows={8} className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-mono dark:border-dark-3 dark:bg-dark" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => { setShowCreateModal(false); setEditingPrompt(null); setForm({ prompt_key: "", name: "", description: "", content_md: "" }); }} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600">取消</button>
            <button onClick={() => void handleCreateOrUpdate()} disabled={saving} className="rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
              {saving ? "保存中..." : "保存"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
