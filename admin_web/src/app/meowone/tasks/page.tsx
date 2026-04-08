"use client";

import { useState, useEffect } from "react";

interface Task {
  id: string;
  name: string;
  task_type: string;
  status: string;
  input_data?: Record<string, unknown>;
  output_data?: Record<string, unknown>;
  agent_name?: string;
  agent_type?: string;
  error_message?: string;
  priority?: number;
  started_at?: string;
  completed_at?: string;
  duration_ms?: number;
  created_at?: string;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<{ status?: string; task_type?: string }>({});
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.status) params.set("status", filter.status);
      if (filter.task_type) params.set("task_type", filter.task_type);
      params.set("limit", "50");

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/tasks?${params.toString()}`
      );
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!confirm("Delete this task?")) return;
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/tasks/${encodeURIComponent(taskId)}`,
        { method: "DELETE" }
      );
      fetchTasks();
      if (selectedTask?.id === taskId) {
        setSelectedTask(null);
      }
    } catch (e: any) {
      setError(e.message);
    }
  };

  const retryTask = async (taskId: string) => {
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/tasks/${encodeURIComponent(taskId)}/retry`,
        { method: "POST", body: JSON.stringify({}) }
      );
      fetchTasks();
    } catch (e: any) {
      setError(e.message);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [filter]);

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    running: "bg-blue-100 text-blue-800",
    completed: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
  };

  const typeColors: Record<string, string> = {
    agent: "bg-purple-100 text-purple-800",
    workflow: "bg-orange-100 text-orange-800",
    scheduled: "bg-teal-100 text-teal-800",
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">任务管理</h1>
          <p className="text-gray-500 mt-1">监控和管理所有任务执行</p>
        </div>
        <button
          onClick={fetchTasks}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          刷新
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
          <button onClick={() => setError("")} className="ml-2 underline">Dismiss</button>
        </div>
      )}

      <div className="mb-4 flex gap-4">
        <select
          value={filter.status || ""}
          onChange={(e) => setFilter({ ...filter, status: e.target.value || undefined })}
          className="px-3 py-2 border rounded-lg"
        >
          <option value="">全部状态</option>
          <option value="pending">Pending</option>
          <option value="running">Running</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
        </select>
        <select
          value={filter.task_type || ""}
          onChange={(e) => setFilter({ ...filter, task_type: e.target.value || undefined })}
          className="px-3 py-2 border rounded-lg"
        >
          <option value="">全部类型</option>
          <option value="agent">Agent</option>
          <option value="workflow">Workflow</option>
          <option value="scheduled">Scheduled</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">Loading...</td>
                  </tr>
                ) : tasks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">No tasks found</td>
                  </tr>
                ) : (
                  tasks.map((task) => (
                    <tr
                      key={task.id}
                      className={`hover:bg-gray-50 cursor-pointer ${
                        selectedTask?.id === task.id ? "bg-blue-50" : ""
                      }`}
                      onClick={() => setSelectedTask(task)}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{task.name}</div>
                        <div className="text-xs text-gray-400">{task.id.slice(0, 8)}...</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded ${typeColors[task.task_type] || "bg-gray-100"}`}>
                          {task.task_type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded ${statusColors[task.status] || "bg-gray-100"}`}>
                          {task.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {task.duration_ms ? `${task.duration_ms}ms` : "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {task.created_at ? new Date(task.created_at).toLocaleString() : "-"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {task.status === "failed" && (
                          <button
                            onClick={(e) => { e.stopPropagation(); retryTask(task.id); }}
                            className="text-blue-600 hover:text-blue-800 text-sm mr-2"
                          >
                            Retry
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-6">
            {selectedTask ? (
              <>
                <h3 className="font-bold text-lg mb-4">{selectedTask.name}</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-500 uppercase">ID</label>
                    <p className="text-sm font-mono break-all">{selectedTask.id}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase">Status</label>
                    <p>
                      <span className={`text-xs px-2 py-1 rounded ${statusColors[selectedTask.status]}`}>
                        {selectedTask.status}
                      </span>
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase">Type</label>
                    <p className="text-sm">{selectedTask.task_type}</p>
                  </div>
                  {selectedTask.agent_name && (
                    <div>
                      <label className="text-xs text-gray-500 uppercase">Agent</label>
                      <p className="text-sm">{selectedTask.agent_name} ({selectedTask.agent_type})</p>
                    </div>
                  )}
                  {selectedTask.duration_ms && (
                    <div>
                      <label className="text-xs text-gray-500 uppercase">Duration</label>
                      <p className="text-sm">{selectedTask.duration_ms}ms</p>
                    </div>
                  )}
                  {selectedTask.started_at && (
                    <div>
                      <label className="text-xs text-gray-500 uppercase">Started</label>
                      <p className="text-sm">{selectedTask.started_at}</p>
                    </div>
                  )}
                  {selectedTask.completed_at && (
                    <div>
                      <label className="text-xs text-gray-500 uppercase">Completed</label>
                      <p className="text-sm">{selectedTask.completed_at}</p>
                    </div>
                  )}
                  {selectedTask.error_message && (
                    <div>
                      <label className="text-xs text-gray-500 uppercase">Error</label>
                      <p className="text-sm text-red-600">{selectedTask.error_message}</p>
                    </div>
                  )}
                  {selectedTask.input_data && Object.keys(selectedTask.input_data).length > 0 && (
                    <div>
                      <label className="text-xs text-gray-500 uppercase">Input</label>
                      <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto max-h-40">
                        {JSON.stringify(selectedTask.input_data, null, 2)}
                      </pre>
                    </div>
                  )}
                  {selectedTask.output_data && Object.keys(selectedTask.output_data).length > 0 && (
                    <div>
                      <label className="text-xs text-gray-500 uppercase">Output</label>
                      <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto max-h-40">
                        {JSON.stringify(selectedTask.output_data, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center text-gray-400">
                <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                选择一个任务查看详情
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}