"""
MeowOne Python SDK Demo
========================
实例创建成功后，通过 Python 代码调用对话接口的完整示例。

依赖安装：
    pip install requests sseclient-py httpx

运行前提：
    1. 后端服务已启动（默认 http://localhost:8000）
    2. 已通过管理后台或 API 创建了智能体实例（instance）
"""

import json
import time
import threading
import requests

BASE_URL = "http://localhost:8000"


# ============================================================
# 方式一：SSE 流式对话（推荐，实时看到 AI 思考过程）
# ============================================================

def demo_sse_stream():
    """
    通过 SSE 流式接口与智能体对话。
    - 每次调用自动带上 session_id，实现多轮对话上下文
    - SSE 事件会实时推送 AI 的思考过程和最终回复
    """
    # Step 1: 创建一个新会话（关联到智能体实例）
    session_resp = requests.post(
        f"{BASE_URL}/api/sessions",
        json={
            "title": "我的第一个对话",
            "agent_name": "客服助手",    # ← 替换为你的实例名称
            "agent_type": "internal"     # internal | external
        }
    )
    session_resp.raise_for_status()
    session = session_resp.json()
    session_id = session["id"]
    print(f"✅ 会话已创建: {session_id}")

    # Step 2: 定义一个处理 SSE 事件的函数
    def consume_sse_events(response: requests.Response):
        """边收边打印，模拟流式输出的体验"""
        buffer = ""
        for line in response.iter_lines():
            if not line:
                continue
            line = line.decode("utf-8")
            # SSE 格式: data: {"event":"message","data":"..."}
            if line.startswith("data: "):
                payload = line[6:]  # 去掉 "data: " 前缀
                if payload == "[DONE]":
                    break
                try:
                    event = json.loads(payload)
                    # 根据事件类型处理
                    event_type = event.get("type") or event.get("event", "")
                    content = event.get("content", "")

                    if event_type in ("message", "text"):
                        if content:
                            print(content, end="", flush=True)
                            buffer += content
                    elif event_type == "tool_call":
                        print(f"\n🔧 [调用工具] {event.get('name')} → {event.get('input')}")
                    elif event_type == "tool_result":
                        print(f"\n📦 [工具结果] {event.get('result')}")
                    elif event_type == "error":
                        print(f"\n❌ [错误] {event.get('message')}")
                    elif event_type == "done":
                        print("\n")
                except json.JSONDecodeError:
                    pass

    # Step 3: 发送消息（第一轮对话）
    print("\n" + "=" * 60)
    print("🗣️  第一轮：发起对话")
    print("=" * 60)

    chat_resp = requests.post(
        f"{BASE_URL}/api/sessions/{session_id}/chat",
        json={
            "content": "你好，请介绍一下你自己",
            # 指定智能体（可选，不指定则用 session 创建时绑定的）
            "agent_name": "客服助手",
            "agent_type": "internal",
        },
        stream=True,   # 关键！必须 stream=True
        headers={"Accept": "text/event-stream"}
    )
    chat_resp.raise_for_status()
    consume_sse_events(chat_resp)

    # Step 4: 继续对话（第二轮，自动携带上下文）
    print("=" * 60)
    print("🗣️  第二轮：追问一个问题")
    print("=" * 60)

    chat_resp2 = requests.post(
        f"{BASE_URL}/api/sessions/{session_id}/chat",
        json={
            "content": "你能做什么？",
            "agent_name": "客服助手",
            "agent_type": "internal",
        },
        stream=True,
        headers={"Accept": "text/event-stream"}
    )
    chat_resp2.raise_for_status()
    consume_sse_events(chat_resp2)

    return session_id


# ============================================================
# 方式二：轮询式对话（非流式，适合后台任务）
# ============================================================

def demo_sync_chat():
    """
    通过 OpenAI 兼容接口发送消息（非流式）。
    一次性返回完整结果，适合不需要实时反馈的场景。
    """
    # Step 1: 获取或创建会话
    sessions_resp = requests.get(f"{BASE_URL}/api/sessions")
    sessions = sessions_resp.json()
    if sessions:
        session_id = sessions[0]["id"]
    else:
        create_resp = requests.post(
            f"{BASE_URL}/api/sessions",
            json={"title": "同步对话", "agent_name": "客服助手", "agent_type": "internal"}
        )
        session_id = create_resp.json()["id"]

    # Step 2: 发送消息并等待完整响应
    # 注意：/v1/chat/completions 不支持流式返回完整结果
    # 这里演示的是通过 OpenAI-compatible 端点调用
    print("\n" + "=" * 60)
    print("🗣️  OpenAI 兼容接口调用")
    print("=" * 60)

    # 使用普通请求（后端目前通过 SSE 实现，这个端点可能需要确认）
    # 如果后端支持非流式，直接调用 SSE 接口但不用 stream=True 即可
    chat_resp = requests.post(
        f"{BASE_URL}/api/sessions/{session_id}/chat",
        json={
            "content": "用一句话介绍你自己",
            "agent_name": "客服助手",
            "agent_type": "internal",
        },
        headers={"Accept": "application/json"}  # 期望 JSON 响应
    )

    # 如果后端返回的是 SSE，则读取最后一个 data: 行
    content = ""
    for line in chat_resp.iter_lines():
        line = line.decode("utf-8")
        if line.startswith("data: ") and not line.startswith("data: [DONE]"):
            try:
                event = json.loads(line[6:])
                if event.get("content"):
                    content += event["content"]
            except json.JSONDecodeError:
                pass

    print(f"🤖 回复：{content}")
    return session_id


