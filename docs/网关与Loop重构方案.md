# MeowOne 网关与 Loop 重构方案

本文档描述后端分层重构的目标架构、模块边界与分阶段迁移步骤，便于**清晰扩展多渠道、能力插件与配置**，并与现有 Web + SSE 行为对齐。

---

## 一、目标与原则

### 目标

1. **网关层**只负责：鉴权/验签、渠道协议 ↔ 内部统一「对话回合」模型、持久化策略、将 `LoopEvent` 适配为各渠道输出。
2. **Loop 内核**只负责：给定一轮输入（system 片段、history、user、工具集）→ 产出事件流；**不**依赖 FastAPI、**不**直接写库。
3. **能力 / 插件**统一走「注册与生命周期」：本地 Tool、远程 A2A、未来动态插件共用同一套抽象。
4. **配置**分层：运行时环境变量、`.meowone` 项目配置、按渠道/按会话覆盖项分离。

### 原则

- **先抽接口再搬家**：新代码可与旧路由并行，再切换。
- **默认行为不变**：Web + SSE 行为与重构前一致，避免重构同时改变产品语义。

---

## 二、现状简要问题（驱动重构）

- `run_loop` 内部写死 `build_system_prompt` 与 `build_extra_system_prompt()`，**按渠道裁剪能力或提示**不直观。
- `chat.py` 混合 HTTP、SSE 序列化、历史组装、落库、`run_loop` 调用，**新渠道易复制粘贴**。
- `registry` 在 `main.py` 全局注册，**按会话或按渠道换工具子集**需要额外设计。

以上并非错误，但会阻碍多网关与可插拔扩展。

---

## 三、目标架构（逻辑分层）

```
                    ┌─────────────────────────────────────────┐
                    │  Channel Adapters（渠道适配器）           │
                    │  web_sse | feishu | slack | cli ...     │
                    └────────────────────┬────────────────────┘
                                         │ 统一调用
                    ┌────────────────────▼────────────────────┐
                    │  Gateway / Application Service          │
                    │  ConversationTurnService（命名示例）      │
                    │  - resolve_session(channel, external_id)│
                    │  - append_user_message / load_history   │
                    │  - build_loop_input()                   │
                    │  - run_loop_pipeline() → events         │
                    │  - persist_assistant                    │
                    └────────────────────┬────────────────────┘
                                         │
                    ┌────────────────────▼────────────────────┐
                    │  Loop Kernel                            │
                    │  run_loop(input: LoopRunInput) → events │
                    └────────────────────┬────────────────────┘
                                         │
         ┌───────────────────────────────┼───────────────────────────────┐
         ▼                               ▼                               ▼
   ┌───────────┐                 ┌───────────────┐               ┌──────────────┐
   │ LLM Client│                 │ Capability    │               │ Prompt /     │
   │           │                 │ Runtime       │               │ Skills build │
   └───────────┘                 │ (tools + a2a) │               └──────────────┘
                                 └───────────────┘
```

### 说明

- **Channel Adapter**：每个渠道一个模块（或一个类），负责「收事件 → 调 `ConversationTurnService`」「消费事件流 → 发回渠道」。
- **Gateway / Application Service**：**不**绑定 HTTP 框架，供所有 Adapter 调用；单元测试优先覆盖这一层。
- **Loop Kernel**：纯异步生成器，输入输出稳定。

---

## 四、核心类型与接口（建议）

### 1. `LoopRunInput`（Loop 唯一入口）

建议字段（可按项目命名习惯调整）：

| 字段 | 说明 |
|------|------|
| `user_message` | `UserContent`，与现有一致 |
| `history` | OpenAI 风格消息列表 |
| `capabilities` | `CapabilityRegistry` 或能力序列 + 工厂 |
| `extra_system` | 渠道或会话级追加 system |
| `system_prompt_variant` | 可选，如 `full` / `text_only`，用于弱化或关闭 A2UI 说明 |
| `message_id` | 可选 |
| `limits` | 可选，覆盖 max_rounds、timeout（测试或特权渠道） |

`run_loop` 改为只接收 **`LoopRunInput`**；**不再在内部**直接调用 `build_extra_system_prompt()`，而是使用 **`input.extra_system`**。默认由上层将全局 skills 等拼入 `extra_system`。

### 2. `CapabilityRuntime`（能力运行时）

- 封装：**全局默认 registry** + **按 `LoopRunInput` 或按渠道策略过滤**（例如飞书去掉 `card_builder`）。
- 后续可演进为 `PluginLoader` 动态注册；**首版**可保持静态注册 + 过滤。

