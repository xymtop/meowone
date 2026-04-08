import type { ComponentType, SVGProps } from "react";
import * as Icons from "../icons";

export type NavSubItem = {
  title: string;
  url: string;
};

export type NavItem = {
  title: string;
  url: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  items: NavSubItem[];
  openInNewTab?: boolean;
};

export type NavSection = {
  label: string;
  items: NavItem[];
};

export const NAV_DATA: NavSection[] = [
  {
    label: "Workbench",
    items: [
      {
        title: "系统总览",
        url: "/meowone",
        icon: Icons.HomeIcon,
        items: [],
      },
      {
        title: "对话控制台",
        url: "/meowone/chat",
        icon: Icons.Authentication,
        items: [],
      },
    ],
  },
  {
    label: "Agents",
    items: [
      {
        title: "智能体列表",
        url: "/meowone/agents",
        icon: Icons.User,
        items: [],
      },
      {
        title: "内部智能体（兼容）",
        url: "/meowone/internal-agents",
        icon: Icons.HomeIcon,
        items: [],
      },
      {
        title: "任务调度",
        url: "/meowone/scheduled-tasks",
        icon: Icons.Calendar,
        items: [],
      },
    ],
  },
  {
    label: "Capabilities",
    items: [
      {
        title: "模型管理",
        url: "/meowone/models",
        icon: Icons.FourCircle,
        items: [],
      },
      {
        title: "MCP 管理",
        url: "/meowone/capabilities-mcp",
        icon: Icons.Authentication,
        items: [],
      },
      {
        title: "技能管理",
        url: "/meowone/capabilities-skills",
        icon: Icons.Alphabet,
        items: [],
      },
      {
        title: "提示词管理",
        url: "/meowone/config",
        icon: Icons.Alphabet,
        items: [],
      },
    ],
  },
  {
    label: "Observability",
    items: [
      {
        title: "会话记录",
        url: "/meowone/sessions",
        icon: Icons.Table,
        items: [],
      },
      {
        title: "消息记录（兼容）",
        url: "/meowone/messages",
        icon: Icons.User,
        items: [],
      },
      {
        title: "网关日志",
        url: "/meowone/gateway-logs",
        icon: Icons.PieChart,
        items: [],
      },
    ],
  },
  {
    label: "开发工具",
    items: [
      {
        title: "Monaco 编辑器测试",
        url: "/meowone/monaco-test",
        icon: Icons.Alphabet,
        items: [],
      },
      {
        title: "Agent DAG 演示",
        url: "/meowone/agent-dag-test",
        icon: Icons.PieChart,
        items: [],
      },
    ],
  },
];
