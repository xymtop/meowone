"use client";

import { useEffect, useState, useCallback } from "react";
import { meowoneApi, type McpListResponse } from "@/lib/meowone-api";
import { cn } from "@/lib/utils";

// ============ 图标组件 ============
function PlusIcon() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function DatabaseIcon() {
  return (
    <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
    </svg>
  );
}

function PlugIcon() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
    </svg>
  );
}

function TerminalIcon() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
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

// ============ 类型定义 ============
type McpServer = {
  name: string;
  command?: string;
  description?: string;
  cwd?: string;
  env?: Record<string, string>;
};

export default function CapabilitiesMcpPage() {
  const [data, setData] = useState<McpListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  
  // 表单状态
  const [name, setName] = useState("");
  const [command, setCommand] = useState("");
  const [description, setDescription] = useState("");
  const [cwd, setCwd] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const result = await meowoneApi.listMcp();
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
    setCommand("");
    setDescription("");
    setCwd("");
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("请输入 MCP 服务名称");
      return;
    }
    if (!command.trim()) {
      setError("请输入启动命令");
      return;
    }

    try {
      setSaving(true);
      setError("");
      await meowoneApi.upsertMcp({
        name: name.trim(),
        command: command.trim(),
        description: description.trim(),
        cwd: cwd.trim() || null,
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

  const handleDelete = async (serverName: string) => {
    if (!confirm(`确定要删除 MCP 服务 "${serverName}" 吗？\n这可能会影响依赖此服务的智能体。`)) return;
    try {
      await meowoneApi.deleteMcp(serverName);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const servers = data?.servers || [];

  // 常见 MCP 服务示例
  const popularServices = [
    {
      name: "Filesystem",
      command: "npx",
      args: "-y @modelcontextprotocol/server-filesystem",
      description: "访问本地文件系统",
    },
    {
      name: "Brave Search",
      command: "npx",
      args: "-y @modelcontextprotocol/server-brave-search",
      description: "网页搜索能力",
    },
    {
      name: "GitHub",
      command: "npx",
      args: "-y @modelcontextprotocol/server-github",
      description: "GitHub API 集成",
    },
  ];

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">MCP 管理</h1>
          <p className="mt-1 text-sm text-gray-500">Model Context Protocol - 数据源和外部服务连接</p>
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
              : "bg-gradient-to-r from-purple-500 to-pink-600 text-white hover:from-purple-600 hover:to-pink-700"
          )}
        >
          {showForm ? "取消" : <><PlusIcon /> 添加 MCP 服务</>}
        </button>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* 添加 MCP 服务表单 */}
      {showForm && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">添加 MCP 服务</h3>
          
          {/* 快速模板 */}
          <div className="mb-4">
            <p className="mb-2 text-sm text-gray-500">快速添加常用服务：</p>
            <div className="flex flex-wrap gap-2">
              {popularServices.map((service) => (
                <button
                  key={service.name}
                  onClick={() => {
                    setName(service.name);
                    setCommand(`${service.command} ${service.args}`);
                    setDescription(service.description);
                  }}
                  className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-sm text-gray-600 transition-colors hover:border-purple-300 hover:bg-purple-50 hover:text-purple-600"
                >
                  {service.name}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  服务名称 *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例如：filesystem、github"
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  启动命令 *
                </label>
                <input
                  type="text"
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  placeholder="npx -y @modelcontextprotocol/server-filesystem"
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                描述
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="这个 MCP 服务提供什么能力"
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                工作目录（可选）
              </label>
              <input
                type="text"
                value={cwd}
                onChange={(e) => setCwd(e.target.value)}
                placeholder="MCP 服务运行的工作目录"
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
              />
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
              className="rounded-lg bg-purple-500 px-4 py-2 text-sm font-medium text-white hover:bg-purple-600 disabled:opacity-50"
            >
              {saving ? "保存中..." : "保存"}
            </button>
          </div>
        </div>
      )}

      {/* 加载状态 */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="size-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
          <span className="ml-3 text-gray-500">加载中...</span>
        </div>
      )}

      {/* MCP 服务列表 */}
      {!loading && (
        <>
          {servers.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 py-16">
              <div className="flex size-16 items-center justify-center rounded-full bg-purple-50">
                <PlugIcon />
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">还没有配置 MCP 服务</h3>
              <p className="mt-2 text-sm text-gray-500">
                MCP 服务可以为智能体提供访问外部数据和工具的能力
              </p>
              <button
                onClick={() => {
                  resetForm();
                  setShowForm(true);
                }}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 px-6 py-3 font-medium text-white transition-all hover:from-purple-600 hover:to-pink-700"
              >
                <PlusIcon />
                添加第一个 MCP 服务
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {servers.map((server) => {
                const s = server as McpServer;

                return (
                  <div
                    key={s.name}
                    className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white transition-all hover:border-purple-300 hover:shadow-lg"
                  >
                    <div className="p-5">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex size-10 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                            <DatabaseIcon />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{s.name}</h3>
                            <p className="mt-0.5 text-sm text-gray-500">MCP 服务</p>
                          </div>
                        </div>
                        <button
                          onClick={() => void handleDelete(s.name)}
                          className="flex items-center justify-center rounded-lg p-1.5 text-gray-400 opacity-0 transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                        >
                          <TrashIcon />
                        </button>
                      </div>

                      {/* 描述 */}
                      {s.description && (
                        <p className="mt-3 text-sm text-gray-600">{s.description}</p>
                      )}

                      {/* 命令 */}
                      <div className="mt-4 rounded-lg bg-gray-50 p-3">
                        <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                          <TerminalIcon />
                          启动命令
                        </div>
                        <code className="block truncate font-mono text-xs text-gray-700">
                          {s.command}
                        </code>
                      </div>

                      {/* 工作目录 */}
                      {s.cwd && (
                        <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                          <FolderIcon />
                          <span className="truncate">{s.cwd}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* 提示信息 */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
        <p className="font-medium text-gray-700">💡 关于 MCP</p>
        <ul className="mt-2 space-y-1">
          <li>• MCP (Model Context Protocol) 是一种让 AI 模型连接外部工具和数据的协议</li>
          <li>• 添加 MCP 服务后，可以在创建智能体时选择使用</li>
          <li>• 常用的 MCP 服务包括：文件系统、搜索引擎、GitHub 等</li>
        </ul>
      </div>
    </div>
  );
}
