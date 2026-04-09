"use client";

import { useEffect, useState } from "react";
import { meowoneApi } from "@/lib/meowone-api";

function RefreshIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  );
}

function LoopIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.25 7.25V3.75m0 0L5.385 5.89M7.25 3.75h4.5m0 0L17.615 5.89M3.75 12v5.25m0-5.25h5.25m0 0l2.865-2.865m-2.865 2.865L10.365 12m-6.615 0l2.865-2.865m-2.865 2.865L8.25 12" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
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

function XIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
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

export default function LoopsPage() {
  const [data, setData] = useState<{ count: number; loops: Record<string, unknown>[] } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", module_path: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      setData(await meowoneApi.listLoops());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleToggle = async (loop: Record<string, unknown>) => {
    const loopId = (loop as { id?: string }).id || "";
    const loopEnabled = (loop as { enabled?: boolean }).enabled || false;
    try {
      await meowoneApi.updateLoop(loopId, { enabled: !loopEnabled });
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleCreate = async () => {
    if (!form.name.trim() || !form.module_path.trim()) {
      setError("名称和模块路径必填");
      return;
    }
    setSaving(true);
    try {
      await meowoneApi.createLoop({
        name: form.name.trim(),
        description: form.description.trim(),
        module_path: form.module_path.trim(),
      });
      setShowCreateModal(false);
      setForm({ name: "", description: "", module_path: "" });
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const loops = data?.loops || [];

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Loop核心管理</h1>
          <p className="mt-1 text-sm text-gray-500">配置智能体的推理/思考模式（Loop）</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-5 py-2.5 font-medium text-white transition-all hover:from-blue-600 hover:to-purple-700"
          >
            <PlusIcon />
            创建 Loop
          </button>
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

      {/* Loop 列表 */}
      {!loading && loops.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-dark-3 dark:bg-dark-2">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-3">
            <thead className="bg-gray-50 dark:bg-dark">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">名称</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">描述</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">模块</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">类型</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">状态</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-dark-3">
              {loops.map((loop) => {
                const loopId = (loop as { id?: string }).id || "";
                const loopName = (loop as { name?: string }).name || "未命名";
                const loopDescription = (loop as { description?: string }).description;
                const loopModulePath = (loop as { module_path?: string }).module_path || "";
                const loopIsSystem = (loop as { is_system?: boolean }).is_system || false;
                const loopEnabled = (loop as { enabled?: boolean }).enabled || false;
                return (
                  <tr key={loopId} className="hover:bg-gray-50 dark:hover:bg-dark">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-8 items-center justify-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-900/30">
                          <LoopIcon />
                        </div>
                        <span className="font-medium">{loopName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{loopDescription || "-"}</td>
                    <td className="px-6 py-4 text-xs font-mono text-gray-400">{loopModulePath}</td>
                    <td className="px-6 py-4 text-center">
                      {loopIsSystem ? (
                        <span className="rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-600 dark:bg-blue-900/30">
                          系统内置
                        </span>
                      ) : (
                        <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600 dark:bg-dark-3">
                          自定义
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => void handleToggle(loop)}
                        disabled={loopIsSystem}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                          loopEnabled
                            ? "bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-900/30"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-dark-3"
                        } ${loopIsSystem ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                      >
                        {loopEnabled ? <CheckIcon /> : <XIcon />}
                        {loopEnabled ? "启用" : "禁用"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : !loading ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 py-16">
          <div className="flex size-16 items-center justify-center rounded-full bg-gray-100">
            <LoopIcon />
          </div>
          <h3 className="mt-4 text-lg font-medium text-gray-900">暂无 Loop</h3>
          <p className="mt-2 text-sm text-gray-500">系统将自动加载内置 Loop</p>
        </div>
      ) : null}

      {/* 说明 */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500 dark:border-dark-3 dark:bg-dark">
        <p className="font-medium text-gray-700 dark:text-gray-300">💡 Loop 说明</p>
        <ul className="mt-2 space-y-1">
          <li>• Loop 是智能体的推理/思考模式，决定智能体如何思考和执行任务</li>
          <li>• react：标准 ReAct 模式，边思考边行动</li>
          <li>• plan_exec：计划-执行分离，先规划再执行</li>
          <li>• multi_agent_debate：多智能体辩论模式</li>
        </ul>
      </div>

      {/* 创建 Loop 弹窗 */}
      <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)} title="创建 Loop">
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">名称</label>
            <input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} placeholder="例如：自定义推理" className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm dark:border-dark-3 dark:bg-dark" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">描述</label>
            <input value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} placeholder="描述这个 Loop 的用途" className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm dark:border-dark-3 dark:bg-dark" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">模块路径</label>
            <input value={form.module_path} onChange={(e) => setForm({...form, module_path: e.target.value})} placeholder="app.loops.custom" className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-mono dark:border-dark-3 dark:bg-dark" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowCreateModal(false)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600">取消</button>
            <button onClick={() => void handleCreate()} disabled={saving} className="rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
              {saving ? "创建中..." : "创建"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
