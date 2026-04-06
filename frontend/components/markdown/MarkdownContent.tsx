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

export interface MarkdownContentProps {
  children: string;
  /** A2UI 按钮等交互回调，将发回对话继续 Agent Loop */
  onA2UIAction?: (action: A2UIAction) => void;
  className?: string;
}

export function MarkdownContent({
  children,
  onA2UIAction,
  className,
}: MarkdownContentProps) {
  const components: Components = {
    pre({ children: preChildren }) {
      const only = Children.toArray(preChildren)[0];
      if (
        isValidElement(only) &&
        only.props &&
        typeof only.props === "object" &&
        "className" in only.props &&
        String((only.props as { className?: string }).className || "").includes(
          "language-a2ui",
        )
      ) {
        const text = extractTextFromCodeChildren(
          (only.props as { children?: ReactNode }).children,
        );
        return (
          <A2UISurfaceBlock source={text.replace(/\n$/, "")} onAction={onA2UIAction} />
        );
      }
      return (
        <pre className="my-4 overflow-x-auto rounded-xl bg-gray-900 p-4 text-[13px] leading-relaxed text-gray-100">
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
            "rounded-md bg-gray-200/90 px-1.5 py-0.5 font-mono text-[0.9em] text-gray-900",
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
