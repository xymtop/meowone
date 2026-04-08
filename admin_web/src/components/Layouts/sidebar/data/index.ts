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
    label: "工作区",
    items: [
      {
        title: "快速开始",
        url: "/meowone",
        icon: Icons.HomeIcon,
        items: [],
      },
      {
        title: "对话",
        url: "/meowone/chat",
        icon: Icons.Authentication,
        items: [],
      },
    ],
  },
  {
    label: "智能体",
    items: [
      {
        title: "我的智能体",
        url: "/meowone/agents",
        icon: Icons.User,
        items: [],
      },
      {
        title: "创建智能体",
        url: "/meowone/agents/create",
        icon: Icons.PieChart,
        items: [],
      },
    ],
  },
  {
    label: "能力中心",
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
    label: "记录",
    items: [
      {
        title: "会话历史",
        url: "/meowone/sessions",
        icon: Icons.Table,
        items: [],
      },
      {
        title: "消息记录",
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
    label: "高级",
    items: [
      {
        title: "工作流编排",
        url: "/meowone/workflows",
        icon: Icons.Table,
        items: [],
      },
      {
        title: "任务管理",
        url: "/meowone/tasks",
        icon: Icons.Table,
        items: [],
      },
      {
        title: "系统监控",
        url: "/meowone/monitoring",
        icon: Icons.PieChart,
        items: [],
      },
      {
        title: "任务调度",
        url: "/meowone/scheduled-tasks",
        icon: Icons.Calendar,
        items: [],
      },
      {
        title: "内部智能体",
        url: "/meowone/internal-agents",
        icon: Icons.HomeIcon,
        items: [],
      },
    ],
  },
];
