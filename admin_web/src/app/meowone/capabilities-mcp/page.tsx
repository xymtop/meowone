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

function PlugIcon() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
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

function EyeIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function WrenchIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75a1.5 1.5 0 01-1.5 1.5h-1.5a1.5 1.5 0 01-1.5-1.5v-1.5a1.5 1.5 0 011.5-1.5H19.5a1.5 1.5 0 011.5 1.5v1.5zM3.75 17.25a1.5 1.5 0 01-1.5-1.5v-1.5a1.5 1.5 0 011.5-1.5H4.5a1.5 1.5 0 011.5 1.5v1.5a1.5 1.5 0 01-1.5 1.5h-.75zM10.5 6.75a1.5 1.5 0 01-1.5-1.5H7.5a1.5 1.5 0 011.5-1.5h1.5a1.5 1.5 0 011.5 1.5v1.5zM10.5 17.25a1.5 1.5 0 01-1.5 1.5H7.5a1.5 1.5 0 01-1.5-1.5v-1.5a1.5 1.5 0 011.5-1.5h1.5a1.5 1.5 0 011.5 1.5v1.5zM17.25 6.75a1.5 1.5 0 01-1.5-1.5h-1.5a1.5 1.5 0 01-1.5 1.5v1.5a1.5 1.5 0 011.5 1.5h1.5a1.5 1.5 0 011.5-1.5v-1.5zM17.25 17.25a1.5 1.5 0 01-1.5 1.5h-1.5a1.5 1.5 0 01-1.5-1.5v-1.5a1.5 1.5 0 011.5-1.5h1.5a1.5 1.5 0 011.5 1.5v1.5z" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
    </svg>
  );
}

type McpServer = {
  id?: string;
  name?: string;
  description?: string;
  command?: string;
  cwd?: string;
  args?: string;
  transport?: string;
  url?: string;
  auth_type?: string;
  auth_token?: string;
  env_json?: string;
  enabled?: number;
};

function Modal({ open, onClose, title, children, size }: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: "sm" | "lg";
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`w-full rounded-2xl bg-white p-6 shadow-2xl dark:bg-dark-2 ${size === "lg" ? "max-w-2xl" : "max-w-lg"}`}>
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