### 3. `ChannelContext`（渠道上下文）

- `channel_id`：如 `web` / `feishu`
- `external_thread_id`：飞书 chat_id 等（可选）
- `session_id`：内部会话 ID
- `auth`：渠道特有凭证（不进入 Loop）

### 4. `ConversationTurnService`（网关应用服务）

对外方法示例：

- `turn(ctx: ChannelContext, user_content: UserContent, ...) -> AsyncIterator[...]`

内部流程：解析/绑定 session → 写 user → 组 history → 构造 `LoopRunInput` → `async for e in run_loop(input)` → 可选持久化 assistant。

事件可**直接复用现有 `LoopEvent`**，仅在 Web adapter 中转为 SSE；降低改动面。

---

## 五、目录与模块建议

以下为在现有 `backend/app/` 包下的增量布局（`capability` 包已存在，新增 `gateway/` 与可选 `capability/runtime.py` 等）。

```
backend/app/
  gateway/                    # 新增：网关与应用服务
    __init__.py
    channel.py                # ChannelContext, ChannelId
    turn_service.py             # ConversationTurnService
    events.py                 # 可选：SSE 序列化辅助
    adapters/
      web_sse.py              # 薄封装：调 turn_service，yield SSE
      feishu.py               # 未来：webhook + 回复 API
  loop/
    runtime.py                # run_loop(LoopRunInput)
    context.py
    events.py
  capability/                 # 已有包；可新增
    runtime.py                # 过滤/组合 registry
    registry.py
    tools/
    ...
  llm/
  config_loaders.py           # 或迁至 config/ 渐进迁移
  api/
    sessions.py
    messages.py
    chat.py                   # 变薄：仅 HTTP + 调 gateway.adapters.web_sse
```

要点：**`api/` 保持 HTTP 边界**；**`gateway/` 承载网关语义**。

---

## 六、插件与多渠道（概念不混淆）

| 概念 | 含义 | 落点 |
|------|------|------|
| **渠道（Channel）** | 用户从哪进、协议是什么 | `gateway/adapters/*` + 路由 |
| **能力 / 插件（Capability）** | 模型能调什么 | `capability/` + `LoopRunInput` 注入的 registry |
| **系统提示变体** | 是否强调 A2UI、语气、合规 | `system_prompt_variant` + `extra_system` |
| **项目配置** | skills、MCP、agents | `.meowone`，由 `turn_service` 组装进 `extra_system` / MCP 工具 |

**动态插件**不必首版完成：先 **静态注册 + 按渠道过滤 + 配置开关**，再引入 entry points 或独立包。

---

## 七、数据层

- **会话与外部渠道绑定**：建议新表 `channel_sessions`（示例字段）  
  `channel`、`external_thread_id`、`session_id`、`created_at`，唯一索引 `(channel, external_thread_id)`。  
  亦可扩展 `sessions` 表；独立表通常更清晰。
- **messages** 表保持；**Loop 不写库**，由 `ConversationTurnService` 统一写。

---

## 八、分阶段迁移

| 阶段 | 内容 | 风险 |
|------|------|------|
| **1** | 引入 `LoopRunInput`，将 system/extra 组装移出 `run_loop` | 低；需单测对齐 system 与工具列表 |
| **2** | 引入 `ConversationTurnService`，`chat.py` 变薄 | 中；SSE 行为需回归 |
| **3** | `CapabilityRuntime` 按渠道过滤；可选 `channels.yaml` | 低 |
| **4** | 新渠道（如飞书）仅新增 adapter + 路由 | 低；Loop 不改 |
| **5** | 可选：`CapabilityPlugin` 协议与启动扫描 | 按需 |

---

## 九、验收标准

- Web：SSE 事件序列、落库内容、工具调用与重构前一致（关键路径可对拍）。
- 新渠道：可对 `ConversationTurnService` mock LLM 做集成测试。
- Loop 单测：不启动 DB、不启动 FastAPI，仅 `LoopRunInput` + mock LLM。

---

## 十、小结

- **API 路由 = 网关的 HTTP 适配器**；重构后网关能力集中在 **`gateway/` + `ConversationTurnService`**，路由保持薄层。
- **Loop** 保持纯函数式边界；**渠道与插件**通过 **`LoopRunInput` 与 `CapabilityRuntime`** 扩展，避免继续向 `chat.py` 堆叠逻辑。

---

## 参考

- 产品与技术总览：`README.md`、`docs/技术方案V1.md`
- 当前对话与 Loop 入口：`backend/app/api/chat.py`、`backend/app/loop/runtime.py`
