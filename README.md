# MeowOne AI 操作系统

以**对话**为核心入口的 AI 操作系统：用户用自然语言描述需求，系统理解意图、在**主循环**里调度工具与远程智能体，并通过 **SSE 流式**返回思考过程、正文与卡片式 UI（A2UI）。

支持**智能体团队**协作，可创建包含多个专业智能体的团队，通过多种调度策略（直接调度、团队分发、能力匹配）自动分配任务。

---

## 功能特性

### 核心能力
- **会话与消息**：多会话管理，SQLite 持久化；支持上下文裁剪与历史回放
- **主智能体循环**：手写 Agent Loop 引擎（`backend_v2/app/loop/`），支持多种算法：
  - **ReAct**：思考 → 行动 → 观察的循环模式
  - **Plan-Exec**：计划 → 执行模式
  - **Direct**：直接执行模式
- **能力（工具）系统**：工作区读写、MCP 工具调用、子智能体调度、卡片构建、可选 Bash
- **多模态输入**：文本 + 附件（图片走 `image_url`，其它文件以文本片段注入上下文）
- **多渠道支持**：统一网关支持 Web、飞书等渠道

### 智能体团队系统（v3）
- **组织管理**：多租户组织架构
- **团队协作**：领导-成员架构，支持团队分发策略
- **智能体镜像**：将多个智能体组合为一个镜像
- **实例运行**：镜像的运行时实例
- **调度策略**：多种策略配置（直接、团队、能力匹配）
- **执行环境**：可配置的沙箱环境

### 技术特性
- **OpenAI 兼容**：完整的 `/v1/chat/completions` 兼容接口
- **SSE 流式**：实时流式返回思考过程、文本、工具调用、卡片等
- **MCP 协议**：支持 MCP stdio 和 SSE 模式
- **A2A 协议**：支持远程 A2A 子智能体

---

## 技术架构

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              MeowOne 架构图                                   │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌──────────────┐     HTTP/SSE      ┌────────────────────────────────────┐ │
│   │  admin_web   │ ◄───────────────► │         FastAPI Backend           │ │
│   │  (Next.js)   │                   │           (backend_v2)             │ │
│   └──────────────┘                   └──────────────┬───────────────────┘ │
│                                                       │                      │
│         ┌────────────────────────────┬────────────────┼────────────────┐   │
│         ▼                            ▼                ▼                ▼   │
│   ┌───────────────┐         ┌───────────────┐  ┌───────────┐   ┌───────────┐│
│   │   SQLite DB   │         │  LLM Client   │  │  MCP /   │   │ Workspace ││
│   │   (sessions)  │         │ (OpenAI compat)│  │  Skills  │   │  / Bash   ││
│   └───────────────┘         └───────┬───────┘  └───────────┘   └───────────┘│
│                                     │                                       │
│                          ┌──────────┴──────────┐                            │
│                          ▼                     ▼                            │
│                   ┌────────────┐        ┌────────────┐                      │
│                   │ Loop Engine │        │ Dispatch   │                      │
│                   │(react/plan/ │        │ (策略调度)  │                      │
│                   │  direct)    │        └─────┬──────┘                      │
│                   └────────────┘              │                              │
│                                             ┌──┴──┐                           │
│                                             ▼     ▼                           │
│                                      ┌─────────┐ ┌─────────┐                  │
│                                      │  Team   │ │Capability│                  │
│                                      │Dispatch │ │  Match   │                  │
│                                      └─────────┘ └─────────┘                  │
│                                                                            │
│                          ┌────────────────────────────┐                    │
│                          │   远程 A2A 子智能体（可选）    │                    │
│                          │ code-writer / doc-assistant │                    │
│                          └────────────────────────────┘                    │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 目录结构

