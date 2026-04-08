"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { meowoneApi, type AgentsListResponse } from "@/lib/meowone-api";

type AgentTypeFilter = "" | "internal" | "external";

export default function AgentsDbPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const param = searchParams.get("agent_type");
  const agentType: AgentTypeFilter = param === "internal" || param === "external" ? param : "";
  const [data, setData] = useState<AgentsListResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState("");

  const setFilter = (v: AgentTypeFilter) => {
    const sp = new URLSearchParams();
    if (v) sp.set("agent_type", v);
    const qs = sp.toString();
    router.replace(qs ? `/meowone/agents?${qs}` : "/meowone/agents");
  };

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      setData(await meowoneApi.listAgents(agentType || undefined));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [agentType]);

  const allAgents = (data?.agents || []) as Record<string, unknown>[];
  const filteredAgents = allAgents.filter((a) => {
    const name = String(a.name ?? "");
    const desc = String(a.description ?? "");
    const typ = String(a.agent_type ?? a.type ?? "");
    return keyword.trim()
      ? [name, desc, typ].join(" ").toLowerCase().includes(keyword.trim().toLowerCase())
      : true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-title-md2 font-semibold text-dark dark:text-white">智能体管理</h1>
        <p className="mt-1 text-sm text-body dark:text-dark-6">业务视图：名称、类型、资源绑定摘要、状态与详情入口。</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={agentType}
          onChange={(e) => setFilter(e.target.value as AgentTypeFilter)}
          className="rounded-lg border border-stroke bg-white px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2"
        >
          <option value="">全部类型</option>
          <option value="internal">internal</option>
          <option value="external">external</option>
        </select>
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="搜索名称/描述/类型"
          className="min-w-[240px] rounded-lg border border-stroke bg-white px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2"
        />
        <button type="button" className="rounded-lg border border-stroke px-3 py-2 text-sm" onClick={() => void load()}>
          刷新
        </button>
      </div>

      {error ? <p className="text-sm text-red">{error}</p> : null}

      <div className="overflow-auto rounded-xl border border-stroke bg-white dark:border-dark-3 dark:bg-dark-2">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-stroke bg-gray-1 dark:border-dark-3 dark:bg-dark">
            <tr>
              <th className="p-3">名称</th>
              <th className="p-3">类型</th>
              <th className="p-3">协议</th>
              <th className="p-3">资源绑定</th>
              <th className="p-3">状态</th>
              <th className="p-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {filteredAgents.map((a) => {
              const typ = String(a.agent_type ?? a.type ?? "?");
              const nm = String(a.name ?? "");
              const prompt = a.prompt_key || a.system_prompt ? "有" : "无";
              const skills = Array.isArray(a.agent_skills) ? (a.agent_skills as unknown[]).length : 0;
              const mcps = Array.isArray(a.mcp_servers) ? (a.mcp_servers as unknown[]).length : 0;
              const protocol = String(a.protocol ?? (typ === "external" ? "a2a" : "native"));
              const enabled = a.enabled === false ? "停用" : "启用";
              return (
                <tr key={`${typ}-${nm}`} className="border-b border-stroke dark:border-dark-3">
                  <td className="p-3 font-medium text-dark dark:text-white">{nm || "-"}</td>
                  <td className="p-3">{typ}</td>
                  <td className="p-3">{protocol}</td>
                  <td className="p-3 text-xs text-body dark:text-dark-6">
                    prompt:{prompt} · skills:{skills} · mcp:{mcps}
                  </td>
                  <td className="p-3">
                    <span className={`rounded-full px-2 py-1 text-xs ${enabled === "启用" ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>
                      {enabled}
                    </span>
                  </td>
                  <td className="space-x-3 p-3">
                    <Link className="text-primary" href={`/meowone/agents/${encodeURIComponent(typ)}/${encodeURIComponent(nm)}`}>
                      详情
                    </Link>
                    <button
                      className="text-red"
                      onClick={async () => {
                        if (!confirm(`删除 ${typ}/${nm}?`)) return;
                        await meowoneApi.deleteAgent(typ, nm);
                        await load();
                      }}
                    >
                      删除
                    </button>
                  </td>
                </tr>
              );
            })}
            {!loading && filteredAgents.length === 0 ? (
              <tr>
                <td className="p-6 text-center text-sm text-body dark:text-dark-6" colSpan={6}>
                  暂无匹配智能体
                </td>
              </tr>
            ) : null}
            {loading ? (
              <tr>
                <td className="p-6 text-center text-sm text-body dark:text-dark-6" colSpan={6}>
                  加载中...
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-stroke bg-white p-4 text-xs text-body dark:border-dark-3 dark:bg-dark-2 dark:text-dark-6">
        说明：`internal-agents` 页面作为兼容入口保留，推荐从“详情”页完成配置与调试闭环。
      </div>
    </div>
  );
}
