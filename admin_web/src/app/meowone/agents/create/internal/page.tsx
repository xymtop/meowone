"use client";

import { useEffect, useState, useCallback, ReactElement } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { meowoneApi } from "@/lib/meowone-api";

// ============ 图标组件 ============
function CheckIcon() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
    </svg>
  );
}

function RobotIcon() {
  return (
    <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
    </svg>
  );
}

function BrainIcon() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
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

function ToolIcon() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
    </svg>
  );
}

function DatabaseIcon() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
    </svg>
  );
}

function CodeIcon() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  );
}

function RocketIcon() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
    </svg>
  );
}

function LoopIcon() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  );
}

function MessageIcon() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
    </svg>
  );
}

// ============ 工具列表 ============
type ToolEntry = {
  name: string;
  desc: string;
  icon: ReactElement;
};

const TOOL_LIST: ToolEntry[] = [
  { name: "bash_tool", desc: "执行 bash 命令", icon: <TerminalIcon /> },
  { name: "sandbox_tool", desc: "沙盒执行环境", icon: <BoxIcon /> },
  { name: "read_workspace_file", desc: "读取工作区文件", icon: <FileTextIcon /> },
  { name: "write_workspace_file", desc: "写入工作区文件", icon: <FileEditIcon /> },
  { name: "list_workspace_dir", desc: "列出工作区目录", icon: <FolderIcon /> },
  { name: "list_mcp_tools", desc: "列出 MCP 工具", icon: <ListIcon /> },
  { name: "call_mcp_tool", desc: "调用 MCP 工具", icon: <PlugIcon /> },
  { name: "subagent_scheduler", desc: "子智能体调度", icon: <UsersIcon /> },
  { name: "create_internal_agent", desc: "创建内部智能体", icon: <PlusCircleIcon /> },
  { name: "list_internal_agents", desc: "列出内部智能体", icon: <RobotIcon /> },
  { name: "invoke_internal_agent", desc: "调用内部智能体", icon: <PlayIcon /> },
  { name: "manage_scheduled_tasks", desc: "管理定时任务", icon: <ClockIcon /> },
  { name: "load_agent_skill", desc: "加载智能体技能", icon: <BookIcon /> },
  { name: "card_builder", desc: "卡片构建器", icon: <LayoutIcon /> },
];

// ============ 工具图标组件 ============
function TerminalIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
    </svg>
  );
}

function BoxIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  );
}

function FileTextIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}

function FileEditIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
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

function ListIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}

function PlusCircleIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
    </svg>
  );
}

function LayoutIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18m0 0v1.5c0 .621-.504 1.125-1.125 1.125M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

// ============ 预设模板 ============
const PRESET_TEMPLATES = [
  { id: "customer_service", name: "客服助手", icon: <MessageIcon />, description: "回答客户咨询，处理常见问题" },
  { id: "code_assistant", name: "代码助手", icon: <CodeIcon />, description: "编写、调试和解释代码" },
  { id: "data_analyst", name: "数据分析师", icon: <ChartIcon />, description: "分析数据，生成可视化建议" },
  { id: "research_assistant", name: "研究助手", icon: <SearchIcon />, description: "搜索信息，整理研究资料" },
];

// ============ 类型定义 ============
type InternalFormData = {
  name: string;
  description: string;
  modelName: string;
  mcpServers: string[];
  skills: string[];
  allowTools: string[];   // 工具白名单
  denyTools: string[];     // 工具黑名单
  promptKey: string;
  customPrompt: string;
  loopMode: string;
};

