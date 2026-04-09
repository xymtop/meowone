"""
API 路由聚合

将所有子路由挂载到主路由树上，保持与原 backend 完全相同的路径。
"""
from __future__ import annotations

import app.api.agents as _ag
import app.api.sessions as _ss
import app.api.messages as _ms
import app.api.chat as _chat
import app.api.prompt_management as _pr
import app.api.model_management as _mm
import app.api.scheduled_tasks as _st
import app.api.workflows as _wf
import app.api.v3 as _v3
import app.api.v3_images as _v3i
import app.api.menu_management as _menu
import app.api.capability_management as _cap
import app.api.openai as _openai
import app.api.agent_executions as _ae
import app.api.internal_agents as _ia
import app.api.meowone_config as _cfg
import app.api.tasks as _ts
import app.api.gateway as _gw


def include_api_routers(app):
    app.include_router(_ag.router)
    app.include_router(_ss.router)
    app.include_router(_ms.router)
    app.include_router(_chat.router)
    app.include_router(_pr.router)
    app.include_router(_mm.router)
    app.include_router(_st.router)
    app.include_router(_wf.router)
    app.include_router(_v3.router)
    app.include_router(_v3i.router)
    app.include_router(_menu.router)
    app.include_router(_cap.router)
    app.include_router(_openai.router)
    app.include_router(_ae.router)
    app.include_router(_ia.router)
    app.include_router(_cfg.router)
    app.include_router(_ts.router)
    app.include_router(_gw.router)


# 兼容引用
api_router = _ag.router
