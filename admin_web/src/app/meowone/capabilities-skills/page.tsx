"use client";

import { useEffect, useState, useCallback } from "react";
import { meowoneApi, type SkillsListResponse } from "@/lib/meowone-api";
import { cn } from "@/lib/utils";

// ============ 图标组件 ============
function PlusIcon() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function ToolIcon() {
  return (
    <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
    </svg>
  );
}

function CodeIcon() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  );
}

function MessageIcon() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}

function CodeFileIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
  );
}

// ============ 类型定义 ============
type SkillFile = {
  path: string;
  name: string;
  size: number;
  is_directory: boolean;
  file_type: string;
};

type Skill = {
  name: string;
  description?: string;
  enabled?: number;
  trigger_keywords?: string[];
  category?: string;
  examples?: string[];
  body?: string;
  files?: SkillFile[];
  file_count?: number;
};

type SkillCategory = "all" | "coding" | "writing" | "analysis" | "tools" | "general";

const CATEGORY_LABELS: Record<SkillCategory, string> = {
  all: "全部",
  coding: "代码",
  writing: "写作",
  analysis: "分析",
  tools: "工具",
  general: "通用",
};

const CATEGORY_COLORS: Record<string, string> = {
  coding: "bg-blue-100 text-blue-700",
  writing: "bg-purple-100 text-purple-700",
  analysis: "bg-green-100 text-green-700",
  tools: "bg-orange-100 text-orange-700",
  general: "bg-gray-100 text-gray-700",
};

// 技能图标映射
const skillIcons: Record<string, React.ReactNode> = {
  code: <CodeIcon />,
  data: <ChartIcon />,
  search: <SearchIcon />,
  chat: <MessageIcon />,
  default: <ToolIcon />,
};

function getFileIcon(fileType: string) {
  switch (fileType) {
    case "py":
    case "sh":
      return <CodeFileIcon />;
    case "md":
    case "txt":
      return <FileIcon />;
    case "asset":
      return <ImageIcon />;
    default:
      return <FileIcon />;
  }
}

function getSkillIcon(name: string): React.ReactNode {
  const lower = name.toLowerCase();
  for (const key of Object.keys(skillIcons)) {
    if (lower.includes(key)) return skillIcons[key];
  }
  return skillIcons.default;
}

const SKILL_STRUCTURE = {
  scripts: "脚本目录 - 存放可执行脚本（如 Python、Bash）",
  references: "参考目录 - 存放文档、API 参考、最佳实践",
  assets: "素材目录 - 存放图片、模板等资源",
  "SKILL.md": "核心文件 - 包含元数据和指令",
};

