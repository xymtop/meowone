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
    label: "智能体镜像",
    items: [
      {
        title: "镜像列表",
        url: "/meowone/images",
        icon: Icons.FourCircle,
        items: [],
      },
      {
        title: "创建镜像",
        url: "/meowone/images/create",
        icon: Icons.PieChart,
        items: [],
      },
    ],
  },
  {
    label: "智能体实例",
    items: [
      {
        title: "实例列表",
        url: "/meowone/instances",
        icon: Icons.User,
        items: [],
      },
      {
        title: "创建实例",
        url: "/meowone/instances/create",
        icon: Icons.PieChart,
        items: [],
      },
    ],
  },
  {
    label: "基础配置",
    items: [
      {
        title: "MCP 服务",
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
        url: "/meowone/capabilities-prompts",
        icon: Icons.Alphabet,
        items: [],
      },
      {
        title: "模型配置",
        url: "/meowone/models",
        icon: Icons.FourCircle,
        items: [],
      },
    ],
  },
  {
    label: "调度配置",
    items: [
      {
        title: "Loop 管理",
        url: "/meowone/scheduler/loops",
        icon: Icons.Calendar,
        items: [],
      },
      {
        title: "调度策略",
        url: "/meowone/scheduler/strategies",
        icon: Icons.PieChart,
        items: [],
      },
      {
        title: "执行环境",
        url: "/meowone/scheduler/environments",
        icon: Icons.FourCircle,
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
      }
    ],
  },
];
