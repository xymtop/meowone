"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { meowoneApi } from "@/lib/meowone-api";

// ============ 类型定义 ============

type SkillFsFile = {
  path: string;
  name: string;
  size: number;
  is_directory: boolean;
  file_type: string;
};

type SkillDetail = {
  name: string;
  description: string;
  body?: string;
  trigger_keywords: string[];
  category: string;
  version: string;
  examples: string[];
  enabled: boolean;
  source: string;
  file_count: number;
  files: SkillFsFile[];
};

type SkillRecord = {
  name: string;
  description: string;
  enabled: number;
  trigger_keywords: string[];
  category: string;
  examples: string[];
};

type Tab = "all" | "enabled" | "disabled";

const CATEGORY_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  开发辅助: { bg: "bg-blue-50 dark:bg-blue-950/40", text: "text-blue-600", dot: "bg-blue-500" },
  工作流: { bg: "bg-purple-50 dark:bg-purple-950/40", text: "text-purple-600", dot: "bg-purple-500" },
  知识管理: { bg: "bg-amber-50 dark:bg-amber-950/40", text: "text-amber-600", dot: "bg-amber-500" },
  代码审查: { bg: "bg-green-50 dark:bg-green-950/40", text: "text-green-600", dot: "bg-green-500" },
  测试: { bg: "bg-red-50 dark:bg-red-950/40", text: "text-red-600", dot: "bg-red-500" },
  文档: { bg: "bg-cyan-50 dark:bg-cyan-950/40", text: "text-cyan-600", dot: "bg-cyan-500" },
  general: { bg: "bg-gray-50 dark:bg-gray-800", text: "text-gray-500", dot: "bg-gray-400" },
};

function getCategoryColor(category: string) {
  return CATEGORY_COLORS[category] || CATEGORY_COLORS.general;
}

// ============ SVG 图标 ============

function SkillIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg className="size-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  );
}

function FolderIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
    </svg>
  );
}

function FileTextIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
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

function LightningIcon() {
  return (
    <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  );
}

// ============ 主页面 ============

