# MeowOne AI 操作系统 — 用户指南

---

# 一、产品概述

## 1.1 什么是 MeowOne？

MeowOne 是一个**以对话为核心入口的 AI 操作系统**。

用户只需要通过自然语言表达需求，系统即可自动理解意图、调度多个智能体协同完成任务，并以对话或卡片的形式返回结果。

**核心理念：**

- 用"对话"取代传统 App 操作
- 用"智能体"取代单一 AI 助手
- 用"系统调度"取代人工流程

> 简单来说：MeowOne 不是一个聊天工具，而是一个"会帮你做事"的 AI 操作系统。

---

## 1.2 平台架构图

```
┌─────────────────────────────────────────────────────────────────────┐
│                          用户界面层                                   │
│                  (Web 对话 / OpenAI 兼容 API)                        │
└─────────────────────────────────┬───────────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────────┐
│                         API 网关层                                   │
│            (SSE 流式响应 / REST API / OpenAI 兼容)                  │
└─────────────────────────────────┬───────────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────────┐
│                       智能体编排层                                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │
│  │   ReAct     │  │ Hierarchical │  │ Multi-Agent │                 │
│  │    Loop     │  │    Loop      │  │   Debate    │                 │
│  └─────────────┘  └─────────────┘  └─────────────┘                 │
└─────────────────────────────────┬───────────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────────┐
│                        调度引擎层                                     │
│  ┌─────────┐  ┌─────────────┐  ┌───────────┐  ┌───────────┐        │
│  │ Direct  │  │ MasterSlave │  │   Swarm   │  │  Custom   │        │
│  └─────────┘  └─────────────┘  └───────────┘  └───────────┘        │
└─────────────────────────────────┬───────────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────────┐
│                        能力系统层                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │ 内置工具  │  │   MCP    │  │ Agent    │  │  远程    │           │
│  │          │  │  Server  │  │  Skill   │  │   A2A    │           │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘           │
└─────────────────────────────────────────────────────────────────────┘
```

---

# 二、核心概念

## 2.1 智能体（Agent）

智能体是平台的核心执行单元，每个智能体具有：

| 属性 | 说明 |
|------|------|
| `name` | 唯一标识名称 |
| `description` | 功能描述，用于自动匹配 |
| `system_prompt` | 系统提示词，定义角色行为 |
| `capabilities` | 可使用的工具列表 |
| `loop_type` | 思考循环类型 |

**智能体类型：**

| 类型 | 说明 | 配置方式 |
|------|------|----------|
| 内部智能体 | 由 Loop Runtime 直接执行的智能体 | `POST /api/agents/internal` |
| 外部智能体 | 通过 A2A 协议调用的远程智能体 | `POST /api/agents/external` |

## 2.2 能力（Capability）

能力是智能体可以使用的工具和服务：

| 类型 | 说明 | 示例 |
|------|------|------|
| 内置工具 | 系统内置的能力 | bash、文件操作、代码执行 |
| MCP 工具 | 通过 MCP 协议连接的外部服务 | 数据库查询、API 调用 |
| Agent Skill | 预定义的专业技能包 | 代码审查、数据分析 |
| 远程能力 | 通过 A2A 调用的其他智能体 | 外部 AI 服务 |

## 2.3 循环类型（Loop Type）

循环类型决定了智能体的思考和执行方式：

| 类型 | 说明 | 适用场景 |
|------|------|----------|
| `react` | 标准 ReAct 循环（思考→行动→观察） | 通用任务 |
| `hierarchical` | 层级式循环（上级规划+下级执行） | 复杂多步骤任务 |
| `plan_exec` | 计划-执行分离 | 需要先规划后执行的任务 |
| `critic` | 执行+评审双循环 | 高质量输出要求 |
| `multi_agent_debate` | 多智能体辩论 | 需要多角度分析的任务 |

## 2.4 调度模式（Scheduler Mode）

调度模式决定了任务的分配策略：

| 模式 | 说明 | 特点 |
|------|------|------|
| `direct` | 直接执行 | 简单快速，一次完成 |
| `master_slave` | 主从模式 | Master 规划 + Worker 执行 |
| `swarm` | 蜂群模式 | 多候选并行，最终收敛 |

## 2.5 A2A 协议

A2A（Agent to Agent）协议是智能体之间的通信标准，使得不同智能体可以相互协作。

**核心概念：**

- **Agent Card**：智能体的"名片"，包含能力描述
- **Task**：任务单元，具有完整生命周期
- **Message**：消息，支持多轮对话

---

# 三、平台接口

## 3.1 基本信息

| 项目 | 说明 |
|------|------|
| Base URL | `http://<host>:<port>` |
| 协议 | HTTP/JSON |
| 流式接口 | SSE（`text/event-stream`） |
| 认证 | 当前未启用 |
| 错误格式 | `{"detail": "error message"}` |

## 3.2 对话接口

### SSE 对话（推荐）

```
POST /api/sessions/{session_id}/chat
```

**请求示例：**

