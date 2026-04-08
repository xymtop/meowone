import Link from "next/link";
import { meowoneApi } from "@/lib/meowone-api";

export default async function Home() {
  let health = "offline";
  try {
    const res = await meowoneApi.health();
    health = res.status || "ok";
  } catch {
    health = "offline";
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-title-md2 font-semibold text-dark dark:text-white">MeowOne Admin</h1>
        <p className="mt-1 text-sm text-body dark:text-dark-6">已收敛为 MeowOne 功能导航，下面是可直接使用的公共能力入口。</p>
        <p className="mt-1 text-sm text-body dark:text-dark-6">
          后端健康状态:{" "}
          <span className={health === "ok" ? "text-green-600 dark:text-green-400" : "text-red"}>
            {health}
          </span>
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Link className="rounded-xl border border-stroke bg-white p-5 dark:border-dark-3 dark:bg-dark-2" href="/meowone/sessions">
          <p className="text-lg font-medium text-dark dark:text-white">Sessions</p>
          <p className="mt-1 text-sm text-body dark:text-dark-6">会话查询、新建、删除</p>
        </Link>
        <Link className="rounded-xl border border-stroke bg-white p-5 dark:border-dark-3 dark:bg-dark-2" href="/meowone/messages">
          <p className="text-lg font-medium text-dark dark:text-white">Messages</p>
          <p className="mt-1 text-sm text-body dark:text-dark-6">按会话查看消息记录</p>
        </Link>
        <Link className="rounded-xl border border-stroke bg-white p-5 dark:border-dark-3 dark:bg-dark-2" href="/meowone/chat">
          <p className="text-lg font-medium text-dark dark:text-white">Chat</p>
          <p className="mt-1 text-sm text-body dark:text-dark-6">类 Gemini 聊天页面（SSE / Markdown / A2UI）</p>
        </Link>
        <Link className="rounded-xl border border-stroke bg-white p-5 dark:border-dark-3 dark:bg-dark-2" href="/meowone/config">
          <p className="text-lg font-medium text-dark dark:text-white">Config</p>
          <p className="mt-1 text-sm text-body dark:text-dark-6">读取 .meowone 配置文件</p>
        </Link>
        <Link className="rounded-xl border border-stroke bg-white p-5 dark:border-dark-3 dark:bg-dark-2" href="/meowone/gateway-logs">
          <p className="text-lg font-medium text-dark dark:text-white">Gateway Logs</p>
          <p className="mt-1 text-sm text-body dark:text-dark-6">GET `/api/gateway/logs` 轮询</p>
        </Link>
        <Link className="rounded-xl border border-stroke bg-white p-5 dark:border-dark-3 dark:bg-dark-2" href="/meowone/models">
          <p className="text-lg font-medium text-dark dark:text-white">Models</p>
          <p className="mt-1 text-sm text-body dark:text-dark-6">模型列表与 CRUD</p>
        </Link>
        <Link className="rounded-xl border border-stroke bg-white p-5 dark:border-dark-3 dark:bg-dark-2" href="/meowone/menus">
          <p className="text-lg font-medium text-dark dark:text-white">Menus</p>
          <p className="mt-1 text-sm text-body dark:text-dark-6">菜单管理</p>
        </Link>
        <Link className="rounded-xl border border-stroke bg-white p-5 dark:border-dark-3 dark:bg-dark-2" href="/meowone/capabilities-mcp">
          <p className="text-lg font-medium text-dark dark:text-white">MCP</p>
          <p className="mt-1 text-sm text-body dark:text-dark-6">MCP 服务管理</p>
        </Link>
        <Link className="rounded-xl border border-stroke bg-white p-5 dark:border-dark-3 dark:bg-dark-2" href="/meowone/capabilities-skills">
          <p className="text-lg font-medium text-dark dark:text-white">Skills</p>
          <p className="mt-1 text-sm text-body dark:text-dark-6">Skill 管理</p>
        </Link>
        <Link className="rounded-xl border border-stroke bg-white p-5 dark:border-dark-3 dark:bg-dark-2" href="/meowone/agents">
          <p className="text-lg font-medium text-dark dark:text-white">Agents</p>
          <p className="mt-1 text-sm text-body dark:text-dark-6">数据库智能体配置</p>
        </Link>
        <Link className="rounded-xl border border-stroke bg-white p-5 dark:border-dark-3 dark:bg-dark-2" href="/meowone/internal-agents">
          <p className="text-lg font-medium text-dark dark:text-white">Internal Agents</p>
          <p className="mt-1 text-sm text-body dark:text-dark-6">运行时内部智能体</p>
        </Link>
        <Link className="rounded-xl border border-stroke bg-white p-5 dark:border-dark-3 dark:bg-dark-2" href="/meowone/scheduled-tasks">
          <p className="text-lg font-medium text-dark dark:text-white">Scheduled Tasks</p>
          <p className="mt-1 text-sm text-body dark:text-dark-6">定时任务</p>
        </Link>
      </div>
    </div>
  );
}