// ============ 主组件 ============
export default function CreateInternalAgentPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // 资源数据
  const [models, setModels] = useState<Record<string, unknown>[]>([]);
  const [mcps, setMcps] = useState<Record<string, unknown>[]>([]);
  const [skills, setSkills] = useState<{ name: string; description: string }[]>([]);
  const [prompts, setPrompts] = useState<{ prompt_key: string; name: string; description?: string; content_md?: string }[]>([]);
  const [loadingResources, setLoadingResources] = useState(true);
  
  // 表单数据
  const [formData, setFormData] = useState<InternalFormData>({
    name: "",
    description: "",
    modelName: "",
    mcpServers: [],
    skills: [],
    allowTools: [],
    denyTools: [],
    promptKey: "",
    customPrompt: "",
    loopMode: "react",
  });

  // 步骤定义
  const steps = [
    { id: 0, title: "基本信息", subtitle: "给智能体起个名字", icon: <RobotIcon /> },
    { id: 1, title: "选择大脑", subtitle: "配置大模型", icon: <BrainIcon /> },
    { id: 2, title: "选择思考方式", subtitle: "配置循环执行模式", icon: <LoopIcon /> },
    { id: 3, title: "连接数据源", subtitle: "添加 MCP 服务", icon: <PlugIcon /> },
    { id: 4, title: "添加技能", subtitle: "赋予特殊能力", icon: <ToolIcon /> },
    { id: 5, title: "限制工具", subtitle: "控制可用工具", icon: <ShieldIcon /> },
    { id: 6, title: "设定角色", subtitle: "配置提示词", icon: <StarIcon /> },
    { id: 7, title: "启动", subtitle: "预览并开始", icon: <RocketIcon /> },
  ];

  // 加载资源数据
  const loadResources = useCallback(async () => {
    try {
      setLoadingResources(true);
      const [modelsRes, mcpsRes, skillsRes, promptsRes] = await Promise.all([
        meowoneApi.listModels(),
        meowoneApi.listMcp(),
        meowoneApi.listSkills(),
        meowoneApi.listPrompts(),
      ]);
      setModels(modelsRes.models || []);
      setMcps(mcpsRes.servers || []);
      setSkills(skillsRes.skills || []);
      setPrompts(promptsRes.prompts || []);
    } catch (e) {
      console.error("加载资源失败:", e);
    } finally {
      setLoadingResources(false);
    }
  }, []);

  useEffect(() => {
    void loadResources();
  }, [loadResources]);

  // 更新表单
  const updateForm = (key: keyof InternalFormData, value: string | string[]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  // 切换 MCP 选择
  const toggleMcp = (mcpName: string) => {
    setFormData((prev) => ({
      ...prev,
      mcpServers: prev.mcpServers.includes(mcpName)
        ? prev.mcpServers.filter((n) => n !== mcpName)
        : [...prev.mcpServers, mcpName],
    }));
  };

  // 切换 Skill 选择
  const toggleSkill = (skillName: string) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.includes(skillName)
        ? prev.skills.filter((n) => n !== skillName)
        : [...prev.skills, skillName],
    }));
  };

  // 切换允许工具
  const toggleAllowTool = (toolName: string) => {
    setFormData((prev) => ({
      ...prev,
      allowTools: prev.allowTools.includes(toolName)
        ? prev.allowTools.filter((n) => n !== toolName)
        : [...prev.allowTools, toolName],
    }));
  };

  // 切换禁止工具
  const toggleDenyTool = (toolName: string) => {
    setFormData((prev) => ({
      ...prev,
      denyTools: prev.denyTools.includes(toolName)
        ? prev.denyTools.filter((n) => n !== toolName)
        : [...prev.denyTools, toolName],
    }));
  };

  // 下一步
  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  // 上一步
  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // 创建智能体
  const handleCreate = async () => {
    if (!formData.name.trim()) {
      setError("请输入智能体名称");
      return;
    }

    try {
      setLoading(true);
      setError("");
      
      const systemPrompt = formData.promptKey && formData.promptKey !== "__custom__" ? undefined : formData.customPrompt;
      const promptKeyToSave = formData.promptKey && formData.promptKey !== "__custom__" ? formData.promptKey : "";
      
      await meowoneApi.createInternalAgentRuntime({
        name: formData.name,
        description: formData.description,
        system_prompt: systemPrompt,
        prompt_key: promptKeyToSave,
        mcp_servers: formData.mcpServers,
        agent_skills: formData.skills,
        allow_tools: formData.allowTools,
        deny_tools: formData.denyTools,
        max_rounds: null,
        max_tool_phases: null,
        timeout_seconds: null,
        loop_mode: formData.loopMode,
      });
      router.push("/meowone/agents");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // 获取默认模型
  const defaultModel = models.find((m) => (m as Record<string, unknown>).is_default) as Record<string, unknown> | undefined;
  const defaultModelName = defaultModel?.name as string | undefined;

  // 检查是否可以继续
  const canProceed = () => {
    if (currentStep === 0) return formData.name.trim().length > 0;
    return true;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* 顶部 */}
      <div className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto max-w-4xl px-4 py-4">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/meowone/agents/create" className="text-gray-500 hover:text-gray-700">
                <ArrowLeftIcon />
              </Link>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">创建内部智能体</h1>
                <p className="text-sm text-gray-500">配置专属 AI 助手</p>
              </div>
            </div>
            <span className="text-sm text-gray-500">第 {currentStep + 1} / {steps.length} 步</span>
          </div>
          
          {/* 步骤指示器 */}
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={`flex items-center justify-center rounded-full border-2 transition-all ${
                    index < currentStep
                      ? "size-8 border-blue-500 bg-blue-500 text-white"
                      : index === currentStep
                        ? "size-8 border-blue-500 bg-white text-blue-500"
                        : "size-8 border-gray-200 bg-gray-50 text-gray-400"
                  }`}
                >
                  {index < currentStep ? <CheckIcon /> : <span className="text-sm font-medium">{step.id + 1}</span>}
                </div>
                {index < steps.length - 1 && (
                  <div className={`mx-1 h-0.5 w-8 transition-all ${index < currentStep ? "bg-blue-500" : "bg-gray-200"}`} />
                )}
              </div>
            ))}
          </div>
          
          <div className="mt-4 text-center">
            <h2 className="text-lg font-medium text-gray-900">{steps[currentStep].title}</h2>
            <p className="mt-1 text-sm text-gray-500">{steps[currentStep].subtitle}</p>
          </div>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="mx-auto max-w-4xl px-4 py-8 pb-32">
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* 步骤 0: 基本信息 */}
        {currentStep === 0 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">智能体名称 *</span>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => updateForm("name", e.target.value)}
                  placeholder="例如：我的客服助手"
                  className="mt-2 block w-full rounded-xl border border-gray-200 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </label>
              <label className="mt-4 block">
                <span className="text-sm font-medium text-gray-700">简短描述</span>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => updateForm("description", e.target.value)}
                  placeholder="描述这个智能体的主要用途"
                  className="mt-2 block w-full rounded-xl border border-gray-200 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </label>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-sm font-medium text-gray-700">快速开始：选择一个模板</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {PRESET_TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => updateForm("name", template.name)}
                    className={`flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-all ${
                      formData.name === template.name
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-100 bg-gray-50 hover:border-gray-200"
                    }`}
                  >
                    <div className={`rounded-lg p-2 ${formData.name === template.name ? "bg-blue-500 text-white" : "bg-white text-gray-600"}`}>
                      {template.icon}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{template.name}</p>
                      <p className="mt-1 text-xs text-gray-500">{template.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 步骤 1: 选择模型 */}
        {currentStep === 1 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-medium text-gray-700">选择一个作为智能体的&quot;大脑&quot;</h3>
            {loadingResources ? (
              <div className="py-8 text-center text-gray-500">加载中...</div>
            ) : models.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-gray-500">暂无可用模型</p>
                <p className="mt-1 text-sm text-gray-400">请先在「能力中心」-「模型管理」中添加模型</p>
              </div>
            ) : (
              <div className="space-y-2">
                {models.map((model) => {
                  const m = model as Record<string, unknown>;
                  const modelName = String(m.name || "");
                  const provider = String(m.provider || "");
                  const isSelected = formData.modelName === modelName;
                  const isDefault = Boolean(m.is_default);

                  return (
                    <button
                      key={modelName}
                      onClick={() => updateForm("modelName", modelName)}
                      className={`flex w-full items-center justify-between rounded-xl border-2 p-4 text-left transition-all ${
                        isSelected ? "border-blue-500 bg-blue-50" : "border-gray-100 bg-gray-50 hover:border-gray-200"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`rounded-lg p-2 ${isSelected ? "bg-blue-500 text-white" : "bg-white text-gray-600"}`}>
                          <BrainIcon />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900">{modelName}</p>
                            {isDefault && <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">默认</span>}
                          </div>
                          <p className="mt-0.5 text-sm text-gray-500">{provider}</p>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="flex size-6 items-center justify-center rounded-full bg-blue-500 text-white">
                          <CheckIcon />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 步骤 2: 选择思考方式 */}
        {currentStep === 2 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-700">选择智能体的思考方式</h3>
              <p className="mt-1 text-xs text-gray-500">循环模式决定智能体如何处理复杂任务</p>
            </div>
            <div className="space-y-3">
              {[
                { value: "react", name: "ReAct（默认）", desc: "思考 → 行动 → 观察，适合大多数任务", badge: "推荐" },
                { value: "plan_exec", name: "计划-执行分离", desc: "先规划再执行，适合需要步骤化处理的任务", badge: "" },
                { value: "critic", name: "批评-改进", desc: "生成 → 批评 → 改进，适合需要高质量输出的任务", badge: "" },
                { value: "hierarchical", name: "层级式执行", desc: "上级规划，下级执行，适合复杂多层次任务", badge: "" },
              ].map((mode) => {
                const isSelected = formData.loopMode === mode.value;
                return (
                  <button
                    key={mode.value}
                    onClick={() => setFormData((prev) => ({ ...prev, loopMode: mode.value }))}
                    className={`flex w-full items-center justify-between rounded-xl border-2 p-4 text-left transition-all ${
                      isSelected ? "border-blue-500 bg-blue-50" : "border-gray-100 bg-gray-50 hover:border-gray-200"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 rounded-lg p-2 ${isSelected ? "bg-blue-500 text-white" : "bg-white text-gray-600"}`}>
                        <LoopIcon />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">{mode.name}</p>
                          {mode.badge && <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">{mode.badge}</span>}
                        </div>
                        <p className="mt-1 text-sm text-gray-500">{mode.desc}</p>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="flex size-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-500 text-white">
                        <CheckIcon />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 步骤 3: MCP 服务 */}
        {currentStep === 3 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-700">连接数据源和外部服务</h3>
                <p className="mt-1 text-xs text-gray-500">MCP 可以让你的智能体连接外部工具和数据</p>
              </div>
              {formData.mcpServers.length > 0 && (
                <span className="rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-700">
                  已选择 {formData.mcpServers.length} 个
                </span>
              )}
            </div>
            {loadingResources ? (
              <div className="py-8 text-center text-gray-500">加载中...</div>
            ) : mcps.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-gray-500">暂无可用 MCP 服务</p>
                <p className="mt-1 text-sm text-gray-400">请先在「能力中心」-「MCP 管理」中添加服务</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {mcps.map((mcp) => {
                  const m = mcp as Record<string, unknown>;
                  const mcpName = String(m.name || "");
                  const description = String(m.description || "暂无描述");
                  const isSelected = formData.mcpServers.includes(mcpName);

                  return (
                    <button
                      key={mcpName}
                      onClick={() => toggleMcp(mcpName)}
                      className={`flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-all ${
                        isSelected ? "border-blue-500 bg-blue-50" : "border-gray-100 bg-gray-50 hover:border-gray-200"
                      }`}
                    >
                      <div className={`rounded-lg p-2 ${isSelected ? "bg-blue-500 text-white" : "bg-white text-gray-600"}`}>
                        <DatabaseIcon />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-gray-900">{mcpName}</p>
                          {isSelected && (
                            <div className="flex size-5 items-center justify-center rounded-full bg-blue-500 text-white">
                              <CheckIcon />
                            </div>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-gray-500 line-clamp-2">{description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 步骤 4: Skills */}
        {currentStep === 4 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-700">添加特殊能力</h3>
                <p className="mt-1 text-xs text-gray-500">技能可以增强智能体处理特定任务的能力</p>
              </div>
              {formData.skills.length > 0 && (
                <span className="rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-700">
                  已选择 {formData.skills.length} 个
                </span>
              )}
            </div>
            {loadingResources ? (
              <div className="py-8 text-center text-gray-500">加载中...</div>
            ) : skills.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-gray-500">暂无可用技能</p>
                <p className="mt-1 text-sm text-gray-400">请先在「能力中心」-「技能管理」中添加技能</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {skills.map((skill) => {
                  const skillName = skill.name;
                  const description = skill.description || "暂无描述";
                  const isSelected = formData.skills.includes(skillName);

                  return (
                    <button
                      key={skillName}
                      onClick={() => toggleSkill(skillName)}
                      className={`flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-all ${
                        isSelected ? "border-blue-500 bg-blue-50" : "border-gray-100 bg-gray-50 hover:border-gray-200"
                      }`}
                    >
                      <div className={`rounded-lg p-2 ${isSelected ? "bg-blue-500 text-white" : "bg-white text-gray-600"}`}>
                        <ToolIcon />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-gray-900">{skillName}</p>
                          {isSelected && (
                            <div className="flex size-5 items-center justify-center rounded-full bg-blue-500 text-white">
                              <CheckIcon />
                            </div>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-gray-500">{description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 步骤 5: 工具限制 */}
        {currentStep === 5 && (
          <div className="space-y-6">
            {/* 允许的工具（白名单） */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-700">允许的工具（白名单）</h3>
                  <p className="mt-1 text-xs text-gray-500">留空表示不限制。如果设置了白名单，则只能使用勾选的这些工具</p>
                </div>
                {formData.allowTools.length > 0 && (
                  <span className="rounded-full bg-green-100 px-3 py-1 text-sm text-green-700">
                    已选择 {formData.allowTools.length} 个
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                {TOOL_LIST.map((tool) => {
                  const isSelected = formData.allowTools.includes(tool.name);
                  return (
                    <button
                      key={tool.name}
                      onClick={() => toggleAllowTool(tool.name)}
                      className={`flex items-center gap-2 rounded-lg border-2 p-3 text-left transition-all ${
                        isSelected ? "border-green-500 bg-green-50" : "border-gray-100 bg-gray-50 hover:border-gray-200"
                      }`}
                    >
                      <div className={`rounded p-1 ${isSelected ? "bg-green-500 text-white" : "bg-gray-200 text-gray-600"}`}>
                        {tool.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900">{tool.name}</p>
                        <p className="truncate text-xs text-gray-500">{tool.desc}</p>
                      </div>
                      {isSelected && <CheckIcon />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 禁止的工具（黑名单） */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-700">禁止的工具（黑名单）</h3>
                  <p className="mt-1 text-xs text-gray-500">勾选的工具将被禁用，即使在白名单中也会被排除</p>
                </div>
                {formData.denyTools.length > 0 && (
                  <span className="rounded-full bg-red-100 px-3 py-1 text-sm text-red-700">
                    已禁止 {formData.denyTools.length} 个
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                {TOOL_LIST.map((tool) => {
                  const isSelected = formData.denyTools.includes(tool.name);
                  return (
                    <button
                      key={tool.name}
                      onClick={() => toggleDenyTool(tool.name)}
                      className={`flex items-center gap-2 rounded-lg border-2 p-3 text-left transition-all ${
                        isSelected ? "border-red-500 bg-red-50" : "border-gray-100 bg-gray-50 hover:border-gray-200"
                      }`}
                    >
                      <div className={`rounded p-1 ${isSelected ? "bg-red-500 text-white" : "bg-gray-200 text-gray-600"}`}>
                        {tool.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900">{tool.name}</p>
                        <p className="truncate text-xs text-gray-500">{tool.desc}</p>
                      </div>
                      {isSelected && <CheckIcon />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 步骤 6: 提示词选择 */}
        {currentStep === 6 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-700">选择提示词</h3>
                <p className="mt-1 text-xs text-gray-500">选择一个预设提示词模板，或编写自定义提示词</p>
              </div>
              {formData.promptKey && (
                <span className="rounded-full bg-green-100 px-3 py-1 text-sm text-green-700">已选择模板</span>
              )}
            </div>
            
            <div className="mb-4 flex gap-2 border-b border-gray-200 pb-2">
              <button
                onClick={() => updateForm("promptKey", "")}
                className={`px-3 py-1.5 text-sm transition-colors ${
                  !formData.promptKey ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500"
                }`}
              >
                从模板选择
              </button>
              <button
                onClick={() => setFormData((prev) => ({ ...prev, promptKey: "__custom__" }))}
                className={`px-3 py-1.5 text-sm transition-colors ${
                  formData.promptKey === "__custom__" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500"
                }`}
              >
                自定义编写
              </button>
            </div>
            
            {formData.promptKey !== "__custom__" && (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {prompts.map((prompt) => {
                  const promptKey = prompt.prompt_key;
                  const name = prompt.name || promptKey;
                  const description = prompt.description || "暂无描述";
                  const isSelected = formData.promptKey === promptKey;

                  return (
                    <button
                      key={promptKey}
                      onClick={() => updateForm("promptKey", promptKey)}
                      className={`flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-all ${
                        isSelected ? "border-blue-500 bg-blue-50" : "border-gray-100 bg-gray-50 hover:border-gray-200"
                      }`}
                    >
                      <div className={`rounded-lg p-2 ${isSelected ? "bg-blue-500 text-white" : "bg-white text-gray-600"}`}>
                        <StarIcon />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-gray-900">{name}</p>
                          {isSelected && (
                            <div className="flex size-5 items-center justify-center rounded-full bg-blue-500 text-white">
                              <CheckIcon />
                            </div>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-gray-500">{description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            
            {formData.promptKey === "__custom__" && (
              <div>
                <textarea
                  value={formData.customPrompt}
                  onChange={(e) => setFormData((prev) => ({ ...prev, customPrompt: e.target.value }))}
                  placeholder="输入系统提示词，告诉智能体它是谁、擅长什么、应该如何回复..."
                  rows={10}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <div className="mt-4 rounded-lg bg-blue-50 p-4">
                  <p className="text-sm font-medium text-blue-800">💡 提示词编写建议</p>
                  <ul className="mt-2 space-y-1 text-sm text-blue-700">
                    <li>• 明确智能体的身份和专长</li>
                    <li>• 说明回答问题的风格和语气</li>
                    <li>• 设定处理边界和限制</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 步骤 7: 预览并启动 */}
        {currentStep === 7 && (
          <div className="space-y-6">
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-12 items-center justify-center rounded-xl bg-white/20 text-white">
                    <RobotIcon />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{formData.name || "未命名智能体"}</h3>
                    <p className="text-sm text-white/80">{formData.description || "暂无描述"}</p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <h4 className="mb-4 text-sm font-medium text-gray-700">配置确认</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                    <div className="flex items-center gap-2">
                      <BrainIcon />
                      <span className="text-sm text-gray-700">大脑（模型）</span>
                    </div>
                    <span className={`text-sm font-medium ${formData.modelName || defaultModelName ? "text-green-600" : "text-gray-400"}`}>
                      {formData.modelName || defaultModelName || "未选择"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                    <div className="flex items-center gap-2">
                      <DatabaseIcon />
                      <span className="text-sm text-gray-700">数据源（MCP）</span>
                    </div>
                    <span className="text-sm font-medium text-gray-600">
                      {formData.mcpServers.length > 0 ? `${formData.mcpServers.length} 个已连接` : "未连接"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                    <div className="flex items-center gap-2">
                      <ToolIcon />
                      <span className="text-sm text-gray-700">技能（Skills）</span>
                    </div>
                    <span className="text-sm font-medium text-gray-600">
                      {formData.skills.length > 0 ? `${formData.skills.length} 个已添加` : "未添加"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                    <div className="flex items-center gap-2">
                      <ShieldIcon />
                      <span className="text-sm text-gray-700">允许工具</span>
                    </div>
                    <span className="text-sm font-medium text-gray-600">
                      {formData.allowTools.length > 0 ? `${formData.allowTools.length} 个` : "不限制"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                    <div className="flex items-center gap-2">
                      <ShieldIcon />
                      <span className="text-sm text-gray-700">禁止工具</span>
                    </div>
                    <span className="text-sm font-medium text-gray-600">
                      {formData.denyTools.length > 0 ? `${formData.denyTools.length} 个` : "无"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                    <div className="flex items-center gap-2">
                      <StarIcon />
                      <span className="text-sm text-gray-700">提示词</span>
                    </div>
                    <span className={`text-sm font-medium ${formData.promptKey ? "text-green-600" : formData.customPrompt ? "text-green-600" : "text-gray-400"}`}>
                      {formData.promptKey ? `模板: ${formData.promptKey}` : formData.customPrompt ? "自定义" : "未配置"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                    <div className="flex items-center gap-2">
                      <LoopIcon />
                      <span className="text-sm text-gray-700">思考方式</span>
                    </div>
                    <span className="text-sm font-medium text-green-600">
                      {formData.loopMode === "react" ? "ReAct（默认）" : formData.loopMode === "plan_exec" ? "计划-执行分离" : formData.loopMode === "critic" ? "批评-改进" : "层级式执行"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {!formData.modelName && !defaultModelName && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm text-amber-800">
                  ⚠️ 尚未选择模型。智能体将使用系统默认模型（如已配置）。
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 底部导航 */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <button
            onClick={prevStep}
            disabled={currentStep === 0}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-gray-600 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ArrowLeftIcon />
            上一步
          </button>
          
          {currentStep < steps.length - 1 ? (
            <button
              onClick={nextStep}
              disabled={!canProceed()}
              className="flex items-center gap-2 rounded-lg bg-blue-500 px-6 py-2 font-medium text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              下一步
              <ArrowRightIcon />
            </button>
          ) : (
            <button
              onClick={() => void handleCreate()}
              disabled={loading || !formData.name.trim()}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-2 font-medium text-white transition-colors hover:from-blue-600 hover:to-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  创建中...
                </>
              ) : (
                <>
                  <RocketIcon />
                  创建智能体
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