export default function SkillsConfigPage() {
  const [records, setRecords] = useState<SkillRecord[]>([]);
  const [fsData, setFsData] = useState<SkillDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [toggling, setToggling] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [recRes, fsRes] = await Promise.all([
        meowoneApi.listSkills() as Promise<{ count: number; skills: SkillRecord[] }>,
        meowoneApi.listSkillsFs() as Promise<{ count: number; skills: SkillDetail[] }>,
      ]);
      setRecords(recRes.skills || []);
      setFsData(fsRes.skills || []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  // 合并记录数据和 FS 数据
  const allSkills = fsData.map((fs) => {
    const rec = records.find((r) => r.name === fs.name);
    return {
      ...fs,
      enabled: rec ? Boolean(rec.enabled) : fs.enabled,
      trigger_keywords: rec?.trigger_keywords || fs.trigger_keywords || [],
      category: rec?.category || fs.category || "general",
    };
  });

  // 过滤
  const filtered = allSkills.filter((s) => {
    const matchTab = tab === "all" || (tab === "enabled" && s.enabled) || (tab === "disabled" && !s.enabled);
    const matchSearch = !search || s.name.includes(search) || s.description.includes(search) || s.category.includes(search);
    return matchTab && matchSearch;
  });

  const counts = {
    all: allSkills.length,
    enabled: allSkills.filter((s) => s.enabled).length,
    disabled: allSkills.filter((s) => !s.enabled).length,
  };

  const handleToggle = async (skill: SkillDetail) => {
    setToggling(skill.name);
    try {
      await meowoneApi.setSkillEnabled(skill.name, !skill.enabled);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setToggling(null);
    }
  };

  const handleDelete = async (name: string) => {
    if (!confirm(`确定要删除技能「${name}」及其整个目录吗？该操作不可恢复。`)) return;
    setDeleting(name);
    try {
      await meowoneApi.deleteSkill(name);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">技能管理</h1>
          <p className="mt-1 text-sm text-gray-500">
            Agent Skills — 让 AI 根据上下文自动调用相关技能。点击卡片查看详情、文件结构和指令内容。
          </p>
        </div>
        <Link
          href="/meowone/capabilities-skills/create"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:shadow"
        >
          <PlusIcon />
          新建技能
        </Link>
      </div>

      {/* 刷新 + 搜索 + Tab */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => void load()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 dark:border-dark-3 dark:bg-dark-2 dark:hover:bg-dark-3"
          >
            <RefreshIcon />
            刷新
          </button>
        </div>
        <div className="flex items-center gap-3">
          {/* 搜索框 */}
          <div className="relative">
            <SearchIcon />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索技能..."
              className="w-48 rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-4 text-sm dark:border-dark-3 dark:bg-dark"
            />
          </div>
          {/* Tab */}
          <div className="flex rounded-xl border border-gray-200 bg-white p-1 dark:border-dark-3 dark:bg-dark-2">
            {(["all", "enabled", "disabled"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  tab === t
                    ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                }`}
              >
                {t === "all" ? "全部" : t === "enabled" ? "已启用" : "已禁用"}
                <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-xs ${
                  tab === t ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500 dark:bg-dark dark:text-gray-400"
                }`}>
                  {counts[t]}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="size-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          <span className="ml-3 text-gray-500">加载中...</span>
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((skill) => {
            const color = getCategoryColor(skill.category);
            const bodyLines = (skill.body || "").split("\n").filter((l) => l.trim());
            const previewLines = bodyLines.slice(0, 3);

            return (
              <div
                key={skill.name}
                className="group relative flex flex-col rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:border-blue-200 hover:shadow-md dark:border-dark-3 dark:bg-dark-2 dark:hover:border-blue-800"
              >
                {/* 头部 */}
                <div className="flex items-start gap-3">
                  <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${color.bg} ${color.text}`}>
                    <SkillIcon />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900 dark:text-white">{skill.name}</h3>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${color.bg} ${color.text}`}>
                        {skill.category}
                      </span>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                        skill.enabled ? "bg-green-50 text-green-600 dark:bg-green-900/30" : "bg-gray-100 text-gray-400 dark:bg-dark"
                      }`}>
                        <span className={`size-1 rounded-full ${skill.enabled ? "bg-green-500" : "bg-gray-300"}`} />
                        {skill.enabled ? "启用" : "禁用"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-500 line-clamp-2">{skill.description || "暂无描述"}</p>
                  </div>
                </div>

                {/* 指令摘要 */}
                {previewLines.length > 0 && (
                  <div className="mt-3 rounded-xl border border-gray-50 bg-gray-50/80 p-3 dark:border-dark-3 dark:bg-dark">
                    <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-gray-400">
                      <FileTextIcon className="size-3" />
                      指令预览
                    </div>
                    <div className="space-y-0.5">
                      {previewLines.map((line, i) => (
                        <div key={i} className={`text-xs leading-relaxed ${line.startsWith("#") ? "font-semibold text-gray-600 dark:text-gray-300" : line.startsWith("-") || line.startsWith("*") ? "text-gray-500 dark:text-gray-400 pl-2" : "text-gray-500 dark:text-gray-400"} line-clamp-1`}>
                          {line}
                        </div>
                      ))}
                      {bodyLines.length > 3 && (
                        <div className="text-xs text-gray-400 italic">+{bodyLines.length - 3} 行</div>
                      )}
                    </div>
                  </div>
                )}

                {/* 元信息 */}
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-400">
                  {skill.trigger_keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {skill.trigger_keywords.slice(0, 4).map((kw) => (
                        <span key={kw} className="inline-flex items-center gap-0.5 rounded bg-gray-100 px-1.5 py-0.5 dark:bg-dark dark:text-gray-400">
                          <LightningIcon />{kw}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="ml-auto flex items-center gap-1">
                    <FolderIcon />
                    {skill.file_count || skill.files?.length || 0} 个文件
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="mt-4 flex items-center gap-2 border-t border-gray-50 pt-3 dark:border-dark-3">
                  <Link
                    href={`/meowone/capabilities-skills/${encodeURIComponent(skill.name)}/edit`}
                    className="flex-1 rounded-lg border border-gray-200 py-1.5 text-center text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-dark-3 dark:text-gray-300 dark:hover:bg-dark-3"
                  >
                    编辑目录
                  </Link>
                  <button
                    onClick={() => void handleToggle(skill)}
                    disabled={toggling === skill.name}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                      skill.enabled
                        ? "border-red-100 text-red-500 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
                        : "border-green-100 text-green-600 hover:bg-green-50 dark:border-green-800 dark:hover:bg-green-900/20"
                    }`}
                  >
                    {toggling === skill.name ? "..." : skill.enabled ? "禁用" : "启用"}
                  </button>
                  <button
                    onClick={() => void handleDelete(skill.name)}
                    disabled={deleting === skill.name}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-400 transition-colors hover:border-red-200 hover:text-red-500 dark:border-dark-3 dark:hover:border-red-800 dark:hover:text-red-400 disabled:opacity-50"
                  >
                    <TrashIcon />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 py-16 dark:border-dark-3 dark:bg-dark/50">
          <div className={`flex size-16 items-center justify-center rounded-2xl ${CATEGORY_COLORS.general.bg} ${CATEGORY_COLORS.general.text}`}>
            <SkillIcon className="size-8" />
          </div>
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
            {search || tab !== "all" ? "没有符合条件的技能" : "还没有技能"}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {search || tab !== "all" ? "换个关键词或筛选条件试试" : "创建你的第一个 Agent Skill，让 AI 自动调用它"}
          </p>
          {!search && tab === "all" && (
            <Link
              href="/meowone/capabilities-skills/create"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-3 text-sm font-medium text-white"
            >
              <PlusIcon />
              创建第一个技能
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
