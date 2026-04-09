"""
Plan-Exec Loop 算法

核心理念：让 LLM 自己决定是否需要规划，以及如何使用 todo_manager 工具。
- 对于闲聊/简单问答：直接返回结果，无需规划
- 对于复杂任务：LLM 通过 todo_manager 主动创建、执行计划

阶段划分（由 LLM 自己判断）：
- 简单任务：直接回答
- 复杂任务：LLM 调用 todo_manager 创建任务列表，然后逐步执行

终止条件：LLM 返回纯文本（无工具调用）、超时、或达到资源限制。

注册名称: "plan_exec"
"""
from __future__ import annotations

import json
import logging
import time
from typing import AsyncIterator, Any

from app.loop.registry import loop_algorithm
from app.loop.context import LoopContext
from app.loop.events import (
    ThinkingEvent, DeltaEvent, CardEvent,
    ToolCallEvent, ToolResultEvent, ErrorEvent, DoneEvent, LoopEvent,
)
from app.loop.tool_executor import execute_tool_calls
from app.llm.client import chat_completion_stream
from app.config import LOOP_MAX_ROUNDS, LOOP_MAX_TOOL_PHASES, LOOP_TIMEOUT_SECONDS
from app.capability.tools.todo_manager import TodoManagerTool, _clear_store
from app.capability.registry import CapabilityRegistry

logger = logging.getLogger(__name__)

# 规划模式系统提示词
# 关键点：引导 LLM 主动判断是否需要规划，并在需要时使用 todo_manager
PLAN_EXEC_SYSTEM_PROMPT = """
## 计划-执行模式

你运行在"计划-执行"模式下。这个模式的核心思想是：**对于复杂任务，先规划再执行；对于简单任务，直接回答**。

### 判断标准

**需要规划的特征**（满足任一即可）：
- 任务涉及多个独立步骤
- 需要搜索或获取多个信息
- 需要创建/修改多个文件
- 任务有明确的交付物（报告、代码、配置等）
- 用户明确要求"帮我做..."、"请完成..."

**不需要规划的特征**：
- 闲聊、问候、简单问答
- 用户只是询问信息
- 任务非常明确单一

### 如何规划（当需要时）

如果判断需要规划，请按以下步骤操作：

**第一步：创建任务列表**
使用 `todo_manager` 工具（action="add"）添加所有需要完成的任务。

**第二步：逐个执行**
按顺序执行每个任务，每完成一个就用 `todo_manager`（action="done"）标记完成。

**第三步：返回最终结果**
所有任务完成后，返回完整的回答。

### 示例

**需要规划的情况**：
User: "帮我分析这个代码库的性能问题"
Assistant: 
1. 调用 todo_manager(action="add", title="分析代码结构")
2. 调用 todo_manager(action="add", title="找出性能瓶颈")
3. 调用 todo_manager(action="add", title="生成优化建议")
4. ... 执行每个任务 ...

**不需要规划的情况**：
User: "你好啊，今天天气怎么样？"
Assistant: "你好！很高兴见到你。不过我无法获取实时天气信息..."

### 重要提示

- 不要为了规划而规划。如果任务很简单，直接回答即可。
- 你可以随时查看当前任务状态：todo_manager(action="list")
- 如果任务有变化，可以更新任务：todo_manager(action="update", id="...", status="done")
- 返回最终回答时，确保所有任务都已标记完成
"""


def _build_capabilities_with_todo(capabilities: Any, message_id: str) -> Any:
    """为 plan_exec 构建包含 todo_manager 的 capabilities"""
    if capabilities is None:
        # 没有现有工具时，只注册 todo_manager
        exec_caps = CapabilityRegistry()
        todo_tool = TodoManagerTool(message_id=message_id)
        exec_caps.register(todo_tool)
        logger.info("plan_exec: message_id=%s 只有 todo_manager 一个工具", message_id)
        return exec_caps

    # 复制所有现有工具，并添加 todo_manager
    exec_caps = CapabilityRegistry()
    for cap in capabilities.list_all():
        exec_caps.register(cap)

    # 添加 todo_manager（执行阶段专用）
    todo_tool = TodoManagerTool(message_id=message_id)
    exec_caps.register(todo_tool)

    logger.info("plan_exec: message_id=%s 添加 todo_manager，共 %d 个工具",
                message_id, len(exec_caps.list_all()))
    return exec_caps


