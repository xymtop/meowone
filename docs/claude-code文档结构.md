Claude Code 标准 .md 文件清单
1. 根目录核心指令文件
CLAUDE.md
claude.md
2. .claude/ 目录下主配置
.claude/claude.md
.claude/config.md
3. 规则文件（rules/）
.claude/rules/general.md
.claude/rules/coding.md
.claude/rules/testing.md
.claude/rules/docs.md
.claude/rules/style.md
.claude/rules/naming.md
.claude/rules/security.md
.claude/rules/performance.md
.claude/rules/api.md
.claude/rules/database.md
.claude/rules/frontend.md
.claude/rules/backend.md
4. 技能文件（skills/）
每个技能一个文件夹，内部一般是：
.claude/skills/xxx/skill.md
.claude/skills/xxx/checklist.md
常见技能名：
code-review
refactor
debug
security-audit
performance-optimize
test-writing
doc-generate
5. 代理文件（agents/）
.claude/agents/backend.md
.claude/agents/frontend.md
.claude/agents/fullstack.md
.claude/agents/devops.md
.claude/agents/reviewer.md
.claude/agents/architect.md
.claude/agents/debugger.md
6. 输出风格（output-styles/）
.claude/output-styles/concise.md
.claude/output-styles/detailed.md
.claude/output-styles/minimal.md
.claude/output-styles/educational.md
7. 其他常用辅助 MD
AGENTS.md
SKILLS.md
PROMPT.md
INSTRUCTIONS.md
GUIDELINES.md
CHEATSHEET.md
README_CLAUDE.md