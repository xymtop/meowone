"use client";

import Link from "next/link";
import { useMemo, useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { meowoneApi } from "@/lib/meowone-api";
import { cn } from "@/lib/utils";

type Tab = "config" | "debug";

function splitList(s: string): string[] {
  return s
    .split(/[,，\n]/g)
    .map((x) => x.trim())
    .filter(Boolean);
}

export default function AgentDetailPage() {
  const params = useParams<{ type: string; name: string }>();
  const type = decodeURIComponent(params.type || "");
  const name = decodeURIComponent(params.name || "");

  const [tab, setTab] = useState<Tab>("config");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [debugging, setDebugging] = useState(false);
  const [agent, setAgent] = useState<Record<string, unknown> | null>(null);

  const [description, setDescription] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [promptKey, setPromptKey] = useState("");
  const [mcpServers, setMcpServers] = useState<string[]>([]);
  const [agentSkills, setAgentSkills] = useState<string[]>([]);
  const [allowTools, setAllowTools] = useState("");
  const [denyTools, setDenyTools] = useState("");
  const [maxRounds, setMaxRounds] = useState("");
  const [maxToolPhases, setMaxToolPhases] = useState("");
  const [timeoutSeconds, setTimeoutSeconds] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [modelName, setModelName] = useState("");
  const [schedulerMode, setSchedulerMode] = useState("direct");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [models, setModels] = useState<Record<string, unknown>[]>([]);
  const [mcpCatalog, setMcpCatalog] = useState<{ name: string; description?: string }[]>([]);
  const [skillsCatalog, setSkillsCatalog] = useState<{ name: string; description?: string }[]>([]);
  const [promptsCatalog, setPromptsCatalog] = useState<{ prompt_key: string; name: string }[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);

  const [task, setTask] = useState("");
  const [debugResult, setDebugResult] = useState("");

  const isInternal = type === "internal";

  const title = useMemo(() => `${type}/${name}`, [type, name]);

  const loadCatalog = useCallback(async () => {
    try {
      setLoadingCatalog(true);
      const [mr, mcp, sk, pr] = await Promise.all([
        meowoneApi.listModels(),
        meowoneApi.listMcp(),
        meowoneApi.listSkills(),
        meowoneApi.listPrompts(),
      ]);
      setModels(mr.models || []);
      setMcpCatalog(
        (mcp.servers || []).map((s: Record<string, unknown>) => ({
          name: String(s.name || ""),
          description: s.description ? String(s.description) : undefined,
        })),
      );
      setSkillsCatalog(
        (sk.skills || []).map((s: { name: string; description?: string }) => ({
          name: s.name,
          description: s.description,
        })),
      );
      setPromptsCatalog(
        (pr.prompts || []).map((p: { prompt_key: string; name: string }) => ({
          prompt_key: p.prompt_key,
          name: p.name,
        })),
      );
    } catch {
      /* 列表失败时仍可使用手动配置 */
    } finally {
      setLoadingCatalog(false);
    }
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      await loadCatalog();
      const resp = await meowoneApi.listAgents(type || undefined);
      const found = (resp.agents || []).find(
        (a) => String(a.agent_type ?? a.type ?? "") === type && String(a.name ?? "") === name,
      ) as Record<string, unknown> | undefined;
      if (!found) {
        throw new Error("Agent not found");
      }
      setAgent(found);
      setDescription(String(found.description ?? ""));
      setSystemPrompt(String(found.system_prompt ?? ""));
      setPromptKey(String(found.prompt_key ?? ""));
      setMcpServers(Array.isArray(found.mcp_servers) ? (found.mcp_servers as string[]).map(String) : []);
      setAgentSkills(Array.isArray(found.agent_skills) ? (found.agent_skills as string[]).map(String) : []);
      setAllowTools(Array.isArray(found.allow_tools) ? (found.allow_tools as string[]).join(", ") : "");
      setDenyTools(Array.isArray(found.deny_tools) ? (found.deny_tools as string[]).join(", ") : "");
      setMaxRounds(found.max_rounds == null ? "" : String(found.max_rounds));
      setMaxToolPhases(found.max_tool_phases == null ? "" : String(found.max_tool_phases));
      setTimeoutSeconds(found.timeout_seconds == null ? "" : String(found.timeout_seconds));
      setBaseUrl(String(found.base_url ?? ""));
      const metadata = found.metadata_json as Record<string, unknown> | undefined;
      setAuthToken((metadata?.auth_token as string) || "");
      setModelName(String(found.model_name ?? ""));
      setSchedulerMode(String(found.scheduler_mode ?? "direct") || "direct");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [type, name]);

  const toggleMcp = (n: string) => {
    setMcpServers((prev) => (prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]));
  };

  const toggleSkill = (n: string) => {
    setAgentSkills((prev) => (prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]));
  };

  const save = async () => {
    try {
      setSaving(true);
      setError("");
      if (isInternal) {
        await meowoneApi.upsertInternalAgent({
          name,
          description,
          system_prompt: systemPrompt,
          prompt_key: promptKey,
          mcp_servers: mcpServers,
          agent_skills: agentSkills,
          allow_tools: splitList(allowTools),
          deny_tools: splitList(denyTools),
          max_rounds: maxRounds ? Number(maxRounds) : null,
          max_tool_phases: maxToolPhases ? Number(maxToolPhases) : null,
          timeout_seconds: timeoutSeconds ? Number(timeoutSeconds) : null,
          model_name: modelName.trim(),
          scheduler_mode: schedulerMode.trim() || "direct",
        });
      } else {
        await meowoneApi.upsertExternalAgent({
          name,
          description,
          base_url: baseUrl,
          auth_token: authToken.trim() || undefined,
        });
      }
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const runDebug = async () => {
    if (!isInternal) return;
    try {
      setDebugging(true);
      setError("");
      const res = await meowoneApi.invokeInternalAgent(name, { task, history: [] });
      setDebugResult(JSON.stringify(res, null, 2));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDebugging(false);
    }
  };

  const modelOptions = useMemo(() => {
    return models.map((m) => ({
      id: String(m.name ?? m.id ?? ""),
      label: String(m.name ?? m.id ?? ""),
    })).filter((x) => x.id);
  }, [models]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link href="/meowone/agents" className="text-sm text-primary">
          ← 返回智能体列表
        </Link>
        <h1 className="text-title-md2 font-semibold text-dark dark:text-white">{title}</h1>
        <p className="text-sm text-body dark:text-dark-6">
          {isInternal ? "可视化配置模型、知识源与能力；高级选项可精细限制工具调用。" : "管理外部 A2A 智能体连接。"}
        </p>
      </div>

      <div className="flex items-center gap-2 border-b border-stroke pb-2 dark:border-dark-3">
        <button
          type="button"
          className={`rounded-lg px-3 py-1.5 text-sm ${tab === "config" ? "bg-primary text-white" : "border border-stroke"}`}
          onClick={() => setTab("config")}
        >
          配置
        </button>
        <button
          type="button"
          className={`rounded-lg px-3 py-1.5 text-sm ${tab === "debug" ? "bg-primary text-white" : "border border-stroke"}`}
          onClick={() => setTab("debug")}
        >
          调试
        </button>
      </div>

      {error ? <p className="text-sm text-red">{error}</p> : null}
      {loading ? <p className="text-sm text-body dark:text-dark-6">加载中...</p> : null}

      {tab === "config" && !loading ? (
        <div className="space-y-6">
          <div className="rounded-2xl border border-stroke bg-white p-6 shadow-sm dark:border-dark-3 dark:bg-dark-2">
            <h2 className="text-lg font-semibold text-dark dark:text-white">基本信息</h2>
            <p className="mt-1 text-xs text-body dark:text-dark-6">名称不可在此修改，请在列表中管理。</p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs text-body dark:text-dark-6">标识名</p>
                <p className="mt-1 text-sm font-medium">{name}</p>
              </div>
              <label className="block text-sm">
                <span className="mb-1 block text-xs text-body dark:text-dark-6">一句话描述</span>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="面向用户的说明"
                  className="w-full rounded-lg border border-stroke px-3 py-2 dark:border-dark-3 dark:bg-dark"
                />
              </label>
            </div>
          </div>

          {isInternal ? (
            <>
              <div className="rounded-2xl border border-stroke bg-white p-6 shadow-sm dark:border-dark-3 dark:bg-dark-2">
                <h2 className="text-lg font-semibold text-dark dark:text-white">模型与调度</h2>
                <p className="mt-1 text-xs text-body dark:text-dark-6">选择推理模型；调度模式与对话页中非默认智能体行为一致。</p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className="block text-sm">
                    <span className="mb-1 block text-xs font-medium text-body dark:text-dark-6">默认模型</span>
                    <select
                      value={modelName}
                      onChange={(e) => setModelName(e.target.value)}
                      disabled={loadingCatalog}
                      className="w-full rounded-lg border border-stroke px-3 py-2 dark:border-dark-3 dark:bg-dark"
                    >
                      <option value="">未指定（由网关默认）</option>
                      {modelOptions.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block text-xs font-medium text-body dark:text-dark-6">调度模式</span>
                    <select
                      value={schedulerMode}
                      onChange={(e) => setSchedulerMode(e.target.value)}
                      className="w-full rounded-lg border border-stroke px-3 py-2 dark:border-dark-3 dark:bg-dark"
                    >
                      <option value="direct">直接（推荐）</option>
                      <option value="scheduled">调度</option>
                    </select>
                  </label>
                </div>
              </div>

              <div className="rounded-2xl border border-stroke bg-white p-6 shadow-sm dark:border-dark-3 dark:bg-dark-2">
                <h2 className="text-lg font-semibold text-dark dark:text-white">角色与提示词</h2>
                <div className="mt-4 space-y-4">
                  <label className="block text-sm">
                    <span className="mb-1 block text-xs font-medium text-body dark:text-dark-6">绑定提示词模板（可选）</span>
                    <select
                      value={promptKey}
                      onChange={(e) => setPromptKey(e.target.value)}
                      disabled={loadingCatalog}
                      className="w-full rounded-lg border border-stroke px-3 py-2 dark:border-dark-3 dark:bg-dark"
                    >
                      <option value="">不使用模板，仅使用下方系统提示</option>
                      {promptsCatalog.map((p) => (
                        <option key={p.prompt_key} value={p.prompt_key}>
                          {p.name} / {p.prompt_key}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block text-xs font-medium text-body dark:text-dark-6">系统提示（System Prompt）</span>
                    <textarea
                      value={systemPrompt}
                      onChange={(e) => setSystemPrompt(e.target.value)}
                      placeholder="描述智能体身份、语气与边界..."
                      rows={8}
                      className="w-full rounded-lg border border-stroke px-3 py-2 font-mono text-sm leading-relaxed dark:border-dark-3 dark:bg-dark"
                    />
                  </label>
                </div>
              </div>

              <div className="rounded-2xl border border-stroke bg-white p-6 shadow-sm dark:border-dark-3 dark:bg-dark-2">
                <h2 className="text-lg font-semibold text-dark dark:text-white">能力与数据源</h2>
                <p className="mt-1 text-xs text-body dark:text-dark-6">点选要启用的 MCP 与技能包，可多选。</p>
                <div className="mt-4 grid gap-6 lg:grid-cols-2">
                  <div>
                    <p className="mb-2 text-sm font-medium text-dark dark:text-white">MCP 服务</p>
                    <div className="flex max-h-56 flex-wrap gap-2 overflow-y-auto rounded-xl border border-stroke dark:border-dark-3 p-3">
                      {mcpCatalog.length === 0 ? (
                        <span className="text-xs text-body dark:text-dark-6">暂无 MCP，请先在「能力 → MCP」中配置。</span>
                      ) : (
                        mcpCatalog.map((m) => (
                          <button
                            key={m.name}
                            type="button"
                            onClick={() => toggleMcp(m.name)}
                            className={cn(
                              "rounded-full border px-3 py-1.5 text-left text-xs transition-colors",
                              mcpServers.includes(m.name)
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-stroke text-body hover:border-primary/40 dark:border-dark-3",
                            )}
                            title={m.description}
                          >
                            {m.name}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-sm font-medium text-dark dark:text-white">技能（Skills）</p>
                    <div className="flex max-h-56 flex-wrap gap-2 overflow-y-auto rounded-xl border border-stroke dark:border-dark-3 p-3">
                      {skillsCatalog.length === 0 ? (
                        <span className="text-xs text-body dark:text-dark-6">暂无技能，请先在「能力 → 技能」中配置。</span>
                      ) : (
                        skillsCatalog.map((s) => (
                          <button
                            key={s.name}
                            type="button"
                            onClick={() => toggleSkill(s.name)}
                            className={cn(
                              "rounded-full border px-3 py-1.5 text-left text-xs transition-colors",
                              agentSkills.includes(s.name)
                                ? "border-green-600 bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300"
                                : "border-stroke text-body hover:border-green-500/40 dark:border-dark-3",
                            )}
                            title={s.description}
                          >
                            {s.name}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-dashed border-stroke bg-gray-1/50 p-4 dark:border-dark-3 dark:bg-dark-2/50">
                <button
                  type="button"
                  className="flex w-full items-center justify-between text-left text-sm font-medium text-dark dark:text-white"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                >
                  <span>高级：工具白名单 / 黑名单与回合限制</span>
                  <span className="text-body">{showAdvanced ? "收起" : "展开"}</span>
                </button>
                {showAdvanced ? (
                  <div className="mt-4 space-y-3">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <label className="block text-sm">
                        <span className="mb-1 block text-xs text-body dark:text-dark-6">允许的工具名（逗号分隔，留空=不额外限制）</span>
                        <input
                          value={allowTools}
                          onChange={(e) => setAllowTools(e.target.value)}
                          className="w-full rounded-lg border border-stroke px-3 py-2 font-mono text-xs dark:border-dark-3 dark:bg-dark"
                        />
                      </label>
                      <label className="block text-sm">
                        <span className="mb-1 block text-xs text-body dark:text-dark-6">禁止的工具名（逗号分隔）</span>
                        <input
                          value={denyTools}
                          onChange={(e) => setDenyTools(e.target.value)}
                          className="w-full rounded-lg border border-stroke px-3 py-2 font-mono text-xs dark:border-dark-3 dark:bg-dark"
                        />
                      </label>
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                      <label className="block text-sm">
                        <span className="mb-1 block text-xs text-body dark:text-dark-6">max_rounds</span>
                        <input
                          value={maxRounds}
                          onChange={(e) => setMaxRounds(e.target.value)}
                          className="w-full rounded-lg border border-stroke px-3 py-2 dark:border-dark-3 dark:bg-dark"
                        />
                      </label>
                      <label className="block text-sm">
                        <span className="mb-1 block text-xs text-body dark:text-dark-6">max_tool_phases</span>
                        <input
                          value={maxToolPhases}
                          onChange={(e) => setMaxToolPhases(e.target.value)}
                          className="w-full rounded-lg border border-stroke px-3 py-2 dark:border-dark-3 dark:bg-dark"
                        />
                      </label>
                      <label className="block text-sm">
                        <span className="mb-1 block text-xs text-body dark:text-dark-6">timeout_seconds</span>
                        <input
                          value={timeoutSeconds}
                          onChange={(e) => setTimeoutSeconds(e.target.value)}
                          className="w-full rounded-lg border border-stroke px-3 py-2 dark:border-dark-3 dark:bg-dark"
                        />
                      </label>
                    </div>
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-stroke bg-white p-6 shadow-sm dark:border-dark-3 dark:bg-dark-2">
              <h2 className="text-lg font-semibold text-dark dark:text-white">外部 A2A 连接</h2>
              <div className="mt-4 space-y-4">
                <label className="block text-sm">
                  <span className="mb-1 block text-xs text-body dark:text-dark-6">A2A 端点 URL</span>
                  <input
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    className="w-full rounded-lg border border-stroke px-3 py-2 dark:border-dark-3 dark:bg-dark"
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block text-xs text-body dark:text-dark-6">认证令牌（可选）</span>
                  <input
                    type="password"
                    value={authToken}
                    onChange={(e) => setAuthToken(e.target.value)}
                    placeholder="Bearer Token"
                    className="w-full rounded-lg border border-stroke px-3 py-2 dark:border-dark-3 dark:bg-dark"
                  />
                </label>
              </div>
            </div>
          )}

          <button
            type="button"
            className="rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-white shadow-sm disabled:opacity-60"
            onClick={() => void save()}
            disabled={saving}
          >
            {saving ? "保存中..." : "保存配置"}
          </button>
        </div>
      ) : null}

      {tab === "debug" && !loading ? (
        <div className="space-y-3 rounded-xl border border-stroke bg-white p-4 dark:border-dark-3 dark:bg-dark-2">
          {isInternal ? (
            <>
              <label className="block text-sm">
                <span className="mb-1 block text-xs text-body dark:text-dark-6">调试任务</span>
                <textarea
                  value={task}
                  onChange={(e) => setTask(e.target.value)}
                  placeholder="输入要让智能体执行的任务..."
                  className="h-24 w-full rounded-lg border border-stroke px-3 py-2 dark:border-dark-3 dark:bg-dark"
                />
              </label>
              <button
                type="button"
                className="rounded-lg bg-primary px-4 py-2 text-sm text-white disabled:opacity-60"
                onClick={() => void runDebug()}
                disabled={debugging || !task.trim()}
              >
                {debugging ? "调试中..." : "运行调试"}
              </button>
              <pre className="max-h-[420px] overflow-auto rounded-lg border border-stroke bg-gray-1 p-3 text-xs dark:border-dark-3 dark:bg-dark">
                {debugResult || "暂无结果"}
              </pre>
            </>
          ) : (
            <p className="text-sm text-body dark:text-dark-6">外部智能体请通过对话控制台或网关链路验证。</p>
          )}
        </div>
      ) : null}

      {agent ? (
        <details className="rounded-xl border border-stroke bg-white p-4 text-xs dark:border-dark-3 dark:bg-dark-2">
          <summary className="cursor-pointer text-sm font-medium">开发者：原始 JSON</summary>
          <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap">{JSON.stringify(agent, null, 2)}</pre>
        </details>
      ) : null}
    </div>
  );
}