# ============================================================
# 方式三：OpenAI SDK 风格调用（需要安装 openai 包）
# ============================================================

def demo_openai_style():
    """
    用 OpenAI SDK 的方式调用（api_key 随便填，base_url 指向 MeowOne）。
    前提：后端已实现 /v1/chat/completions 兼容端点。
    """
    try:
        from openai import OpenAI
    except ImportError:
        print("⚠️  请先安装 openai 包: pip install openai")
        return

    client = OpenAI(
        api_key="dummy",  # MeowOne 不需要真实 key
        base_url=f"{BASE_URL}/v1",
    )

    # Step 1: 创建会话
    session_resp = requests.post(
        f"{BASE_URL}/api/sessions",
        json={"title": "OpenAI SDK 对话", "agent_name": "客服助手", "agent_type": "internal"}
    )
    session_id = session_resp.json()["id"]

    # Step 2: 通过 extra_query 传递 instance 信息
    response = client.chat.completions.create(
        model="meowone",
        messages=[
            {"role": "system", "content": "你是一个有用的助手"},
            {"role": "user", "content": "你好！"},
        ],
        extra_query={
            "session_id": session_id,
            "agent_name": "客服助手",
            "agent_type": "internal",
        },
        stream=False,
    )

    print("\n" + "=" * 60)
    print("🗣️  OpenAI SDK 风格调用结果")
    print("=" * 60)
    print(f"🤖 回复：{response.choices[0].message.content}")
    print(f"📋 Usage: {response.usage}")


# ============================================================
# 方式四：带调度策略的对话
# ============================================================

def demo_with_strategy(session_id: str):
    """
    指定调度策略（scheduler_mode）和推理模式（loop）来调用。
    """
    print("\n" + "=" * 60)
    print("🗣️  带调度策略的对话")
    print("=" * 60)

    # 支持的 scheduler_mode:
    #   - direct       : 直接调度
    #   - master_slave : 主从协同
    #   - swarm        : 多智能体 swarm
    #   - pipeline     : 流水线
    #   - parallel     : 并行执行
    #   - dag          : DAG 执行

    chat_resp = requests.post(
        f"{BASE_URL}/api/sessions/{session_id}/chat",
        json={
            "content": "请用主从协同模式分析一下今天的天气",
            "agent_name": "客服助手",
            "agent_type": "internal",
            "scheduler_mode": "direct",   # 指定调度策略
            "max_rounds": 5,              # 最大对话轮次
            "timeout_seconds": 60,        # 超时时间（秒）
        },
        stream=True,
        headers={"Accept": "text/event-stream"}
    )

    for line in chat_resp.iter_lines():
        line = line.decode("utf-8")
        if line.startswith("data: "):
            payload = line[6:]
            if payload == "[DONE]":
                break
            try:
                event = json.loads(payload)
                print(event.get("content", ""), end="", flush=True)
            except json.JSONDecodeError:
                pass
    print()


# ============================================================
# 辅助函数：列出所有可用的智能体实例
# ============================================================

def list_available_agents():
    """查询系统中所有可用的智能体（内部 + 外部）"""
    resp = requests.get(f"{BASE_URL}/api/agents")
    data = resp.json()
    print("\n" + "=" * 60)
    print("📋 当前可用的智能体列表")
    print("=" * 60)
    for agent in data.get("agents", []):
        typ = agent.get("agent_type", "unknown")
        name = agent.get("name", "unnamed")
        enabled = "✅" if agent.get("enabled", True) else "❌"
        print(f"  {enabled} [{typ}] {name}")


# ============================================================
# 主函数入口
# ============================================================

if __name__ == "__main__":
    print("=" * 60)
    print("MeowOne Python SDK Demo")
    print("=" * 60)

    # 先查看可用的智能体
    list_available_agents()

    # 方式一：SSE 流式对话（推荐）
    session_id = demo_sse_stream()

    # 方式二：同步轮询（非流式）
    # demo_sync_chat()

    # 方式三：OpenAI SDK 风格
    # demo_openai_style()

    # 方式四：带调度策略
    # demo_with_strategy(session_id)

    print("\n✅ Demo 完成！")
    print(f"会话 ID: {session_id}")
    print(f"查看历史记录: GET {BASE_URL}/api/sessions/{session_id}/messages")