```
meowone/
├── admin_web/              # Next.js 前端应用
│   ├── src/app/           # 页面路由
│   │   └── meowone/       # MeowOne 功能模块
│   │       ├── chat/      # 聊天页面
│   │       ├── sessions/  # 会话管理
│   │       ├── agents/    # 智能体管理
│   │       ├── instances/ # 实例管理
│   │       ├── images/    # 镜像管理
│   │       ├── scheduler/ # 调度配置
│   │       │   ├── strategies/  # 策略管理
│   │       │   ├── loops/      # Loop 管理
│   │       │   └── strategy-configs/  # 策略配置
│   │       ├── capabilities-mcp/  # MCP 管理
│   │       ├── capabilities-skills/  # Skills 管理
│   │       ├── capabilities-prompts/  # 提示词管理
│   │       └── workflows/   # 工作流
│   └── src/components/    # 组件库
│
├── backend_v2/             # Python FastAPI 后端
│   └── app/
│       ├── main.py        # 应用入口
│       ├── config.py      # 配置管理
│       ├── api/          # API 路由
│       │   ├── sessions.py      # 会话 API
│       │   ├── messages.py      # 消息 API
│       │   ├── chat.py          # 聊天 SSE
│       │   ├── agents.py        # 智能体 API
│       │   ├── v3.py            # v3 团队系统 API
│       │   ├── gateway.py        # 多渠道网关
│       │   ├── capability_management.py  # 能力管理
│       │   └── openai.py        # OpenAI 兼容接口
│       ├── loop/           # 核心 Loop 引擎
│       │   ├── engine.py   # Loop 调度引擎
│       │   ├── context.py  # LoopContext
│       │   ├── events.py   # 事件类型
│       │   ├── tool_executor.py  # 工具执行器
│       │   └── algorithms/ # 算法实现
│       │       ├── react.py     # ReAct 算法
│       │       ├── plan_exec.py # 计划-执行
│       │       └── direct.py   # 直接执行
│       ├── dispatch/       # 调度层
│       │   ├── gateway.py  # 调度网关
│       │   ├── context.py  # DispatchContext
│       │   └── strategies/ # 调度策略
│       │       ├── direct.py          # 直接调度
│       │       ├── team_dispatch.py   # 团队分发
│       │       └── capability_match.py # 能力匹配
│       ├── capability/     # 能力系统
│       │   ├── registry.py  # 能力注册表
│       │   ├── runtime.py  # 能力运行时
│       │   └── tools/      # 工具实现
│       ├── agents/         # 智能体运行时
│       ├── llm/            # LLM 客户端
│       ├── mcp/            # MCP 协议支持
│       ├── db/             # 数据库层
│       ├── services/      # 服务层
│       └── sandbox/        # 沙箱系统
│
├── agents/                 # 远程 A2A 子智能体
│   ├── code-writer/       # 代码编写智能体
│   ├── doc-assistant/      # 文档助手
│   └── mermaid-assistant/  # Mermaid 图表助手
│
├── demo/                   # Electron Demo 示例
│
├── docs/                   # 文档
│
├── .meowone/              # 项目配置目录
│   ├── agents.yaml        # 远程 A2A 智能体配置
│   ├── mcp.json          # MCP 服务器配置
│   ├── channels.yaml     # 渠道配置
│   ├── skills/          # Skills 文件目录
│   └── rules/           # 规则文件目录
│
├── docker-compose.yml     # Docker 部署配置
├── docker-compose.prod.yml # 生产环境配置
│
└── README.md
```

---

## 核心设计思想

MeowOne 在设计时遵循以下核心理念：**第一性原理**（从本质出发）、**KISS 原则**（保持简单）、**SOLID 原则**（单一职责、开闭原则、里氏替换、接口隔离、依赖倒置）。

### 1. Loop 算法设计

**问题**：智能体需要与外部世界交互（读写文件、执行代码、调用 API），但 LLM 本身无法直接执行这些操作。

**解决方案**：构建一个"思考-行动-观察"循环（Loop），让 LLM 决定何时调用工具，并将结果反馈给下一轮思考。

#### 1.1 LoopContext 统一上下文

所有 Loop 算法共享同一个上下文类 `LoopContext`，包含：

- `user_message`：用户输入
- `history`：对话历史（OpenAI messages 格式）
- `capabilities`：可用的工具注册表
- `system_prompt`：完整的系统提示词
- `limits`：资源限制（最大轮数、超时等）

```
┌─────────────────────────────────────────────────────────┐
│                      LoopContext                        │
├─────────────────────────────────────────────────────────┤
│  user_message: 用户输入                                  │
│  history: 对话历史（不含 system）                          │
│  capabilities: 工具注册表                               │
│  system_prompt: 完整系统提示词                            │
│  limits: 资源限制                                       │
│  model: 模型名称                                         │
│  _messages: 内部维护的完整消息列表                        │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                 LLM API (OpenAI 兼容)                    │
├─────────────────────────────────────────────────────────┤
│  messages = [system] + history + [user_message]         │
│  tools = capabilities.to_openai_tools()                  │
│  model = ctx.model                                       │
└─────────────────────────────────────────────────────────┘
```

