"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { meowoneApi } from "@/lib/meowone-api";

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

function TrashIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
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

function ChatIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z" />
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

type InstanceItem = {
  id: string;
  name: string;
  description?: string;
  image_id: string;
  model_name?: string;
  status: string;
  enabled: boolean;
  image?: {
    name: string;
    description?: string;
  };
  created_at?: string;
};

export default function InstancesPage() {
  const [data, setData] = useState<{ count: number; instances: Record<string, unknown>[] } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingInstance, setEditingInstance] = useState<Record<string, unknown> | null>(null);
  const [editForm, setEditForm] = useState({ name: "", description: "", model_name: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      setData(await meowoneApi.listAgentInstances());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleToggle = async (instance: Record<string, unknown>) => {
    const instId = instance.id as string;
    const instEnabled = instance.enabled as boolean;
    try {
      await meowoneApi.updateAgentInstance(instId, { enabled: !instEnabled });
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleStart = async (instance: Record<string, unknown>) => {
    const instId = instance.id as string;
    try {
      await meowoneApi.startAgentInstance(instId);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleStop = async (instance: Record<string, unknown>) => {
    const instId = instance.id as string;
    try {
      await meowoneApi.stopAgentInstance(instId);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`确定要删除实例「${name}」吗？`)) return;
    try {
      await meowoneApi.deleteAgentInstance(id);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const openEditModal = (instance: Record<string, unknown>) => {
    setEditingInstance(instance);
    setEditForm({
      name: (instance as {name?:string}).name || "",
      description: (instance as {description?:string}).description || "",
      model_name: (instance as {model_name?:string}).model_name || "",
    });
    setShowEditModal(true);
  };

  const handleUpdate = async () => {
    if (!editingInstance) return;
    const instId = (editingInstance as {id?:string}).id || "";
    setSaving(true);
    try {
      await meowoneApi.updateAgentInstance(instId, {
        name: editForm.name.trim(),
        description: editForm.description.trim(),
        model_name: editForm.model_name.trim() || undefined,
      });
      setShowEditModal(false);
      setEditingInstance(null);
      setEditForm({ name: "", description: "", model_name: "" });
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const instances = data?.instances || [];

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">智能体实例</h1>
          <p className="mt-1 text-sm text-gray-500">实例是镜像的运行实体，直接用于对话和任务执行</p>
        </div>
        <Link
          href="/meowone/instances/create"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-5 py-2.5 font-medium text-white transition-all hover:from-blue-600 hover:to-purple-700"
        >
          <PlusIcon />
          创建实例
        </Link>
      </div>

      {/* 刷新按钮 */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 dark:border-dark-3 dark:bg-dark-2"
        >
          <RefreshIcon />
          刷新
        </button>
        <span className="text-sm text-gray-500">{data?.count || 0} 个实例</span>
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

      {/* 实例列表 */}
      {!loading && instances.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {instances.map((instance, i) => {
            const instId = (instance as {id?:string}).id || `inst-${i}`;
            const instName = (instance as {name?:string}).name || "未命名";
            const instStatus = (instance as {status?:string}).status || "stopped";
            const instEnabled = (instance as {enabled?:boolean}).enabled ?? false;
            const instModel = (instance as {model_name?:string}).model_name;
            const instDesc = (instance as {description?:string}).description;
            const instImage = (instance as {image?:{name?:string}}).image;
            return (
              <div
                key={instId}
                className="overflow-hidden rounded-2xl border border-gray-200 bg-white transition-all hover:border-blue-300 hover:shadow-lg dark:border-dark-3 dark:bg-dark-2"
              >
                <div className="bg-gradient-to-r from-green-500 to-teal-600 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-white/20 text-white">
                      <RobotIcon />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-semibold text-white">{instName}</h3>
                      <div className="mt-0.5 flex items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs ${
                          instStatus === "running"
                            ? "bg-green-400/30 text-green-100"
                            : "bg-white/20 text-white/80"
                        }`}>
                          {instStatus === "running" ? "运行中" : "已停止"}
                        </span>
                        {instModel && (
                          <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs text-white/80">
                            {instModel}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-sm text-gray-500 line-clamp-2">
                    {instDesc || "暂无描述"}
                  </p>

                  {/* 镜像信息 */}
                  {instImage && (
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-xs text-gray-400">基于镜像：</span>
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600">
                        {instImage.name}
                      </span>
                    </div>
                  )}

                  {/* 操作按钮 */}
                  <div className="mt-4 flex items-center gap-2">
                    <Link
                      href={`/meowone/chat?instance=${encodeURIComponent(instId)}`}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-600 transition-colors hover:bg-green-100"
                    >
                      <ChatIcon />
                      对话
                    </Link>
                    <button
                      onClick={() => openEditModal(instance)}
                      className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium bg-blue-50 text-blue-600 hover:bg-blue-100"
                    >
                      <EditIcon />
                      编辑
                    </button>
                    {instStatus === "running" ? (
                      <button
                        onClick={() => handleStop(instance)}
                        className="flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50"
                      >
                        <StopIcon />
                        停止
                      </button>
                    ) : (
                      <button
                        onClick={() => handleStart(instance)}
                        className="flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm text-green-600 transition-colors hover:bg-green-50"
                      >
                        <PlayIcon />
                        启动
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(instId, instName)}
                      className="flex items-center justify-center rounded-lg border border-gray-200 p-2 text-red-500 transition-colors hover:bg-red-50 hover:border-red-200"
                    >
                      <TrashIcon />
                    </button>
                  </div>
              </div>
            </div>
          );
          })}
        </div>
      ) : !loading ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 py-16 dark:border-dark-3 dark:bg-dark">
          <div className="flex size-16 items-center justify-center rounded-full bg-gray-100">
            <RobotIcon />
          </div>
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">还没有实例</h3>
          <p className="mt-2 text-sm text-gray-500">创建一个实例，开始和智能体对话</p>
          <Link
            href="/meowone/instances/create"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-3 font-medium text-white transition-all hover:from-blue-600 hover:to-purple-700"
          >
            <PlusIcon />
            创建第一个实例
          </Link>
        </div>
      ) : null}

      {/* 说明 */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500 dark:border-dark-3 dark:bg-dark">
        <p className="font-medium text-gray-700 dark:text-gray-300">💡 实例概念</p>
        <ul className="mt-2 space-y-1">
          <li>• <strong>实例</strong>是基于镜像创建的运行实体</li>
          <li>• 一个镜像可以创建多个实例</li>
          <li>• 每个实例可以配置不同的模型</li>
          <li>• 点击「对话」直接和实例进行交互</li>
        </ul>
      </div>

      {/* 编辑实例弹窗 */}
      <Modal open={showEditModal} onClose={() => { setShowEditModal(false); setEditingInstance(null); setEditForm({ name: "", description: "", model_name: "" }); }} title="编辑实例">
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">名称</label>
            <input value={editForm.name} onChange={(e) => setEditForm({...editForm, name: e.target.value})} placeholder="实例名称" className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm dark:border-dark-3 dark:bg-dark" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">描述</label>
            <textarea value={editForm.description} onChange={(e) => setEditForm({...editForm, description: e.target.value})} placeholder="描述这个实例" rows={2} className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm dark:border-dark-3 dark:bg-dark" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">模型</label>
            <input value={editForm.model_name} onChange={(e) => setEditForm({...editForm, model_name: e.target.value})} placeholder="使用的模型（可选）" className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm dark:border-dark-3 dark:bg-dark" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => { setShowEditModal(false); setEditingInstance(null); setEditForm({ name: "", description: "", model_name: "" }); }} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600">取消</button>
            <button onClick={() => void handleUpdate()} disabled={saving} className="rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
              {saving ? "保存中..." : "保存"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