function DetailModal({ server, onClose }: { server: McpServer; onClose: () => void }) {
  const [tools, setTools] = useState<Array<{ name: string; description?: string; inputSchema?: Record<string, unknown> }>>([]);
  const [resources, setResources] = useState<Array<{ uri: string; name?: string; description?: string; mimeType?: string }>>([]);
  const [loadingTools, setLoadingTools] = useState(true);
  const [loadingResources, setLoadingResources] = useState(true);
  const [toolsError, setToolsError] = useState("");
  const [resourcesError, setResourcesError] = useState("");
  const [activeTab, setActiveTab] = useState<"tools" | "resources">("tools");

  useEffect(() => {
    if (!server.name) return;
    meowoneApi.getMcpTools(server.name).then((res) => {
      setTools((res as { tools?: Array<{ name: string; description?: string; inputSchema?: Record<string, unknown> }> }).tools || []);
    }).catch((e) => {
      setToolsError((e as Error).message);
    }).finally(() => {
      setLoadingTools(false);
    });

    meowoneApi.getMcpResources(server.name).then((res) => {
      setResources((res as { resources?: Array<{ uri: string; name?: string; description?: string; mimeType?: string }> }).resources || []);
    }).catch((e) => {
      setResourcesError((e as Error).message);
    }).finally(() => {
      setLoadingResources(false);
    });
  }, [server.name]);

  return (
    <Modal open onClose={onClose} title={`${server.name || ""} — 详情`} size="lg">
      {/* 协议标签 */}
      <div className="mb-4 flex items-center gap-2">
        <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-600">
          {(server.transport || "stdio").toUpperCase()}
        </span>
        {server.url && (
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-500 truncate max-w-xs">{server.url}</span>
        )}
        {server.command && (
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-500 font-mono truncate max-w-xs">{server.command}</span>
        )}
      </div>

      {/* Tab */}
      <div className="mb-4 flex gap-1 border-b border-gray-200">
        {[
          { key: "tools", label: `工具 (${tools.length})`, icon: <WrenchIcon /> },
          { key: "resources", label: `资源 (${resources.length})`, icon: <FolderIcon /> },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as "tools" | "resources")}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {(loadingTools && loadingResources) && (
        <div className="flex items-center justify-center py-8">
          <div className="size-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          <span className="ml-2 text-sm text-gray-500">加载中...</span>
        </div>
      )}

      {(toolsError || resourcesError) && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {activeTab === "tools" ? toolsError : resourcesError}
        </div>
      )}

      {!loadingTools && activeTab === "tools" && (
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {tools.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">
              {toolsError ? "获取失败" : "暂无工具"}
            </p>
          ) : tools.map((tool) => (
            <div key={tool.name} className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-dark-3 dark:bg-dark">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded bg-blue-100 px-2 py-0.5 text-xs font-mono font-medium text-blue-700">
                  <WrenchIcon /> {tool.name}
                </span>
              </div>
              {tool.description && (
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{tool.description}</p>
              )}
              {tool.inputSchema && Object.keys(tool.inputSchema).length > 0 && (
                <details className="mt-2">
                  <summary className="text-xs text-gray-400 cursor-pointer">输入参数</summary>
                  <pre className="mt-1 rounded bg-white p-2 text-xs font-mono text-gray-600 dark:bg-dark-2 dark:text-gray-300 overflow-x-auto">
                    {JSON.stringify(tool.inputSchema, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ))}
        </div>
      )}

      {!loadingResources && activeTab === "resources" && (
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {resources.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">暂无资源</p>
          ) : resources.map((res) => (
            <div key={res.uri} className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-dark-3 dark:bg-dark">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded bg-green-100 px-2 py-0.5 text-xs font-mono font-medium text-green-700">
                  <FolderIcon /> {res.uri}
                </span>
              </div>
              {res.name && (
                <p className="mt-1 text-sm font-medium text-gray-700 dark:text-gray-300">{res.name}</p>
              )}
              {res.description && (
                <p className="mt-1 text-sm text-gray-500">{res.description}</p>
              )}
              {res.mimeType && (
                <p className="mt-1 text-xs text-gray-400">MIME: {res.mimeType}</p>
              )}
            </div>
          ))}
        </div>
      )}

    </Modal>
  );
}

function McpFormModal({ server, onClose, onSaved }: {
  server?: McpServer | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = Boolean(server);
  const [form, setForm] = useState({
    name: server?.name || "",
    description: server?.description || "",
    command: server?.command || "",
    cwd: server?.cwd || "",
    args: server?.args || "",
    transport: server?.transport || "stdio",
    url: server?.url || "",
    auth_type: server?.auth_type || "none",
    auth_token: server?.auth_token || "",
    env_json: server?.env_json || "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const update = (key: string, val: string) => {
    setForm((prev) => ({ ...prev, [key]: val }));
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      setError("名称必填");
      return;
    }
    if (form.transport === "stdio") {
      if (!form.command.trim()) {
        setError("stdio 协议必须填写命令");
        return;
      }
    } else {
      if (!form.url.trim()) {
        setError(`${form.transport} 协议必须填写 URL`);
        return;
      }
    }

    setSaving(true);
    try {
      await meowoneApi.upsertMcp({
        name: form.name.trim(),
        description: form.description.trim(),
        command: form.command.trim(),
        cwd: form.cwd.trim(),
        args: form.args.trim(),
        transport: form.transport,
        url: form.url.trim(),
        auth_type: form.auth_type,
        auth_token: form.auth_type !== "none" ? form.auth_token.trim() : "",
        env_json: form.env_json.trim() || "{}",
      });
      onSaved();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => ({
    name: "", description: "", command: "", cwd: "", args: "",
    transport: "stdio", url: "", auth_type: "none", auth_token: "", env_json: "",
  });

  const handleClose = () => {
    onClose();
  };

  return (
    <Modal open onClose={handleClose} title={isEdit ? "编辑 MCP 服务" : "添加 MCP 服务"} size="lg">
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>
        )}

        <div>
          <label className="mb-1.5 block text-sm font-medium">名称 <span className="text-red-500">*</span></label>
          <input
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder="my-mcp-server"
            disabled={isEdit}
            className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm dark:border-dark-3 dark:bg-dark disabled:opacity-60"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">描述</label>
          <input
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            placeholder="简短描述该 MCP 服务的用途"
            className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm dark:border-dark-3 dark:bg-dark"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">传输方式</label>
          <div className="flex gap-3">
            {[
              { value: "stdio", label: "STDIO", desc: "标准输入输出，子进程方式" },
              { value: "sse", label: "SSE", desc: "Server-Sent Events" },
              { value: "http_stream", label: "HTTP Stream", desc: "基于 HTTP 的流式传输" },
            ].map((t) => (
              <label
                key={t.value}
                className={`flex flex-1 cursor-pointer items-start gap-2 rounded-lg border-2 p-3 transition-all ${
                  form.transport === t.value
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                    : "border-gray-200 hover:border-gray-300 dark:border-dark-3"
                }`}
              >
                <input
                  type="radio"
                  name="transport"
                  value={t.value}
                  checked={form.transport === t.value}
                  onChange={() => update("transport", t.value)}
                  className="mt-0.5"
                />
                <div>
                  <div className="text-sm font-medium">{t.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{t.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* STDIO 专属字段 */}
        {form.transport === "stdio" && (
          <>
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                命令 <span className="text-red-500">*</span>
              </label>
              <input
                value={form.command}
                onChange={(e) => update("command", e.target.value)}
                placeholder="npx -y @modelcontextprotocol/server-filesystem"
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-mono dark:border-dark-3 dark:bg-dark"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">工作目录</label>
                <input
                  value={form.cwd}
                  onChange={(e) => update("cwd", e.target.value)}
                  placeholder="可选，不填则用当前目录"
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-mono dark:border-dark-3 dark:bg-dark"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">启动参数</label>
                <input
                  value={form.args}
                  onChange={(e) => update("args", e.target.value)}
                  placeholder="./data /tmp/files"
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-mono dark:border-dark-3 dark:bg-dark"
                />
              </div>
            </div>
          </>
        )}

        {/* SSE / HTTP Stream 专属字段 */}
        {form.transport !== "stdio" && (
          <>
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                服务 URL <span className="text-red-500">*</span>
              </label>
              <input
                value={form.url}
                onChange={(e) => update("url", e.target.value)}
                placeholder={form.transport === "sse" ? "https://mcp.example.com/sse" : "https://mcp.example.com/stream"}
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-mono dark:border-dark-3 dark:bg-dark"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">认证方式</label>
              <div className="flex gap-3">
                {[
                  { value: "none", label: "无认证" },
                  { value: "bearer", label: "Bearer Token" },
                  { value: "api_key", label: "API Key" },
                ].map((a) => (
                  <label
                    key={a.value}
                    className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border-2 p-2.5 text-sm transition-all ${
                      form.auth_type === a.value
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                        : "border-gray-200 hover:border-gray-300 dark:border-dark-3"
                    }`}
                  >
                    <input
                      type="radio"
                      name="auth_type"
                      value={a.value}
                      checked={form.auth_type === a.value}
                      onChange={() => update("auth_type", a.value)}
                      className="sr-only"
                    />
                    {a.label}
                  </label>
                ))}
              </div>
            </div>

            {form.auth_type !== "none" && (
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  认证令牌 <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.auth_token}
                  onChange={(e) => update("auth_token", e.target.value)}
                  placeholder={form.auth_type === "bearer" ? "Bearer eyJhbG..." : "sk-xxxx..."}
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-mono dark:border-dark-3 dark:bg-dark"
                />
              </div>
            )}
          </>
        )}

        {/* 通用字段：环境变量 */}
        <div>
          <label className="mb-1.5 block text-sm font-medium">环境变量（JSON）</label>
          <textarea
            value={form.env_json}
            onChange={(e) => update("env_json", e.target.value)}
            placeholder='{"KEY": "value"}'
            rows={2}
            className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-mono dark:border-dark-3 dark:bg-dark"
          />
        </div>

        {/* 底部按钮 */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100 dark:border-dark-3">
          <button
            onClick={handleClose}
            className="rounded-lg border border-gray-200 px-5 py-2 text-sm text-gray-600 dark:border-dark-3 dark:text-gray-300"
          >
            取消
          </button>
          <button
            onClick={() => void handleSubmit()}
            disabled={saving}
            className="rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? "保存中..." : "保存"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default function McpConfigPage() {
  const [data, setData] = useState<{ count: number; servers: McpServer[] } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingServer, setEditingServer] = useState<McpServer | null>(null);
  const [detailServer, setDetailServer] = useState<McpServer | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      setData(await meowoneApi.listMcp());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const servers = data?.servers || [];

  const handleDelete = async (name: string) => {
    if (!confirm(`确定要删除 MCP 服务「${name}」吗？`)) return;
    try {
      await meowoneApi.deleteMcp(name);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const openCreate = () => {
    setEditingServer(null);
    setShowForm(true);
  };

  const openEdit = (server: McpServer) => {
    setEditingServer(server);
    setShowForm(true);
  };

  const transportBadge = (t?: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      stdio: { label: "STDIO", cls: "bg-gray-100 text-gray-600" },
      sse: { label: "SSE", cls: "bg-blue-100 text-blue-600" },
      http_stream: { label: "HTTP Stream", cls: "bg-purple-100 text-purple-600" },
    };
    const info = map[t || "stdio"] || map.stdio;
    return (
      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${info.cls}`}>
        {info.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">MCP 服务配置</h1>
          <p className="mt-1 text-sm text-gray-500">
            配置 Model Context Protocol (MCP) 服务，支持 stdio / SSE / HTTP Stream 三种协议
          </p>
        </div>
        <button
          onClick={() => void openCreate()}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-5 py-2.5 font-medium text-white transition-all hover:from-blue-600 hover:to-purple-700"
        >
          <PlusIcon />
          添加 MCP
        </button>
      </div>

      <button
        onClick={() => void load()}
        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 dark:border-dark-3 dark:bg-dark-2"
      >
        <RefreshIcon />
        刷新
      </button>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">{error}</div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="size-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          <span className="ml-3 text-gray-500">加载中...</span>
        </div>
      )}

      {/* MCP 列表 */}
      {!loading && servers.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {servers.map((s) => (
            <div
              key={s.id || s.name}
              className="rounded-xl border border-gray-200 bg-white p-5 dark:border-dark-3 dark:bg-dark-2 hover:border-purple-300 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-900/30">
                  <PlugIcon />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold truncate">{s.name || "未命名"}</h3>
                    {transportBadge(s.transport)}
                  </div>
                  <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                    {s.description || "无描述"}
                  </p>
                </div>
              </div>

              {/* 配置摘要 */}
              <div className="mt-3 rounded bg-gray-50 p-2 font-mono text-xs dark:bg-dark">
                {s.transport === "stdio" ? (
                  <>
                    <div className="truncate" title={s.command}>{s.command || "—"}</div>
                    {s.cwd && <div className="mt-1 truncate text-gray-400" title={s.cwd}>cwd: {s.cwd}</div>}
                  </>
                ) : (
                  <>
                    <div className="truncate" title={s.url}>{s.url || "—"}</div>
                    {s.auth_type && s.auth_type !== "none" && (
                      <div className="mt-1 text-gray-400">🔒 {s.auth_type}</div>
                    )}
                  </>
                )}
              </div>

              {/* 底部状态与操作 */}
              <div className="mt-3 flex items-center justify-between">
                <span className={`rounded-full px-2 py-0.5 text-xs ${
                  s.enabled ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-500"
                }`}>
                  {s.enabled ? "启用" : "禁用"}
                </span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setDetailServer(s)}
                    className="flex items-center gap-1 text-xs text-purple-500 hover:text-purple-600"
                    title="查看工具和资源"
                  >
                    <EyeIcon />
                    详情
                  </button>
                  <button
                    onClick={() => openEdit(s)}
                    className="text-blue-500 hover:text-blue-600"
                    title="编辑"
                  >
                    <EditIcon />
                  </button>
                  <button
                    onClick={() => handleDelete(s.name || "")}
                    className="text-red-500 hover:text-red-600"
                    title="删除"
                  >
                    <TrashIcon />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && servers.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 py-16">
          <div className="flex size-16 items-center justify-center rounded-full bg-gray-100">
            <PlugIcon />
          </div>
          <h3 className="mt-4 text-lg font-medium text-gray-900">还没有 MCP 服务</h3>
          <p className="mt-2 text-sm text-gray-500">添加 MCP 服务，为智能体提供工具能力</p>
          <button
            onClick={() => void openCreate()}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-3 font-medium text-white"
          >
            <PlusIcon />
            添加第一个 MCP
          </button>
        </div>
      )}

      {/* 创建 / 编辑弹窗 */}
      {showForm && (
        <McpFormModal
          server={editingServer}
          onClose={() => { setShowForm(false); setEditingServer(null); }}
          onSaved={() => { void load(); }}
        />
      )}

      {/* 详情弹窗 */}
      {detailServer && (
        <DetailModal
          server={detailServer}
          onClose={() => setDetailServer(null)}
        />
      )}
    </div>
  );
}
