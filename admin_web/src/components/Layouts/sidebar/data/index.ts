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
        title: "首页",
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
    label: "智能体管理",
    items: [
      {
        title: "我的智能体",
        url: "/meowone/agents",
        icon: Icons.BotIcon,
        items: [],
      },
      {
        title: "MCP管理",
        url: "/meowone/capabilities-mcp",
        icon: Icons.PuzzleIcon,
        items: [],
      },
      {
        title: "技能管理",
        url: "/meowone/capabilities-skills",
        icon: Icons.CodeIcon,
        items: [],
      },
      {
        title: "提示词管理",
        url: "/meowone/capabilities-prompts",
        icon: Icons.FileTextIcon,
        items: [],
      },
      {
        title: "模型管理",
        url: "/meowone/models",
        icon: Icons.PieChart,
        items: [],
      },
      {
        title: "Loop管理",
        url: "/meowone/scheduler/loops",
        icon: Icons.StackIcon,
        items: [],
      },
    ],
  },
  {
    label: "智能体OS",
    items: [
      {
        title: "我的实例",
        url: "/meowone/instances",
        icon: Icons.User,
        items: [],
      },
      {
        title: "镜像管理",
        url: "/meowone/images",
        icon: Icons.ImageIcon,
        items: [],
      },
      {
        title: "调度策略",
        url: "/meowone/scheduler/strategies",
        icon: Icons.RouteIcon,
        items: [
          { title: "策略列表", url: "/meowone/scheduler/strategies" },
          { title: "策略配置", url: "/meowone/scheduler/strategy-configs" },
        ],
      },
      {
        title: "执行环境",
        url: "/meowone/scheduler/environments",
        icon: Icons.CloudIcon,
        items: [],
      },
      {
        title: "会话管理",
        url: "/meowone/sessions",
        icon: Icons.Calendar,
        items: [],
      },
    ],
  },
  {
    label: "系统设置",
    items: [
      {
        title: "接口文档",
        url: "/docs",
        icon: Icons.FileTextIcon,
        items: [],
        openInNewTab: true,
      },
      {
        title: "系统日志",
        url: "/meowone/logs",
        icon: Icons.SettingsIcon,
        items: [],
      },
    ],
  },
];
