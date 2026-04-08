"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { meowoneApi } from "@/lib/meowone-api";

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
  const [mcpServers, setMcpServers] = useState("");
  const [agentSkills, setAgentSkills] = useState("");
  const [allowTools, setAllowTools] = useState("");
  const [denyTools, setDenyTools] = useState("");
  const [maxRounds, setMaxRounds] = useState("");
  const [maxToolPhases, setMaxToolPhases] = useState("");
  const [timeoutSeconds, setTimeoutSeconds] = useState("");
  const [baseUrl, setBaseUrl] = useState("");

  const [task, setTask] = useState("");
  const [debugResult, setDebugResult] = useState("");

  const isInternal = type === "internal";

  const title = useMemo(() => `${type}/${name}`, [type, name]);

  const load = async () => {
    try {
      setLoading(true);
      setError("");
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
      setMcpServers(Array.isArray(found.mcp_servers) ? (found.mcp_servers as string[]).join(", ") : "");
      setAgentSkills(Array.isArray(found.agent_skills) ? (found.agent_skills as string[]).join(", ") : "");
      setAllowTools(Array.isArray(found.allow_tools) ? (found.allow_tools as string[]).join(", ") : "");
      setDenyTools(Array.isArray(found.deny_tools) ? (found.deny_tools as string[]).join(", ") : "");
      setMaxRounds(found.max_rounds == null ? "" : String(found.max_rounds));
      setMaxToolPhases(found.max_tool_phases == null ? "" : String(found.max_tool_phases));
      setTimeoutSeconds(found.timeout_seconds == null ? "" : String(found.timeout_seconds));
      setBaseUrl(String(found.base_url ?? ""));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [type, name]);

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
          mcp_servers: splitList(mcpServers),
          agent_skills: splitList(agentSkills),
          allow_tools: splitList(allowTools),
          deny_tools: splitList(denyTools),
          max_rounds: maxRounds ? Number(maxRounds) : null,
          max_tool_phases: maxToolPhases ? Number(maxToolPhases) : null,
          timeout_seconds: timeoutSeconds ? Number(timeoutSeconds) : null,
        });
      } else {
        await meowoneApi.upsertExternalAgent({
          name,
          description,
          base_url: baseUrl,
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

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link href="/meowone/agents" className="text-sm text-primary">
          ← 返回智能体列表
        </Link>
        <h1 className="text-title-md2 font-semibold text-dark dark:text-white">{title}</h1>
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
        <div className="space-y-3 rounded-xl border border-stroke bg-white p-4 dark:border-dark-3 dark:bg-dark-2">
          <div>
            <p className="text-xs text-body dark:text-dark-6">名称</p>
            <p className="text-sm font-medium">{name}</p>
          </div>
          <label className="block text-sm">
            <span className="mb-1 block text-xs text-body dark:text-dark-6">描述</span>
            <input value={description} onChange={(e) => setDescription(e.target.value)} className="w-full rounded-lg border border-stroke px-3 py-2 dark:border-dark-3 dark:bg-dark" />
          </label>

          {isInternal ? (
            <>
              <label className="block text-sm">
                <span className="mb-1 block text-xs text-body dark:text-dark-6">system_prompt</span>
                <textarea value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} className="h-28 w-full rounded-lg border border-stroke px-3 py-2 dark:border-dark-3 dark:bg-dark" />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs text-body dark:text-dark-6">prompt_key</span>
                <input value={promptKey} onChange={(e) => setPromptKey(e.target.value)} className="w-full rounded-lg border border-stroke px-3 py-2 dark:border-dark-3 dark:bg-dark" />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs text-body dark:text-dark-6">mcp_servers（逗号分隔）</span>
                <input value={mcpServers} onChange={(e) => setMcpServers(e.target.value)} className="w-full rounded-lg border border-stroke px-3 py-2 dark:border-dark-3 dark:bg-dark" />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs text-body dark:text-dark-6">agent_skills（逗号分隔）</span>
                <input value={agentSkills} onChange={(e) => setAgentSkills(e.target.value)} className="w-full rounded-lg border border-stroke px-3 py-2 dark:border-dark-3 dark:bg-dark" />
              </label>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="block text-sm">
                  <span className="mb-1 block text-xs text-body dark:text-dark-6">allow_tools（逗号分隔）</span>
                  <input value={allowTools} onChange={(e) => setAllowTools(e.target.value)} className="w-full rounded-lg border border-stroke px-3 py-2 dark:border-dark-3 dark:bg-dark" />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block text-xs text-body dark:text-dark-6">deny_tools（逗号分隔）</span>
                  <input value={denyTools} onChange={(e) => setDenyTools(e.target.value)} className="w-full rounded-lg border border-stroke px-3 py-2 dark:border-dark-3 dark:bg-dark" />
                </label>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <label className="block text-sm">
                  <span className="mb-1 block text-xs text-body dark:text-dark-6">max_rounds</span>
                  <input value={maxRounds} onChange={(e) => setMaxRounds(e.target.value)} className="w-full rounded-lg border border-stroke px-3 py-2 dark:border-dark-3 dark:bg-dark" />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block text-xs text-body dark:text-dark-6">max_tool_phases</span>
                  <input value={maxToolPhases} onChange={(e) => setMaxToolPhases(e.target.value)} className="w-full rounded-lg border border-stroke px-3 py-2 dark:border-dark-3 dark:bg-dark" />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block text-xs text-body dark:text-dark-6">timeout_seconds</span>
                  <input value={timeoutSeconds} onChange={(e) => setTimeoutSeconds(e.target.value)} className="w-full rounded-lg border border-stroke px-3 py-2 dark:border-dark-3 dark:bg-dark" />
                </label>
              </div>
            </>
          ) : (
            <label className="block text-sm">
              <span className="mb-1 block text-xs text-body dark:text-dark-6">base_url</span>
              <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} className="w-full rounded-lg border border-stroke px-3 py-2 dark:border-dark-3 dark:bg-dark" />
            </label>
          )}

          <button type="button" className="rounded-lg bg-primary px-4 py-2 text-sm text-white disabled:opacity-60" onClick={() => void save()} disabled={saving}>
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
                <textarea value={task} onChange={(e) => setTask(e.target.value)} placeholder="输入要让智能体执行的任务..." className="h-24 w-full rounded-lg border border-stroke px-3 py-2 dark:border-dark-3 dark:bg-dark" />
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
            <p className="text-sm text-body dark:text-dark-6">外部智能体暂不支持此页面内联调试，请通过对话控制台或网关链路验证。</p>
          )}
        </div>
      ) : null}

      {agent ? (
        <details className="rounded-xl border border-stroke bg-white p-4 text-xs dark:border-dark-3 dark:bg-dark-2">
          <summary className="cursor-pointer text-sm">查看原始数据（只读）</summary>
          <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap">{JSON.stringify(agent, null, 2)}</pre>
        </details>
      ) : null}
    </div>
  );
}

