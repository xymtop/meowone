"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { meowoneApi } from "@/lib/meowone-api";
import { bodyAfterFrontmatter } from "@/lib/skill-directory";

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

export default function CreateSkillDirectoryPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>("general");
  const [description, setDescription] = useState("");
  const [trigger, setTrigger] = useState("");
  const [examples, setExamples] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const previewName = name.trim() || "your-skill";

  const handleCreate = async () => {
    const n = name.trim().replace(/\s+/g, "-").toLowerCase();
    if (!n) {
      setError("请填写技能目录名（将作为文件夹名）");
      return;
    }
    if (!/^[a-z0-9][a-z0-9-]*$/.test(n)) {
      setError("名称仅允许小写字母、数字和连字符，且不能以连字符开头");
      return;
    }
    if (!description.trim()) {
      setError("请填写描述（会写入 SKILL.md 的 YAML，供 AI 判断是否调用）");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const trigger_keywords = trigger.split(",").map((k) => k.trim()).filter(Boolean);
      const ex = examples.split(",").map((e) => e.trim()).filter(Boolean);
      await meowoneApi.createSkillFs({
        name: n,
        description: description.trim(),
        category,
        trigger_keywords,
        examples: ex,
      });
      const md = await meowoneApi.readSkillFile(n, "SKILL.md");
      const body = bodyAfterFrontmatter(md.content);
      await meowoneApi.upsertSkill({
        name: n,
        description: description.trim(),
        body,
        category,
        trigger_keywords,
        examples: ex,
        version: "1.0.0",
      });
      router.push(`/meowone/capabilities-skills/${encodeURIComponent(n)}/edit`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm text-gray-500">
            <Link href="/meowone/capabilities-skills" className="text-blue-600 hover:underline dark:text-blue-400">
              技能管理
            </Link>
            <span className="mx-2">/</span>
            <span>新建技能目录</span>
          </div>
          <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">新建技能（目录结构）</h1>
          <p className="mt-1 text-sm text-gray-500">
            每个技能对应 <code className="rounded bg-gray-100 px-1 py-0.5 text-xs dark:bg-dark">.meowone/skills/&lt;名称&gt;/</code>{" "}
            目录，内含 SKILL.md、scripts、references、assets，符合 Agent Skill 标准。
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/meowone/capabilities-skills"
            className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-dark-3 dark:bg-dark-2 dark:hover:bg-dark-3"
          >
            返回列表
          </Link>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">将生成的目录结构</h2>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 font-mono text-sm leading-relaxed text-gray-700 shadow-sm dark:border-dark-3 dark:bg-dark-2 dark:text-gray-300">
            <div className="text-gray-400">.meowone/skills/</div>
            <div>
              <span className="text-blue-600 dark:text-blue-400">{previewName}/</span>
            </div>
            <div className="ml-3 border-l border-gray-200 pl-3 dark:border-dark-3">
              <div>SKILL.md — YAML 元数据（L1）+ 指令正文（L2）</div>
              <div className="text-amber-600 dark:text-amber-400">scripts/</div>
              <div className="ml-3 text-gray-500">example.py</div>
              <div className="text-amber-600 dark:text-amber-400">references/</div>
              <div className="ml-3 text-gray-500">guide.md</div>
              <div className="text-amber-600 dark:text-amber-400">assets/</div>
            </div>
          </div>
          <p className="text-xs text-gray-500">
            创建完成后会进入「编辑技能目录」页，可在左侧文件树中打开任意文件修改；脚本与参考文档属于 L3，按需加载。
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-dark-3 dark:bg-dark-2">
          <h2 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-200">目录与元数据</h2>
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                目录名（技能标识）<span className="text-red-500">*</span>
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value.replace(/\s/g, "-"))}
                placeholder="例如 code-review-helper"
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm dark:border-dark-3 dark:bg-dark"
              />
              <p className="mt-1 text-xs text-gray-400">与 SKILL.md 中 name 字段一致，创建后不可在此改名（需手动改目录名）。</p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">分类</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => {
                  const st = catStyle(cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                        category === cat
                          ? `${st.bg} ${st.text} ring-2 ring-current ring-opacity-30`
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-dark dark:hover:bg-dark-3"
                      }`}
                    >
                      <span className={`size-1.5 rounded-full ${st.dot}`} />
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                描述（写入 YAML description）<span className="text-red-500">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="说明技能做什么、何时应由 AI 调用"
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm dark:border-dark-3 dark:bg-dark"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">触发关键词</label>
              <input
                value={trigger}
                onChange={(e) => setTrigger(e.target.value)}
                placeholder="pr, review, ci（逗号分隔）"
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm dark:border-dark-3 dark:bg-dark"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">使用示例（可选）</label>
              <input
                value={examples}
                onChange={(e) => setExamples(e.target.value)}
                placeholder="示例短语，逗号分隔，写入 YAML"
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm dark:border-dark-3 dark:bg-dark"
              />
            </div>
          </div>
          <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-4 dark:border-dark-3">
            <Link
              href="/meowone/capabilities-skills"
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 dark:border-dark-3 dark:text-gray-400"
            >
              取消
            </Link>
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleCreate()}
              className="rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {saving ? "创建中…" : "创建目录并进入编辑"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
