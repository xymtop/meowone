"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Workflow {
  id: string;
  name: string;
  description?: string;
  strategy: string;
  node_count?: number;
  enabled?: number;
  created_at?: string;
  updated_at?: string;
}

interface WorkflowDetail {
  found: boolean;
  workflow: Workflow & { nodes?: any[] };
}

interface Execution {
  id: string;
  workflow_id: string;
  workflow_name: string;
  status: string;
  inputs?: Record<string, unknown>;
  outputs?: Record<string, unknown>;
  error_message?: string;
  node_results?: Record<string, unknown>[];
  started_at?: string;
  completed_at?: string;
  duration_ms?: number;
  created_at?: string;
}

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowDetail | null>(null);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);

  const [newWorkflow, setNewWorkflow] = useState({
    name: "",
    description: "",
    strategy: "direct",
    nodes: [] as any[],
  });

  const fetchWorkflows = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/workflows`);
      const data = await res.json();
      setWorkflows(data.workflows || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkflowDetail = async (name: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/workflows/${encodeURIComponent(name)}`);
      const data: WorkflowDetail = await res.json();
      setSelectedWorkflow(data);
      if (data.found) {
        fetchExecutions(name);
      }
    } catch (e: any) {
      setError(e.message);
    }
  };

  const fetchExecutions = async (name: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/workflows/${encodeURIComponent(name)}/runs`);
      const data = await res.json();
      setExecutions(data.executions || []);
    } catch (e: any) {
      console.error(e);
    }
  };

  const createWorkflow = async () => {
    if (!newWorkflow.name.trim()) return;
    setCreating(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/workflows`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newWorkflow),
      });
      if (res.ok) {
        setShowCreateModal(false);
        setNewWorkflow({ name: "", description: "", strategy: "direct", nodes: [] });
        fetchWorkflows();
      } else {
        const err = await res.json();
        setError(err.detail || "Failed to create workflow");
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  };

  const deleteWorkflow = async (name: string) => {
    if (!confirm(`Delete workflow "${name}"?`)) return;
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/workflows/${encodeURIComponent(name)}`, {
        method: "DELETE",
      });
      fetchWorkflows();
      if (selectedWorkflow?.workflow?.name === name) {
        setSelectedWorkflow(null);
        setExecutions([]);
      }
    } catch (e: any) {
      setError(e.message);
    }
  };

  const toggleEnabled = async (name: string, enabled: boolean) => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/workflows/${encodeURIComponent(name)}/enabled`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      fetchWorkflows();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const runWorkflow = async (name: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/workflows/${encodeURIComponent(name)}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inputs: {} }),
      });
      const data = await res.json();
      alert(`Workflow started! Execution ID: ${data.execution_id}`);
      fetchExecutions(name);
    } catch (e: any) {
      setError(e.message);
    }
  };

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const strategyColors: Record<string, string> = {
    direct: "bg-blue-100 text-blue-800",
    pipeline: "bg-green-100 text-green-800",
    parallel: "bg-purple-100 text-purple-800",
    dag: "bg-orange-100 text-orange-800",
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">工作流编排</h1>
          <p className="text-gray-500 mt-1">管理和执行多智能体工作流</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          创建工作流
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
          <button onClick={() => setError("")} className="ml-2 underline">Dismiss</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <h2 className="font-semibold text-gray-700">工作流列表</h2>
          </div>
          {loading ? (
            <div className="p-4 text-gray-500">Loading...</div>
          ) : workflows.length === 0 ? (
            <div className="p-4 text-gray-500 text-center">暂无工作流</div>
          ) : (
            <div className="divide-y">
              {workflows.map((wf) => (
                <div
                  key={wf.id}
                  className={`p-4 cursor-pointer hover:bg-gray-50 ${
                    selectedWorkflow?.workflow?.name === wf.name ? "bg-blue-50" : ""
                  }`}
                  onClick={() => fetchWorkflowDetail(wf.name)}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">{wf.name}</h3>
                      <p className="text-sm text-gray-500 mt-1">{wf.description || "No description"}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${strategyColors[wf.strategy] || "bg-gray-100"}`}>
                      {wf.strategy}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                    <span>{wf.node_count || 0} 节点</span>
                    <span>{wf.enabled ? "已启用" : "已禁用"}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 bg-white rounded-lg shadow">
          {selectedWorkflow?.found ? (
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedWorkflow.workflow.name}</h2>
                  <p className="text-gray-500 mt-1">{selectedWorkflow.workflow.description}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => runWorkflow(selectedWorkflow.workflow.name!)}
                    className="px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                  >
                    运行
                  </button>
                  <button
                    onClick={() => toggleEnabled(selectedWorkflow.workflow.name!, !selectedWorkflow.workflow.enabled)}
                    className={`px-3 py-1.5 rounded text-sm ${
                      selectedWorkflow.workflow.enabled
                        ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                        : "bg-green-100 text-green-800 hover:bg-green-200"
                    }`}
                  >
                    {selectedWorkflow.workflow.enabled ? "禁用" : "启用"}
                  </button>
                  <button
                    onClick={() => deleteWorkflow(selectedWorkflow.workflow.name!)}
                    className="px-3 py-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
                  >
                    删除
                  </button>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="font-semibold text-gray-700 mb-3">节点配置</h3>
                {selectedWorkflow.workflow.nodes?.length ? (
                  <div className="space-y-3">
                    {selectedWorkflow.workflow.nodes.map((node: any, idx: number) => (
                      <div key={idx} className="p-4 bg-gray-50 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                            {idx + 1}
                          </div>
                          <div>
                            <p className="font-medium">{node.id}</p>
                            <p className="text-sm text-gray-500">
                              Agent: {node.agent_name} ({node.agent_type})
                            </p>
                          </div>
                        </div>
                        {node.depends_on?.length > 0 && (
                          <p className="text-sm text-gray-400 mt-2">依赖: {node.depends_on.join(", ")}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400">暂无节点</p>
                )}
              </div>

              <div>
                <h3 className="font-semibold text-gray-700 mb-3">执行历史</h3>
                {executions.length === 0 ? (
                  <p className="text-gray-400">暂无执行记录</p>
                ) : (
                  <div className="space-y-2">
                    {executions.map((exec) => (
                      <div key={exec.id} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-mono text-gray-500">{exec.id.slice(0, 8)}...</span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded ${
                              exec.status === "completed"
                                ? "bg-green-100 text-green-800"
                                : exec.status === "failed"
                                ? "bg-red-100 text-red-800"
                                : exec.status === "running"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {exec.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                          <span>{exec.created_at}</span>
                          {exec.duration_ms && <span>{exec.duration_ms}ms</span>}
                        </div>
                        {exec.error_message && (
                          <p className="text-sm text-red-500 mt-1">Error: {exec.error_message}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-gray-400">
              <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              选择一个工作流查看详情
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">创建工作流</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">名称</label>
                <input
                  type="text"
                  value={newWorkflow.name}
                  onChange={(e) => setNewWorkflow({ ...newWorkflow, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="my-workflow"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                <input
                  type="text"
                  value={newWorkflow.description}
                  onChange={(e) => setNewWorkflow({ ...newWorkflow, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="工作流描述"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">策略</label>
                <select
                  value={newWorkflow.strategy}
                  onChange={(e) => setNewWorkflow({ ...newWorkflow, strategy: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="direct">Direct (直接执行)</option>
                  <option value="pipeline">Pipeline (流水线)</option>
                  <option value="parallel">Parallel (并行)</option>
                  <option value="dag">DAG (有向无环图)</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
              >
                取消
              </button>
              <button
                onClick={createWorkflow}
                disabled={creating}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {creating ? "创建中..." : "创建"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}