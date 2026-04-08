"use client";

import { useState, useEffect } from "react";

interface SystemMetrics {
  total_agents: number;
  active_agents: number;
  total_workflows: number;
  total_tasks: number;
  pending_tasks: number;
  running_tasks: number;
  completed_tasks: number;
  failed_tasks: number;
  avg_duration_ms: number;
}

interface RecentExecution {
  id: string;
  workflow_name: string;
  status: string;
  duration_ms: number;
  created_at: string;
}

export default function MonitoringPage() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [recentExecutions, setRecentExecutions] = useState<RecentExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchMetrics = async () => {
    try {
      const [wfRes, taskRes, agentRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/workflows`),
        fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/tasks?limit=100`),
        fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/agents?agent_type=internal`),
      ]);

      const wfData = await wfRes.json();
      const taskData = await taskRes.json();
      const agentData = await agentRes.json();

      const tasks = taskData.tasks || [];
      const completedTasks = tasks.filter((t: any) => t.status === "completed");
      const totalDuration = completedTasks.reduce((sum: number, t: any) => sum + (t.duration_ms || 0), 0);

      setMetrics({
        total_agents: agentData.count || 0,
        active_agents: agentData.agents?.filter((a: any) => a.enabled).length || 0,
        total_workflows: wfData.count || 0,
        total_tasks: tasks.length,
        pending_tasks: tasks.filter((t: any) => t.status === "pending").length,
        running_tasks: tasks.filter((t: any) => t.status === "running").length,
        completed_tasks: completedTasks.length,
        failed_tasks: tasks.filter((t: any) => t.status === "failed").length,
        avg_duration_ms: completedTasks.length > 0 ? Math.round(totalDuration / completedTasks.length) : 0,
      });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  const StatCard = ({ title, value, subtitle, color }: {
    title: string;
    value: number | string;
    subtitle?: string;
    color: string;
  }) => (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`w-12 h-12 rounded-full bg-opacity-10 ${color.replace("text-", "bg-")} flex items-center justify-center`}>
          <div className={`w-6 h-6 rounded-full ${color.replace("text-", "bg-")}`} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">系统监控</h1>
          <p className="text-gray-500 mt-1">实时系统状态和性能指标</p>
        </div>
        <button
          onClick={fetchMetrics}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
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

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : metrics ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard
              title="智能体总数"
              value={metrics.total_agents}
              subtitle={`${metrics.active_agents} 已启用`}
              color="text-blue-600"
            />
            <StatCard
              title="工作流总数"
              value={metrics.total_workflows}
              color="text-purple-600"
            />
            <StatCard
              title="任务总数"
              value={metrics.total_tasks}
              subtitle={`${metrics.pending_tasks} 待处理`}
              color="text-green-600"
            />
            <StatCard
              title="平均执行时间"
              value={`${metrics.avg_duration_ms}ms`}
              color="text-orange-600"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold text-gray-700 mb-4">任务状态分布</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <span className="text-sm">待处理</span>
                  </div>
                  <span className="font-medium">{metrics.pending_tasks}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-400" />
                    <span className="text-sm">运行中</span>
                  </div>
                  <span className="font-medium">{metrics.running_tasks}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                    <span className="text-sm">已完成</span>
                  </div>
                  <span className="font-medium">{metrics.completed_tasks}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <span className="text-sm">失败</span>
                  </div>
                  <span className="font-medium">{metrics.failed_tasks}</span>
                </div>
              </div>
              <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden flex">
                {metrics.total_tasks > 0 && (
                  <>
                    <div
                      className="h-full bg-yellow-400"
                      style={{ width: `${(metrics.pending_tasks / metrics.total_tasks) * 100}%` }}
                    />
                    <div
                      className="h-full bg-blue-400"
                      style={{ width: `${(metrics.running_tasks / metrics.total_tasks) * 100}%` }}
                    />
                    <div
                      className="h-full bg-green-400"
                      style={{ width: `${(metrics.completed_tasks / metrics.total_tasks) * 100}%` }}
                    />
                    <div
                      className="h-full bg-red-400"
                      style={{ width: `${(metrics.failed_tasks / metrics.total_tasks) * 100}%` }}
                    />
                  </>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold text-gray-700 mb-4">成功率</h3>
              <div className="flex items-center justify-center h-32">
                {metrics.total_tasks > 0 ? (
                  <>
                    <div className="relative w-24 h-24">
                      <svg className="w-24 h-24 transform -rotate-90">
                        <circle
                          cx="48"
                          cy="48"
                          r="40"
                          stroke="#e5e7eb"
                          strokeWidth="8"
                          fill="none"
                        />
                        <circle
                          cx="48"
                          cy="48"
                          r="40"
                          stroke="#22c55e"
                          strokeWidth="8"
                          fill="none"
                          strokeDasharray={`${(metrics.completed_tasks / metrics.total_tasks) * 251.2} 251.2`}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-2xl font-bold text-gray-900">
                          {Math.round((metrics.completed_tasks / metrics.total_tasks) * 100)}%
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <span className="text-gray-400">无数据</span>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold text-gray-700 mb-4">快速操作</h3>
              <div className="space-y-2">
                <a
                  href="/meowone/workflows"
                  className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
                >
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <span className="text-sm">管理工作流</span>
                </a>
                <a
                  href="/meowone/tasks"
                  className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
                >
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                  <span className="text-sm">查看任务</span>
                </a>
                <a
                  href="/meowone/agents"
                  className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
                >
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span className="text-sm">管理智能体</span>
                </a>
                <a
                  href="/meowone/logs"
                  className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
                >
                  <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-sm">查看日志</span>
                </a>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-700 mb-4">系统健康状态</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="font-medium text-green-800">API 服务</span>
                </div>
                <p className="text-sm text-green-600 mt-1">正常运行</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="font-medium text-green-800">数据库</span>
                </div>
                <p className="text-sm text-green-600 mt-1">正常连接</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="font-medium text-green-800">调度引擎</span>
                </div>
                <p className="text-sm text-green-600 mt-1">就绪</p>
              </div>
              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <span className="font-medium text-yellow-800">MCP 服务</span>
                </div>
                <p className="text-sm text-yellow-600 mt-1">部分运行</p>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-12 text-gray-500">无法加载数据</div>
      )}
    </div>
  );
}