#### 1.2 三种 Loop 算法

| 算法 | 适用场景 | 工具调用 | 终止条件 |
|------|----------|----------|----------|
| **Direct** | 简单问答、闲聊 | 无 | LLM 返回文本即结束 |
| **ReAct** | 标准工具调用场景 | 有 | 纯文本回复 / 超时 / 达到限制 |
| **Plan-Exec** | 复杂多步骤任务 | 有 | 纯文本回复 / 超时 / 达到限制 |

**Direct 算法**：最简单，不使用任何工具。一次 LLM 调用完成，直接返回文本。

**ReAct 算法**（默认）：
```
while True:
    1. 调用 LLM（携带工具列表）
    2. 如果只有文本回复 → 结束
    3. 如果有工具调用 → 并行执行 → 结果加入上下文 → 继续
    4. 超时或达到限制 → 结束
```

**Plan-Exec 算法**：
- 核心思想：**让 LLM 自己决定是否需要规划**
- 对于闲聊/简单问答：直接返回结果，无需规划
- 对于复杂任务：LLM 通过 `todo_manager` 工具主动创建、执行计划
- 关键提示词引导 LLM 判断任务类型

```
┌──────────────────────────────────────────────────────────┐
│                    Plan-Exec 流程                        │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  用户: "帮我分析这个代码库的性能问题"                        │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ LLM 判断: 这是一个复杂任务，需要规划                    │  │
│  └────────────────────────────────────────────────────┘  │
│                         │                                │
│                         ▼                                │
│  ┌────────────────────────────────────────────────────┐  │
│  │ 调用 todo_manager(action="add", title="分析代码结构") │  │
│  │ 调用 todo_manager(action="add", title="找出瓶颈")   │  │
│  │ 调用 todo_manager(action="add", title="生成建议")   │  │
│  └────────────────────────────────────────────────────┘  │
│                         │                                │
│                         ▼                                │
│  ┌────────────────────────────────────────────────────┐  │
│  │ 逐个执行任务，调用其他工具（read_workspace 等）        │  │
│  │ 每完成一个: todo_manager(action="done", id="...")   │  │
│  └────────────────────────────────────────────────────┘  │
│                         │                                │
│                         ▼                                │
│  ┌────────────────────────────────────────────────────┐  │
│  │ 返回最终分析报告                                     │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

#### 1.3 工具并行执行

ReAct 和 Plan-Exec 支持同一轮内并行执行多个工具（使用 `asyncio.gather`），显著提升效率。

```
Round 2:
  LLM 返回: [read_file("a.py"), read_file("b.py"), bash("ls")]

  并行执行:
  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
  │ read_file   │  │ read_file   │  │   bash      │
  │ ("a.py")    │  │ ("b.py")    │  │   ("ls")    │
  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘
         │                │                │
         └────────────────┼────────────────┘
                          ▼
              ┌─────────────────────────┐
              │ 汇总结果，加入上下文       │
              │ 继续下一轮 LLM 调用       │
              └─────────────────────────┘
