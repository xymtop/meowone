from __future__ import annotations

from collections import deque
from datetime import datetime, timezone
from itertools import count
from typing import Any, Deque, Dict, List, Optional

MAX_LOGS = 2000
_counter = count(1)
_logs: Deque[Dict[str, Any]] = deque(maxlen=MAX_LOGS)


def append_log(*, session_id: str, event: str, data: str) -> None:
    _logs.append(
        {
            "id": next(_counter),
            "sessionId": session_id,
            "event": event,
            "data": data,
            "createdAt": datetime.now(timezone.utc).isoformat(),
        }
    )


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
