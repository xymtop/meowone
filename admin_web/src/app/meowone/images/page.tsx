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

function ImageIcon() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
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

function ChevronRightIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
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

function CheckIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
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

type ImageItem = {
  id: string;
  name: string;
  description?: string;
  agent_ids?: string[];
  loop_id?: string;
  strategy_id?: string;
  environment_id?: string;
  enabled: boolean;
  created_at?: string;
};

export default function ImagesPage() {
  const [data, setData] = useState<{ count: number; images: Record<string, unknown>[] } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingImage, setEditingImage] = useState<Record<string, unknown> | null>(null);
  const [editForm, setEditForm] = useState({ name: "", description: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      setData(await meowoneApi.listAgentImages());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleToggle = async (img: Record<string, unknown>) => {
    const imgId = img.id as string;
    const imgEnabled = img.enabled as boolean;
    try {
      await meowoneApi.updateAgentImage(imgId, { enabled: !imgEnabled });
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`确定要删除镜像「${name}」吗？`)) return;
    try {
      await meowoneApi.deleteAgentImage(id);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const openEditModal = (img: Record<string, unknown>) => {
    setEditingImage(img);
    setEditForm({
      name: (img as {name?:string}).name || "",
      description: (img as {description?:string}).description || "",
    });
    setShowEditModal(true);
  };

  const handleUpdate = async () => {
    if (!editingImage) return;
    const imgId = (editingImage as {id?:string}).id || "";
    setSaving(true);
    try {
      await meowoneApi.updateAgentImage(imgId, {
        name: editForm.name.trim(),
        description: editForm.description.trim(),
      });
      setShowEditModal(false);
      setEditingImage(null);
      setEditForm({ name: "", description: "" });
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const images = data?.images || [];

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">智能体镜像</h1>
          <p className="mt-1 text-sm text-gray-500">镜像 = 选中的智能体 + 可选调度策略 + 可选执行环境（推理模式由智能体或运行时决定，不在此配置）</p>
        </div>
        <Link
          href="/meowone/images/create"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-5 py-2.5 font-medium text-white transition-all hover:from-blue-600 hover:to-purple-700"
        >
          <PlusIcon />
          创建镜像
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
        <span className="text-sm text-gray-500">{data?.count || 0} 个镜像</span>
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

      {/* 镜像列表 */}
      {!loading && images.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {images.map((img, i) => {
            const agentIds = (img.agent_ids as string[]) || [];
            const agentCount = Array.isArray(img.agent_ids) ? img.agent_ids.length : 0;
            const imgId = (img as {id?:string}).id || `img-${i}`;
            const imgName = (img as {name?:string}).name || "未命名";
            const loop = img.loop_id;
            const strategy = img.strategy_id;
            const env = img.environment_id;

            return (
              <div
                key={imgId}
                className="overflow-hidden rounded-2xl border border-gray-200 bg-white transition-all hover:border-blue-300 hover:shadow-lg dark:border-dark-3 dark:bg-dark-2"
              >
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-white/20 text-white">
                      <ImageIcon />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-semibold text-white">{imgName}</h3>
                      <p className="mt-0.5 text-xs text-white/80 line-clamp-1">
                        {(img as {description?:string}).description || "暂无描述"}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-sm text-gray-500 line-clamp-2">
                    {(img as {description?:string}).description || "暂无描述"}
                  </p>

                  {/* 组件标签 */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {agentCount > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-1 text-xs text-purple-600">
                        <span className="size-1.5 rounded-full bg-purple-500" />
                        {agentCount} 智能体
                      </span>
                    )}
                    {Boolean(loop) && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-pink-50 px-2.5 py-1 text-xs text-pink-600">
                        <span className="size-1.5 rounded-full bg-pink-500" />
                        Loop
                      </span>
                    )}
                    {Boolean(strategy) && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-50 px-2.5 py-1 text-xs text-yellow-600">
                        <span className="size-1.5 rounded-full bg-yellow-500" />
                        策略
                      </span>
                    )}
                    {Boolean(env) && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 text-xs text-teal-600">
                        <span className="size-1.5 rounded-full bg-teal-500" />
                        环境
                      </span>
                    )}
                  </div>

                  {/* 操作按钮 */}
                  <div className="mt-4 flex items-center gap-2">
                    <Link
                      href={`/meowone/instances/create?image_id=${imgId}`}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-100"
                    >
                      创建实例
                    </Link>
                    <button
                      onClick={() => openEditModal(img)}
                      className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium bg-blue-50 text-blue-600 hover:bg-blue-100"
                    >
                      <EditIcon />
                      编辑
                    </button>
                    <button
                      onClick={() => handleToggle(img)}
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
                        (img.enabled as boolean)
                          ? "bg-green-50 text-green-600"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {(img.enabled as boolean) ? <CheckIcon /> : null}
                      {(img.enabled as boolean) ? "启用" : "禁用"}
                    </button>
                    <button
                      onClick={() => handleDelete(imgId, imgName)}
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
            <ImageIcon />
          </div>
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">还没有镜像</h3>
          <p className="mt-2 text-sm text-gray-500">创建一个镜像，组合你的智能体组件</p>
          <Link
            href="/meowone/images/create"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-3 font-medium text-white transition-all hover:from-blue-600 hover:to-purple-700"
          >
            <PlusIcon />
            创建第一个镜像
          </Link>
        </div>
      ) : null}

      {/* 说明 */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500 dark:border-dark-3 dark:bg-dark">
        <p className="font-medium text-gray-700 dark:text-gray-300">💡 镜像概念</p>
        <ul className="mt-2 space-y-1">
          <li>• <strong>智能体</strong>：镜像绑定一组智能体；各智能体自身的 MCP、技能、提示词等在智能体配置中维护</li>
          <li>• <strong>调度策略</strong>：可选，决定任务如何分配和执行</li>
          <li>• <strong>执行环境</strong>：可选，控制工具权限和资源限制</li>
          <li>• 创建镜像后，可以基于该镜像创建多个实例进行对话</li>
        </ul>
      </div>

      {/* 编辑镜像弹窗 */}
      <Modal open={showEditModal} onClose={() => { setShowEditModal(false); setEditingImage(null); setEditForm({ name: "", description: "" }); }} title="编辑镜像">
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">名称</label>
            <input value={editForm.name} onChange={(e) => setEditForm({...editForm, name: e.target.value})} placeholder="镜像名称" className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm dark:border-dark-3 dark:bg-dark" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">描述</label>
            <textarea value={editForm.description} onChange={(e) => setEditForm({...editForm, description: e.target.value})} placeholder="描述这个镜像的用途" rows={3} className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm dark:border-dark-3 dark:bg-dark" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => { setShowEditModal(false); setEditingImage(null); setEditForm({ name: "", description: "" }); }} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600">取消</button>
            <button onClick={() => void handleUpdate()} disabled={saving} className="rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
              {saving ? "保存中..." : "保存"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
