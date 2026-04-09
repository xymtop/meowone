from __future__ import annotations

import json
import logging
from collections import deque
from datetime import datetime, timezone
from itertools import count
from typing import Any, Deque, Dict, List, Optional

MAX_LOGS = 4000
_counter = count(1)
_logs: Deque[Dict[str, Any]] = deque(maxlen=MAX_LOGS)


def append_log(*, session_id: str, event: str, data: str) -> None:
    _logs.append(
        {
            "id": next(_counter),
            "sessionId": session_id,
            "event": event,
            "data": data,
            "source": "gateway",
            "createdAt": datetime.now(timezone.utc).isoformat(),
        }
    )


def append_app_log(*, level: str, logger_name: str, message: str) -> None:
    """应用日志（与网关 SSE 合并展示）。"""
    payload = json.dumps({"level": level, "logger": logger_name, "message": message}, ensure_ascii=False)
    _logs.append(
        {
            "id": next(_counter),
            "sessionId": "",
            "event": "app",
            "data": payload,
            "source": "app",
            "createdAt": datetime.now(timezone.utc).isoformat(),
        }
    )


class _AppLogHandler(logging.Handler):
    def emit(self, record: logging.LogRecord) -> None:
        try:
            msg = self.format(record)
            append_app_log(level=record.levelname, logger_name=record.name, message=msg)
        except Exception:
            pass


def install_app_log_handler() -> None:
    h = _AppLogHandler()
    h.setLevel(logging.INFO)
    h.setFormatter(logging.Formatter("%(message)s"))
    root = logging.getLogger()
    root.addHandler(h)


def query_logs(*, cursor: int = 0, limit: int = 50, session_id: Optional[str] = None) -> Dict[str, Any]:
    safe_limit = max(1, min(limit, 200))
    items: List[Dict[str, Any]] = []
    for entry in _logs:
        if entry["id"] <= cursor:
            continue
        if session_id and entry["sessionId"] != session_id:
            continue
        items.append(entry)
        if len(items) >= safe_limit:
            break
    next_cursor = items[-1]["id"] if items else cursor
    return {"items": items, "nextCursor": next_cursor}
