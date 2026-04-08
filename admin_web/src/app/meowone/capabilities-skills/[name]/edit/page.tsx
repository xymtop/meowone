"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { meowoneApi } from "@/lib/meowone-api";
import { bodyAfterFrontmatter } from "@/lib/skill-directory";

type SkillFile = {
  path: string;
  name: string;
  size: number;
  is_directory: boolean;
  file_type: string;
};

const CATEGORIES = ["开发辅助", "工作流", "知识管理", "代码审查", "测试", "文档", "general"] as const;
const CATEGORY_STYLE: Record<string, { bg: string; text: string; dot: string }> = {
  开发辅助: { bg: "bg-blue-50 dark:bg-blue-950/40", text: "text-blue-600", dot: "bg-blue-500" },
  工作流: { bg: "bg-purple-50 dark:bg-purple-950/40", text: "text-purple-600", dot: "bg-purple-500" },
  知识管理: { bg: "bg-amber-50 dark:bg-amber-950/40", text: "text-amber-600", dot: "bg-amber-500" },
  代码审查: { bg: "bg-green-50 dark:bg-green-950/40", text: "text-green-600", dot: "bg-green-500" },
  测试: { bg: "bg-red-50 dark:bg-red-950/40", text: "text-red-600", dot: "bg-red-500" },
  文档: { bg: "bg-cyan-50 dark:bg-cyan-950/40", text: "text-cyan-600", dot: "bg-cyan-500" },
  general: { bg: "bg-gray-50 dark:bg-gray-800", text: "text-gray-500", dot: "bg-gray-400" },
};
function catStyle(c: string) {
  return CATEGORY_STYLE[c] || CATEGORY_STYLE.general;
}

function FileIcon({ type, name }: { type: string; name: string }) {
  if (type === "folder") return (
    <svg className="size-4 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
    </svg>
  );
  if (type === "md") return <span className="font-mono text-[10px] font-bold text-blue-400">MD</span>;
  if (type === "py") return <span className="font-mono text-[10px] font-bold text-yellow-500">PY</span>;
  if (type === "sh") return <span className="font-mono text-[10px] font-bold text-green-500">SH</span>;
  if (type === "json") return <span className="font-mono text-[10px] font-bold text-orange-400">JSON</span>;
  return <span className="font-mono text-[10px] text-gray-400">{name.split(".").pop()?.toUpperCase()}</span>;
}

function FolderOpenIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 19.5A2.25 2.25 0 017.25 17h9.5A2.25 2.25 0 0119 19.5V8.25a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 8.25v.265m9-5.25V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v11.25a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25V14.5a2.25 2.25 0 00-2.25-2.25H9.75" />
    </svg>
  );
}

function FolderClosedIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
    </svg>
  );
}

