"use client";

/**
 * 将助手消息中的 ```a2ui 代码块解析为 A2UI v0.8 消息流，并用官方 @a2ui-sdk/react 渲染。
 * 支持：JSON 数组 或 JSON Lines（每行一条消息）。
 */
import { useMemo } from "react";
import {
  A2UIProvider,
  A2UIRenderer,
  standardCatalog,
  type A2UIMessage,
  type A2UIAction,
} from "@a2ui-sdk/react/0.8";
import type { ComponentDefinition } from "@a2ui-sdk/types/0.8";

function parseA2UIMessages(raw: string): A2UIMessage[] {
  const t = raw.trim();
  if (!t) return [];
  if (t.startsWith("[")) {
    const parsed: unknown = JSON.parse(t);
    if (Array.isArray(parsed)) return parsed as A2UIMessage[];
    return [parsed as A2UIMessage];
  }
  const out: A2UIMessage[] = [];
  for (const line of t.split("\n")) {
    const s = line.trim();
    if (!s) continue;
    try {
      out.push(JSON.parse(s) as A2UIMessage);
    } catch {
      /* 跳过损坏行 */
    }
  }
  return out;
}

/**
 * `@a2ui-sdk/react` only paints a surface when `beginRendering` set a non-empty `root`.
 * If the model emits only `surfaceUpdate`, the runtime keeps `root` as "" and `A2UIRenderer` returns null (blank box).
 * We inject a synthetic `beginRendering` before the first `surfaceUpdate` per surface when missing.
 */
function inferRootComponentId(components: ComponentDefinition[]): string | null {
  if (!components.length) return null;
  for (const c of components) {
    const types = Object.keys(c.component ?? {});
    if (types.some((t) => t === "Column" || t === "Row" || t === "List")) {
      return c.id;
    }
  }
  return components[0].id;
}

function normalizeA2UIMessages(messages: A2UIMessage[]): A2UIMessage[] {
  const hasBegin = new Set<string>();
  for (const m of messages) {
    if (m.beginRendering) {
      hasBegin.add(m.beginRendering.surfaceId);
    }
  }

  const out: A2UIMessage[] = [];
  const injected = new Set<string>();

  for (const m of messages) {
    if (m.surfaceUpdate) {
      const { surfaceId, components } = m.surfaceUpdate;
      if (
        !hasBegin.has(surfaceId) &&
        !injected.has(surfaceId) &&
        components?.length
      ) {
        const root = inferRootComponentId(components);
        if (root) {
          out.push({
            beginRendering: { surfaceId, root, styles: {} },
          });
          injected.add(surfaceId);
          hasBegin.add(surfaceId);
        }
      }
    }
    out.push(m);
  }
  return out;
}

export interface A2UISurfaceBlockProps {
  source: string;
  onAction?: (action: A2UIAction) => void;
}

export function A2UISurfaceBlock({ source, onAction }: A2UISurfaceBlockProps) {
  const messages = useMemo(() => {
    try {
      return normalizeA2UIMessages(parseA2UIMessages(source));
    } catch {
      return [];
    }
  }, [source]);

  if (messages.length === 0) {
    return (
      <div className="my-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
        A2UI 内容无法解析。请使用 JSON 数组或每行一条 JSON（JSON Lines），符合 A2UI v0.8。
      </div>
    );
  }

  return (
    <div className="not-prose my-4 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 bg-gray-50/80 px-3 py-1.5 text-xs font-medium text-gray-600">
        A2UI 交互界面
      </div>
      <div className="p-4">
        <A2UIProvider messages={messages} catalog={standardCatalog}>
          <A2UIRenderer
            onAction={(action) => {
              onAction?.(action);
            }}
          />
        </A2UIProvider>
      </div>
    </div>
  );
}