```

---

### 2. 调度策略设计

**问题**：当一个用户请求到来时，应该由哪个智能体处理？如果有多个智能体，如何选择？

**解决方案**：构建调度层（Dispatch），负责根据配置和上下文选择最合适的执行策略。

#### 2.1 DispatchContext 统一上下文

```
┌────────────────────────────────────────────────────────────────┐
│                      DispatchContext                            │
├────────────────────────────────────────────────────────────────┤
│  【入口参数】                                                    │
│  user_message: 用户消息                                         │
│  history: 对话历史                                               │
│  strategy_name: 策略名称                                        │
│  strategy_config: 策略配置（JSON）                               │
│  model: 模型名称                                                │
│                                                                │
│  【预填充字段】（gateway 层自动推导）                              │
│  agent_id: 智能体 ID                                           │
│  instance_id: 实例 ID                                          │
│  image_id: 镜像 ID                                              │
│  agent_runtime: 已构建的智能体运行时                              │
│  candidate_runtimes: 候选智能体列表                              │
└────────────────────────────────────────────────────────────────┘
```

**设计原则**：Gateway 层负责预填充所有可推导的字段，策略函数优先使用预填充字段，fallback 到自行查询。只有无法自动推导的配置才需要用户通过 `strategy_config` 提供。

#### 2.2 三种调度策略

| 策略 | 适用场景 | 核心逻辑 |
|------|----------|----------|
| **Direct** | 单智能体对话 | 直接调用指定的智能体 |
| **Team Dispatch** | 多智能体协作 | 领导分析 + 成员分工 + 结果汇总 |
| **Capability Match** | 智能体选择 | LLM 语义匹配选择最佳智能体 |

**Direct 策略**：最简单的调度，直接调用单个智能体。

**Team Dispatch 策略**（领导-成员架构）：
```
┌─────────────────────────────────────────────────────────────────┐
│                   Team Dispatch 流程                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. 领导接收任务                                                  │
│     ┌─────────────────────────────────────────────────────────┐  │
│     │ "用户消息 + 团队成员信息" → 领导智能体分析                 │  │
│     └─────────────────────────────────────────────────────────┘  │
│                            │                                    │
│                            ▼                                    │
│  2. 领导制定分配方案                                              │
│     ┌─────────────────────────────────────────────────────────┐  │
│     │ 为每个成员分配具体任务                                    │  │
│     │ 【成员A】：任务1                                        │  │
│     │ 【成员B】：任务2                                        │  │
│     │ 【成员C】：任务3                                        │  │
│     └─────────────────────────────────────────────────────────┘  │
│                            │                                    │
│                            ▼                                    │
│  3. 成员并行/串行执行                                             │
│     ┌──────────┐  ┌──────────┐  ┌──────────┐                   │
│     │ 成员 A    │  │ 成员 B    │  │ 成员 C    │                   │
│     │ 执行任务1 │  │ 执行任务2 │  │ 执行任务3 │                   │
│     └────┬─────┘  └────┬─────┘  └────┬─────┘                   │
│          └─────────────┼─────────────┘                          │
│                          ▼                                      │
│  4. 领导汇总汇报                                                  │
│     ┌─────────────────────────────────────────────────────────┐  │
│     │ 收集所有成员汇报 → 整合 → 返回最终结果给用户               │  │
│     └─────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Capability Match 策略**：
```
用户: "帮我写一段 Python 代码"

┌──────────────────────────────────────────────────────────────┐
│  候选智能体:                                                   │
│  1. code-writer: 擅长代码编写、重构                             │
│  2. doc-assistant: 擅长文档、摘要                               │
│  3. mermaid-assistant: 擅长图表生成                            │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│  LLM 语义匹配: "写 Python 代码" → code-writer (相关性最高)     │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│  选中 code-writer 执行任务                                     │
└──────────────────────────────────────────────────────────────┘
```

#### 2.3 策略推导顺序

Gateway 按以下优先级自动推导策略配置：

```
1. instance_id → 查 agent_instances 表 → 获取 strategy_config + image
2. agent_id / agent_name → 查 agents 表 → 使用 direct 策略
3. 默认 → 使用 direct 策略，自动推导执行目标
```

---

### 3. 智能体、镜像与实例设计

**问题**：如何组合多个专业智能体形成团队？如何管理智能体的配置和运行时？

**解决方案**：设计三层架构——**智能体 (Agent)** → **镜像 (Image)** → **实例 (Instance)**。

#### 3.1 三层架构