```json
{
  "messages": [
    {"role": "user", "content": "帮我分析本月销售数据"}
  ],
  "stream": true,
  "agent_id": "data-analyst",
  "capabilities": ["bash", "read_workspace_file"],
  "loop_config": {
    "loop_type": "react",
    "max_rounds": 10
  },
  "scheduler_config": {
    "mode": "direct"
  }
}
```

**SSE 事件类型：**

| 事件 | 说明 | 示例数据 |
|------|------|----------|
| `thinking` | 智能体思考中 | `{"content": "正在分析..."}` |
| `delta` | 文本增量输出 | `{"content": "好的，我来"}` |
| `tool_call` | 调用工具 | `{"tool": "bash", "params": {...}}` |
| `tool_result` | 工具执行结果 | `{"tool": "bash", "result": "..."}` |
| `card` | 卡片输出 | `{"card_type": "table", "data": {...}}` |
| `error` | 错误信息 | `{"error": "timeout"}` |
| `done` | 完成 | `{"summary": "任务完成"}` |

### OpenAI 兼容接口

```
POST /v1/chat/completions
```

完全兼容 OpenAI Chat Completions API，方便与现有生态集成。

**请求示例：**

```json
{
  "model": "gpt-4",
  "messages": [
    {"role": "user", "content": "写一首关于春天的诗"}
  ],
  "stream": true
}
```

### 通用网关接口

```
POST /api/gateway/turn
```

灵活的统一入口，支持更多扩展参数。

## 3.3 智能体管理接口

### 创建内部智能体

```
POST /api/agents/internal
```

```json
{
  "name": "sales-analyst",
  "description": "销售数据分析助手",
  "system_prompt": "你是一个专业的数据分析师，擅长销售数据分析。",
  "capabilities": ["read_workspace_file", "bash"],
  "max_rounds": 8,
  "timeout_seconds": 120
}
```

### 创建外部智能体

```
POST /api/agents/external
```

```json
{
  "name": "research-agent",
  "description": "外部研究助手",
  "base_url": "https://research-agent.example.com",
  "protocol": "a2a"
}
```

### 调用智能体

```
POST /api/agent-executions
```

```json
{
  "agent_name": "sales-analyst",
  "task": "分析Q1季度销售数据，找出增长点",
  "history": [],
  "overrides": {
    "max_rounds": 6,
    "timeout_seconds": 90
  }
}
```

**响应示例：**

```json
{
  "ok": true,
  "agent_name": "sales-analyst",
  "agent_type": "internal",
  "output": "根据Q1数据分析，主要增长点包括...",
  "duration_ms": 1234,
  "loop_rounds": 3,
  "error": null,
  "execution_id": "uuid-xxx"
}
```

## 3.4 会话管理接口

| 接口 | 说明 |
|------|------|
| `POST /api/sessions` | 创建会话 |
| `GET /api/sessions` | 获取会话列表 |
| `GET /api/sessions/{id}` | 获取会话详情 |
| `PATCH /api/sessions/{id}` | 更新会话 |
| `DELETE /api/sessions/{id}` | 删除会话 |
| `GET /api/sessions/{id}/messages` | 获取消息历史 |

## 3.5 能力管理接口

### MCP 服务

| 接口 | 说明 |
|------|------|
| `GET /api/capabilities/mcp` | 列出 MCP 服务 |
| `POST /api/capabilities/mcp` | 添加 MCP 服务 |
| `DELETE /api/capabilities/mcp/{name}` | 删除 MCP 服务 |

### Agent Skill

| 接口 | 说明 |
|------|------|
| `GET /api/capabilities/skills` | 列出技能 |
| `POST /api/capabilities/skills` | 添加技能 |
| `DELETE /api/capabilities/skills/{name}` | 删除技能 |

## 3.6 模型管理接口

| 接口 | 说明 |
|------|------|
| `GET /api/models` | 列出模型 |
| `POST /api/models` | 添加模型 |
| `POST /api/models/{name}/default` | 设置默认模型 |
| `DELETE /api/models/{name}` | 删除模型 |

---

# 四、使用示例

## 4.1 示例一：创建问答智能体

### 步骤 1：创建智能体

```bash
curl -X POST http://localhost:8080/api/agents/internal \
  -H "Content-Type: application/json" \
  -d '{
    "name": "faq-assistant",
    "description": "常见问题问答助手",
    "system_prompt": "你是一个友好的客服助手，擅长回答常见问题。",
    "max_rounds": 5
  }'
```

### 步骤 2：开始对话

```bash
curl -X POST http://localhost:8080/api/sessions/{session_id}/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "你们的服务价格是多少？"}
    ],
    "agent_id": "faq-assistant"
  }'
```

## 4.2 示例二：使用工具执行任务

### 创建带工具的智能体

```bash
curl -X POST http://localhost:8080/api/agents/internal \
  -H "Content-Type: application/json" \
  -d '{
    "name": "file-manager",
    "description": "文件管理助手",
    "system_prompt": "你是一个文件管理助手，可以帮助用户操作文件。",
    "capabilities": ["read_workspace_file", "write_workspace_file", "list_workspace_dir"],
    "max_rounds": 10
  }'
```

