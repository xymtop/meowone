"""Services 模块——统一导出所有 service"""
from __future__ import annotations

import app.services.services.agent_service as _ag
import app.services.services.agent_execution_log_service as _ael
import app.services.services.agent_image_service as _ai
import app.services.services.channel_session_service as _css
import app.services.services.log_stream_service as _ls
import app.services.services.mcp_service as _mcp
import app.services.services.menu_service as _menu
import app.services.services.message_service as _msg
import app.services.services.model_service as _mdl
import app.services.services.organization_service as _org
import app.services.services.plugin_service as _plg
import app.services.services.prompt_service as _prm
import app.services.services.scheduled_task_service as _sct
import app.services.services.session_service as _ssn
import app.services.services.skill_fs as _skfs
import app.services.services.skill_service as _sk
import app.services.services.task_executor as _tsk
import app.services.services.team_service as _team
import app.services.services.v3_service as _v3
import app.services.services.workflow_service as _wf

# 直接从 app.services 导入的兼容写法
agent_service = _ag
agent_execution_log_service = _ael
agent_image_service = _ai
channel_session_service = _css
log_stream_service = _ls
mcp_service = _mcp
menu_service = _menu
message_service = _msg
model_service = _mdl
organization_service = _org
plugin_service = _plg
prompt_service = _prm
scheduled_task_service = _sct
session_service = _ssn
skill_fs = _skfs
skill_service = _sk
task_executor = _tsk
team_service = _team
v3_service = _v3
workflow_service = _wf

__all__ = [
    "agent_service",
    "agent_execution_log_service",
    "agent_image_service",
    "channel_session_service",
    "log_stream_service",
    "mcp_service",
    "menu_service",
    "message_service",
    "model_service",
    "organization_service",
    "plugin_service",
    "prompt_service",
    "scheduled_task_service",
    "session_service",
    "skill_fs",
    "skill_service",
    "task_executor",
    "team_service",
    "v3_service",
    "workflow_service",
]