```
┌────────────────────────────────────────────────────────────────────────┐
│                           智能体三层架构                                  │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│   ┌─────────────────┐                                                  │
│   │   Agent (智能体)  │  ← 最底层，独立的专业能力                          │
│   ├─────────────────┤                                                  │
│   │ id              │                                                  │
│   │ name            │                                                  │
│   │ description     │                                                  │
│   │ system_prompt   │                                                  │
│   │ loop_mode       │                                                  │
│   │ capabilities    │                                                  │
│   └─────────────────┘                                                  │
│            ▲                                                            │
│            │ 组合                                                      │
│            ▼                                                            │
│   ┌─────────────────┐                                                  │
│   │  Image (镜像)    │  ← 多个智能体的组合                                │
│   ├─────────────────┤                                                  │
│   │ id              │                                                  │
│   │ name            │                                                  │
│   │ agent_ids_json  │  ← 包含的智能体 ID 列表                            │
│   │ strategy_id     │  ← 默认调度策略                                   │
│   └─────────────────┘                                                  │
│            ▲                                                            │
│            │ 实例化                                                     │
│            ▼                                                            │
│   ┌─────────────────┐                                                  │
│   │ Instance (实例)  │  ← 镜像的运行时实例                               │
│   ├─────────────────┤                                                  │
│   │ id              │                                                  │
│   │ image_id        │  ← 所属镜像                                       │
│   │ strategy_config │  ← 策略配置（可覆盖镜像默认配置）                   │
│   │ environment_id  │  ← 执行环境                                       │
│   │ enabled         │                                                  │
│   └─────────────────┘                                                  │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

#### 3.2 AgentBuilder 动态构建

`AgentBuilder` 负责从数据库配置动态构建 `AgentRuntime`：

```
┌─────────────────────────────────────────────────────────────────┐
│                   AgentBuilder 构建流程                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. 从 agents 表读取智能体配置                                     │
│                                                                  │
│  2. 组装系统提示词 (优先级递减):                                   │
│     system_prompt = prompt_key 模板                               │
│                    + skills 正文                                  │
│                    + system_prompt 直接覆盖                       │
│                                                                  │
│  3. 解析工具策略:                                                 │
│     allow_tools: 白名单                                          │
│     deny_tools: 黑名单                                           │
│     mcp_servers: MCP 服务列表                                    │
│                                                                  │
│  4. 解析能力注册表 (CapabilityRegistry)                           │
│                                                                  │
│  5. 返回完整的 AgentRuntime                                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### 3.3 实例化流程

```
用户请求
    │
    ▼
┌─────────────────────────────────────────┐
│  查找 Instance                           │
│  └─ image_id → Image                    │
│     └─ agent_ids_json → [Agent1, ...]   │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│  选择调度策略                             │
│  └─ strategy_config / image 默认策略     │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│  执行策略                                │
│  └─ Direct / TeamDispatch / Capability  │
└─────────────────────────────────────────┘
```

---

### 4. 能力系统设计

**问题**：智能体需要调用各种工具（文件操作、代码执行、API 调用等），如何统一管理这些工具？

**解决方案**：构建能力注册表（CapabilityRegistry），将所有工具注册为"能力"，支持白名单/黑名单过滤。

#### 4.1 能力注册表

```
┌─────────────────────────────────────────────────────────────────┐
│                    CapabilityRegistry                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  内置能力 (Built-in):                                            │
│  ├── read_workspace_file    读取工作区文件                       │
│  ├── write_workspace_file   写入工作区文件                       │
│  ├── list_workspace_dir     列出目录                            │
│  ├── bash_tool              执行 Bash 命令                       │
│  ├── call_mcp_tool         调用 MCP 工具                        │
│  ├── subagent_tool          调用子智能体                          │
│  ├── invoke_internal_agent 调用内部智能体                        │
│  └── todo_manager          任务管理器 (Plan-Exec 专用)           │
│                                                                  │
│  MCP 能力 (动态加载):                                             │
│  └── 通过 mcp_servers 配置动态加载                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### 4.2 工具过滤机制

```
┌─────────────────────────────────────────────────────────────────┐
│                   工具过滤流程                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Agent 配置:                                                     │
│  allow_tools = ["read_workspace", "bash_tool"]                  │
│  deny_tools = []                                                │
│  mcp_servers = ["github-mcp"]                                    │
│                                                                  │
│  过滤步骤:                                                       │
│  1. apply allow_tools → 只保留白名单中的工具                       │
│  2. apply deny_tools → 移除黑名单中的工具                         │
│  3. apply mcp_servers → 只允许指定的 MCP 服务                     │
│                                                                  │
│  结果: read_workspace + bash_tool + 受限的 call_mcp_tool         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### 4.3 MCP 集成

```
┌─────────────────────────────────────────────────────────────────┐
│                      MCP 集成架构                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────────────┐                                          │
│   │   MeowOne Agent  │                                          │
│   └────────┬─────────┘                                          │
│            │                                                    │
│            │ call_mcp_tool(server, tool, args)                   │
│            ▼                                                    │
│   ┌──────────────────┐    stdio / SSE    ┌──────────────────┐  │
│   │  MCP Client      │◄─────────────────►│  MCP Server      │  │
│   │  (stdio_session  │                    │  (GitHub/Figma   │  │
│   │   / sse_client)  │                    │   / Filesystem)  │  │
│   └──────────────────┘                    └──────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

### 5. 事件流设计

所有异步交互通过 SSE（Server-Sent Events）流式返回，提供实时反馈。

```
┌─────────────────────────────────────────────────────────────────┐
│                      SSE 事件流                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  thinking     → "正在思考..."                                    │
│  text         → "这是回答的第一部分"                              │
│  text         → "这是回答的第二部分"                              │
│  tool_call    → read_workspace(file="README.md")               │
│  tool_result  → "文件内容..."                                   │
│  card         → {type: "form", ...}                            │
│  done         → {loop_rounds: 3, duration: 1500}              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 环境要求

