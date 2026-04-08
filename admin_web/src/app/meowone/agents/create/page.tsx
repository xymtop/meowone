"use client";

import Link from "next/link";

// ============ 图标组件 ============
function RobotIcon() {
  return (
    <svg className="size-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg className="size-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function ServerIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z" />
    </svg>
  );
}

function BrainIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
    </svg>
  );
}

function PlugIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
    </svg>
  );
}

function SparklesIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
    </svg>
  );
}

function BoltIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  );
}

function CloudIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" />
    </svg>
  );
}

export default function CreateAgentPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12">
      <div className="mx-auto max-w-4xl px-4">
        {/* 标题 */}
        <div className="mb-12 text-center">
          <h1 className="text-3xl font-bold text-gray-900">创建智能体</h1>
          <p className="mt-3 text-gray-500">根据你的需求，选择创建内部智能体或连接外部智能体</p>
        </div>

        {/* 选择卡片 */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {/* 内部智能体 */}
          <Link
            href="/meowone/agents/create/internal"
            className="group relative overflow-hidden rounded-3xl border-2 border-gray-200 bg-white p-8 transition-all hover:border-blue-400 hover:shadow-xl hover:shadow-blue-500/10"
          >
            {/* 背景装饰 */}
            <div className="absolute -right-4 -top-4 size-32 rounded-full bg-gradient-to-br from-blue-500/10 to-purple-500/10 opacity-0 transition-opacity group-hover:opacity-100" />
            
            <div className="relative">
              {/* 图标 */}
              <div className="mb-6 flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/30">
                <RobotIcon />
              </div>

              <h2 className="text-2xl font-bold text-gray-900">内部智能体</h2>
              <p className="mt-3 text-gray-500">
                在本地运行，拥有完整的功能配置。支持 MCP 服务、Skills 技能、自定义提示词等高级能力。
              </p>

              {/* 特性列表 */}
              <ul className="mt-6 space-y-3">
                <li className="flex items-center gap-3 text-sm text-gray-600">
                  <span className="flex size-6 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                    <BrainIcon />
                  </span>
                  可配置模型
                </li>
                <li className="flex items-center gap-3 text-sm text-gray-600">
                  <span className="flex size-6 items-center justify-center rounded-full bg-purple-100 text-purple-600">
                    <PlugIcon />
                  </span>
                  支持 MCP 服务
                </li>
                <li className="flex items-center gap-3 text-sm text-gray-600">
                  <span className="flex size-6 items-center justify-center rounded-full bg-green-100 text-green-600">
                    <SparklesIcon />
                  </span>
                  自定义提示词
                </li>
                <li className="flex items-center gap-3 text-sm text-gray-600">
                  <span className="flex size-6 items-center justify-center rounded-full bg-orange-100 text-orange-600">
                    <BoltIcon />
                  </span>
                  完整工具链
                </li>
              </ul>

              {/* 按钮 */}
              <div className="mt-8">
                <span className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-3 font-medium text-white transition-transform hover:scale-[1.02] active:scale-[0.98]">
                  开始创建
                  <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </span>
              </div>
            </div>
          </Link>

          {/* 外部智能体 */}
          <Link
            href="/meowone/agents/create/external"
            className="group relative overflow-hidden rounded-3xl border-2 border-gray-200 bg-white p-8 transition-all hover:border-green-400 hover:shadow-xl hover:shadow-green-500/10"
          >
            {/* 背景装饰 */}
            <div className="absolute -right-4 -top-4 size-32 rounded-full bg-gradient-to-br from-green-500/10 to-teal-500/10 opacity-0 transition-opacity group-hover:opacity-100" />
            
            <div className="relative">
              {/* 图标 */}
              <div className="mb-6 flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-teal-600 text-white shadow-lg shadow-green-500/30">
                <GlobeIcon />
              </div>

              <h2 className="text-2xl font-bold text-gray-900">外部智能体</h2>
              <p className="mt-3 text-gray-500">
                通过 A2A 协议连接远程 Agent。无需本地部署，快速集成第三方 AI 能力。
              </p>

              {/* 特性列表 */}
              <ul className="mt-6 space-y-3">
                <li className="flex items-center gap-3 text-sm text-gray-600">
                  <span className="flex size-6 items-center justify-center rounded-full bg-green-100 text-green-600">
                    <ShieldIcon />
                  </span>
                  A2A 协议支持
                </li>
                <li className="flex items-center gap-3 text-sm text-gray-600">
                  <span className="flex size-6 items-center justify-center rounded-full bg-cyan-100 text-cyan-600">
                    <SparklesIcon />
                  </span>
                  自动发现能力
                </li>
                <li className="flex items-center gap-3 text-sm text-gray-600">
                  <span className="flex size-6 items-center justify-center rounded-full bg-teal-100 text-teal-600">
                    <ServerIcon />
                  </span>
                  Bearer Token 认证
                </li>
                <li className="flex items-center gap-3 text-sm text-gray-600">
                  <span className="flex size-6 items-center justify-center rounded-full bg-sky-100 text-sky-600">
                    <CloudIcon />
                  </span>
                  无需本地部署
                </li>
              </ul>

              {/* 按钮 */}
              <div className="mt-8">
                <span className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-green-500 to-teal-600 px-6 py-3 font-medium text-white transition-transform hover:scale-[1.02] active:scale-[0.98]">
                  立即连接
                  <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </span>
              </div>
            </div>
          </Link>
        </div>

        {/* 底部说明 */}
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-400">
            选择困难？<Link href="/meowone/agents" className="text-blue-500 hover:underline">查看现有智能体</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
