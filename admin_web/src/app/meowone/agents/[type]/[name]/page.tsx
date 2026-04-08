"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { meowoneApi } from "@/lib/meowone-api";

function ArrowLeftIcon() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function RobotIcon() {
  return (
    <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
    </svg>
  );
}

function BrainIcon() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
    </svg>
  );
}

function PlugIcon() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
    </svg>
  );
}

function ToolIcon() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
    </svg>
  );
}

type AgentDetail = {
  id: string;
  name: string;
  description?: string;
  agent_type: string;
  mcp_servers?: string[];
  agent_skills?: string[];
  prompt_key?: string;
  system_prompt?: string;
  model_name?: string;
  enabled?: boolean;
};

type ModelItem = { name: string; provider?: string };
type McpItem = { name: string; description?: string };
type SkillItem = { name: string; description?: string };
type PromptItem = { prompt_key: string; name: string; description?: string };

function AgentDetailContent() {
  const router = useRouter();
  const params = useParams();
  const agentType = String(params?.type || "internal");
  const agentName = String(params?.name || "");
  const [agent, setAgent] = useState<AgentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"mcp" | "skills" | "prompt" | "model">("mcp");

  // 资源数据
  const [models, setModels] = useState<ModelItem[]>([]);
  const [mcps, setMcps] = useState<McpItem[]>([]);
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [prompts, setPrompts] = useState<PromptItem[]>([]);

  // 编辑状态
  const [selectedMcp, setSelectedMcp] = useState<string[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedPromptKey, setSelectedPromptKey] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [useCustomPrompt, setUseCustomPrompt] = useState(false);

  const loadData = useCallback(async () => {
    if (!agentType || !agentName) {
      setError("缺少智能体类型或名称");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const [detailRes, modelsRes, mcpsRes, skillsRes, promptsRes] = await Promise.all([
        meowoneApi.getAgentDetail(agentType, agentName),
        meowoneApi.listModels(),
        meowoneApi.listMcp(),
        meowoneApi.listSkills(),
        meowoneApi.listPrompts(),
      ]);

      const agentData = detailRes as unknown as AgentDetail;
      setAgent(agentData);

      // 设置当前配置
      setSelectedMcp(agentData.mcp_servers || []);
      setSelectedSkills(agentData.agent_skills || []);
      setSelectedPromptKey(agentData.prompt_key || "");
      setCustomPrompt(agentData.system_prompt || "");
      setSelectedModel(agentData.model_name || "");

      if (agentData.system_prompt && !agentData.prompt_key) {
        setUseCustomPrompt(true);
      }

      // 设置资源列表
      setModels((modelsRes.models || []) as ModelItem[]);
      setMcps((mcpsRes.servers || []) as McpItem[]);
      setSkills((skillsRes.skills || []) as SkillItem[]);
      setPrompts((promptsRes.prompts || []) as PromptItem[]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [agentType, agentName]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleSave = async () => {
    if (!agent) return;

    try {
      setSaving(true);
      setError("");

      const systemPrompt = useCustomPrompt ? customPrompt : undefined;
      const promptKeyToSave = !useCustomPrompt && selectedPromptKey ? selectedPromptKey : undefined;

      if (agent.agent_type === "external") {
        await meowoneApi.upsertExternalAgent({
          name: agent.name,
          description: agent.description || "",
          mcp_servers: selectedMcp,
          agent_skills: selectedSkills,
          prompt_key: promptKeyToSave || "",
          model_name: selectedModel,
          enabled: agent.enabled,
        });
      } else {
        await meowoneApi.upsertInternalAgent({
          name: agent.name,
          description: agent.description || "",
          agent_type: agent.agent_type,
          system_prompt: systemPrompt,
          prompt_key: promptKeyToSave || "",
          mcp_servers: selectedMcp,
          agent_skills: selectedSkills,
          model_name: selectedModel,
          enabled: agent.enabled,
        });
      }

      await loadData();
      alert("保存成功！");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const toggleMcp = (name: string) => {
    setSelectedMcp((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  const toggleSkill = (name: string) => {
    setSelectedSkills((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="size-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        <span className="ml-3 text-gray-500">加载中...</span>
      </div>
    );
  }

  if (error && !agent) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
        <Link href="/meowone/agents" className="text-blue-500 hover:underline">
          返回智能体列表
        </Link>
      </div>
    );
  }

  if (!agent) return null;

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/meowone/agents" className="text-gray-500 hover:text-gray-700">
            <ArrowLeftIcon />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{agent.name}</h1>
            <p className="mt-1 text-sm text-gray-500">
              {agent.description || `${agent.agent_type} 类型智能体`}
            </p>
          </div>
        </div>
        <button
          onClick={() => void handleSave()}
          disabled={saving}
          className="rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 px-5 py-2.5 font-medium text-white disabled:opacity-50"
        >
          {saving ? "保存中..." : "保存修改"}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Tab 切换 */}
      <div className="flex gap-1 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("mcp")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === "mcp"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <PlugIcon />
          MCP 服务
          {selectedMcp.length > 0 && (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-600">
              {selectedMcp.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("skills")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === "skills"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <ToolIcon />
          技能
          {selectedSkills.length > 0 && (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-600">
              {selectedSkills.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("prompt")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === "prompt"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <StarIcon />
          提示词
        </button>
        <button
          onClick={() => setActiveTab("model")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === "model"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <BrainIcon />
          模型
        </button>
      </div>

      {/* Tab 内容 */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
        {/* MCP 服务 */}
        {activeTab === "mcp" && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium">MCP 服务</h3>
                <p className="mt-1 text-sm text-gray-500">选择该智能体可用的 MCP 服务</p>
              </div>
              <span className="rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-600">
                已选择 {selectedMcp.length} 个
              </span>
            </div>
            {mcps.length === 0 ? (
              <div className="rounded-lg border-2 border-dashed border-gray-200 p-8 text-center">
                <p className="text-gray-500">暂无可用 MCP 服务</p>
                <Link href="/meowone/capabilities-mcp" className="mt-2 inline-block text-blue-500 hover:underline">
                  添加 MCP 服务
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {mcps.map((mcp) => {
                  const isSelected = selectedMcp.includes(mcp.name);
                  return (
                    <button
                      key={mcp.name}
                      onClick={() => toggleMcp(mcp.name)}
                      className={`flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-all ${
                        isSelected ? "border-blue-500 bg-blue-50" : "border-gray-100 bg-gray-50 hover:border-gray-200"
                      }`}
                    >
                      <div className={`mt-1 rounded-lg p-2 ${isSelected ? "bg-blue-500 text-white" : "bg-white text-gray-600"}`}>
                        <PlugIcon />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{mcp.name}</p>
                          {isSelected && (
                            <div className="flex size-5 items-center justify-center rounded-full bg-blue-500 text-white">
                              <CheckIcon />
                            </div>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-gray-500">{mcp.description || "暂无描述"}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 技能 */}
        {activeTab === "skills" && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium">技能</h3>
                <p className="mt-1 text-sm text-gray-500">选择该智能体可用的技能</p>
              </div>
              <span className="rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-600">
                已选择 {selectedSkills.length} 个
              </span>
            </div>
            {skills.length === 0 ? (
              <div className="rounded-lg border-2 border-dashed border-gray-200 p-8 text-center">
                <p className="text-gray-500">暂无可用技能</p>
                <Link href="/meowone/capabilities-skills" className="mt-2 inline-block text-blue-500 hover:underline">
                  添加技能
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {skills.map((skill) => {
                  const isSelected = selectedSkills.includes(skill.name);
                  return (
                    <button
                      key={skill.name}
                      onClick={() => toggleSkill(skill.name)}
                      className={`flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-all ${
                        isSelected ? "border-blue-500 bg-blue-50" : "border-gray-100 bg-gray-50 hover:border-gray-200"
                      }`}
                    >
                      <div className={`mt-1 rounded-lg p-2 ${isSelected ? "bg-blue-500 text-white" : "bg-white text-gray-600"}`}>
                        <ToolIcon />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{skill.name}</p>
                          {isSelected && (
                            <div className="flex size-5 items-center justify-center rounded-full bg-blue-500 text-white">
                              <CheckIcon />
                            </div>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-gray-500">{skill.description || "暂无描述"}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 提示词 */}
        {activeTab === "prompt" && (
          <div>
            <div className="mb-4">
              <h3 className="text-lg font-medium">提示词</h3>
              <p className="mt-1 text-sm text-gray-500">选择预设模板或编写自定义提示词</p>
            </div>

            <div className="mb-4 flex gap-2 border-b border-gray-200 pb-2">
              <button
                onClick={() => setUseCustomPrompt(false)}
                className={`px-3 py-1.5 text-sm transition-colors ${
                  !useCustomPrompt ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500"
                }`}
              >
                从模板选择
              </button>
              <button
                onClick={() => setUseCustomPrompt(true)}
                className={`px-3 py-1.5 text-sm transition-colors ${
                  useCustomPrompt ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500"
                }`}
              >
                自定义编写
              </button>
            </div>

            {!useCustomPrompt && (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {prompts.map((prompt) => {
                  const isSelected = selectedPromptKey === prompt.prompt_key;
                  return (
                    <button
                      key={prompt.prompt_key}
                      onClick={() => setSelectedPromptKey(prompt.prompt_key)}
                      className={`flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-all ${
                        isSelected ? "border-blue-500 bg-blue-50" : "border-gray-100 bg-gray-50 hover:border-gray-200"
                      }`}
                    >
                      <div className={`mt-1 rounded-lg p-2 ${isSelected ? "bg-blue-500 text-white" : "bg-white text-gray-600"}`}>
                        <StarIcon />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{prompt.name}</p>
                          {isSelected && (
                            <div className="flex size-5 items-center justify-center rounded-full bg-blue-500 text-white">
                              <CheckIcon />
                            </div>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-gray-500">{prompt.description || "暂无描述"}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {useCustomPrompt && (
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="输入系统提示词，告诉智能体它是谁、擅长什么..."
                rows={10}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-dark-3 dark:bg-dark"
              />
            )}
          </div>
        )}

        {/* 模型 */}
        {activeTab === "model" && (
          <div>
            <div className="mb-4">
              <h3 className="text-lg font-medium">模型</h3>
              <p className="mt-1 text-sm text-gray-500">选择该智能体使用的大语言模型</p>
            </div>
            {models.length === 0 ? (
              <div className="rounded-lg border-2 border-dashed border-gray-200 p-8 text-center">
                <p className="text-gray-500">暂无可用模型</p>
                <Link href="/meowone/models" className="mt-2 inline-block text-blue-500 hover:underline">
                  添加模型
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {models.map((model) => {
                  const isSelected = selectedModel === model.name;
                  return (
                    <button
                      key={model.name}
                      onClick={() => setSelectedModel(model.name)}
                      className={`flex w-full items-center justify-between rounded-xl border-2 p-4 text-left transition-all ${
                        isSelected ? "border-blue-500 bg-blue-50" : "border-gray-100 bg-gray-50 hover:border-gray-200"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`rounded-lg p-2 ${isSelected ? "bg-blue-500 text-white" : "bg-white text-gray-600"}`}>
                          <BrainIcon />
                        </div>
                        <div>
                          <p className="font-medium">{model.name}</p>
                          <p className="text-sm text-gray-500">{model.provider || "openai-compatible"}</p>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="flex size-6 items-center justify-center rounded-full bg-blue-500 text-white">
                          <CheckIcon />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 底部保存按钮 */}
      <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-6 dark:border-dark-3">
        <Link
          href="/meowone/agents"
          className="rounded-lg border border-gray-200 px-6 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-dark-3 dark:text-gray-300"
        >
          取消
        </Link>
        <button
          onClick={() => void handleSave()}
          disabled={saving}
          className="rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving ? "保存中..." : "保存修改"}
        </button>
      </div>
    </div>
  );
}

export default function AgentDetailPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-12">
        <div className="size-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        <span className="ml-3 text-gray-500">加载中...</span>
      </div>
    }>
      <AgentDetailContent />
    </Suspense>
  );
}