| 组件 | 版本要求 | 说明 |
|------|----------|------|
| **Python** | 3.11+ | 后端运行环境 |
| **Node.js** | 20+ | 前端运行环境 |
| **uv** | 最新版 | Python 包管理（可选，推荐使用） |

> **提示**：本仓库根目录配置了 `uv.toml` 的清华 PyPI 镜像，在中国大陆可加速依赖安装。

---

## 快速开始

### 1. 克隆与配置

```bash
# 克隆仓库
git clone <repository-url>
cd meowone

# 配置后端环境变量
cp .env.example backend_v2/.env
```

编辑 `backend_v2/.env`，配置 LLM API：

```env
# OpenAI 兼容 API
LLM_API_KEY=sk-your-api-key
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4o
```

### 2. 启动后端

```bash
cd backend_v2

# 安装依赖（使用 uv）
uv sync

# 或使用 pip
pip install -r requirements.txt

# 启动服务
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

- 健康检查：<http://localhost:8000/health>
- API 文档：<http://localhost:8000/docs>

### 3. 启动前端

```bash
cd admin_web

# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev
```

访问 <http://localhost:3000>

### 4. 启动子智能体（可选）

```bash
# 代码编写助手
cd agents/code-writer
python __main__.py

# 文档助手
cd agents/doc-assistant
python __main__.py

# Mermaid 图表助手
cd agents/mermaid-assistant
python __main__.py
```

---

## Docker 部署

### 开发环境

```bash
# 准备环境变量
cp .env.example backend_v2/.env
# 编辑 backend_v2/.env 配置 LLM_API_KEY 等

# 启动所有服务
docker compose up --build
```

访问地址：
- **前端**：<http://localhost:9006>
- **后端**：<http://localhost:8000>

### 生产环境

```bash
# 准备生产环境变量
cp .env.example backend_v2/.env.production
# 编辑 backend_v2/.env.production

# 使用生产配置启动
docker compose -f docker-compose.prod.yml up --build
```

---

## 主要 API

### 会话与聊天

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/health` | 健康检查 |
| `GET` | `/api/sessions` | 会话列表 |
| `POST` | `/api/sessions` | 创建会话 |
| `GET` | `/api/sessions/{id}/messages` | 消息列表 |
| `POST` | `/api/sessions/{id}/chat` | **发送消息，SSE 流式返回** |

### 智能体管理

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/agents` | 智能体列表 |
| `POST` | `/api/agents/internal` | 创建内部智能体 |
| `GET` | `/api/internal-agents` | 内部智能体运行时 |
| `POST` | `/api/internal-agents/{name}/invoke` | 调用内部智能体 |

### v3 团队系统

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/api/v3/orgs` | 创建组织 |
| `POST` | `/api/v3/teams` | 创建团队 |
| `POST` | `/api/v3/loops` | 创建 Loop |
| `POST` | `/api/v3/strategies` | 创建策略 |
| `POST` | `/api/v3/strategy-configs` | 创建策略配置 |
| `POST` | `/api/v3/environments` | 创建环境 |
| `POST` | `/api/v3/images` | 创建镜像 |
| `POST` | `/api/v3/instances` | 创建实例 |

### 能力管理

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/api/capabilities/mcp` | 创建 MCP 服务 |
| `GET` | `/api/capabilities/mcp/{name}/tools` | 获取 MCP 工具列表 |
| `POST` | `/api/capabilities/skills` | 创建 Skill |
| `GET` | `/api/prompts` | 提示词列表 |
| `POST` | `/api/prompts` | 创建提示词 |

### OpenAI 兼容

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/v1/chat/completions` | OpenAI 兼容接口（支持 stream） |