### 发送带工具调用的任务

```json
{
  "messages": [
    {"role": "user", "content": "列出当前目录下的所有文件"}
  ],
  "agent_id": "file-manager"
}
```

系统会自动调用 `list_workspace_dir` 工具并返回结果。

## 4.3 示例三：多智能体协作

### 场景：销售报告分析

**组织结构：**

```
CEO Agent (hierarchical)
├── Data Analyst Agent (react)
├── Writer Agent (react)
└── Chart Generator Agent (react)
```

### 执行流程

```json
{
  "messages": [
    {"role": "user", "content": "生成一份本月销售报告，包括数据分析和图表"}
  ],
  "agent_id": "ceo-agent",
  "loop_config": {
    "loop_type": "hierarchical",
    "max_rounds": 20
  },
  "scheduler_config": {
    "mode": "master_slave"
  }
}
```

**系统执行流程：**

1. **CEO 分析任务** → 拆分为数据分析、报告撰写、图表生成
2. **并行调度子智能体**：
   - Data Analyst 分析数据
   - Writer 撰写报告
   - Chart Generator 生成图表
3. **CEO 汇总结果** → 输出完整报告

## 4.4 示例四：使用 MCP 扩展能力

### 添加 MCP 数据源

```bash
curl -X POST http://localhost:8080/api/capabilities/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "name": "database-mcp",
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-sqlite", "./data.db"]
  }'
```

### 创建使用 MCP 的智能体

```bash
curl -X POST http://localhost:8080/api/agents/internal \
  -H "Content-Type: application/json" \
  -d '{
    "name": "db-assistant",
    "description": "数据库查询助手",
    "system_prompt": "你是一个数据库助手，可以帮助用户查询和分析数据。",
    "mcp_servers": ["database-mcp"],
    "max_rounds": 10
  }'
```

---

# 五、最佳实践

## 5.1 智能体设计原则

1. **单一职责**：每个智能体专注于一个领域
2. **清晰描述**：编写准确的 description，便于自动匹配
3. **适量工具**：每个智能体配置 3-5 个核心工具
4. **限制轮次**：根据任务复杂度设置合理的 max_rounds

## 5.2 选择合适的 Loop 类型

| 任务类型 | 推荐 Loop | 原因 |
|----------|-----------|------|
| 简单问答 | react | 一次往返即可完成 |
| 多步骤任务 | hierarchical | 上级规划，下级执行 |
| 需要规划 | plan_exec | 先规划后执行，更可控 |
| 高质量要求 | critic | 执行+评审双重保障 |
| 多角度分析 | multi_agent_debate | 辩论产生最优解 |

## 5.3 选择合适的调度模式

| 场景 | 推荐模式 | 说明 |
|------|----------|------|
| 简单明确任务 | direct | 直接执行，效率最高 |
| 复杂协作任务 | master_slave | 主从配合，分工明确 |
| 探索性任务 | swarm | 多方案并行，最终收敛 |

## 5.4 性能优化建议

1. **控制上下文长度**：及时清理不必要的对话历史
2. **合理设置超时**：避免长时间等待影响体验
3. **使用流式输出**：提升用户感知到的响应速度
4. **监控资源使用**：关注 token 消耗和执行时间

---

# 六、常见问题

## Q1: 如何调试智能体？

使用 `GET /api/gateway/logs` 接口查看详细的执行日志。

## Q2: 智能体调用失败怎么办？

检查返回的 `error_code`：
- `A2A_UNREACHABLE`：远程智能体不可达
- `A2A_TIMEOUT`：调用超时
- `A2A_PROTOCOL_ERROR`：协议错误

## Q3: 如何扩展平台能力？

1. **内置工具**：在 `backend/app/capability/tools/` 添加
2. **MCP 服务**：通过 `POST /api/capabilities/mcp` 动态添加
3. **Agent Skill**：在 `.meowone/skills/` 目录添加

## Q4: 支持哪些 LLM 模型？

平台通过配置层支持任何 OpenAI 兼容的 API，包括：
- GPT-4 / GPT-3.5
- Claude 系列
- 本地部署模型
- 开源模型

---

# 七、附录

## 7.1 错误码说明

| 错误码 | 说明 | 解决方案 |
|--------|------|----------|
| 400 | 请求参数错误 | 检查请求体格式 |
| 404 | 资源不存在 | 检查 ID 是否正确 |
| 500 | 服务器内部错误 | 查看服务端日志 |
| A2A_UNREACHABLE | 远程智能体不可达 | 检查网络和地址 |
| A2A_TIMEOUT | 调用超时 | 增加超时时间 |

## 7.2 相关资源

- 项目文档：`./docs/`
- 技术方案：`./docs/技术方案V1.md`
- 接口文档：`./docs/后端接口文档.md`
- A2A 协议：`./docs/A2A协议介绍.md`
- Agent Skill：`./docs/agent skill介绍.md`

---

*文档版本：v1.0*
*最后更新：2026-04-08*