export default function EditSkillDirectoryPage() {
  const router = useRouter();
  const params = useParams();
  const skillName = decodeURIComponent(String(params?.name || ""));

  const [skill, setSkill] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // 元数据表单
  const [name, setName] = useState("");
  const [category, setCategory] = useState("general");
  const [description, setDescription] = useState("");
  const [trigger, setTrigger] = useState("");
  const [examples, setExamples] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [version, setVersion] = useState("1.0.0");
  const [metaDirty, setMetaDirty] = useState(false);
  const [savingMeta, setSavingMeta] = useState(false);
  const [metaSuccess, setMetaSuccess] = useState(false);

  // 文件相关
  const [files, setFiles] = useState<SkillFile[]>([]);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState("");
  const [fileDirty, setFileDirty] = useState(false);
  const [loadingFile, setLoadingFile] = useState(false);
  const [savingFile, setSavingFile] = useState(false);
  const [saveFileSuccess, setSaveFileSuccess] = useState(false);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set(["scripts", "references", "assets"]));
  const [newFileName, setNewFileName] = useState("");
  const [showNewFile, setShowNewFile] = useState(false);

  const loadSkill = useCallback(async () => {
    if (!skillName) return;
    setLoading(true);
    setError("");
    try {
      const res = await meowoneApi.getSkillFs(skillName) as { found: boolean; skill: Record<string, unknown> };
      if (!res.found || !res.skill) {
        setError(`技能「${skillName}」不存在`);
        return;
      }
      const s = res.skill;
      setSkill(s);
      setName(String(s.name || skillName));
      setCategory(String(s.category || "general"));
      setDescription(String(s.description || ""));
      setTrigger(Array.isArray(s.trigger_keywords) ? (s.trigger_keywords as string[]).join(", ") : "");
      setExamples(Array.isArray(s.examples) ? (s.examples as string[]).join(", ") : "");
      setEnabled(Boolean(s.enabled));
      setVersion(String(s.version || "1.0.0"));
      const fList = (s.files || []) as SkillFile[];
      setFiles(fList);
      // 默认打开 SKILL.md
      const md = fList.find((f: SkillFile) => f.path === "SKILL.md");
      if (md) {
        setActiveFile("SKILL.md");
        await loadFileContent("SKILL.md");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [skillName]);

  useEffect(() => { void loadSkill(); }, [loadSkill]);

  const loadFileContent = async (path: string) => {
    setLoadingFile(true);
    setSaveFileSuccess(false);
    try {
      const res = await meowoneApi.readSkillFile(skillName, path) as { content: string };
      setFileContent(res.content);
    } catch {
      setFileContent("// 读取失败");
    } finally {
      setLoadingFile(false);
    }
  };

  const handleFileSelect = (path: string) => {
    if (fileDirty) {
      if (!confirm("当前文件有未保存的更改，确定切换？")) return;
    }
    setActiveFile(path);
    setFileDirty(false);
    void loadFileContent(path);
  };

  const handleSaveFile = async () => {
    if (!activeFile) return;
    setSavingFile(true);
    try {
      await meowoneApi.updateSkillFile(skillName, activeFile, fileContent);
      setFileDirty(false);
      setSaveFileSuccess(true);
      setTimeout(() => setSaveFileSuccess(false), 2000);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSavingFile(false);
    }
  };

  const handleSaveMeta = async () => {
    if (!description.trim()) { setError("描述必填"); return; }
    setSavingMeta(true);
    setError("");
    try {
      const keywords = trigger.split(",").map((k) => k.trim()).filter(Boolean);
      const ex = examples.split(",").map((e) => e.trim()).filter(Boolean);
      await meowoneApi.upsertSkill({
        name: skillName,
        description: description.trim(),
        body: "",
        category,
        trigger_keywords: keywords,
        examples: ex,
        version,
        enabled: enabled ? 1 : 0,
      });
      setMetaDirty(false);
      setMetaSuccess(true);
      setTimeout(() => setMetaSuccess(false), 2000);
      await loadSkill();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSavingMeta(false);
    }
  };

  const handleNewFile = async () => {
    const fn = newFileName.trim();
    if (!fn) return;
    const safe = fn.startsWith("scripts/") || fn.startsWith("references/") || fn.startsWith("assets/") ? fn : `scripts/${fn}`;
    setSavingFile(true);
    try {
      await meowoneApi.updateSkillFile(skillName, safe, "");
      setNewFileName("");
      setShowNewFile(false);
      await loadSkill();
      setActiveFile(safe);
      setFileContent("");
      setFileDirty(false);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSavingFile(false);
    }
  };

  const handleDeleteFile = async (path: string) => {
    if (!confirm(`删除文件「${path}」？`)) return;
    try {
      // updateSkillFile with empty content? No — we need a delete API.
      // For now, just warn.
      alert("暂不支持删除文件（需后端支持）");
    } catch (e) {
      alert((e as Error).message);
    }
  };

  // 文件树按目录分组
  const rootFiles = files.filter((f) => !f.path.includes("/"));
  const subDirs = [...new Set(files.filter((f) => f.path.includes("/")).map((f) => f.path.split("/")[0]))];
  const grouped = (dir: string) => files.filter((f) => f.path.startsWith(dir + "/") && !f.path.slice(dir.length + 1).includes("/"));

  const toggleDir = (dir: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(dir)) next.delete(dir);
      else next.add(dir);
      return next;
    });
  };

  const handleCtrlS = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      if (fileDirty) void handleSaveFile();
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        <span className="ml-3 text-gray-500">加载技能中…</span>
      </div>
    );
  }

  if (error || !skill) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="mb-4 text-red-500">{error || "技能不存在"}</p>
        <Link href="/meowone/capabilities-skills" className="text-blue-600 hover:underline">返回列表</Link>
      </div>
    );
  }

  const fileExt = activeFile?.split(".").pop() || "";
  const isMarkdown = fileExt === "md";
  const isCode = ["py", "sh", "json", "js", "ts", "yaml", "yml", "txt"].includes(fileExt);

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-0 rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-dark-3 dark:bg-dark-2 overflow-hidden">
      {/* 顶部工具栏 */}
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3 dark:border-dark-3 shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href="/meowone/capabilities-skills"
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-50 dark:border-dark-3 dark:hover:bg-dark-3"
          >
            <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            技能管理
          </Link>
          <span className="text-gray-300 dark:text-gray-600">/</span>
          <span className="font-semibold text-gray-900 dark:text-white">{name}</span>
          {fileDirty && <span className="size-2 rounded-full bg-amber-400" title="文件有未保存的更改" />}
          {saveFileSuccess && <span className="text-xs text-green-600 font-medium">已保存</span>}
        </div>
        <div className="flex items-center gap-2">
          {activeFile && fileDirty && (
            <button
              onClick={() => void handleSaveFile()}
              disabled={savingFile}
              className="rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
            >
              {savingFile ? "保存中…" : "保存文件"}
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* 左侧：文件树 */}
        <div className="w-56 shrink-0 overflow-y-auto border-r border-gray-100 bg-gray-50/60 p-3 dark:border-dark-3 dark:bg-dark/50">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">文件结构</span>
            <button
              onClick={() => setShowNewFile((v) => !v)}
              className="rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-dark-3"
              title="新建文件"
            >
              <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </button>
          </div>

          {showNewFile && (
            <div className="mb-2 flex items-center gap-1 px-1">
              <input
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void handleNewFile(); if (e.key === "Escape") setShowNewFile(false); }}
                placeholder="scripts/new.py"
                className="flex-1 rounded border border-gray-200 bg-white px-2 py-1 text-xs dark:border-dark-3 dark:bg-dark"
                autoFocus
              />
              <button onClick={() => void handleNewFile()} className="rounded p-0.5 text-blue-500">
                <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </button>
              <button onClick={() => setShowNewFile(false)} className="rounded p-0.5 text-gray-400">
                <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* 根级文件 */}
          {rootFiles.map((f) => (
            <button
              key={f.path}
              onClick={() => void handleFileSelect(f.path)}
              className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors ${
                activeFile === f.path
                  ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30"
                  : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-dark-3"
              }`}
            >
              <FileIcon type={f.file_type} name={f.name} />
              <span className="truncate">{f.name}</span>
            </button>
          ))}

          {/* 目录 */}
          {subDirs.map((dir) => (
            <div key={dir}>
              <button
                onClick={() => toggleDir(dir)}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-dark-3"
              >
                {expandedDirs.has(dir) ? (
                  <FolderOpenIcon />
                ) : (
                  <FolderClosedIcon />
                )}
                <span>{dir}/</span>
              </button>
              {expandedDirs.has(dir) && (
                <div className="ml-4">
                  {grouped(dir).map((f) => (
                    <div key={f.path} className="flex items-center group">
                      <button
                        onClick={() => void handleFileSelect(f.path)}
                        className={`flex flex-1 items-center gap-2 rounded-lg px-2 py-1 text-sm transition-colors ${
                          activeFile === f.path
                            ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30"
                            : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-dark-3"
                        }`}
                      >
                        <FileIcon type={f.file_type} name={f.name} />
                        <span className="truncate">{f.name}</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 中间：编辑器 */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {activeFile ? (
            <>
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-2 dark:border-dark-3 shrink-0">
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <FileIcon type={activeFile.split(".").pop() || ""} name={activeFile} />
                  <span className="font-mono">{activeFile}</span>
                  {fileDirty && <span className="text-amber-500">· 已修改</span>}
                  {!fileDirty && <span className="text-green-500">· 已保存</span>}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  {isMarkdown && <span className="rounded bg-blue-100 px-1.5 py-0.5 text-blue-600">Markdown</span>}
                  {isCode && <span className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-600 dark:bg-dark dark:text-gray-400">代码</span>}
                  <span>Ctrl+S 保存</span>
                </div>
              </div>
              {loadingFile ? (
                <div className="flex flex-1 items-center justify-center">
                  <div className="size-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                </div>
              ) : (
                <textarea
                  value={fileContent}
                  onChange={(e) => { setFileContent(e.target.value); setFileDirty(true); }}
                  onKeyDown={handleCtrlS}
                  spellCheck={false}
                  className={`flex-1 resize-none border-0 bg-white p-5 font-mono text-sm leading-relaxed text-gray-700 focus:outline-none focus:ring-0 dark:bg-dark dark:text-gray-200 ${
                    isMarkdown ? "bg-gray-50 dark:bg-dark/80" : ""
                  }`}
                  placeholder={activeFile === "SKILL.md" ? "# 技能名称\n\n## Instructions\n- 详细步骤…" : ""}
                />
              )}
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center text-gray-400">
              <svg className="size-12 mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              <p className="text-sm">从左侧选择一个文件进行编辑</p>
            </div>
          )}
        </div>

        {/* 右侧：元数据面板 */}
        <div className="w-72 shrink-0 overflow-y-auto border-l border-gray-100 p-5 dark:border-dark-3">
          <h3 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-200">元数据</h3>
          {metaSuccess && (
            <div className="mb-3 rounded-lg border border-green-200 bg-green-50 p-2 text-xs text-green-600 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400">
              保存成功
            </div>
          )}
          {error && (
            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">名称</label>
              <input value={name} disabled className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-400 dark:border-dark-3 dark:bg-dark cursor-not-allowed" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">分类</label>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map((cat) => {
                  const st = catStyle(cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => { setCategory(cat); setMetaDirty(true); }}
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs transition-colors ${
                        category === cat
                          ? `${st.bg} ${st.text} ring-2 ring-current ring-opacity-30`
                          : "bg-gray-100 text-gray-400 hover:bg-gray-200 dark:bg-dark dark:hover:bg-dark-3"
                      }`}
                    >
                      <span className={`size-1 rounded-full ${st.dot}`} />
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">描述（L1 元数据）</label>
              <textarea
                value={description}
                onChange={(e) => { setDescription(e.target.value); setMetaDirty(true); }}
                rows={3}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark"
              />
              <p className="mt-1 text-xs text-gray-400">将写入 SKILL.md YAML description，AI 始终读取用于判断何时调用</p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">触发关键词</label>
              <input
                value={trigger}
                onChange={(e) => { setTrigger(e.target.value); setMetaDirty(true); }}
                placeholder="pr, review, ci"
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">使用示例</label>
              <input
                value={examples}
                onChange={(e) => { setExamples(e.target.value); setMetaDirty(true); }}
                placeholder="逗号分隔"
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">版本</label>
              <input
                value={version}
                onChange={(e) => { setVersion(e.target.value); setMetaDirty(true); }}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark"
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5 dark:border-dark-3 dark:bg-dark">
              <div>
                <div className="text-xs font-medium text-gray-700 dark:text-gray-200">启用状态</div>
                <p className="text-xs text-gray-400">{enabled ? "AI 可调用此技能" : "已禁用"}</p>
              </div>
              <button
                onClick={() => { setEnabled((v) => !v); setMetaDirty(true); }}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  enabled ? "bg-green-500" : "bg-gray-300 dark:bg-dark"
                }`}
              >
                <span className={`inline-block size-3.5 rounded-full bg-white transition-transform ${
                  enabled ? "translate-x-5" : "translate-x-1"
                }`} />
              </button>
            </div>
          </div>
          {metaDirty && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-600 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
              有未保存的更改
            </div>
          )}
          <button
            onClick={() => void handleSaveMeta()}
            disabled={savingMeta || !metaDirty}
            className="mt-3 w-full rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            {savingMeta ? "保存中…" : "保存元数据"}
          </button>
        </div>
      </div>
    </div>
  );
}
