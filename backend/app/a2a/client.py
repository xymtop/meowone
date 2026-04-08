"""A2A protocol client and Agent Card discovery."""
from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


@dataclass
class AgentSkill:
    id: str
    name: str
    description: str


@dataclass
class AgentCard:
    name: str
    description: str
    url: str
    version: str = "1.0.0"
    capabilities: Dict[str, bool] = None
    skills: List[AgentSkill] = None
    authentication: Optional[str] = None
    icon: Optional[str] = None

    def __post_init__(self):
        if self.capabilities is None:
            self.capabilities = {}
        if self.skills is None:
            self.skills = []

    @classmethod
    def from_dict(cls, data: Dict[str, Any], base_url: str) -> "AgentCard":
        skills = []
        for s in data.get("skills", []):
            if isinstance(s, dict):
                skills.append(AgentSkill(
                    id=s.get("id", ""),
                    name=s.get("name", ""),
                    description=s.get("description", ""),
                ))

        return cls(
            name=data.get("name", "Unknown"),
            description=data.get("description", ""),
            url=base_url,
            version=data.get("version", "1.0.0"),
            capabilities=data.get("capabilities", {}),
            skills=skills,
            authentication=data.get("authentication"),
            icon=data.get("icon"),
        )


async def discover_agent_card(base_url: str, timeout: float = 10.0) -> Optional[AgentCard]:
    """
    Discover an Agent Card from a remote A2A agent server.
    
    Tries multiple well-known paths:
    1. /.well-known/agent.json (standard)
    2. /agent-card.json
    3. /agent.json
    """
    try:
        import httpx
    except ImportError:
        logger.warning("httpx not installed, cannot discover A2A agents")
        return None

    paths_to_try = [
        f"{base_url.rstrip('/')}/.well-known/agent.json",
        f"{base_url.rstrip('/')}/agent-card.json",
        f"{base_url.rstrip('/')}/agent.json",
    ]

    async with httpx.AsyncClient(timeout=timeout) as client:
        for card_url in paths_to_try:
            try:
                response = await client.get(card_url)
                if response.status_code == 200:
                    data = response.json()
                    logger.info("Found Agent Card at %s", card_url)
                    return AgentCard.from_dict(data, base_url)
            except (httpx.ConnectError, httpx.TimeoutException, json.JSONDecodeError) as e:
                logger.debug("Failed to fetch Agent Card from %s: %s", card_url, e)
                continue

    logger.warning("No Agent Card found at %s", base_url)
    return None


async def send_a2a_message(
    base_url: str,
    message: Dict[str, Any],
    auth_token: Optional[str] = None,
    timeout: float = 60.0,
) -> Dict[str, Any]:
    """
    Send an A2A message to a remote agent.
    
    Args:
        base_url: The A2A agent endpoint URL
        message: The JSON-RPC message to send
        auth_token: Optional authentication token
        timeout: Request timeout in seconds
    
    Returns:
        The JSON-RPC response from the agent
    """
    try:
        import httpx
    except ImportError:
        raise RuntimeError("httpx is required for A2A communication. Install with: pip install httpx")

    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream",
    }

    if auth_token:
        headers["Authorization"] = f"Bearer {auth_token}"

    async with httpx.AsyncClient(timeout=timeout) as client:
        try:
            response = await client.post(
                base_url,
                json=message,
                headers=headers,
            )

            if response.status_code != 200:
                raise RuntimeError(
                    f"A2A request failed with status {response.status_code}: {response.text}"
                )

            content_type = response.headers.get("content-type", "")

            if "text/event-stream" in content_type:
                return await _parse_sse_response(response.text)
            else:
                return response.json()

        except httpx.ConnectError as e:
            raise RuntimeError(f"Failed to connect to A2A agent at {base_url}: {e}")
        except httpx.TimeoutException as e:
            raise RuntimeError(f"A2A request timed out after {timeout}s: {e}")


async def _parse_sse_response(text: str) -> Dict[str, Any]:
    """Parse Server-Sent Events response."""
    result = None
    current_event = ""
    current_data = ""

    for line in text.split("\n"):
        line = line.rstrip("\r")
        if not line:
            continue

        if line.startswith("event: "):
            current_event = line[7:].strip()
        elif line.startswith("data: "):
            current_data = line[6:].strip()
        elif line == "" and current_event and current_data:
            try:
                data_obj = json.loads(current_data)
                if isinstance(data_obj, dict):
                    if "result" in data_obj:
                        result = data_obj["result"]
                    elif "error" in data_obj:
                        raise RuntimeError(f"A2A error: {data_obj['error']}")
            except json.JSONDecodeError:
                pass
            current_event = ""
            current_data = ""

    if result is None:
        raise RuntimeError("No result received from A2A agent")

    return result


def build_a2a_task_request(
    session_id: str,
    message: str,
    task_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Build a standard A2A task request."""
    import uuid

    return {
        "jsonrpc": "2.0",
        "id": str(uuid.uuid4()),
        "method": "tasks/send",
        "params": {
            "id": task_id or str(uuid.uuid4()),
            "sessionId": session_id,
            "message": {
                "role": "user",
                "parts": [{"type": "text", "text": message}],
            },
        },
    }