export default function CapabilitiesSkillsPage() {
  const [data, setData] = useState<SkillsListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<SkillCategory>("all");

  // 查看 Skill 详情
  const [viewingSkill, setViewingSkill] = useState<Skill | null>(null);
  const [skillFiles, setSkillFiles] = useState<SkillFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState("");
  const [fileDirty, setFileDirty] = useState(false);
  const [savingFile, setSavingFile] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(false);

  // 表单状态
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [body, setBody] = useState("");
  const [triggerKeywords, setTriggerKeywords] = useState("");
  const [category, setCategory] = useState("general");
  const [examples, setExamples] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const result = await meowoneApi.listSkills();
      setData(result);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const resetForm = () => {
    setName("");
    setDescription("");
    setBody("");
    setTriggerKeywords("");
    setCategory("general");
    setExamples("");
    setEditingSkill(null);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("请输入技能名称");
      return;
    }

    const keywords = triggerKeywords.split(",").map(k => k.trim()).filter(Boolean);
    const examplesList = examples.split(",").map(e => e.trim()).filter(Boolean);

    try {
      setSaving(true);
      setError("");
      await meowoneApi.upsertSkill({
        name: name.trim(),
        description: description.trim(),
        body: body.trim(),
        trigger_keywords: keywords,
        category,
        examples: examplesList,
      });
      resetForm();
      setShowForm(false);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (skill: Skill) => {
    setName(skill.name);
    setDescription(skill.description || "");
    setBody(skill.body || "");
    setTriggerKeywords((skill.trigger_keywords || []).join(", "));
    setCategory(skill.category || "general");
    setExamples((skill.examples || []).join(", "));
    setEditingSkill(skill);
    setShowForm(true);
  };

  const handleDelete = async (skillName: string) => {
    if (!confirm(`确定要删除技能 "${skillName}" 吗？`)) return;
    try {
      await meowoneApi.deleteSkill(skillName);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleViewSkill = async (skillName: string) => {
    try {
      setLoadingFiles(true);
      const result = await meowoneApi.getSkillFs(skillName);
      setViewingSkill(result.skill as Skill);
      setSkillFiles((result.skill.files as SkillFile[]) || []);
      setSelectedFile(null);
      setFileContent("");
      setFileDirty(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoadingFiles(false);
    }
  };

  const handleSelectFile = async (skillName: string, filePath: string) => {
    if (fileDirty && !confirm("当前文件未保存，确定切换？")) return;
    try {
      const result = await meowoneApi.readSkillFile(skillName, filePath);
      setSelectedFile(filePath);
      setFileContent(result.content);
      setFileDirty(false);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleSaveFile = async () => {
    if (!viewingSkill || !selectedFile) return;
    try {
      setSavingFile(true);
      await meowoneApi.updateSkillFile(viewingSkill.name, selectedFile, fileContent);
      setFileDirty(false);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSavingFile(false);
    }
  };

  const skills = data?.skills || [];

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">技能管理</h1>
          <p className="mt-1 text-sm text-gray-500">为智能体添加特殊能力</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(!showForm);
          }}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl px-5 py-2.5 font-medium transition-all",
            showForm
              ? "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              : "bg-gradient-to-r from-green-500 to-teal-600 text-white hover:from-green-600 hover:to-teal-700"
          )}
        >
          {showForm ? (
            "取消"
          ) : (
            <>
              <PlusIcon /> 添加技能
            </>
          )}
        </button>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* 添加/编辑技能表单 */}
      {showForm && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            {editingSkill ? "编辑技能" : "添加新技能"}
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  技能名称 *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例如：code-editor"
                  disabled={!!editingSkill}
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  分类
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-900 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                >
                  <option value="coding">代码</option>
                  <option value="writing">写作</option>
                  <option value="analysis">分析</option>
                  <option value="tools">工具</option>
                  <option value="general">通用</option>
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                描述 *
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="这个技能做什么，触发场景是什么"
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                触发关键词（逗号分隔）
              </label>
              <input
                type="text"
                value={triggerKeywords}
                onChange={(e) => setTriggerKeywords(e.target.value)}
                placeholder="例如：写代码, 编程, 重构"
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
              />
              <p className="mt-1 text-xs text-gray-500">
                当用户提到这些关键词时，AI 会优先考虑使用此技能
              </p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                使用示例（逗号分隔）
              </label>
              <input
                type="text"
                value={examples}
                onChange={(e) => setExamples(e.target.value)}
                placeholder="例如：帮我写排序算法, 优化代码性能"
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                技能内容（Markdown）
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="用 Markdown 描述这个技能的具体行为..."
                rows={8}
                className="w-full rounded-lg border border-gray-200 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
              />
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={() => {
                resetForm();
                setShowForm(false);
              }}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              取消
            </button>
            <button
              onClick={() => void handleSubmit()}
              disabled={saving}
              className="rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white hover:bg-green-600 disabled:opacity-50"
            >
              {saving ? "保存中..." : editingSkill ? "更新" : "创建"}
            </button>
          </div>
        </div>
      )}

      {/* 加载状态 */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="size-8 animate-spin rounded-full border-2 border-green-500 border-t-transparent" />
          <span className="ml-3 text-gray-500">加载中...</span>
        </div>
      )}

      {/* 技能列表 */}
      {!loading && (
        <>
          {skills.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 py-16">
              <div className="flex size-16 items-center justify-center rounded-full bg-green-50">
                <ToolIcon />
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">还没有配置技能</h3>
              <p className="mt-2 text-sm text-gray-500">
                技能可以增强智能体处理特定任务的能力
              </p>
              <button
                onClick={() => {
                  resetForm();
                  setShowForm(true);
                }}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-green-500 to-teal-600 px-6 py-3 font-medium text-white transition-all hover:from-green-600 hover:to-teal-700"
              >
                <PlusIcon />
                添加第一个技能
              </button>
            </div>
          ) : (
            <>
              {/* 分类筛选 */}
              <div className="mb-4 flex flex-wrap gap-2">
                {(Object.keys(CATEGORY_LABELS) as SkillCategory[]).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={cn(
                      "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                      categoryFilter === cat
                        ? "bg-green-500 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    )}
                  >
                    {CATEGORY_LABELS[cat]}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {skills
                  .filter((skill) => {
                    const s = skill as Skill;
                    return categoryFilter === "all" || s.category === categoryFilter;
                  })
                  .map((skill) => {
                    const s = skill as Skill;
                    const icon = getSkillIcon(s.name);
                    const catColor = CATEGORY_COLORS[s.category || "general"] || CATEGORY_COLORS.general;

                    return (
                      <div
                        key={s.name}
                        className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white transition-all hover:border-green-300 hover:shadow-lg"
                      >
                        <div className="p-5">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="flex size-10 items-center justify-center rounded-lg bg-green-50 text-green-600">
                                {icon}
                              </div>
                              <div>
                                <h3 className="font-semibold text-gray-900">{s.name}</h3>
                                <span className={cn("mt-0.5 inline-block rounded-full px-2 py-0.5 text-xs", catColor)}>
                                  {CATEGORY_LABELS[(s.category as SkillCategory) || "general"]}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* 描述 */}
                          {s.description && (
                            <p className="mt-3 text-sm text-gray-600 line-clamp-2">
                              {s.description}
                            </p>
                          )}

                          {/* 触发关键词 */}
                          {s.trigger_keywords && s.trigger_keywords.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-1">
                              {s.trigger_keywords.slice(0, 3).map((kw, i) => (
                                <span key={i} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                                  {kw}
                                </span>
                              ))}
                              {s.trigger_keywords.length > 3 && (
                                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                                  +{s.trigger_keywords.length - 3}
                                </span>
                              )}
                            </div>
                          )}

                          {/* 示例 */}
                          {s.examples && s.examples.length > 0 && (
                            <div className="mt-3 rounded-lg bg-gray-50 p-2">
                              <p className="mb-1 text-xs text-gray-500">使用示例：</p>
                              <p className="line-clamp-1 text-xs italic text-gray-700">
                                &quot;{s.examples[0]}&quot;
                              </p>
                            </div>
                          )}

                          {/* 操作按钮 */}
                          <div className="mt-4 flex items-center gap-2">
                            <button
                              onClick={() => void handleViewSkill(s.name)}
                              className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 transition-colors hover:border-green-300 hover:bg-green-50 hover:text-green-600"
                            >
                              <FolderIcon />
                              详情
                            </button>
                            <button
                              onClick={() => void handleEdit(s)}
                              className="flex items-center justify-center rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
                            >
                              <EditIcon />
                            </button>
                            <button
                              onClick={() => void handleDelete(s.name)}
                              className="flex items-center justify-center rounded-lg border border-gray-200 p-1.5 text-red-500 transition-colors hover:border-red-200 hover:bg-red-50"
                            >
                              <TrashIcon />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </>
          )}
        </>
      )}

      {/* 提示信息 */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
        <p className="font-medium text-gray-700">关于技能</p>
        <ul className="mt-2 space-y-1">
          <li><strong>触发关键词</strong>：当用户提到这些词时，AI 会自动使用对应技能</li>
          <li><strong>分类</strong>：代码、写作、分析、工具、通用，便于组织管理</li>
          <li><strong>使用示例</strong>：展示技能的典型使用场景</li>
          <li><strong>渐进式加载</strong>：AI 会根据需要动态加载技能内容</li>
          <li><strong>完整目录</strong>：支持 scripts/、references/、assets/ 等子目录</li>
        </ul>
      </div>

      {/* Skill 详情弹窗 */}
      {viewingSkill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="flex w-full max-w-4xl max-h-[90vh] flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
            {/* 弹窗头部 */}
            <div className="flex items-center justify-between border-b p-6">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-green-50 text-green-600">
                  {getSkillIcon(viewingSkill.name)}
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{viewingSkill.name}</h2>
                  <span className={cn(
                    "mt-0.5 inline-block rounded-full px-2 py-0.5 text-xs",
                    CATEGORY_COLORS[viewingSkill.category || "general"] || CATEGORY_COLORS.general
                  )}>
                    {CATEGORY_LABELS[(viewingSkill.category as SkillCategory) || "general"]}
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  if (fileDirty && !confirm("有未保存的修改，确定关闭？")) return;
                  setViewingSkill(null);
                  setSelectedFile(null);
                  setFileContent("");
                  setFileDirty(false);
                }}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 弹窗内容 */}
            <div className="flex flex-1 overflow-hidden">
              {/* 左侧文件列表 */}
              <div className="w-64 overflow-y-auto border-r p-4">
                <h3 className="mb-3 text-sm font-medium text-gray-700">目录结构</h3>
                <div className="space-y-1">
                  {/* SKILL.md 总是显示在顶部 */}
                  <button
                    onClick={() => void handleSelectFile(viewingSkill.name, "SKILL.md")}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                      selectedFile === "SKILL.md"
                        ? "bg-green-100 text-green-700"
                        : "text-gray-600 hover:bg-gray-100"
                    )}
                  >
                    <FileIcon />
                    SKILL.md
                  </button>

                  {/* 目录结构说明 */}
                  <div className="mt-4 mb-2 text-xs text-gray-500">
                    目录结构
                  </div>

                  {/* 显示文件 */}
                  {skillFiles
                    .filter(f => !f.is_directory && f.path !== "SKILL.md")
                    .map((file) => (
                      <button
                        key={file.path}
                        onClick={() => void handleSelectFile(viewingSkill.name, file.path)}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                          selectedFile === file.path
                            ? "bg-green-100 text-green-700"
                            : "text-gray-600 hover:bg-gray-100"
                        )}
                      >
                        {getFileIcon(file.file_type)}
                        <span className="truncate">{file.path}</span>
                      </button>
                    ))}

                  {/* 显示目录 */}
                  {skillFiles
                    .filter(f => f.is_directory)
                    .map((dir) => (
                      <div key={dir.path} className="mt-2">
                        <div className="flex items-center gap-2 px-3 py-1 font-mono text-xs font-medium text-gray-500">
                          <FolderIcon />
                          {dir.path}
                        </div>
                        {skillFiles
                          .filter(f => !f.is_directory && f.path.startsWith(dir.path + "/"))
                          .map((file) => (
                            <button
                              key={file.path}
                              onClick={() => void handleSelectFile(viewingSkill.name, file.path)}
                              className={cn(
                                "flex w-full items-center gap-2 rounded-lg px-3 py-2 pl-6 text-sm transition-colors",
                                selectedFile === file.path
                                  ? "bg-green-100 text-green-700"
                                  : "text-gray-600 hover:bg-gray-100"
                              )}
                            >
                              {getFileIcon(file.file_type)}
                              <span className="truncate">{file.name}</span>
                            </button>
                          ))}
                      </div>
                    ))}
                </div>

                {/* 目录结构说明 */}
                <div className="mt-6 rounded-lg bg-gray-50 p-3 text-xs text-gray-500">
                  <p className="mb-2 font-medium text-gray-600">目录说明：</p>
                  {Object.entries(SKILL_STRUCTURE).map(([key, desc]) => (
                    <p key={key} className="mb-1">• <code className="rounded bg-gray-200 px-1">{key}</code>: {desc}</p>
                  ))}
                </div>
              </div>

              {/* 右侧内容 */}
              <div className="flex flex-1 flex-col overflow-hidden">
                {selectedFile ? (
                  <>
                    <div className="flex items-center justify-between border-b bg-gray-50 px-4 py-3">
                      <span className="font-mono text-sm font-medium text-gray-800">{selectedFile}</span>
                      <div className="flex items-center gap-2">
                        {fileDirty && (
                          <span className="text-xs text-amber-600">未保存</span>
                        )}
                        <button
                          type="button"
                          onClick={() => void handleSaveFile()}
                          disabled={savingFile || !fileDirty}
                          className="rounded-lg bg-green-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-40"
                        >
                          {savingFile ? "保存中…" : "保存"}
                        </button>
                      </div>
                    </div>
                    <div className="flex-1 overflow-auto p-4">
                      <textarea
                        value={fileContent}
                        onChange={(e) => {
                          setFileContent(e.target.value);
                          setFileDirty(true);
                        }}
                        spellCheck={false}
                        className="min-h-[320px] w-full resize-y rounded-lg border border-gray-200 bg-white p-4 font-mono text-sm text-gray-800 shadow-inner focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                      />
                    </div>
                  </>
                ) : (
                  <div className="flex flex-1 items-center justify-center text-gray-400">
                    <p>选择左侧文件进行编辑</p>
                  </div>
                )}
              </div>
            </div>

            {/* 弹窗底部 */}
            <div className="flex items-center justify-between border-t bg-gray-50 p-4">
              <div className="text-sm text-gray-500">
                {viewingSkill.description || "暂无描述"}
              </div>
              <div className="flex gap-2">
                {viewingSkill.trigger_keywords && viewingSkill.trigger_keywords.length > 0 && (
                  <div className="mr-4 flex gap-1">
                    {viewingSkill.trigger_keywords.slice(0, 3).map((kw, i) => (
                      <span key={i} className="rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-600">
                        {kw}
                      </span>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => {
                    if (fileDirty && !confirm("有未保存的修改，确定关闭？")) return;
                    setViewingSkill(null);
                    setSelectedFile(null);
                    setFileContent("");
                    setFileDirty(false);
                  }}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
