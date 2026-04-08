"use client";

import { useCallback, useEffect, useState } from "react";
import Editor from "@monaco-editor/react";
import { useTheme } from "next-themes";
import { meowoneApi, type PromptItem } from "@/lib/meowone-api";
import { cn } from "@/lib/utils";

function splitTags(s: string): string[] {
  return s
    .split(/[,，\n]/g)
    .map((t) => t.trim())
    .filter(Boolean);
}

export default function MeowConfigPage() {
  const { resolvedTheme } = useTheme();
  const [items, setItems] = useState<PromptItem[]>([]);
  /** 空字符串表示「新增」模式（未选中已有提示词） */
  const [selectedKey, setSelectedKey] = useState("");
  const [current, setCurrent] = useState<PromptItem | null>(null);

  const [promptKeyDraft, setPromptKeyDraft] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tagsStr, setTagsStr] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [content, setContent] = useState("");

  const [enabledOnly, setEnabledOnly] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const monacoTheme = resolvedTheme === "dark" ? "vs-dark" : "light";
  const isNew = selectedKey === "";

  const resetNewDraft = useCallback(() => {
    setCurrent(null);
    setPromptKeyDraft("");
    setName("");
    setDescription("");
    setTagsStr("");
    setEnabled(true);
    setContent("# 新提示词\n\n");
  }, []);

  const fetchList = async () => {
    try {
      setError("");
      const res = await meowoneApi.listPrompts(enabledOnly);
      setItems(res.prompts || []);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  useEffect(() => {
    void fetchList();
  }, [enabledOnly]);

  useEffect(() => {
    setSelectedKey((prev) => {
      if (!prev) return prev;
      const stillThere = items.some((p) => p.prompt_key === prev);
      return stillThere ? prev : "";
    });
  }, [items]);

  useEffect(() => {
    if (selectedKey === "") {
      resetNewDraft();
      return;
    }

    let cancelled = false;
    meowoneApi
      .getPrompt(selectedKey)
      .then((detail) => {
        if (cancelled) return;
        setCurrent(detail);
        setPromptKeyDraft(detail.prompt_key);
        setName(detail.name || "");
        setDescription(detail.description || "");
        setTagsStr((detail.tags || []).join(", "));
        setEnabled(Boolean(detail.enabled));
        setContent(detail.content_md || "");
      })
      .catch((e: Error) => setError(e.message));

    return () => {
      cancelled = true;
    };
  }, [selectedKey, resetNewDraft]);

  const editorHeight = "min(640px, calc(100vh - 14rem))";

  const startNew = () => {
    setNotice("");
    setError("");
    resetNewDraft();
    setSelectedKey("");
  };

  const afterSave = async (key: string) => {
    await fetchList();
    setSelectedKey(key);
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-title-md2 font-semibold tracking-tight text-dark dark:text-white">
          提示词管理
        </h1>
        <p className="mt-1 text-sm text-body dark:text-dark-6">
          未选中列表项时为新增；选中后可编辑。内容使用 Markdown，对应接口 `/api/prompts`。
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex items-center gap-2 text-sm text-body dark:text-dark-6">
          <input
            type="checkbox"
            checked={enabledOnly}
            onChange={(e) => setEnabledOnly(e.target.checked)}
          />
          仅显示启用
        </label>
        {notice ? (
          <span className="rounded-md bg-emerald-500/10 px-2 py-1 text-xs text-emerald-600 dark:text-emerald-400">
            {notice}
          </span>
        ) : null}
      </div>

      {error ? (
        <p className="rounded-lg border border-red/30 bg-red/5 px-3 py-2 text-sm text-red dark:border-red/40 dark:bg-red/10">
          {error}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,280px)_1fr] lg:gap-5">
        <aside
          className={cn(
            "flex max-h-[min(640px,calc(100vh-14rem))] flex-col overflow-hidden rounded-2xl border shadow-sm",
            "border-stroke/80 bg-white dark:border-white/10 dark:bg-gray-dark/90 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.04)]",
          )}
        >
          <div className="shrink-0 border-b border-stroke px-4 py-3 dark:border-white/10">
            <p className="text-xs font-semibold uppercase tracking-wider text-body dark:text-dark-6">
              提示词列表
            </p>
            <p className="mt-0.5 text-sm font-medium text-dark dark:text-white">
              {items.length} 条记录
            </p>
          </div>
          <nav className="custom-scrollbar flex-1 overflow-y-auto p-2">
            <ul className="space-y-1">
              <li>
                <button
                  type="button"
                  onClick={startNew}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                    isNew
                      ? "bg-primary/12 text-primary ring-1 ring-primary/35 dark:bg-primary/15 dark:ring-primary/40"
                      : "text-dark hover:bg-gray-100 dark:text-white/90 dark:hover:bg-white/5",
                  )}
                >
                  <span className="text-lg leading-none">+</span>
                  <span className="font-medium">新建提示词</span>
                </button>
              </li>
              {items.map((item) => {
                const active = !isNew && selectedKey === item.prompt_key;
                return (
                  <li key={item.prompt_key}>
                    <button
                      type="button"
                      onClick={() => {
                        setNotice("");
                        setError("");
                        setSelectedKey(item.prompt_key);
                      }}
                      title={item.prompt_key}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left transition-colors",
                        active
                          ? "bg-primary/12 text-primary ring-1 ring-primary/35 dark:bg-primary/15 dark:ring-primary/40"
                          : "text-dark hover:bg-gray-100 dark:text-white/90 dark:hover:bg-white/5",
                      )}
                    >
                      <span
                        className={cn(
                          "inline-flex min-w-[2.5rem] shrink-0 justify-center rounded-md px-1.5 py-0.5 font-mono text-[10px] font-medium",
                          active
                            ? "bg-primary/20 text-primary dark:bg-primary/25"
                            : "bg-gray-100 text-body dark:bg-white/10 dark:text-dark-6",
                        )}
                      >
                        {item.enabled ? "ON" : "OFF"}
                      </span>
                      <span className="min-w-0 truncate font-mono text-xs">{item.prompt_key}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        <section
          className={cn(
            "flex min-h-0 flex-col overflow-hidden rounded-2xl border shadow-sm",
            "border-stroke/80 bg-white dark:border-white/10 dark:bg-[#1e1e1e] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.04)]",
          )}
        >
          <div className="shrink-0 space-y-3 border-b border-stroke px-4 py-3 dark:border-white/10">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1 space-y-2">
                <p className="font-mono text-sm font-medium text-dark dark:text-white/95">
                  {isNew ? "新建提示词" : current?.prompt_key ?? "加载中…"}
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {isNew ? (
                    <label className="block text-xs text-body dark:text-dark-6">
                      <span className="mb-1 block font-medium text-dark dark:text-white">prompt_key</span>
                      <input
                        value={promptKeyDraft}
                        onChange={(e) => setPromptKeyDraft(e.target.value)}
                        placeholder="例如 scheduler.master"
                        className="w-full rounded-lg border border-stroke bg-transparent px-3 py-2 font-mono text-sm text-dark outline-none dark:border-white/15 dark:text-white"
                      />
                    </label>
                  ) : null}
                  <label className="block text-xs text-body dark:text-dark-6 sm:col-span-2">
                    <span className="mb-1 block font-medium text-dark dark:text-white">名称 name</span>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="显示名称"
                      className="w-full rounded-lg border border-stroke bg-transparent px-3 py-2 text-sm text-dark outline-none dark:border-white/15 dark:text-white"
                    />
                  </label>
                  <label className="block text-xs text-body dark:text-dark-6 sm:col-span-2">
                    <span className="mb-1 block font-medium text-dark dark:text-white">描述 description</span>
                    <input
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="可选"
                      className="w-full rounded-lg border border-stroke bg-transparent px-3 py-2 text-sm text-dark outline-none dark:border-white/15 dark:text-white"
                    />
                  </label>
                  <label className="block text-xs text-body dark:text-dark-6 sm:col-span-2">
                    <span className="mb-1 block font-medium text-dark dark:text-white">
                      标签 tags（逗号分隔）
                    </span>
                    <input
                      value={tagsStr}
                      onChange={(e) => setTagsStr(e.target.value)}
                      placeholder="a, b, c"
                      className="w-full rounded-lg border border-stroke bg-transparent px-3 py-2 text-sm text-dark outline-none dark:border-white/15 dark:text-white"
                    />
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm text-dark dark:text-white/90">
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(e) => setEnabled(e.target.checked)}
                    />
                    启用
                  </label>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {!isNew && current ? (
                  <button
                    type="button"
                    className="rounded-md bg-red px-2.5 py-1 text-xs text-white"
                    onClick={async () => {
                      if (!confirm(`确认删除提示词 ${current.prompt_key} ?`)) return;
                      await meowoneApi.deletePrompt(current.prompt_key);
                      setNotice("已删除");
                      setSelectedKey("");
                      await fetchList();
                    }}
                  >
                    删除
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={saving}
                  onClick={async () => {
                    const key = (isNew ? promptKeyDraft : current?.prompt_key ?? "").trim();
                    const nameTrim = name.trim();
                    const bodyMd = content.trim();
                    if (!key) {
                      setError("prompt_key 不能为空");
                      return;
                    }
                    if (!nameTrim) {
                      setError("名称 name 不能为空");
                      return;
                    }
                    if (!bodyMd) {
                      setError("内容 content_md 不能为空");
                      return;
                    }
                    setSaving(true);
                    setError("");
                    setNotice("");
                    try {
                      await meowoneApi.upsertPrompt({
                        prompt_key: key,
                        name: nameTrim,
                        description: description.trim(),
                        tags: splitTags(tagsStr),
                        enabled,
                        content_md: bodyMd,
                      });
                      setNotice(isNew ? "创建成功" : "保存成功");
                      await afterSave(key);
                    } catch (e) {
                      setError((e as Error).message);
                    } finally {
                      setSaving(false);
                    }
                  }}
                  className="rounded-md bg-primary px-3 py-1 text-xs text-white disabled:opacity-60"
                >
                  {saving ? "提交中..." : isNew ? "创建" : "保存"}
                </button>
              </div>
            </div>
          </div>
          <div className="min-h-0 flex-1">
            <Editor
              height={editorHeight}
              theme={monacoTheme}
              language="markdown"
              value={content}
              onChange={(v) => setContent(v ?? "")}
              loading={
                <div className="flex h-48 items-center justify-center text-sm text-body dark:text-dark-6">
                  加载编辑器…
                </div>
              }
              options={{
                readOnly: false,
                minimap: { enabled: true, scale: 0.85 },
                fontSize: 13,
                lineHeight: 20,
                fontFamily:
                  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                padding: { top: 12, bottom: 12 },
                automaticLayout: true,
                scrollBeyondLastLine: false,
                smoothScrolling: true,
                cursorBlinking: "smooth",
                renderLineHighlight: "line",
                overviewRulerBorder: false,
              }}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