def _extract_user_intent(user_message: str) -> str:
    """
    简单分析用户意图，判断是闲聊还是复杂任务。
    这是辅助判断，真正的决策由 LLM 做出。
    """
    if not user_message:
        return "unknown"

    user_lower = user_message.lower().strip()

    # 闲聊关键词
    chitchat_keywords = [
        "你好", "嗨", "hi", "hello", " hey", "早上好", "下午好", "晚上好",
        "谢谢你", "谢谢", "拜拜", "再见", " bye", "天气", "怎么样",
        "最近如何", "你好吗", "在吗", "在不在", "有空吗",
    ]

    # 明确任务关键词
    task_keywords = [
        "帮我", "请帮我", "帮我做", "请完成", "请生成", "请创建",
        "分析", "优化", "修改", "修复", "调试", "实现",
        "写代码", "写一个", "写段代码", "生成代码",
        "帮我写", "帮我分析", "帮我查找", "帮我搜索",
        "查找", "搜索", "查找所有", "搜索所有",
    ]

    # 检查闲聊
    for kw in chitchat_keywords:
        if kw.lower() in user_lower:
            # 如果只是闲聊关键词，没有任务关键词
            has_task = any(tk in user_lower for tk in task_keywords)
            if not has_task:
                return "chitchat"

    return "task"


