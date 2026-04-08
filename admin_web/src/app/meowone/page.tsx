"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { meowoneApi } from "@/lib/meowone-api";

type Card = { title: string; value: string; hint: string; tone: "ok" | "warn" | "neutral" };

export default function MeowOverviewPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [health, setHealth] = useState<string>("unknown");
  const [modelCount, setModelCount] = useState(0);
  const [defaultModel, setDefaultModel] = useState("未配置");
  const [mcpCount, setMcpCount] = useState(0);
  const [skillCount, setSkillCount] = useState(0);
  const [agentCount, setAgentCount] = useState(0);
  const [taskEnabledCount, setTaskEnabledCount] = useState(0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const [h, models, mcp, skills, agents, tasks] = await Promise.all([
          meowoneApi.health(),
          meowoneApi.listModels(),
          meowoneApi.listMcp(),
          meowoneApi.listSkills(),
          meowoneApi.listAgents(),
          meowoneApi.listScheduledTasks(),
        ]);
        if (!mounted) return;
        setHealth(h.status || "ok");
        setModelCount(models.count || 0);
        const currentDefault =
          (models.models || []).find((m) => Boolean((m as Record<string, unknown>).is_default)) || null;
        setDefaultModel(String((currentDefault as Record<string, unknown> | null)?.name || "未配置"));
        setMcpCount(mcp.count || 0);
        setSkillCount(skills.count || 0);
        setAgentCount(agents.count || 0);
        const enabled = (tasks.tasks || []).filter((t) => Boolean((t as Record<string, unknown>).enabled)).length;
        setTaskEnabledCount(enabled);
      } catch (e) {
        if (!mounted) return;
        setError((e as Error).message);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const cards = useMemo<Card[]>(
    () => [
      {
        title: "系统健康",
        value: health === "ok" ? "健康" : health,
        hint: "后端与运行状态",
        tone: health === "ok" ? "ok" : "warn",
      },
      {
        title: "默认模型",
        value: defaultModel,
        hint: `已注册 ${modelCount} 个模型`,
        tone: defaultModel === "未配置" ? "warn" : "ok",
      },
      {
        title: "能力资源",
        value: `MCP ${mcpCount} / Skills ${skillCount}`,
        hint: "可用能力数量",
        tone: "neutral",
      },
      {
        title: "智能体与调度",
        value: `Agents ${agentCount} / Tasks ${taskEnabledCount}`,
        hint: "启用任务数",
        tone: "neutral",
      },
    ],
    [health, defaultModel, modelCount, mcpCount, skillCount, agentCount, taskEnabledCount],
  );

  const toneCls = (tone: Card["tone"]) =>
    tone === "ok"
      ? "border-emerald-200 bg-emerald-50"
      : tone === "warn"
        ? "border-amber-200 bg-amber-50"
        : "border-[#e6eaf2] bg-white";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-title-md2 font-semibold text-dark dark:text-white">系统总览</h1>
        <p className="mt-1 text-sm text-body dark:text-dark-6">从配置到运行的系统状态总入口。</p>
      </div>

      {error ? <p className="rounded-lg border border-red/40 bg-red/5 px-3 py-2 text-sm text-red">{error}</p> : null}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <section key={c.title} className={`rounded-2xl border p-4 ${toneCls(c.tone)}`}>
            <p className="text-xs text-[#6b7280]">{c.title}</p>
            <p className="mt-1 truncate text-[17px] font-semibold text-[#1d2129]">{loading ? "加载中..." : c.value}</p>
            <p className="mt-1 text-xs text-[#8a9099]">{c.hint}</p>
          </section>
        ))}
      </div>

      <div className="rounded-2xl border border-[#e6eaf2] bg-white p-4">
        <p className="text-sm font-medium text-[#1d2129]">快捷入口</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link className="rounded-lg bg-[#2f7dff] px-3 py-2 text-sm text-white" href="/meowone/chat">
            进入对话控制台
          </Link>
          <Link className="rounded-lg border border-[#d1d5db] px-3 py-2 text-sm text-[#1d2129]" href="/meowone/agents">
            管理智能体
          </Link>
          <Link className="rounded-lg border border-[#d1d5db] px-3 py-2 text-sm text-[#1d2129]" href="/meowone/gateway-logs">
            查看网关日志
          </Link>
        </div>
      </div>
    </div>
  );
}

