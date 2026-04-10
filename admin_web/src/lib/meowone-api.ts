// 客户端用绝对 URL 直接访问后端（绕过 Next.js 代理，避免 SSE 缓冲）
// 服务端走相对路径通过 next.config 代理
const API_BASE = typeof window !== "undefined"
  ? (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000")
  : "";

export type Session = {
  id: string;
  user_id: string;
  title: string | null;
  summary: string | null;
  agent_name?: string | null;
  agent_type?: string | null;
  created_at: string;
  updated_at: string;
};

export type Message = {
  id: string;
  session_id: string;
  role: string;
  content_type: string;
  content: string | null;
  card_data: unknown;
  created_at: string;
};

export type MeowConfigFile = {
  path: string;
  content: string;
};

export type GatewayTurnInput = {
  channel_id: string;
  session_id?: string;
  external_thread_id?: string;
  content: string;
};

export type ChatEvent = {
  event: string;
  data: Record<string, unknown>;
};

export type ChatStreamInput = {
  content: string;
  channel_id?: string;
  max_rounds?: number;
  max_tool_phases?: number;
  timeout_seconds?: number;
  scheduler_mode?: string;
  agent_name?: string;
  agent_type?: string;
  /** 数据库主键，优先于 agent_name */
  agent_id?: string;
  /** 实例 ID，传此字段表示给实例发消息（与 agent_id 互斥）*/
  instance_id?: string;
  /** 仅默认智能体：用户选择的模型名 */
  model_name?: string;
};

export type A2UIActionInput = {
  action: Record<string, unknown>;
  channel_id?: string;
  max_rounds?: number;
  max_tool_phases?: number;
  timeout_seconds?: number;
  scheduler_mode?: string;
  agent_name?: string;
  agent_type?: string;
  agent_id?: string;
  instance_id?: string;
  model_name?: string;
};

type StreamOptions = {
  signal?: AbortSignal;
};

export type ModelsListResponse = { count: number; models: Record<string, unknown>[] };

export type MenusListResponse = { count: number; menus: unknown };

export type McpListResponse = { count: number; servers: Record<string, unknown>[] };

export type SkillsListResponse = {
  count: number;
  skills: { name: string; description: string; enabled?: number }[];
};

export type SkillFsFile = {
  path: string;
  name: string;
  size: number;
  is_directory: boolean;
  file_type: string;
};

export type SkillFsDetail = {
  name: string;
  description?: string;
  category?: string;
  files?: SkillFsFile[];
  [key: string]: unknown;
};

export type McpToolsResponse = {
  name: string;
  tools: { name: string; description?: string; inputSchema?: unknown }[];
  error?: string;
};

export type McpResourcesResponse = {
  name: string;
  resources: { uri: string; name: string; description?: string; mimeType?: string }[];
  error?: string | null;
};

export type PromptItem = {
  prompt_key: string;
  name: string;
  description?: string;
  tags?: string[];
  enabled?: boolean;
  content_md?: string;
};

export type PromptsListResponse = {
  count: number;
  prompts: PromptItem[];
};

export type AgentsListResponse = { count: number; agents: Record<string, unknown>[] };

export type InternalAgentsListResponse = { count: number; agents: Record<string, unknown>[] };

export type AgentDetailResponse = Record<string, unknown>;

export type ScheduledTasksListResponse = { count: number; tasks: Record<string, unknown>[] };

export type GatewayLogsResponse = {
  items: { id: number; sessionId: string; event: string; data: string; createdAt: string }[];
  nextCursor: number;
};

// ============ 工作流类型 ============
export type WorkflowNode = {
  id: string;
  agent_name: string;
  agent_type: string;
  depends_on: string[];
  input_mapping: Record<string, string>;
  config: Record<string, unknown>;
};

export type Workflow = {
  id: string;
  name: string;
  description?: string;
  strategy: string;
  nodes?: WorkflowNode[];
  node_count?: number;
  enabled?: number;
  created_at?: string;
  updated_at?: string;
};

export type WorkflowListResponse = { count: number; workflows: Workflow[] };

export type WorkflowDetailResponse = { found: boolean; workflow: Workflow };

export type WorkflowExecution = {
  id: string;
  workflow_id: string;
  workflow_name: string;
  status: string;
  inputs?: Record<string, unknown>;
  outputs?: Record<string, unknown>;
  error_message?: string;
  node_results?: Record<string, unknown>[];
  started_at?: string;
  completed_at?: string;
  duration_ms?: number;
  created_at?: string;
};

export type WorkflowExecutionsResponse = { count: number; executions: WorkflowExecution[] };

// ============ 任务类型 ============
export type Task = {
  id: string;
  name: string;
  task_type: string;
  status: string;
  input_data?: Record<string, unknown>;
  output_data?: Record<string, unknown>;
  agent_name?: string;
  agent_type?: string;
  error_message?: string;
  parent_task_id?: string;
  metadata?: Record<string, unknown>;
  priority?: number;
  started_at?: string;
  completed_at?: string;
  duration_ms?: number;
  created_at?: string;
  updated_at?: string;
};

export type TaskListResponse = { total: number; limit: number; offset: number; tasks: Task[] };
export type TaskDetailResponse = { found: boolean; task: Task };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    ...init,
  });
  if (!res.ok) {
    throw new Error(`${res.status} ${await res.text()}`);
  }
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return res.json() as Promise<T>;
  }
  return (await res.text()) as T;
}