@loop_algorithm("plan_exec")
async def plan_exec_loop(ctx: LoopContext) -> AsyncIterator[LoopEvent]:
    """
    Plan-Exec Loop

    核心改变：不再写死"先规划→再执行"的两阶段流程，
    而是让 LLM 自己判断任务类型，并主动调用 todo_manager 来管理任务。

    流程：
    1. 构建包含 todo_manager 的 capabilities
    2. 在系统提示中加入规划模式引导词
    3. LLM 自主决定是否需要规划，以及如何使用工具
    4. 终止条件同 react：纯文本回复、超时、或达到限制
    """
    message_id = ctx.message_id
    capabilities = ctx.capabilities
    limits = ctx.limits

    max_rounds = (limits.max_rounds if limits and limits.max_rounds else None) or LOOP_MAX_ROUNDS
    max_tool_phases = (limits.max_tool_phases if limits and limits.max_tool_phases else None) or LOOP_MAX_TOOL_PHASES
    timeout_seconds = (limits.timeout_seconds if limits and limits.timeout_seconds else None) or LOOP_TIMEOUT_SECONDS

    # 构建包含 todo_manager 的 capabilities
    exec_capabilities = _build_capabilities_with_todo(capabilities, message_id)
    tools = exec_capabilities.to_openai_tools() if exec_capabilities.list_all() else None

    # 构建执行上下文：原始系统提示 + 规划模式引导
    exec_ctx = ctx.clone_with_extra_system(PLAN_EXEC_SYSTEM_PROMPT)
    exec_ctx = exec_ctx.with_capabilities(exec_capabilities)

    # 简单预判：如果是闲聊，可以跳过规划提示（但 LLM 仍有工具可用）
    user_text = ""
    if isinstance(ctx.user_message, str):
        user_text = ctx.user_message
    elif isinstance(ctx.user_message, list):
        for part in ctx.user_message:
            if isinstance(part, dict) and part.get("type") == "text":
                user_text += part.get("text", "")
    user_intent = _extract_user_intent(user_text)

    start_time = time.time()
    round_num = 0
    tool_phases = 0

    # 如果预判是闲聊，可以稍微简化提示（但仍然可用 todo_manager）
    if user_intent == "chitchat":
        exec_ctx = exec_ctx.clone_with_extra_system(
            "\n\n## 注意\n这是一个简单的对话，无需规划。请直接回答用户。"
        )

    while True:
        round_num += 1

        # 超时检查
        if time.time() - start_time > timeout_seconds:
            yield ErrorEvent(code="TIMEOUT", message="Loop execution timed out")
            _clear_store(message_id)
            break

        # 轮次限制
        if round_num > max_rounds:
            logger.info("达到最大轮次 max_rounds=%s，结束循环", max_rounds)
            _clear_store(message_id)
            break

        # 工具阶段限制
        if tool_phases >= max_tool_phases:
            logger.info("达到最大工具阶段数 max_tool_phases=%s，结束循环", max_tool_phases)
            _clear_store(message_id)
            break

        if round_num > 1:
            yield ThinkingEvent(step=round_num, description="正在思考...")

        accumulated_content = ""
        tool_calls = []
        has_content = False

        try:
            async for chunk in chat_completion_stream(
                messages=exec_ctx.get_messages(),
                tools=tools,
                model=ctx.model,
            ):
                if chunk["type"] == "content_delta":
                    has_content = True
                    accumulated_content += chunk["content"]
                    yield DeltaEvent(message_id=message_id, content=chunk["content"], done=False)
                elif chunk["type"] == "tool_call":
                    tool_calls.append(chunk)
        except Exception as e:
            yield ErrorEvent(code="LLM_ERROR", message=str(e))
            _clear_store(message_id)
            break

        # 纯文本回复 → 结束
        if has_content and not tool_calls:
            exec_ctx.add_assistant_message(accumulated_content)
            yield DeltaEvent(message_id=message_id, content="", done=True)
            break

        # 处理工具调用
        if tool_calls:
            exec_ctx.add_assistant_tool_calls(
                [{"id": tc["id"], "name": tc["name"], "arguments": tc["arguments"]} for tc in tool_calls]
            )
            names = [tc["name"] for tc in tool_calls]
            logger.info("Plan-Exec 模式: round=%s tools=%s", round_num, names)

            # 检查是否使用了 todo_manager（用于日志）
            has_todo = "todo_manager" in names
            if has_todo:
                yield ThinkingEvent(
                    step=round_num,
                    description=f"正在执行任务计划... ({', '.join(names)})"
                )
            else:
                desc = (
                    f"并行执行 {len(tool_calls)} 个工具: {', '.join(names)}"
                    if len(tool_calls) > 1
                    else f"使用 {names[0]}..."
                )
                yield ThinkingEvent(step=round_num, description=desc)

            # 发出工具调用事件
            for tc in tool_calls:
                try:
                    params = json.loads(tc["arguments"])
                except json.JSONDecodeError:
                    params = {}
                yield ToolCallEvent(
                    tool_call_id=str(tc["id"]),
                    capability_name=tc["name"],
                    params=params,
                )

            # 执行工具
            outcomes = await execute_tool_calls(tool_calls, exec_capabilities)

            # 回填结果
            for out in outcomes:
                exec_ctx.add_tool_result(out["tool_call_id"], out["result_str"])
                ok = out.get("error_code") is None
                yield ToolResultEvent(
                    tool_call_id=out["tool_call_id"],
                    capability_name=out["name"],
                    result=out["result"] if out["result"] is not None else out["result_str"],
                    success=ok,
                )
                if out["error_code"] in ("UNKNOWN_CAPABILITY", "TOOL_ERROR"):
                    yield ErrorEvent(code=out["error_code"], message=out["error_message"] or "")
                elif ok:
                    res = out["result"]
                    if isinstance(res, dict) and res.get("type") in ("info", "action", "form"):
                        yield CardEvent(message_id=message_id, card=res)

            tool_phases += 1
            continue  # 继续下一轮

        # 既无文本也无工具调用（LLM 返回空）
        break

    # 清理 todo store
    _clear_store(message_id)

    yield DoneEvent(
        message_id=message_id,
        loop_rounds=round_num,
        total_duration=(time.time() - start_time) * 1000,
    )
