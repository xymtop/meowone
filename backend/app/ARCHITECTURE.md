# Backend Architecture (v2)

## Layers

- `app_factory.py` + `main.py`: app creation and ASGI entrypoint
- `api/`: inbound HTTP adapters (chat, gateway, openai, internal-agents)
- `core/`: runtime container and cross-module wiring
- `bootstrap/`: startup lifecycle and capability registration
- `gateway/`: turn orchestration service + channel adapters
- `loop/`: shared agent loop runtime kernel
- `scheduler/`: scheduler mode selection and execution plan model
- `agents/`: internal subagent factory and invocation runtime
- `capability/`: tool registry + built-in tools + remote A2A wrappers
- `services/`: persistence/business services
- `models/`: request/response DTOs

## Runtime Flow

1. `main.py` imports `create_app()` from `app_factory.py`.
2. `app_factory.py` wires middlewares, routers, and lifespan hooks.
3. API layer receives request and normalizes payload.
4. API delegates to `core.runtime_container.turn_service`.
5. Turn service resolves scheduler mode and emits plan metadata.
6. Scheduler executor chooses direct/master-slave/swarm runtime behavior.
7. Loop runtime executes with selected capabilities and limits.
8. SSE/OpenAI adapters stream standardized events to clients.

## Extension Rules

- Add new scheduler behavior in `scheduler/`, not in API handlers.
- Add startup wiring in `bootstrap/`, keep `main.py` thin.
- Add internal agent behavior in `agents/`, keep tools as façades.
