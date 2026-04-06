# MeowOne local configuration

Place **agent skills**, **MCP**, **context docs**, and **remote A2A agents** here (standard layout).

- `agents.yaml` — remote A2A tools (`tool_name`, `description`, `base_url`)
- `mcp.yaml` — MCP stdio servers; invoke via backend tools `list_mcp_tools` / `call_mcp_tool`
- `skills/<skill-id>/SKILL.md` — [Agent Skills](https://agentskills.io/) style (YAML frontmatter + body)
- `context/**/*.md` — optional long-form reference for the system prompt

Override directory with env `MEOWONE_CONFIG_DIR` if needed.