export const meowoneApi = {
  health: () => request<{ status?: string }>("/health"),
  listSessions: () => request<Session[]>("/api/sessions"),
  createSession: (title?: string) =>
    request<Session>("/api/sessions", {
      method: "POST",
      body: JSON.stringify({ title: title || null }),
    }),
  deleteSession: (id: string) =>
    request<{ ok: boolean }>(`/api/sessions/${id}`, { method: "DELETE" }),
  listMessages: (sessionId: string) =>
    request<Message[]>(`/api/sessions/${sessionId}/messages`),
  readConfig: () => request<{ root: string; files: MeowConfigFile[] }>("/api/meowone/config"),
  gatewayTurn: (payload: GatewayTurnInput) =>
    request<unknown>("/api/gateway/turn", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  async streamSSE(
    path: string,
    payload: Record<string, unknown>,
    onEvent: (evt: ChatEvent) => void,
    options?: StreamOptions,
  ): Promise<void> {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: options?.signal,
    });
    if (!res.ok || !res.body) {
      throw new Error(`${res.status} ${await res.text()}`);
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let currentEvent = "";
    let currentData = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const rawLine of lines) {
        const line = rawLine.replace(/\r$/, "");
        if (line.startsWith("event: ")) {
          currentEvent = line.slice(7).trim();
          continue;
        }
        if (line.startsWith("data: ")) {
          currentData = line.slice(6);
          continue;
        }
        if (line === "" && currentEvent && currentData) {
          try {
            onEvent({ event: currentEvent, data: JSON.parse(currentData) as Record<string, unknown> });
          } catch {
            // ignore malformed events
          }
          currentEvent = "";
          currentData = "";
        }
      }
    }
  },
  async streamChat(
    sessionId: string,
    input: ChatStreamInput,
    onEvent: (evt: ChatEvent) => void,
    options?: StreamOptions,
  ): Promise<void> {
    await meowoneApi.streamSSE(
      `/api/sessions/${sessionId}/chat`,
      {
        content: input.content,
        type: "text",
        channel_id: input.channel_id,
        max_rounds: input.max_rounds,
        max_tool_phases: input.max_tool_phases,
        timeout_seconds: input.timeout_seconds,
        scheduler_mode: input.scheduler_mode,
        agent_name: input.agent_name,
        agent_type: input.agent_type,
        agent_id: input.agent_id,
        instance_id: input.instance_id,
        model_name: input.model_name,
      },
      onEvent,
      options,
    );
  },
  async streamA2UIAction(
    sessionId: string,
    input: A2UIActionInput,
    onEvent: (evt: ChatEvent) => void,
    options?: StreamOptions,
  ): Promise<void> {
    await meowoneApi.streamSSE(
      `/api/sessions/${sessionId}/a2ui-action`,
      {
        action: input.action,
        channel_id: input.channel_id,
        max_rounds: input.max_rounds,
        max_tool_phases: input.max_tool_phases,
        timeout_seconds: input.timeout_seconds,
        scheduler_mode: input.scheduler_mode,
        agent_name: input.agent_name,
        agent_type: input.agent_type,
        agent_id: input.agent_id,
        instance_id: input.instance_id,
        model_name: input.model_name,
      },
      onEvent,
      options,
    );
  },
  async streamGatewayTurn(
    payload: GatewayTurnInput & {
      max_rounds?: number;
      max_tool_phases?: number;
      timeout_seconds?: number;
      scheduler_mode?: string;
      task_tag?: string;
    },
    onEvent: (evt: ChatEvent) => void,
    options?: StreamOptions,
  ): Promise<void> {
    await meowoneApi.streamSSE("/api/gateway/turn", payload, onEvent, options);
  },

  listModels: () => request<ModelsListResponse>("/api/models"),
  upsertModel: (body: Record<string, unknown>) =>
    request<{ ok: boolean; name: string }>("/api/models", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  setDefaultModel: (name: string) =>
    request<{ ok: boolean; name: string }>(`/api/models/${encodeURIComponent(name)}/default`, {
      method: "POST",
      body: JSON.stringify({}),
    }),
  deleteModel: (name: string) =>
    request<{ ok: boolean; deleted: boolean }>(`/api/models/${encodeURIComponent(name)}`, {
      method: "DELETE",
    }),

  listMenus: (flat?: boolean) =>
    request<MenusListResponse>(`/api/menus${flat === undefined ? "" : `?flat=${flat}`}`),
  getMenu: (menuKey: string) => request<Record<string, unknown>>(`/api/menus/${encodeURIComponent(menuKey)}`),
  upsertMenu: (body: Record<string, unknown>) =>
    request<{ ok: boolean; menu_key: string }>("/api/menus", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  deleteMenu: (menuKey: string) =>
    request<{ ok: boolean; deleted: boolean }>(`/api/menus/${encodeURIComponent(menuKey)}`, {
      method: "DELETE",
    }),

  listMcp: () => request<McpListResponse>("/api/capabilities/mcp"),
  upsertMcp: (body: Record<string, unknown>) =>
    request<{ ok: boolean; name: string }>("/api/capabilities/mcp", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  deleteMcp: (name: string) =>
    request<{ ok: boolean; deleted: boolean }>(
      `/api/capabilities/mcp/${encodeURIComponent(name)}`,
      { method: "DELETE" },
    ),
  getMcpTools: (name: string) =>
    request<McpToolsResponse>(`/api/capabilities/mcp/${encodeURIComponent(name)}/tools`),
  getMcpResources: (name: string) =>
    request<McpResourcesResponse>(`/api/capabilities/mcp/${encodeURIComponent(name)}/resources`),

  listSkills: () => request<SkillsListResponse>("/api/capabilities/skills"),
  upsertSkill: (body: Record<string, unknown>) =>
    request<{ ok: boolean; name: string }>("/api/capabilities/skills", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  setSkillEnabled: (name: string, enabled: boolean) =>
    request<{ ok: boolean; updated: boolean; enabled: boolean }>(
      `/api/capabilities/skills/${encodeURIComponent(name)}/enabled`,
      {
        method: "POST",
        body: JSON.stringify({ enabled }),
      },
    ),
  deleteSkill: (name: string) =>
    request<{ ok: boolean; deleted: boolean }>(
      `/api/capabilities/skills/${encodeURIComponent(name)}`,
      { method: "DELETE" },
    ),

  listSkillsFs: () => request<{ count: number; skills: SkillFsDetail[] }>("/api/capabilities/skills/fs"),
  getSkillFs: (name: string) =>
    request<{ found: boolean; skill: SkillFsDetail }>(
      `/api/capabilities/skills/fs/${encodeURIComponent(name)}`,
    ),
  readSkillFile: (skillName: string, filePath: string) =>
    request<{ name: string; file_path: string; content: string }>(
      `/api/capabilities/skills/fs/${encodeURIComponent(skillName)}/files/${encodeURIComponent(filePath)}`,
    ),
  updateSkillFile: (skillName: string, filePath: string, content: string) =>
    request<{ ok: boolean; name: string; file_path: string }>(
      `/api/capabilities/skills/fs/${encodeURIComponent(skillName)}/files`,
      {
        method: "POST",
        body: JSON.stringify({ file_path: filePath, content }),
      },
    ),
  createSkillFs: (body: {
    name: string;
    description?: string;
    category?: string;
    trigger_keywords?: string[];
    examples?: string[];
  }) =>
    request<{ ok: boolean; name: string }>("/api/capabilities/skills/fs", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  deleteSkillFs: (name: string) =>
    request<{ ok: boolean; deleted: boolean }>(
      `/api/capabilities/skills/fs/${encodeURIComponent(name)}`,
      { method: "DELETE" },
    ),

  listPrompts: (enabledOnly?: boolean) =>
    request<PromptsListResponse>(
      `/api/prompts${enabledOnly === undefined ? "" : `?enabled_only=${enabledOnly}`}`,
    ),
  getPrompt: (promptKey: string) =>
    request<PromptItem>(`/api/prompts/${encodeURIComponent(promptKey)}`),
  upsertPrompt: (body: {
    prompt_key: string;
    name: string;
    content_md: string;
    description?: string;
    tags?: string[];
    enabled?: boolean;
  }) =>
    request<{ ok: boolean; prompt_key: string }>("/api/prompts", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  setPromptEnabled: (promptKey: string, enabled: boolean) =>
    request<{ ok: boolean; updated: boolean; enabled: boolean }>(
      `/api/prompts/${encodeURIComponent(promptKey)}/enabled`,
      {
        method: "POST",
        body: JSON.stringify({ enabled }),
      },
    ),
  deletePrompt: (promptKey: string) =>
    request<{ ok: boolean; deleted: boolean }>(
      `/api/prompts/${encodeURIComponent(promptKey)}`,
      { method: "DELETE" },
    ),

  listAgents: (agentType?: string) =>
    request<AgentsListResponse>(
      `/api/agents${agentType ? `?agent_type=${encodeURIComponent(agentType)}` : ""}`,
    ),
  upsertInternalAgent: (body: Record<string, unknown>) =>
    request<{ ok: boolean; name: string; agent_type: string }>("/api/agents/internal", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getExternalAgent: (name: string) =>
    request<Record<string, unknown>>(`/api/agents/external/${name}`),
  upsertExternalAgent: (body: Record<string, unknown>) =>
    request<{ ok: boolean; name: string; agent_type: string }>("/api/agents/external", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  deleteAgent: (agentType: string, name: string) =>
    request<{ ok: boolean; deleted: boolean }>(
      `/api/agents/${agentType}/${name}`,
      { method: "DELETE" },
    ),
  getAgentDetail: (agentType: string, name: string) =>
    request<AgentDetailResponse>(
      `/api/agents/${agentType}/${name}`,
    ),

  listInternalAgentsRuntime: () => request<InternalAgentsListResponse>("/api/internal-agents"),
  createInternalAgentRuntime: (body: Record<string, unknown>) =>
    request<{ ok: boolean; agent: Record<string, unknown> }>("/api/internal-agents", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  invokeInternalAgent: (agentName: string, body: Record<string, unknown>) =>
    request<Record<string, unknown>>(
      `/api/internal-agents/${encodeURIComponent(agentName)}/invoke`,
      {
        method: "POST",
        body: JSON.stringify(body),
      },
    ),

  listScheduledTasks: (enabledOnly?: boolean) =>
    request<ScheduledTasksListResponse>(
      `/api/scheduled-tasks${enabledOnly === undefined ? "" : `?enabled_only=${enabledOnly}`}`,
    ),
  upsertScheduledTask: (body: Record<string, unknown>) =>
    request<{ ok: boolean; name: string }>("/api/scheduled-tasks", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  deleteScheduledTask: (name: string) =>
    request<{ ok: boolean; deleted: boolean }>(
      `/api/scheduled-tasks/${encodeURIComponent(name)}`,
      { method: "DELETE" },
    ),
  setScheduledTaskEnabled: (name: string, enabled: boolean) =>
    request<{ ok: boolean; updated: boolean; enabled: boolean }>(
      `/api/scheduled-tasks/${encodeURIComponent(name)}/enabled`,
      {
        method: "POST",
        body: JSON.stringify({ enabled }),
      },
    ),
  runDueScheduledTasks: (limit?: number) =>
    request<Record<string, unknown>>(
      `/api/scheduled-tasks/run-due${limit === undefined ? "" : `?limit=${limit}`}`,
      { method: "POST", body: JSON.stringify({}) },
    ),

  queryGatewayLogs: (query: { session_id?: string; cursor?: number; limit?: number }) => {
    const sp = new URLSearchParams();
    if (query.session_id) sp.set("session_id", query.session_id);
    if (query.cursor !== undefined) sp.set("cursor", String(query.cursor));
    if (query.limit !== undefined) sp.set("limit", String(query.limit));
    const q = sp.toString();
    return request<GatewayLogsResponse>(`/api/gateway/logs${q ? `?${q}` : ""}`);
  },

  // ============ 工作流 API ============
  listWorkflows: () => request<WorkflowListResponse>("/api/workflows"),
  createWorkflow: (body: {
    name: string;
    description?: string;
    nodes: WorkflowNode[];
    strategy?: string;
    timeout_seconds?: number;
  }) =>
    request<{ ok: boolean; id: string; name: string }>("/api/workflows", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getWorkflow: (workflowIdOrName: string) =>
    request<WorkflowDetailResponse>(`/api/workflows/${encodeURIComponent(workflowIdOrName)}`),
  updateWorkflow: (workflowIdOrName: string, body: {
    name: string;
    description?: string;
    nodes: WorkflowNode[];
    strategy?: string;
  }) =>
    request<{ ok: boolean; id: string; name: string }>(
      `/api/workflows/${encodeURIComponent(workflowIdOrName)}`,
      { method: "PUT", body: JSON.stringify(body) },
    ),
  deleteWorkflow: (workflowIdOrName: string) =>
    request<{ ok: boolean; deleted: boolean }>(
      `/api/workflows/${encodeURIComponent(workflowIdOrName)}`,
      { method: "DELETE" },
    ),
  runWorkflow: (workflowIdOrName: string, body: {
    inputs?: Record<string, unknown>;
    max_rounds?: number;
    max_tool_phases?: number;
    model_name?: string;
  }) =>
    request<{ ok: boolean; execution_id: string; status: string }>(
      `/api/workflows/${encodeURIComponent(workflowIdOrName)}/run`,
      { method: "POST", body: JSON.stringify(body) },
    ),
  listWorkflowRuns: (workflowIdOrName: string) =>
    request<WorkflowExecutionsResponse>(
      `/api/workflows/${encodeURIComponent(workflowIdOrName)}/runs`,
    ),
  setWorkflowEnabled: (workflowIdOrName: string, enabled: boolean) =>
    request<{ ok: boolean; enabled: boolean }>(
      `/api/workflows/${encodeURIComponent(workflowIdOrName)}/enabled`,
      { method: "POST", body: JSON.stringify({ enabled }) },
    ),

  // ============ 任务 API ============
  listTasks: (query?: { status?: string; task_type?: string; limit?: number; offset?: number }) => {
    const sp = new URLSearchParams();
    if (query?.status) sp.set("status", query.status);
    if (query?.task_type) sp.set("task_type", query.task_type);
    if (query?.limit !== undefined) sp.set("limit", String(query.limit));
    if (query?.offset !== undefined) sp.set("offset", String(query.offset));
    const q = sp.toString();
    return request<TaskListResponse>(`/api/tasks${q ? `?${q}` : ""}`);
  },
  createTask: (body: {
    name: string;
    task_type?: string;
    input_data?: Record<string, unknown>;
    agent_name?: string;
    agent_type?: string;
    priority?: number;
    metadata?: Record<string, unknown>;
  }) =>
    request<{ ok: boolean; id: string; status: string }>("/api/tasks", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getTask: (taskId: string) => request<TaskDetailResponse>(`/api/tasks/${encodeURIComponent(taskId)}`),
  updateTask: (taskId: string, body: {
    status?: string;
    output_data?: Record<string, unknown>;
    error_message?: string;
  }) =>
    request<{ ok: boolean; updated: boolean; task_id: string }>(
      `/api/tasks/${encodeURIComponent(taskId)}`,
      { method: "PATCH", body: JSON.stringify(body) },
    ),
  deleteTask: (taskId: string) =>
    request<{ ok: boolean; deleted: boolean }>(
      `/api/tasks/${encodeURIComponent(taskId)}`,
      { method: "DELETE" },
    ),
  retryTask: (taskId: string) =>
    request<{ ok: boolean; task_id: string; status: string }>(
      `/api/tasks/${encodeURIComponent(taskId)}/retry`,
      { method: "POST", body: JSON.stringify({}) },
    ),

  // ============ v3 API (Organization, Team, Loop, Strategy, Environment) ============
  listOrganizations: (parentOrgId?: string) => {
    const q = parentOrgId ? `?parent_org_id=${encodeURIComponent(parentOrgId)}` : "";
    return request<{ count: number; organizations: Record<string, unknown>[] }>(`/api/v3/orgs${q}`);
  },
  createOrganization: (body: {
    name: string;
    description?: string;
    parent_org_id?: string;
    settings?: Record<string, unknown>;
  }) =>
    request<{ ok: boolean; organization: Record<string, unknown> }>("/api/v3/orgs", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateOrganization: (orgId: string, body: {
    name?: string;
    description?: string;
    parent_org_id?: string;
    settings?: Record<string, unknown>;
  }) =>
    request<{ ok: boolean; organization: Record<string, unknown> }>(
      `/api/v3/orgs/${encodeURIComponent(orgId)}`,
      { method: "PUT", body: JSON.stringify(body) },
    ),
  deleteOrganization: (orgId: string) =>
    request<{ ok: boolean; deleted: boolean }>(
      `/api/v3/orgs/${encodeURIComponent(orgId)}`,
      { method: "DELETE" },
    ),
  addOrgAgent: (orgId: string, agentId: string) =>
    request<{ ok: boolean }>(`/api/v3/orgs/${encodeURIComponent(orgId)}/agents`, {
      method: "POST",
      body: JSON.stringify({ agent_id: agentId }),
    }),

  listTeams: (orgId?: string) => {
    const q = orgId ? `?org_id=${encodeURIComponent(orgId)}` : "";
    return request<{ count: number; teams: Record<string, unknown>[] }>(`/api/v3/teams${q}`);
  },
  createTeam: (body: {
    name: string;
    org_id: string;
    description?: string;
    parent_team_id?: string;
    leader_agent_id?: string;
    default_strategy?: string;
    strategy_config?: Record<string, unknown>;
  }) =>
    request<{ ok: boolean; team: Record<string, unknown> }>("/api/v3/teams", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateTeam: (teamId: string, body: {
    name?: string;
    description?: string;
    leader_agent_id?: string;
    default_strategy?: string;
    strategy_config?: Record<string, unknown>;
  }) =>
    request<{ ok: boolean; team: Record<string, unknown> }>(
      `/api/v3/teams/${encodeURIComponent(teamId)}`,
      { method: "PUT", body: JSON.stringify(body) },
    ),
  deleteTeam: (teamId: string) =>
    request<{ ok: boolean; deleted: boolean }>(
      `/api/v3/teams/${encodeURIComponent(teamId)}`,
      { method: "DELETE" },
    ),
  addTeamMember: (teamId: string, agentId: string, role?: string) =>
    request<{ ok: boolean }>(
      `/api/v3/teams/${encodeURIComponent(teamId)}/members`,
      { method: "POST", body: JSON.stringify({ agent_id: agentId, role: role || "member" }) },
    ),
  removeTeamMember: (teamId: string, agentId: string) =>
    request<{ ok: boolean; removed: boolean }>(
      `/api/v3/teams/${encodeURIComponent(teamId)}/members/${encodeURIComponent(agentId)}`,
      { method: "DELETE" },
    ),

  listLoops: (enabledOnly?: boolean) => {
    const q = enabledOnly !== undefined ? `?enabled=${enabledOnly}` : "";
    return request<{ count: number; loops: Record<string, unknown>[] }>(`/api/v3/loops${q}`);
  },
  createLoop: (body: {
    name: string;
    description?: string;
    module_path: string;
    config_schema?: Record<string, unknown>;
    is_system?: boolean;
  }) =>
    request<{ ok: boolean; loop: Record<string, unknown> }>("/api/v3/loops", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateLoop: (loopId: string, body: {
    description?: string;
    config_schema?: Record<string, unknown>;
    enabled?: boolean;
  }) =>
    request<{ ok: boolean; loop: Record<string, unknown> }>(
      `/api/v3/loops/${encodeURIComponent(loopId)}`,
      { method: "PUT", body: JSON.stringify(body) },
    ),
  deleteLoop: (loopId: string) =>
    request<{ ok: boolean; deleted: boolean }>(
      `/api/v3/loops/${encodeURIComponent(loopId)}`,
      { method: "DELETE" },
    ),

  listStrategies: (enabledOnly?: boolean) => {
    const q = enabledOnly !== undefined ? `?enabled=${enabledOnly}` : "";
    return request<{ count: number; strategies: Record<string, unknown>[] }>(`/api/v3/strategies${q}`);
  },
  createStrategy: (body: {
    name: string;
    description?: string;
    module_path: string;
    config_schema?: Record<string, unknown>;
    is_system?: boolean;
  }) =>
    request<{ ok: boolean; strategy: Record<string, unknown> }>("/api/v3/strategies", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateStrategy: (strategyId: string, body: {
    description?: string;
    config_schema?: Record<string, unknown>;
    enabled?: boolean;
  }) =>
    request<{ ok: boolean; strategy: Record<string, unknown> }>(
      `/api/v3/strategies/${encodeURIComponent(strategyId)}`,
      { method: "PUT", body: JSON.stringify(body) },
    ),
  getStrategy: (strategyId: string) =>
    request<Record<string, unknown>>(`/api/v3/strategies/${encodeURIComponent(strategyId)}`),
  deleteStrategy: (strategyId: string) =>
    request<{ ok: boolean; deleted: boolean }>(
      `/api/v3/strategies/${encodeURIComponent(strategyId)}`,
      { method: "DELETE" },
    ),

  // 策略配置 CRUD
  listStrategyConfigs: (params?: { image_id?: string; strategy_id?: string; enabled?: boolean }) => {
    const q = new URLSearchParams();
    if (params?.image_id) q.set("image_id", params.image_id);
    if (params?.strategy_id) q.set("strategy_id", params.strategy_id);
    if (params?.enabled !== undefined) q.set("enabled", String(params.enabled));
    const query = q.toString() ? `?${q.toString()}` : "";
    return request<{ count: number; configs: Record<string, unknown>[] }>(`/api/v3/strategy-configs${query}`);
  },
  getStrategyConfig: (configId: string) =>
    request<Record<string, unknown>>(`/api/v3/strategy-configs/${encodeURIComponent(configId)}`),
  createStrategyConfig: (body: {
    name: string;
    description?: string;
    image_id?: string;
    strategy_id?: string;
    config?: Record<string, unknown>;
  }) => {
    return request<{ ok: boolean; config: Record<string, unknown> }>("/api/v3/strategy-configs", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
  updateStrategyConfig: (configId: string, body: {
    name?: string;
    description?: string;
    image_id?: string;
    strategy_id?: string;
    config?: Record<string, unknown>;
    enabled?: boolean;
  }) => {
    return request<{ ok: boolean; config: Record<string, unknown> }>(
      `/api/v3/strategy-configs/${encodeURIComponent(configId)}`,
      { method: "PUT", body: JSON.stringify(body) },
    );
  },
  deleteStrategyConfig: (configId: string) =>
    request<{ ok: boolean; deleted: boolean }>(
      `/api/v3/strategy-configs/${encodeURIComponent(configId)}`,
      { method: "DELETE" },
    ),
  getImageStrategyConfigs: (imageId: string) =>
    request<{ count: number; configs: Record<string, unknown>[] }>(
      `/api/v3/images/${encodeURIComponent(imageId)}/strategy-configs`,
    ),

  listEnvironments: (enabledOnly?: boolean) => {
    const q = enabledOnly !== undefined ? `?enabled=${enabledOnly}` : "";
    return request<{ count: number; environments: Record<string, unknown>[] }>(`/api/v3/environments${q}`);
  },
  createEnvironment: (body: {
    name: string;
    description?: string;
    sandbox_type?: string;
    sandbox_config?: Record<string, unknown>;
    resource_limits?: Record<string, unknown>;
    allowed_tools?: string[];
    denied_tools?: string[];
    max_rounds?: number;
    timeout_seconds?: number;
    api_key?: string;
  }) =>
    request<{ ok: boolean; environment: Record<string, unknown> }>("/api/v3/environments", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateEnvironment: (envId: string, body: {
    name?: string;
    description?: string;
    sandbox_type?: string;
    sandbox_config?: Record<string, unknown>;
    resource_limits?: Record<string, unknown>;
    allowed_tools?: string[];
    denied_tools?: string[];
    max_rounds?: number;
    timeout_seconds?: number;
    enabled?: boolean;
    api_key?: string;
  }) =>
    request<{ ok: boolean; environment: Record<string, unknown> }>(
      `/api/v3/environments/${encodeURIComponent(envId)}`,
      { method: "PUT", body: JSON.stringify(body) },
    ),
  deleteEnvironment: (envId: string) =>
    request<{ ok: boolean; deleted: boolean }>(
      `/api/v3/environments/${encodeURIComponent(envId)}`,
      { method: "DELETE" },
    ),

  dispatchTask: (body: {
    task: string;
    target?: { type: string; id: string };
    strategy?: string;
    strategy_config?: Record<string, unknown>;
    environment_id?: string;
    loop?: { name: string; config?: Record<string, unknown> };
    timeout_seconds?: number;
  }) =>
    request<{ ok: boolean; execution_id: string; status: string }>("/api/v3/dispatch", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getDispatchStatus: (executionId: string) =>
    request<{ execution_id: string; status: string; message?: string }>(
      `/api/v3/dispatch/${encodeURIComponent(executionId)}`,
    ),

  // ============ Agent Image API (智能体镜像) ============
  listAgentImages: (enabledOnly?: boolean) => {
    const q = enabledOnly !== undefined ? `?enabled=${enabledOnly}` : "";
    return request<{ count: number; images: Record<string, unknown>[] }>(`/api/v3/images${q}`);
  },
  createAgentImage: (body: {
    name: string;
    description?: string;
    agent_ids?: string[];
    loop_id?: string;
    strategy_id?: string;
    environment_id?: string;
  }) =>
    request<{ ok: boolean; image: Record<string, unknown> }>("/api/v3/images", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getAgentImage: (imageId: string) =>
    request<Record<string, unknown>>(`/api/v3/images/${encodeURIComponent(imageId)}`),
  updateAgentImage: (imageId: string, body: {
    name?: string;
    description?: string;
    agent_ids?: string[];
    loop_id?: string;
    strategy_id?: string;
    environment_id?: string;
    enabled?: boolean;
  }) =>
    request<{ ok: boolean; image: Record<string, unknown> }>(
      `/api/v3/images/${encodeURIComponent(imageId)}`,
      { method: "PUT", body: JSON.stringify(body) },
    ),
  deleteAgentImage: (imageId: string) =>
    request<{ ok: boolean; deleted: boolean }>(
      `/api/v3/images/${encodeURIComponent(imageId)}`,
      { method: "DELETE" },
    ),

  // ============ Agent Instance API (智能体实例) ============
  listAgentInstances: (enabledOnly?: boolean) => {
    const q = enabledOnly !== undefined ? `?enabled=${enabledOnly}` : "";
    return request<{ count: number; instances: Record<string, unknown>[] }>(`/api/v3/instances${q}`);
  },
  createAgentInstance: (body: {
    name: string;
    description?: string;
    image_id: string;
    model_name?: string;
    strategy_config_id?: string;
    strategy_config?: Record<string, unknown>;
    runtime_config?: Record<string, unknown>;
  }) =>
    request<{ ok: boolean; instance: Record<string, unknown> }>("/api/v3/instances", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getAgentInstance: (instanceId: string) =>
    request<Record<string, unknown>>(`/api/v3/instances/${encodeURIComponent(instanceId)}`),
  updateAgentInstance: (instanceId: string, body: {
    name?: string;
    description?: string;
    image_id?: string;
    model_name?: string;
    strategy_config_id?: string;
    strategy_config?: Record<string, unknown>;
    runtime_config?: Record<string, unknown>;
    enabled?: boolean;
  }) =>
    request<{ ok: boolean; instance: Record<string, unknown> }>(
      `/api/v3/instances/${encodeURIComponent(instanceId)}`,
      { method: "PUT", body: JSON.stringify(body) },
    ),
  deleteAgentInstance: (instanceId: string) =>
    request<{ ok: boolean; deleted: boolean }>(
      `/api/v3/instances/${encodeURIComponent(instanceId)}`,
      { method: "DELETE" },
    ),
  startAgentInstance: (instanceId: string) => {
    const config = { method: "POST" as const, body: JSON.stringify({}) };
    return request<{ ok: boolean; instance: Record<string, unknown> }>(
      `/api/v3/instances/${encodeURIComponent(instanceId)}/start`,
      config,
    );
  },
  stopAgentInstance: (instanceId: string) => {
    const config = { method: "POST" as const, body: JSON.stringify({}) };
    return request<{ ok: boolean; instance: Record<string, unknown> }>(
      `/api/v3/instances/${encodeURIComponent(instanceId)}/stop`,
      config,
    );
  },
};
