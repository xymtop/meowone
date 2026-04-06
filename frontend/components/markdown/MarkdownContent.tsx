"use client";

/**
 * 统一 Markdown 渲染：GFM（表格、任务列表、删除线等）+ A2UI 代码块。
 */
import { Children, isValidElement, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import type { A2UIAction } from "@a2ui-sdk/react/0.8";
import { A2UISurfaceBlock } from "@/components/a2ui/A2UISurfaceBlock";
import { cn } from "@/lib/utils";

function extractTextFromCodeChildren(children: ReactNode): string {
  if (typeof children === "string") return children;
  if (Array.isArray(children)) return children.map(extractTextFromCodeChildren).join("");
  return "";
}

function codeClassNameFromChild(child: unknown): string {
  if (!isValidElement(child)) return "";
  const p = child.props as { className?: string };
  return String(p.className || "");
}

/** 模型可能输出 `language-A2UI` 或误标为 json；兼容检测。 */
function looksLikeA2UIPayload(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  return (
    t.includes('"surfaceUpdate"') ||
    t.includes('"beginRendering"') ||
    t.includes('"surfaceId"')
  );
}

/** fenced code 在部分环境下 pre 下会有空白文本节点 + code，不能只取 children[0] */
function a2uiPayloadFromPre(preChildren: ReactNode): string | null {
  const parts = Children.toArray(preChildren);
  for (const child of parts) {
    if (!isValidElement(child)) continue;
    const cls = codeClassNameFromChild(child).toLowerCase();
    const inner = (child.props as { children?: ReactNode }).children;
    const text = extractTextFromCodeChildren(inner).replace(/\n$/, "");
    if (!text.trim()) continue;
    if (cls.includes("language-a2ui")) return text;
    if (cls.includes("language-json") && looksLikeA2UIPayload(text)) return text;
  }
  return null;
}

export interface MarkdownContentProps {
  children: string;
  /** A2UI 按钮等交互回调，将发回对话继续 Agent Loop */
  onA2UIAction?: (action: A2UIAction) => void;
  className?: string;
  /**
   * 为 false 时不在 Markdown 内联渲染 ```a2ui```（显示为普通代码块）。
   * 由 AssistantBubble 等将 A2UI 拆出单独成卡时使用。
   */
  embedA2UI?: boolean;
}

export function MarkdownContent({
  children,
  onA2UIAction,
  className,
  embedA2UI = true,
}: MarkdownContentProps) {
  const components: Components = {
    pre({ children: preChildren }) {
      const a2ui = embedA2UI ? a2uiPayloadFromPre(preChildren) : null;
      if (a2ui !== null) {
        return <A2UISurfaceBlock source={a2ui} onAction={onA2UIAction} />;
      }
      return (
        <pre className="my-4 overflow-x-auto rounded-xl bg-muted p-4 text-[13px] leading-relaxed text-foreground">
          {preChildren}
        </pre>
      );
    },
    code({ className, children, ...props }) {
      const isBlock = /language-/.test(String(className || ""));
      if (isBlock) {
        return (
          <code className={className} {...props}>
            {children}
          </code>
        );
      }
      return (
        <code
          className={cn(
            "rounded-md bg-muted px-1.5 py-0.5 font-mono text-[0.9em] text-foreground",
            className,
          )}
          {...props}
        >
          {children}
        </code>
      );
    },
    table({ children }) {
      return (
        <div className="my-4 w-full overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full min-w-[32rem] border-collapse text-left text-[15px]">
            {children}
          </table>
        </div>
      );
    },
    thead({ children }) {
      return <thead className="bg-gray-100 text-gray-900">{children}</thead>;
    },
    tbody({ children }) {
      return <tbody className="divide-y divide-gray-200 bg-white">{children}</tbody>;
    },
    tr({ children }) {
      return <tr className="border-b border-gray-100">{children}</tr>;
    },
    th({ children }) {
      return (
        <th className="border border-gray-200 px-4 py-2.5 font-semibold">{children}</th>
      );
    },
    td({ children }) {
      return <td className="border border-gray-200 px-4 py-2.5 align-top">{children}</td>;
    },
    ul({ children }) {
      return <ul className="my-3 list-disc pl-6">{children}</ul>;
    },
    ol({ children }) {
      return <ol className="my-3 list-decimal pl-6">{children}</ol>;
    },
    li({ children }) {
      return <li className="my-1">{children}</li>;
    },
    a({ href, children }) {
      return (
        <a
          href={href}
          className="font-medium text-blue-600 underline decoration-blue-300 underline-offset-2 hover:text-blue-800"
          target="_blank"
          rel="noopener noreferrer"
        >
          {children}
        </a>
      );
    },
    blockquote({ children }) {
      return (
        <blockquote className="my-4 border-l-4 border-gray-300 pl-4 text-gray-700 italic">
          {children}
        </blockquote>
      );
    },
    hr() {
      return <hr className="my-6 border-gray-200" />;
    },
    h1({ children }) {
      return <h1 className="mt-6 mb-3 text-2xl font-bold">{children}</h1>;
    },
    h2({ children }) {
      return <h2 className="mt-5 mb-2 text-xl font-semibold">{children}</h2>;
    },
    h3({ children }) {
      return <h3 className="mt-4 mb-2 text-lg font-semibold">{children}</h3>;
    },
    p({ children }) {
      return <p className="my-3 leading-relaxed first:mt-0 last:mb-0">{children}</p>;
    },
  };

  return (
    <div className={cn("markdown-body", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