---

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `LLM_API_KEY` | - | LLM API 密钥 |
| `LLM_BASE_URL` | `https://api.openai.com/v1` | LLM API 地址 |
| `LLM_MODEL` | `gpt-4o` | 默认模型 |
| `DATABASE_PATH` | `meowone.db` | SQLite 路径 |
| `LOOP_MAX_ROUNDS` | `16` | 主循环最大轮数 |
| `LOOP_MAX_TOOL_PHASES` | `8` | 单条消息最大工具调用轮次 |
| `LOOP_TIMEOUT_SECONDS` | `120` | 循环超时（秒） |
| `TOOL_TIMEOUT_SECONDS` | `30` | 工具超时（秒） |
| `MEOWONE_CONFIG_DIR` | `.meowone` | 配置目录 |
| `WORKSPACE_ROOT` | 项目根目录 | 工作区根路径 |
| `MEOWONE_ALLOW_BASH` | `0` | 是否启用 Bash 工具 |

---

## `.meowone/` 配置目录

| 文件 / 目录 | 作用 |
|-------------|------|
| `agents.yaml` | 远程 A2A 智能体配置 |
| `mcp.json` | MCP 服务器配置 |
| `channels.yaml` | 渠道能力策略 |
| `skills/` | Skills 文件目录 |
| `rules/` | 规则文件目录 |

---

## SSE 事件类型

聊天接口返回的流式事件类型：

| 事件类型 | 说明 |
|----------|------|
| `thinking` | 思考过程 |
| `text` | 文本增量 |
| `tool_call` | 工具调用请求 |
| `tool_result` | 工具执行结果 |
| `card` | 卡片 UI |
| `error` | 错误信息 |
| `done` | 结束标记 |

---

## 技术栈

| 层级 | 技术 |
|------|------|
| **前端** | Next.js 16, React 19, TypeScript, Tailwind CSS 4, shadcn/ui, Zustand, react-markdown, A2UI SDK |
| **后端** | Python 3.11+, FastAPI, SQLite (aiosqlite), SSE (sse-starlette), 自研 LLM Client 与 Agent Loop |
| **协议与集成** | OpenAI 兼容 Chat Completions, MCP (stdio), A2A (a2a-sdk) |
| **子智能体** | Python A2A 服务（code-writer、doc-assistant、mermaid-assistant） |

---

## 许可证

本项目不允许商用！！！若使用本项目，必须开源！！！



 

## **一、系统页面展示**

 

![img](README.assets/wps1.jpg) 

![img](README.assets/wps2.jpg) 

![img](README.assets/wps3.jpg) 

![img](README.assets/wps4.jpg) 

![img](README.assets/wps5.jpg) 

![img](README.assets/wps6.jpg) 

![img](README.assets/wps7.jpg) 

![img](README.assets/wps8.jpg) 

![img](README.assets/wps9.jpg) 

![img](README.assets/wps10.jpg) 

![img](README.assets/wps11.jpg) 

![img](README.assets/wps12.jpg) 

![img](README.assets/wps13.jpg) 

![img](README.assets/wps14.jpg) 

![img](README.assets/wps15.jpg) 

![img](README.assets/wps16.jpg) 

![img](README.assets/wps17.jpg) 

![img](README.assets/wps18.jpg) 

![img](README.assets/wps19.jpg) 

![img](README.assets/wps20.jpg) 

![img](README.assets/wps21.jpg) 

![img](README.assets/wps22.jpg) 

![img](README.assets/wps23.jpg) 

![img](README.assets/wps24.jpg) 

![img](README.assets/wps25.jpg) 

![img](README.assets/wps26.jpg) 

![img](README.assets/wps27.jpg) 

![img](README.assets/wps28.jpg) 

![img](README.assets/wps29.jpg) 

![img](README.assets/wps30.jpg) 

![img](README.assets/wps31.jpg) 

![img](README.assets/wps32.jpg) 

![img](README.assets/wps33.jpg) 

![img](README.assets/wps34.jpg) 

![img](README.assets/wps35.jpg) 

![img](README.assets/wps36.jpg) 

![img](README.assets/wps37.jpg) 

![img](README.assets/wps38.jpg) 

![img](README.assets/wps39.jpg) 

![img](README.assets/wps40.jpg) 

![img](README.assets/wps41.jpg) 

 

## 二、**案例展示**

![img](README.assets/wps42.jpg) 

![img](README.assets/wps43.jpg) 

![img](README.assets/wps44.jpg) 

![img](README.assets/wps45.jpg) 

![img](README.assets/wps46.jpg) 

![img](README.assets/wps47.jpg) 

![img](README.assets/wps48.jpg) 

![img](README.assets/wps49.jpg) 

![img](README.assets/wps50.jpg) 
