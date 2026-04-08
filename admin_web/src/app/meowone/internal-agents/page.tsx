"use client";
import { Suspense, useEffect, useState } from "react";
import { meowoneApi, type InternalAgentsListResponse } from "@/lib/meowone-api";

function splitList(s: string) {
  return s.split(/[,，\n]/g).map(x => x.trim()).filter(Boolean);
}

function InternalAgentsContent() {
  const [data, setData] = useState<InternalAgentsListResponse | null>(null);
  const [error, setError] = useState("");
  const [invokeResult, setInvokeResult] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [mcpServers, setMcpServers] = useState("");
  const [agentSkills, setAgentSkills] = useState("");
  const [allowTools, setAllowTools] = useState("");
  const [denyTools, setDenyTools] = useState("");
  const [maxRounds, setMaxRounds] = useState("");
  const [maxToolPhases, setMaxToolPhases] = useState("");
  const [timeoutSeconds, setTimeoutSeconds] = useState("");
  const [invokeAgent, setInvokeAgent] = useState("");
  const [invokeTask, setInvokeTask] = useState("");
  const [invokeHistory, setInvokeHistory] = useState("[]");

  const load = async () => {
    try {
      setError("");
      setData(await meowoneApi.listInternalAgentsRuntime());
    } catch (e) {
      setError((e as Error).message);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-title-md2 font-semibold text-dark dark:text-white">内部智能体（运行时）</h1>
      {error ? <p className="text-sm text-red">{error}</p> : null}

      <div className="rounded-xl border border-stroke bg-white p-4 dark:border-dark-3 dark:bg-dark-2">
        <h2 className="mb-3 text-sm font-semibold">创建运行时智能体</h2>
        <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="名称"
            className="rounded-lg border border-stroke px-3 py-2 dark:border-dark-3"
          />
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="描述"
            className="rounded-lg border border-stroke px-3 py-2 dark:border-dark-3"
          />
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="system_prompt"
            className="md:col-span-2 h-24 rounded-lg border border-stroke px-3 py-2 dark:border-dark-3"
          />
          <input
            value={mcpServers}
            onChange={(e) => setMcpServers(e.target.value)}
            placeholder="mcp_servers 逗号分隔"
            className="rounded-lg border border-stroke px-3 py-2 dark:border-dark-3"
          />
          <input
            value={agentSkills}
            onChange={(e) => setAgentSkills(e.target.value)}
            placeholder="agent_skills 逗号分隔"
            className="rounded-lg border border-stroke px-3 py-2 dark:border-dark-3"
          />
          <input
            value={allowTools}
            onChange={(e) => setAllowTools(e.target.value)}
            placeholder="allow_tools 逗号分隔"
            className="rounded-lg border border-stroke px-3 py-2 dark:border-dark-3"
          />
          <input
            value={denyTools}
            onChange={(e) => setDenyTools(e.target.value)}
            placeholder="deny_tools 逗号分隔"
            className="rounded-lg border border-stroke px-3 py-2 dark:border-dark-3"
          />
          <input
            value={maxRounds}
            onChange={(e) => setMaxRounds(e.target.value)}
            placeholder="max_rounds"
            className="rounded-lg border border-stroke px-3 py-2 dark:border-dark-3"
          />
          <input
            value={maxToolPhases}
            onChange={(e) => setMaxToolPhases(e.target.value)}
            placeholder="max_tool_phases"
            className="rounded-lg border border-stroke px-3 py-2 dark:border-dark-3"
          />
          <input
            value={timeoutSeconds}
            onChange={(e) => setTimeoutSeconds(e.target.value)}
            placeholder="timeout_seconds"
            className="rounded-lg border border-stroke px-3 py-2 dark:border-dark-3"
          />
        </div>
        <button
          className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm text-white"
          onClick={async () => {
            await meowoneApi.createInternalAgentRuntime({
              name,
              description,
              system_prompt: systemPrompt,
              mcp_servers: splitList(mcpServers),
              agent_skills: splitList(agentSkills),
              allow_tools: splitList(allowTools),
              deny_tools: splitList(denyTools),
              max_rounds: maxRounds ? Number(maxRounds) : null,
              max_tool_phases: maxToolPhases ? Number(maxToolPhases) : null,
              timeout_seconds: timeoutSeconds ? Number(timeoutSeconds) : null,
            });
            await load();
          }}
        >
          创建
        </button>
      </div>

      <div className="rounded-xl border border-stroke bg-white p-4 dark:border-dark-3 dark:bg-dark-2">
        <h2 className="mb-3 text-sm font-semibold">调用</h2>
        <div className="space-y-2 text-sm">
          <input
            value={invokeAgent}
            onChange={(e) => setInvokeAgent(e.target.value)}
            placeholder="agent_name"
            className="w-full rounded-lg border border-stroke px-3 py-2 dark:border-dark-3"
          />
          <textarea
            value={invokeTask}
            onChange={(e) => setInvokeTask(e.target.value)}
            placeholder="task"
            className="h-24 w-full rounded-lg border border-stroke px-3 py-2 dark:border-dark-3"
          />
          <textarea
            value={invokeHistory}
            onChange={(e) => setInvokeHistory(e.target.value)}
            placeholder='history JSON 数组，默认 []'
            className="h-20 w-full rounded-lg border border-stroke px-3 py-2 font-mono text-xs dark:border-dark-3"
          />
        </div>
        <button
          className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm text-white"
          onClick={async () => {
            let history: unknown[] = [];
            try {
              history = JSON.parse(invokeHistory || "[]") as unknown[];
            } catch {
              setInvokeResult("历史记录 JSON 无效");
              return;
            }
            const r = await meowoneApi.invokeInternalAgent(invokeAgent, { task: invokeTask, history });
            setInvokeResult(JSON.stringify(r, null, 2));
          }}
        >
          调用
        </button>
        {invokeResult ? (
          <pre className="mt-3 max-h-64 overflow-auto rounded-lg bg-gray-1 p-3 text-xs dark:bg-dark">{invokeResult}</pre>
        ) : null}
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold">当前列表</h2>
        {(data?.agents || []).map((a) => (
          <pre
            key={String((a as { name?: string }).name)}
            className="rounded-xl border border-stroke bg-white p-3 text-xs dark:border-dark-3 dark:bg-dark-2"
          >
            {JSON.stringify(a, null, 2)}
          </pre>
        ))}
      </div>
    </div>
  );
}

export default function InternalAgentsRuntimePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-12">
        <div className="size-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        <span className="ml-3 text-gray-500">加载中...</span>
      </div>
    }>
      <InternalAgentsContent />
    </Suspense>
  );
}