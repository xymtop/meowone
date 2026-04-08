function defaultApiBase(): string {
  if (typeof window === "undefined") return "http://localhost:8000";
  const host = window.location.hostname || "localhost";
  return `http://${host}:8000`;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || defaultApiBase();

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
};

export type A2UIActionInput = {
  action: Record<string, unknown>;
  channel_id?: string;
  max_rounds?: number;
  max_tool_phases?: number;
  timeout_seconds?: number;
  scheduler_mode?: string;
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

export type ScheduledTasksListResponse = { count: number; tasks: Record<string, unknown>[] };

export type GatewayLogsResponse = {
  items: { id: number; sessionId: string; event: string; data: string; createdAt: string }[];
  nextCursor: number;
};

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

  listSkills: () => request<SkillsListResponse>("/api/capabilities/skills"),
  upsertSkill: (body: Record<string, unknown>) =>
    request<{ ok: boolean; name: string }>("/api/capabilities/skills", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  deleteSkill: (name: string) =>
    request<{ ok: boolean; deleted: boolean }>(
      `/api/capabilities/skills/${encodeURIComponent(name)}`,
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
  upsertExternalAgent: (body: Record<string, unknown>) =>
    request<{ ok: boolean; name: string; agent_type: string }>("/api/agents/external", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  deleteAgent: (agentType: string, name: string) =>
    request<{ ok: boolean; deleted: boolean }>(
      `/api/agents/${encodeURIComponent(agentType)}/${encodeURIComponent(name)}`,
      { method: "DELETE" },
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
};
