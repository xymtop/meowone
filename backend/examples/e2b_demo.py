"""E2B 沙箱使用示例."""
from __future__ import annotations

import asyncio
import os

from dotenv import load_dotenv

# 加载 .env 文件中的环境变量
load_dotenv()

from app.sandbox.e2b_sandbox import E2BSandboxImpl

# 检查是否配置了 API Key
if not os.environ.get("E2B_API_KEY"):
    print("请先设置 E2B_API_KEY 环境变量")
    print("1. 注册 E2B 账号: https://e2b.dev/auth/sign-up")
    print("2. 获取 API Key: https://e2b.dev/dashboard?tab=keys")
    print("3. 设置环境变量: export E2B_API_KEY=your_api_key")
    exit(1)


async def basic_example():
    """基础使用示例: 创建沙箱并执行代码."""
    print("=" * 60)
    print("基础示例: 创建沙箱并执行 Python 代码")
    print("=" * 60)

    # 创建沙箱实例
    sandbox = E2BSandboxImpl(metadata={"example": "basic"})

    try:
        # 执行 Python 代码
        print("\n1. 执行 Python 代码:")
        result = await sandbox.run_code("""
import sys
print(f"Python 版本: {sys.version}")
print(f"当前工作目录: {os.getcwd()}")

# 简单计算
numbers = list(range(1, 11))
print(f"1-10 的和: {sum(numbers)}")
        """)

        if result.error:
            print(f"错误: {result.error}")
        else:
            print(result.stdout)

        # 列出文件
        print("\n2. 列出沙箱根目录:")
        files = await sandbox.list_dir("/")
        for f in files:
            print(f"  {'[DIR] ' if f.is_dir else '[FILE]'} {f.name}")

    finally:
        await sandbox.close()
        print("\n沙箱已关闭")


async def file_example():
    """文件操作示例."""
    print("\n" + "=" * 60)
    print("文件操作示例: 读写文件和目录列表")
    print("=" * 60)

    sandbox = E2BSandboxImpl()

    try:
        # 写入文件
        print("\n1. 写入文件:")
        await sandbox.write_file("/tmp/test.txt", "Hello from E2B Sandbox!")
        print("文件 /tmp/test.txt 已创建")

        # 读取文件
        print("\n2. 读取文件:")
        content = await sandbox.read_file("/tmp/test.txt")
        print(f"内容: {content}")

        # 执行命令
        print("\n3. 执行 shell 命令:")
        result = await sandbox.run_command("ls -la /tmp/")
        print(result.stdout if result.stdout else result.stderr or "(无输出)")

    finally:
        await sandbox.close()


async def multi_agent_example():
    """多 Agent 隔离示例: 为每个 Agent 创建独立沙箱."""
    print("\n" + "=" * 60)
    print("多 Agent 示例: 为不同 Agent 创建独立沙箱")
    print("=" * 60)

    agent_ids = ["agent-001", "agent-002", "agent-003"]
    sandboxes = {}

    try:
        # 为每个 Agent 创建独立沙箱
        for agent_id in agent_ids:
            print(f"\n创建 Agent {agent_id} 的沙箱...")
            sandboxes[agent_id] = E2BSandboxImpl(
                metadata={"agent_id": agent_id}
            )

        # 并行执行不同 Agent 的任务
        async def agent_task(agent_id: str, task: str):
            sandbox = sandboxes[agent_id]
            result = await sandbox.run_code(task)
            return agent_id, result.stdout, result.error

        tasks = [
            ("agent-001", 'print("Agent 001: 计算 2^10 =", 2**10)'),
            ("agent-002", 'print("Agent 002: 当前时间戳:", __import__("time").time())'),
            ("agent-003", 'print("Agent 003: 随机数:", __import__("random").random())'),
        ]

        print("\n并行执行各 Agent 任务:")
        results = await asyncio.gather(*[agent_task(*t) for t in tasks])

        for agent_id, output, error in results:
            print(f"\n{agent_id}:")
            print(output if not error else f"错误: {error}")

    finally:
        # 关闭所有沙箱
        for sandbox in sandboxes.values():
            await sandbox.close()
        print("\n所有沙箱已关闭")


async def python_data_analysis_example():
    """Python 数据分析示例: 展示沙箱的 Python 执行能力."""
    print("\n" + "=" * 60)
    print("Python 数据分析示例: 复杂的数据处理任务")
    print("=" * 60)

    sandbox = E2BSandboxImpl()

    try:
        code = """
# 数据处理示例
import json

# 模拟数据
data = [
    {"name": "Alice", "score": 85},
    {"name": "Bob", "score": 92},
    {"name": "Charlie", "score": 78},
    {"name": "David", "score": 95},
]

# 计算统计信息
scores = [d["score"] for d in data]
avg_score = sum(scores) / len(scores)
max_score = max(scores)
min_score = min(scores)

print("=" * 40)
print("数据分析结果")
print("=" * 40)
print(f"参与人数: {len(data)}")
print(f"平均分: {avg_score:.2f}")
print(f"最高分: {max_score}")
print(f"最低分: {min_score}")
print("\n详细信息:")
for d in data:
    print(f"  {d['name']}: {d['score']}分")

# 输出 JSON 格式
print("\nJSON 格式输出:")
print(json.dumps({
    "summary": {
        "count": len(data),
        "avg": round(avg_score, 2),
        "max": max_score,
        "min": min_score,
    },
    "students": data
}, indent=2, ensure_ascii=False))
"""
        result = await sandbox.run_code(code)

        if result.error:
            print(f"错误: {result.error}")
        else:
            print(result.stdout)

    finally:
        await sandbox.close()


async def main():
    """运行所有示例."""
    print("\n" + "=" * 60)
    print("E2B 云端沙箱 Demo")
    print("=" * 60)

    try:
        await basic_example()
        await file_example()
        await multi_agent_example()
        await python_data_analysis_example()

        print("\n" + "=" * 60)
        print("所有示例执行完成!")
        print("=" * 60)

    except Exception as e:
        print(f"\n执行出错: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
