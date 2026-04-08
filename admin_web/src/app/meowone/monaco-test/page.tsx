"use client";

import { useMemo, useState } from "react";
import Editor from "@monaco-editor/react";

const EXAMPLES: Record<string, string> = {
  javascript: `function greet(name) {
  return "Hello, " + name + "!";
}

console.log(greet("MeowOne"));`,
  typescript: `type User = {
  id: string;
  name: string;
};

const user: User = { id: "1", name: "MeowOne" };
console.log(user);`,
  json: `{
  "name": "meowone",
  "mode": "test",
  "enabled": true
}`,
  markdown: `# Monaco 预览

- 只读预览，不可编辑
- 可切换语言查看高亮效果`,
};

type LanguageKey = keyof typeof EXAMPLES;

export default function MonacoTestPage() {
  const [language, setLanguage] = useState<LanguageKey>("typescript");
  const value = useMemo(() => EXAMPLES[language], [language]);

  const lineCount = useMemo(() => value.split("\n").length, [value]);

  return (
    <div className="space-y-4">
      <h1 className="text-title-md2 font-semibold text-dark dark:text-white">
        Monaco 编辑器测试（只读预览）
      </h1>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-stroke bg-white p-3 dark:border-dark-3 dark:bg-dark-2">
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as LanguageKey)}
          className="rounded-lg border border-stroke px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark"
        >
          <option value="typescript">TypeScript</option>
          <option value="javascript">JavaScript</option>
          <option value="json">JSON</option>
          <option value="markdown">Markdown</option>
        </select>

        <span className="text-xs text-body dark:text-dark-6">
          仅预览，不可编辑 · 行数：{lineCount}
        </span>
      </div>

      <div className="overflow-hidden rounded-xl border border-stroke bg-white dark:border-dark-3 dark:bg-dark-2">
        <Editor
          height="560px"
          language={language}
          value={value}
          options={{
            minimap: { enabled: true },
            fontSize: 14,
            automaticLayout: true,
            readOnly: true,
            scrollBeyondLastLine: false,
          }}
        />
      </div>
    </div>
  );
}
