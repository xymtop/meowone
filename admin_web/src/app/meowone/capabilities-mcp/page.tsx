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

function InfoIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.02M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function ToolDetailIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0" />
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
  transport?: "stdio" | "sse" | "streamable-http";
  url?: string;
  auth_type?: "none" | "bearer" | "api-key";
  auth_token?: string;
};

type TransportType = "stdio" | "sse" | "streamable-http";

type McpTool = {
  name: string;
  description?: string;
  inputSchema?: unknown;
};

export default function CapabilitiesMcpPage() {
  const [data, setData] = useState<McpListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);

  // MCP 详情弹窗
  const [viewingServer, setViewingServer] = useState<McpServer | null>(null);
  const [serverTools, setServerTools] = useState<McpTool[]>([]);
  const [serverResources, setServerResources] = useState<
    { uri: string; name: string; description?: string; mimeType?: string }[]
  >([]);
  const [loadingTools, setLoadingTools] = useState(false);
  const [detailTab, setDetailTab] = useState<"tools" | "resources">("tools");
  const [mcpDetailError, setMcpDetailError] = useState("");

  // 表单状态
  const [name, setName] = useState("");
  const [command, setCommand] = useState("");
  const [description, setDescription] = useState("");
  const [cwd, setCwd] = useState("");
  const [transport, setTransport] = useState<TransportType>("stdio");
  const [url, setUrl] = useState("");
  const [authType, setAuthType] = useState<"none" | "bearer" | "api-key">("none");
  const [authToken, setAuthToken] = useState("");
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
    setTransport("stdio");
    setUrl("");
    setAuthType("none");
    setAuthToken("");
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("请输入 MCP 服务名称");
      return;
    }
    if (transport === "stdio" && !command.trim()) {
      setError("请输入启动命令");
      return;
    }
    if ((transport === "sse" || transport === "streamable-http") && !url.trim()) {
      setError("请输入远程服务地址");
      return;
    }

    try {
      setSaving(true);
      setError("");
      await meowoneApi.upsertMcp({
        name: name.trim(),
        command: transport === "stdio" ? command.trim() : null,
        description: description.trim(),
        cwd: cwd.trim() || null,
        transport,
        url: url.trim() || null,
        auth_type: authType,
        auth_token: authToken.trim() || null,
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

  // 查看 MCP 服务详情
  const handleViewDetails = async (server: McpServer) => {
    setViewingServer(server);
    setServerTools([]);
    setServerResources([]);
    setMcpDetailError("");
    setDetailTab("tools");
    setLoadingTools(true);
    try {
      const [toolsRes, resRes] = await Promise.all([
        meowoneApi.getMcpTools(server.name),
        meowoneApi.getMcpResources(server.name),
      ]);
      setServerTools(toolsRes.tools || []);
      setServerResources(resRes.resources || []);
      const err = [toolsRes.error, resRes.error].filter(Boolean).join("；");
      if (err) setMcpDetailError(err);
    } catch (e) {
      setMcpDetailError((e as Error).message);
    } finally {
      setLoadingTools(false);
    }
  };

  const servers = data?.servers || [];

  // 常见 MCP 服务示例
  const popularServices = [
    { name: "Filesystem", command: "npx", args: "-y @modelcontextprotocol/server-filesystem", description: "访问本地文件系统" },
    { name: "Brave Search", command: "npx", args: "-y @modelcontextprotocol/server-brave-search", description: "网页搜索能力" },
    { name: "GitHub", command: "npx", args: "-y @modelcontextprotocol/server-github", description: "GitHub API 集成" },
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
          onClick={() => { resetForm(); setShowForm(!showForm); }}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl px-5 py-2.5 font-medium transition-all",
            showForm ? "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50" : "bg-gradient-to-r from-purple-500 to-pink-600 text-white hover:from-purple-600 hover:to-pink-700"
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

          <div className="mb-4">
            <p className="mb-2 text-sm text-gray-500">快速添加常用服务（STDIO）：</p>
            <div className="flex flex-wrap gap-2">
              {popularServices.map((service) => (
                <button
                  key={service.name}
                  onClick={() => { setName(service.name); setCommand(`${service.command} ${service.args}`); setDescription(service.description); setTransport("stdio"); }}
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
                <label className="mb-1 block text-sm font-medium text-gray-700">服务名称 *</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="例如：filesystem、github"
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">传输方式 *</label>
                <select value={transport} onChange={(e) => setTransport(e.target.value as TransportType)}
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20">
                  <option value="stdio">本地进程 (STDIO)</option>
                  <option value="sse">远程服务 (SSE + HTTP POST)</option>
                  <option value="streamable-http">远程服务 (Streamable HTTP)</option>
                </select>
              </div>
            </div>

            {transport === "stdio" && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">启动命令 *</label>
                  <input type="text" value={command} onChange={(e) => setCommand(e.target.value)} placeholder="npx -y @modelcontextprotocol/server-filesystem"
                    className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">工作目录（可选）</label>
                  <input type="text" value={cwd} onChange={(e) => setCwd(e.target.value)} placeholder="MCP 服务运行的工作目录"
                    className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20" />
                </div>
              </div>
            )}

            {(transport === "sse" || transport === "streamable-http") && (
              <div className="rounded-lg border border-purple-200 bg-purple-50 p-4 space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">服务地址 (URL) *</label>
                  <input type="text" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://mcp-server.example.com/mcp"
                    className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20" />
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">认证方式</label>
                    <select value={authType} onChange={(e) => setAuthType(e.target.value as "none" | "bearer" | "api-key")}
                      className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20">
                      <option value="none">无认证</option>
                      <option value="bearer">Bearer Token</option>
                      <option value="api-key">API Key</option>
                    </select>
                  </div>
                  {authType !== "none" && (
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">认证令牌</label>
                      <input type="password" value={authToken} onChange={(e) => setAuthToken(e.target.value)} placeholder={authType === "bearer" ? "Bearer token..." : "API key..."}
                        className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20" />
                    </div>
                  )}
                </div>
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">描述</label>
              <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="这个 MCP 服务提供什么能力"
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20" />
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button onClick={() => setShowForm(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">取消</button>
            <button onClick={() => void handleSubmit()} disabled={saving} className="rounded-lg bg-purple-500 px-4 py-2 text-sm font-medium text-white hover:bg-purple-600 disabled:opacity-50">
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
              <p className="mt-2 text-sm text-gray-500">MCP 服务可以为智能体提供访问外部数据和工具的能力</p>
              <button onClick={() => { resetForm(); setShowForm(true); }}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 px-6 py-3 font-medium text-white transition-all hover:from-purple-600 hover:to-pink-700">
                <PlusIcon /> 添加第一个 MCP 服务
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {servers.map((server) => {
                const s = server as McpServer;
                return (
                  <div key={s.name} className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white transition-all hover:border-purple-300 hover:shadow-lg">
                    <div className="p-5">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex size-10 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                            <DatabaseIcon />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{s.name}</h3>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                s.transport === "stdio" ? "bg-green-100 text-green-700" : s.transport === "sse" ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"
                              }`}>
                                {s.transport === "stdio" ? "本地进程" : s.transport === "sse" ? "SSE" : "Streamable"}
                              </span>
                            </div>
                          </div>
                        </div>
                        <button onClick={() => void handleDelete(s.name)}
                          className="flex items-center justify-center rounded-lg p-1.5 text-gray-400 opacity-0 transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-500 group-hover:opacity-100">
                          <TrashIcon />
                        </button>
                      </div>

                      {s.description && <p className="mt-3 text-sm text-gray-600">{s.description}</p>}

                      {/* 操作按钮 */}
                      <div className="mt-4 flex items-center gap-2">
                        <button onClick={() => void handleViewDetails(s)}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 transition-colors hover:border-purple-300 hover:bg-purple-50 hover:text-purple-600">
                          <InfoIcon /> 查看详情
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* MCP 服务详情弹窗 */}
      {viewingServer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="flex w-full max-w-3xl max-h-[85vh] flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
            {/* 弹窗头部 */}
            <div className="flex items-center justify-between border-b p-6">
              <div className="flex items-center gap-3">
                <div className="flex size-12 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                  <DatabaseIcon />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{viewingServer.name}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      viewingServer.transport === "stdio" ? "bg-green-100 text-green-700" : viewingServer.transport === "sse" ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"
                    }`}>
                      {viewingServer.transport === "stdio" ? "本地进程 (STDIO)" : viewingServer.transport === "sse" ? "SSE + HTTP" : "Streamable HTTP"}
                    </span>
                    {viewingServer.description && <span className="text-sm text-gray-500">{viewingServer.description}</span>}
                  </div>
                </div>
              </div>
              <button onClick={() => setViewingServer(null)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                <CloseIcon />
              </button>
            </div>

            {/* 弹窗内容 */}
            <div className="flex flex-1 overflow-hidden">
              {/* 左侧：配置信息 */}
              <div className="w-72 border-r p-4 overflow-y-auto">
                <h3 className="mb-4 text-sm font-medium text-gray-700">配置信息</h3>
                <div className="space-y-4">
                  {viewingServer.transport === "stdio" && viewingServer.command && (
                    <div className="rounded-lg bg-gray-50 p-3">
                      <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                        <TerminalIcon /> 启动命令
                      </div>
                      <code className="block font-mono text-xs text-gray-700 whitespace-pre-wrap break-all">{viewingServer.command}</code>
                    </div>
                  )}
                  {(viewingServer.transport === "sse" || viewingServer.transport === "streamable-http") && viewingServer.url && (
                    <div className="rounded-lg bg-blue-50 p-3">
                      <div className="flex items-center gap-2 text-xs text-blue-600 mb-2">
                        <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0 3-4.03 3-9s-1.343-9-3-9" /></svg>
                        远程地址
                      </div>
                      <code className="block font-mono text-xs text-gray-700 break-all">{viewingServer.url}</code>
                      {viewingServer.auth_type && viewingServer.auth_type !== "none" && (
                        <div className="mt-2 flex items-center gap-1 text-xs text-blue-600">
                          <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                          {viewingServer.auth_type === "bearer" ? "Bearer Token" : "API Key"}
                        </div>
                      )}
                    </div>
                  )}
                  {viewingServer.cwd && (
                    <div className="rounded-lg bg-gray-50 p-3">
                      <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                        <FolderIcon /> 工作目录
                      </div>
                      <code className="block font-mono text-xs text-gray-700">{viewingServer.cwd}</code>
                    </div>
                  )}
                </div>
              </div>

              {/* 右侧：工具 / 资源 */}
              <div className="flex flex-1 flex-col overflow-hidden">
                <div className="flex shrink-0 gap-1 border-b border-gray-100 px-4 pt-2">
                  <button
                    type="button"
                    onClick={() => setDetailTab("tools")}
                    className={cn(
                      "rounded-t-lg px-4 py-2 text-sm font-medium transition-colors",
                      detailTab === "tools"
                        ? "border-b-2 border-purple-500 text-purple-700"
                        : "text-gray-500 hover:text-gray-800",
                    )}
                  >
                    工具 ({serverTools.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setDetailTab("resources")}
                    className={cn(
                      "rounded-t-lg px-4 py-2 text-sm font-medium transition-colors",
                      detailTab === "resources"
                        ? "border-b-2 border-purple-500 text-purple-700"
                        : "text-gray-500 hover:text-gray-800",
                    )}
                  >
                    资源 ({serverResources.length})
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  {mcpDetailError && (
                    <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                      {mcpDetailError}
                    </div>
                  )}
                  {loadingTools ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="size-6 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
                      <span className="ml-2 text-gray-500">连接 MCP 中...</span>
                    </div>
                  ) : detailTab === "tools" ? (
                    serverTools.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                        <ToolDetailIcon />
                        <p className="mt-2 text-sm">暂无可用工具</p>
                        <p className="mt-1 text-center text-xs">确认服务已启动，或查看上方错误信息</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {serverTools.map((tool, idx) => (
                          <div
                            key={idx}
                            className="rounded-xl border border-gray-100 bg-gradient-to-br from-white to-gray-50/80 p-4 shadow-sm transition-all hover:border-purple-200 hover:shadow-md"
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                                <ToolDetailIcon />
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className="font-semibold text-gray-900">{tool.name}</h4>
                                {tool.description && (
                                  <p className="mt-1 text-sm leading-relaxed text-gray-600">{tool.description}</p>
                                )}
                                {tool.inputSchema != null && tool.inputSchema !== "" && (
                                  <div className="mt-3 rounded-lg border border-gray-100 bg-white p-3">
                                    <p className="mb-1 text-xs font-medium text-gray-500">参数结构</p>
                                    <pre className="max-h-40 overflow-auto whitespace-pre-wrap font-mono text-xs text-gray-700">
                                      {typeof tool.inputSchema === "string"
                                        ? tool.inputSchema
                                        : JSON.stringify(tool.inputSchema, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  ) : serverResources.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                      <FolderIcon />
                      <p className="mt-2 text-sm">暂无资源或未实现 resources/list</p>
                      <p className="mt-1 text-center text-xs">部分 MCP 仅提供工具，不提供资源列表</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {serverResources.map((r, idx) => (
                        <div
                          key={`${r.uri}-${idx}`}
                          className="rounded-xl border border-gray-100 bg-gradient-to-br from-white to-slate-50/80 p-4 shadow-sm"
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                              <FolderIcon />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="font-semibold text-gray-900">{r.name || r.uri || "资源"}</h4>
                              {r.description && (
                                <p className="mt-1 text-sm text-gray-600">{r.description}</p>
                              )}
                              <p className="mt-2 break-all font-mono text-xs text-gray-500">{r.uri}</p>
                              {r.mimeType && (
                                <span className="mt-2 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                                  {r.mimeType}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 弹窗底部 */}
            <div className="flex items-center justify-end border-t bg-gray-50 p-4">
              <button onClick={() => setViewingServer(null)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">关闭</button>
            </div>
          </div>
        </div>
      )}

      {/* 提示信息 */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
        <p className="font-medium text-gray-700">关于 MCP</p>
        <ul className="mt-2 space-y-1">
          <li><strong>STDIO</strong>：本地进程模式，适合本地 MCP 服务</li>
          <li><strong>SSE</strong>：远程服务模式，通过 Server-Sent Events 通信</li>
          <li><strong>Streamable HTTP</strong>：远程服务模式，支持双向流式传输</li>
          <li>添加 MCP 服务后，可以在创建智能体时选择使用</li>
        </ul>
      </div>
    </div>
  );
}
