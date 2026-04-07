import json
import time

import requests


BASE_URL = "http://localhost:8000"
URL = f"{BASE_URL}/v1/chat/completions"


def test_non_stream() -> None:
    print("=== 非流式返回 ===")
    payload = {
        "model": "gpt-4o",
        "stream": False,
        "messages": [
            {"role": "user", "content": "用一两句话介绍一下 MeowOne SDK 是干嘛的？"},
        ],
        "user": "local-test",
    }
    resp = requests.post(URL, json=payload, timeout=60)
    print("HTTP status:", resp.status_code)
    print("raw json:")
    print(resp.text)
    try:
        data = resp.json()
        print("\nassistant content:")
        print(data["choices"][0]["message"]["content"])
    except Exception as exc:  # pragma: no cover - simple script
        print("parse json error:", exc)


def test_stream() -> None:
    print("\n=== 流式返回（SSE） ===")
    payload = {
        "model": "gpt-4o",
        "stream": True,
        "messages": [
            {"role": "user", "content": "用中文简单介绍一下 MeowOne 的架构。"},
        ],
        "user": "local-test",
    }
    with requests.post(
        URL,
        json=payload,
        stream=True,
        timeout=120,
        headers={"Accept": "text/event-stream"},
    ) as resp:
        print("HTTP status:", resp.status_code)
        print("---- 原始 SSE 行 ----")
        full_text: list[str] = []
        for line in resp.iter_lines(decode_unicode=True):
            if not line:
                continue
            print(line)
            if line.startswith("data: "):
                data_str = line[6:]
                if data_str.strip() == "[DONE]":
                    break
                try:
                    chunk = json.loads(data_str)
                except Exception:
                    continue
                choices = chunk.get("choices") or []
                if choices:
                    delta = choices[0].get("delta") or {}
                    content = delta.get("content")
                    if content:
                        full_text.append(content)
        print("\n---- 拼接后的 assistant 文本 ----")
        print("".join(full_text))


if __name__ == "__main__":
    test_non_stream()
    time.sleep(1)
    test_stream()
