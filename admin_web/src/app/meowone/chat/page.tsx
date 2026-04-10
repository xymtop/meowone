"use client";

import { A2UIProvider, A2UIRenderer, standardCatalog, useDataBinding, useDispatchAction, type A2UIAction } from "@a2ui-sdk/react/0.8";
import type { A2UIMessage } from "@a2ui-sdk/types/0.8";
import { Suspense, useEffect, useMemo, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Markdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import { meowoneApi, type ChatEvent, type Message, type Session } from "@/lib/meowone-api";
import { cn } from "@/lib/utils";
import { MentionPicker, type AgentItem } from "@/components/Chat/MentionPicker";

type Segment = { type: "markdown" | "a2ui" | "mermaid"; value: string };
const A2UI_BLOCK_START = "---A2UI-START---";
const A2UI_BLOCK_END = "---A2UI-END---";

function looksLikeA2UIPayload(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  return t.includes("\"surfaceUpdate\"") || t.includes("\"beginRendering\"") || t.includes("\"surfaceId\"");
}

function parseSegments(content: string): Segment[] {
  const chunks: Segment[] = [];

  let pos = 0;
  while (pos < content.length) {
    const startIdx = content.indexOf(A2UI_BLOCK_START, pos);
    if (startIdx === -1) {
      const rest = content.slice(pos);
      if (rest.trim()) chunks.push({ type: "markdown", value: rest });
      break;
    }
    const before = content.slice(pos, startIdx);
    if (before.trim()) chunks.push({ type: "markdown", value: before });
    const bodyStart = startIdx + A2UI_BLOCK_START.length;
    const endIdx = content.indexOf(A2UI_BLOCK_END, bodyStart);
    const body = (endIdx === -1 ? content.slice(bodyStart) : content.slice(bodyStart, endIdx)).trim();
    if (body) chunks.push({ type: "a2ui", value: body });
    if (endIdx === -1) break;
    pos = endIdx + A2UI_BLOCK_END.length;
  }

  const out: Segment[] = [];
  const fenceRe = /```([a-zA-Z0-9_-]*)\s*\n([\s\S]*?)```/g;
  for (const seg of chunks.length ? chunks : [{ type: "markdown", value: content } as Segment]) {
    if (seg.type !== "markdown") {
      out.push(seg);
      continue;
    }
    let p = 0;
    let m: RegExpExecArray | null;
    while ((m = fenceRe.exec(seg.value)) !== null) {
      const before = seg.value.slice(p, m.index);
      if (before.trim()) out.push({ type: "markdown", value: before });
      const lang = (m[1] || "").trim().toLowerCase();
      const body = (m[2] || "").trim();
      if (lang === "mermaid") out.push({ type: "mermaid", value: body });
      else if (lang === "a2ui" || (lang === "json" && looksLikeA2UIPayload(body))) out.push({ type: "a2ui", value: body });
      else out.push({ type: "markdown", value: m[0] });
      p = fenceRe.lastIndex;
    }
    const rest = seg.value.slice(p);
    if (rest.trim()) out.push({ type: "markdown", value: rest });
    fenceRe.lastIndex = 0;
  }
  return out.length ? out : [{ type: "markdown", value: content }];
}

function MultipleChoicePatched(props: any) {
  const { surfaceId, componentId, label, options = [], maxAllowedSelections = 1 } = props ?? {};
  const dispatch = useDispatchAction();
  const labelText = useDataBinding(surfaceId, label, "");
  const [value, setValue] = useState("");

  if (maxAllowedSelections !== 1) {
    const DefaultMultipleChoice = (standardCatalog as any).components?.MultipleChoice;
    return DefaultMultipleChoice ? <DefaultMultipleChoice {...props} /> : null;
  }

  return (
    <div className="flex min-w-0 max-w-full flex-col gap-2">
      {labelText ? <label className="text-sm font-medium text-[#111827]">{labelText}</label> : null}
      <select
        className="h-10 w-full rounded-md border border-[#d1d5db] bg-white px-3 text-sm text-[#111827] outline-none focus:border-[#3b82f6] focus:ring-2 focus:ring-[#3b82f6]/25"
        value={value}
        onChange={(e) => {
          const v = e.target.value;
          setValue(v);
          dispatch(surfaceId, componentId, {
            name: "meowone.selectionChange",
            context: [{ key: "value", value: { literalString: v } }],
          });
        }}
      >
        <option value="">请选择...</option>
        {options.map((opt: any, idx: number) => {
          const v = String(opt?.value ?? opt?.id ?? `opt-${idx}`);
          const label =
            typeof opt?.label === "string"
              ? opt.label
              : opt?.label?.literalString ?? v;
          return (
            <option key={v} value={v}>
              {label}
            </option>
          );
        })}
      </select>
    </div>
  );
}

const meowoneCatalog = {
  ...standardCatalog,
  components: {
    ...(standardCatalog as any).components,
    MultipleChoice: MultipleChoicePatched,
  },
} as any;

function parseA2UIMessages(raw: string): A2UIMessage[] {
  const src = raw.trim();
  if (!src) return [];

  const extractFirstJsonValue = (s: string): string | null => {
    const t = s.trim();
    const m = t.match(/[\[{]/);
    if (!m || m.index === undefined) return null;
    const start = m.index;
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let i = start; i < t.length; i++) {
      const c = t[i];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (c === "\\" && inString) {
        escaped = true;
        continue;
      }
      if (c === "\"") {
        inString = !inString;
        continue;
      }
      if (inString) continue;
      if (c === "{" || c === "[") depth++;
      else if (c === "}" || c === "]") {
        depth--;
        if (depth === 0) return t.slice(start, i + 1);
      }
    }
    return null;
  };

  const tryParseJSON = (text: string): unknown | null => {
    const t = text.trim();
    if (!t) return null;
    try {
      return JSON.parse(t) as unknown;
    } catch {
      let fixed = t;
      for (let i = 0; i < 8; i++) {
        const next = fixed.replace(/,(\s*[}\]])/g, "$1");
        if (next === fixed) break;
        fixed = next;
        try {
          return JSON.parse(fixed) as unknown;
        } catch {
          // keep trying
        }
      }
      const extracted = extractFirstJsonValue(t);
      if (extracted && extracted !== t) {
        try {
          return JSON.parse(extracted) as unknown;
        } catch {
          return null;
        }
      }
      return null;
    }
  };

  const coerceBegin = (p: Record<string, unknown>) => ({
    surfaceId: String(p.surfaceId ?? p.surface_id ?? "default"),
    root: String(p.root ?? ""),
    styles: (p.styles as Record<string, unknown>) ?? {},
    catalogId: p.catalogId as string | undefined,
  });

  const coerceSurface = (p: Record<string, unknown>, fallbackSurfaceId?: string) => ({
    surfaceId: String(p.surfaceId ?? p.surface_id ?? fallbackSurfaceId ?? "default"),
    components: Array.isArray(p.components) ? p.components : [],
  });

  const expandObject = (obj: Record<string, unknown>): A2UIMessage[] => {
    const out: A2UIMessage[] = [];
    const br = obj.beginRendering ?? obj.begin_rendering;
    const brSurfaceId =
      br && typeof br === "object"
        ? String((br as Record<string, unknown>).surfaceId ?? (br as Record<string, unknown>).surface_id ?? "")
        : "";
    const su = obj.surfaceUpdate ?? obj.surface_update;
    const dm = obj.dataModelUpdate ?? obj.data_model_update;
    const ds = obj.deleteSurface ?? obj.delete_surface;
    if (br && typeof br === "object") out.push({ beginRendering: coerceBegin(br as Record<string, unknown>) } as A2UIMessage);
    if (dm && typeof dm === "object") {
      const p = dm as Record<string, unknown>;
      out.push({
        dataModelUpdate: {
          surfaceId: String(p.surfaceId ?? p.surface_id ?? "default"),
          path: p.path as string | undefined,
          contents: Array.isArray(p.contents) ? p.contents : [],
        },
      } as A2UIMessage);
    }
    if (su && typeof su === "object") {
      out.push({ surfaceUpdate: coerceSurface(su as Record<string, unknown>, brSurfaceId || undefined) } as A2UIMessage);
    }
    if (ds && typeof ds === "object") {
      const p = ds as Record<string, unknown>;
      out.push({ deleteSurface: { surfaceId: String(p.surfaceId ?? p.surface_id ?? "default") } } as A2UIMessage);
    }
    return out.length ? out : ([obj as unknown as A2UIMessage] as A2UIMessage[]);
  };

  const expandAny = (v: unknown): A2UIMessage[] => {
    if (!v) return [];
    if (Array.isArray(v)) return v.flatMap((x) => expandAny(x));
    if (typeof v !== "object") return [];
    const o = v as Record<string, unknown>;
    if (Array.isArray(o.messages)) return expandAny(o.messages);
    if (Array.isArray(o.events)) return expandAny(o.events);
    if (Array.isArray(o.a2ui)) return expandAny(o.a2ui);
    if (o.data && typeof o.data === "object") return expandAny(o.data);
    return expandObject(o);
  };

  const ensureRenderable = (messages: A2UIMessage[]): A2UIMessage[] => {
    let out = [...messages];
    const explicitBegins = out
      .map((m) => (m as unknown as Record<string, any>).beginRendering?.surfaceId)
      .filter((x) => typeof x === "string" && x && x !== "default") as string[];
    const primarySurfaceId =
      explicitBegins.length === 1 ? explicitBegins[0] : "";
    if (primarySurfaceId) {
      out = out.map((m) => {
        const rec = m as unknown as Record<string, any>;
        const su = rec.surfaceUpdate;
        if (!su) return m;
        const sid = String(su.surfaceId ?? "");
        if (sid && sid !== "default") return m;
        return {
          ...(rec as Record<string, unknown>),
          surfaceUpdate: { ...su, surfaceId: primarySurfaceId },
        } as A2UIMessage;
      });
    }

    const hasBegin = new Set<string>();
    const compsBySurface = new Map<string, string[]>();
    for (const m of out) {
      const br = (m as unknown as Record<string, any>).beginRendering;
      const su = (m as unknown as Record<string, any>).surfaceUpdate;
      if (br?.surfaceId) hasBegin.add(String(br.surfaceId));
      if (su?.surfaceId) {
        const ids = (Array.isArray(su.components) ? su.components : [])
          .map((c: any) => (c && typeof c.id === "string" ? c.id : ""))
          .filter(Boolean);
        compsBySurface.set(String(su.surfaceId), ids);
      }
    }
    const inject: A2UIMessage[] = [];
    for (const m of out) {
      const su = (m as unknown as Record<string, any>).surfaceUpdate;
      if (su?.surfaceId && !hasBegin.has(String(su.surfaceId))) {
        const ids = compsBySurface.get(String(su.surfaceId)) ?? [];
        inject.push({
          beginRendering: {
            surfaceId: String(su.surfaceId),
            root: ids[0] ?? "",
            styles: {},
          },
        } as A2UIMessage);
        hasBegin.add(String(su.surfaceId));
      }
      inject.push(m);
    }
    return inject.map((m) => {
      const br = (m as unknown as Record<string, any>).beginRendering;
      if (!br?.surfaceId) return m;
      const ids = compsBySurface.get(String(br.surfaceId)) ?? [];
      if (!ids.length) return m;
      const root = typeof br.root === "string" ? br.root : "";
      if (root && ids.includes(root)) return m;
      return {
        ...(m as unknown as Record<string, unknown>),
        beginRendering: { ...br, root: ids[0] },
      } as A2UIMessage;
    });
  };

  const parsed = tryParseJSON(src);
  if (parsed !== null) return ensureRenderable(expandAny(parsed));

  const lines = src
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => (l.startsWith("data:") ? l.slice(5).trim() : l))
    .filter((l) => l && l !== "[DONE]");
  const out: A2UIMessage[] = [];
  for (const line of lines) {
    const one = tryParseJSON(line);
    if (one == null) continue;
    out.push(...expandAny(one));
  }
  return ensureRenderable(out);
}

function normalizeA2UIMessages(messages: A2UIMessage[]): A2UIMessage[] {
  const ensureValueSource = (v: unknown): unknown => {
    if (v && typeof v === "object") return v;
    if (typeof v === "string") return { literalString: v };
    if (typeof v === "number") return { literalNumber: v };
    if (typeof v === "boolean") return { literalBoolean: v };
    return { literalString: "" };
  };

  const toContext = (obj: Record<string, unknown>) =>
    Object.entries(obj).map(([k, v]) => ({ key: k, value: ensureValueSource(v) }));

  const normalizeComponent = (component: Record<string, unknown>): Record<string, unknown> => {
    const entries = Object.entries(component);
    if (entries.length !== 1) return component;
    const [name, rawProps] = entries[0];
    const props = ((rawProps ?? {}) as Record<string, unknown>) || {};

    const componentName = name === "Select" || name === "Dropdown" ? "MultipleChoice" : name;

    if (componentName === "Text") {
      if ("text" in props) props.text = ensureValueSource(props.text);
    }

    if (componentName === "Button") {
      if ("label" in props) props.label = ensureValueSource(props.label);
      else if ("text" in props) props.label = ensureValueSource(props.text);
      const act = props.action;
      if (act && typeof act === "object" && !Array.isArray(act)) {
        const a = { ...(act as Record<string, unknown>) };
        const name = String(a.name ?? a.type ?? "button.click");
        let context: unknown = a.context;
        if (!Array.isArray(context)) {
          const fromObj =
            (a.arguments as Record<string, unknown>) ??
            (a.payload as Record<string, unknown>) ??
            (a.data as Record<string, unknown>) ??
            null;
          context = fromObj && typeof fromObj === "object" && !Array.isArray(fromObj) ? toContext(fromObj) : [];
        }
        props.action = { name, context };
      }
    }

    if (componentName === "MultipleChoice") {
      if ("label" in props) props.label = ensureValueSource(props.label);
      if (typeof props.selections === "string") props.selections = ensureValueSource(props.selections);
      const opts = props.options;
      if (Array.isArray(opts)) {
        props.options = opts.map((o, i) => {
          if (typeof o === "string") return { value: o, label: { literalString: o } };
          if (!o || typeof o !== "object" || Array.isArray(o)) return o;
          const rec = o as Record<string, unknown>;
          const value = String(rec.value ?? rec.id ?? `opt-${i}`);
          const label = "label" in rec ? ensureValueSource(rec.label) : { literalString: value };
          return { ...rec, value, label };
        });
      }
      if (props.maxAllowedSelections === undefined) props.maxAllowedSelections = 1;
    }

    return { [componentName]: props };
  };

  return messages.map((m) => {
    const su = (m as unknown as Record<string, unknown>).surfaceUpdate as Record<string, unknown> | undefined;
    if (!su || !Array.isArray(su.components)) return m;
    const components = su.components.map((c) => {
      if (!c || typeof c !== "object" || Array.isArray(c)) return c;
      const rec = c as Record<string, unknown>;
      const component = rec.component;
      if (!component || typeof component !== "object" || Array.isArray(component)) return c;
      return { ...rec, component: normalizeComponent(component as Record<string, unknown>) };
    });
    return { ...(m as unknown as Record<string, unknown>), surfaceUpdate: { ...su, components } } as A2UIMessage;
  });
}

function canRenderA2UI(messages: A2UIMessage[]): boolean {
  if (!messages.length) return false;
  const surfaceToIds = new Map<string, Set<string>>();
  for (const m of messages as unknown as Record<string, any>[]) {
    const su = m.surfaceUpdate;
    if (!su?.surfaceId || !Array.isArray(su.components)) continue;
    if (!surfaceToIds.has(String(su.surfaceId))) surfaceToIds.set(String(su.surfaceId), new Set());
    const set = surfaceToIds.get(String(su.surfaceId))!;
    for (const c of su.components) {
      if (c && typeof c.id === "string" && c.id) set.add(c.id);
    }
  }
  for (const m of messages as unknown as Record<string, any>[]) {
    const br = m.beginRendering;
    if (!br?.surfaceId) continue;
    const ids = surfaceToIds.get(String(br.surfaceId));
    if (!ids || ids.size === 0) return false;
    if (typeof br.root === "string" && br.root && !ids.has(br.root)) return false;
  }
  return true;
}

function MermaidBlock({ source }: { source: string }) {
  const [svg, setSvg] = useState<string>("");
  const [err, setErr] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const scriptId = "meowone-mermaid-cdn";
        if (!(window as unknown as { mermaid?: unknown }).mermaid) {
          await new Promise<void>((resolve, reject) => {
            const existing = document.getElementById(scriptId) as HTMLScriptElement | null;
            if (existing) {
              existing.addEventListener("load", () => resolve(), { once: true });
              existing.addEventListener("error", () => reject(new Error("mermaid load failed")), { once: true });
              return;
            }
            const s = document.createElement("script");
            s.id = scriptId;
            s.src = "https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js";
            s.async = true;
            s.onload = () => resolve();
            s.onerror = () => reject(new Error("mermaid load failed"));
            document.head.appendChild(s);
          });
        }
        const mermaid = (window as unknown as { mermaid: any }).mermaid;
        if (!mermaid) throw new Error("mermaid unavailable");
        mermaid.initialize({ startOnLoad: false, securityLevel: "loose", theme: "default" });
        const { svg: rendered } = await mermaid.render(`mermaid-${Math.random().toString(36).slice(2)}`, source);
        if (!cancelled) {
          setSvg(rendered);
          setErr("");
        }
      } catch (e) {
        if (!cancelled) setErr((e as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [source]);

  if (err) {
    return <pre className="rounded-xl bg-zinc-100 p-3 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">Mermaid render failed: {err}</pre>;
  }
  if (!svg) {
    return <div className="rounded-xl border border-zinc-200 bg-white/80 p-3 text-xs text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/60">Rendering Mermaid...</div>;
  }
  return <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900/60" dangerouslySetInnerHTML={{ __html: svg }} />;
}

function filterRenderableParts(parts: Segment[]): Segment[] {
  return parts.filter((part) => {
    if (part.type === "markdown" && !part.value.trim()) return false;
    if (part.type === "mermaid" && !part.value.trim()) return false;
    if (part.type === "a2ui" && !part.value.trim()) return false;
    return true;
  });
}

function RichContent({ content, onA2UIAction }: { content: string; onA2UIAction?: (action: A2UIAction) => void }) {
  const parts = useMemo(() => filterRenderableParts(parseSegments(content)), [content]);
  if (!parts.length && (content || "").trim()) {
    return (
      <div className="meow-chat-md prose prose-sm max-w-none text-[#111827] [&_p]:my-2 [&_p]:text-[#111827] [&_li]:text-[#111827] [&_strong]:text-[#030712] [&_code]:rounded [&_code]:bg-[#f3f4f6] [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[#111827] [&_pre]:rounded-xl [&_pre]:border [&_pre]:border-[#d1d5db] [&_pre]:bg-[#f8fafc] [&_pre]:p-4 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-[#111827] [&_.hljs]:bg-transparent [&_.hljs]:text-[#111827]">
        <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
          {content}
        </Markdown>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {parts.map((part, idx) => {
        if (part.type === "markdown") {
          return (
            <div
              key={`md-${idx}`}
              className="meow-chat-md prose prose-sm max-w-none text-[#111827] [&_p]:my-2 [&_p]:text-[#111827] [&_li]:text-[#111827] [&_strong]:text-[#030712] [&_code]:rounded [&_code]:bg-[#f3f4f6] [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[#111827] [&_pre]:rounded-xl [&_pre]:border [&_pre]:border-[#d1d5db] [&_pre]:bg-[#f8fafc] [&_pre]:p-4 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-[#111827] [&_.hljs]:bg-transparent [&_.hljs]:text-[#111827] [&_table]:text-[#111827] [&_th]:text-[#111827] [&_td]:text-[#111827]"
            >
              <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                {part.value}
              </Markdown>
            </div>
          );
        }
        if (part.type === "mermaid") return <MermaidBlock key={`mermaid-${idx}`} source={part.value} />;
        const messages = normalizeA2UIMessages(parseA2UIMessages(part.value));
        if (!messages.length) {
          const maybeJson = part.value.trim().startsWith("{") || part.value.trim().startsWith("[");
          return maybeJson ? (
            <div key={`a2ui-pending-${idx}`} className="rounded-xl border border-dashed border-[#d1d5db] bg-[#f8fafc] px-3 py-2 text-xs text-[#6b7280]">
              正在渲染 A2UI...
            </div>
          ) : (
            <pre key={`a2ui-err-${idx}`} className="rounded-xl bg-zinc-100 p-3 text-xs dark:bg-zinc-800">A2UI parse failed</pre>
          );
        }
        if (!canRenderA2UI(messages)) {
          return (
            <div key={`a2ui-invalid-${idx}`} className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              A2UI 数据不完整，已跳过渲染（避免页面卡顿）。
            </div>
          );
        }
        return (
          <div key={`a2ui-${idx}`} className="a2ui-standalone-card not-prose relative z-30 my-1 overflow-visible rounded-[18px] border border-[#e6eaf2] bg-[#fcfdff] p-4 shadow-[0_2px_10px_rgba(29,33,41,0.06)]">
            <div className="overflow-visible">
              <A2UIProvider messages={messages} catalog={meowoneCatalog}>
                <A2UIRenderer onAction={onA2UIAction} />
              </A2UIProvider>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CopyMessageButton({ text, variant }: { text: string; variant: "user" | "assistant" }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        const t = (text || "").trim();
        if (!t) return;
        try {
          await navigator.clipboard.writeText(t);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 2000);
        } catch {
          // ignore
        }
      }}
      className={cn(
        "absolute right-2 top-2 z-10 shrink-0 rounded-lg p-1.5 transition-colors",
        variant === "user"
          ? "text-white/85 hover:bg-white/15 hover:text-white"
          : "text-[#9aa0a6] hover:bg-[#f0f2f5] hover:text-[#1d2129]",
      )}
      title={copied ? "已复制" : "复制"}
      aria-label={copied ? "已复制" : "复制消息"}
    >
      {copied ? (
        <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      ) : (
        <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"
          />
        </svg>
      )}
    </button>
  );
}

// ============ 图标组件 ============
function PlusIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden className="text-white">
      <path d="M3.478 2.404a.75.75 0 0 0-.926.94l2.432 7.905h7.016a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.167.75.75 0 0 0 0-1.666A60.516 60.516 0 0 0 3.478 2.404Z" />
    </svg>
  );
}

function NewChatIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
      <path
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 20h4.5L20 8.5 15.5 4 4 15.5V20Z M13.5 6l4.5 4.5"
      />
    </svg>
  );
}

function SidebarToggleIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
      <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M4 5h16M4 12h16M4 19h16" />
      {collapsed ? <path strokeWidth="1.8" strokeLinecap="round" d="M10 8l4 4-4 4" /> : <path strokeWidth="1.8" strokeLinecap="round" d="M14 8l-4 4 4 4" />}
    </svg>
  );
}

function StopIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <rect x="7" y="6.5" width="3.8" height="11" rx="1.2" />
      <rect x="13.2" y="6.5" width="3.8" height="11" rx="1.2" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
      <path strokeWidth="1.8" strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function ChatBubbleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
      <path strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
      <path strokeWidth="1.8" strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
      <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M8 6V4h8v2m-9 0l1 14h8l1-14" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function ServerIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z" />
    </svg>
  );
}

// ============ 实例选择器组件 ============
type SelectedTarget =
  | { mode: "instance"; id: string }
  | { mode: "agent"; id: string; name: string };

function InstanceSelector({
  instances,
  agents,
  selectedTarget,
  onSelect,
  onCreateNew,
  onManageAll,
}: {
  instances: { id: string; name: string; description?: string; status?: string }[];
  agents: { id: string; name: string; agent_type: string; description?: string }[];
  selectedTarget: SelectedTarget | null;
  onSelect: (target: SelectedTarget) => void;
  onCreateNew: () => void;
  onManageAll?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [modeTab, setModeTab] = useState<"instance" | "agent">("instance");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const getDisplayName = () => {
    if (!selectedTarget) return "选择实例";
    if (selectedTarget.mode === "agent") return selectedTarget.name;
    const currentInstance = instances.find((i) => i.id === selectedTarget.id);
    return currentInstance?.name || "选择实例";
  };

  const getInstanceStatus = () => {
    if (!selectedTarget || selectedTarget.mode !== "instance") return null;
    const currentInstance = instances.find((i) => i.id === selectedTarget.id);
    return currentInstance?.status;
  };

  const isAgentMode = selectedTarget?.mode === "agent";

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const runningInstances = instances.filter((i) => i.status === "running");
  const stoppedInstances = instances.filter((i) => i.status !== "running");

  const internalAgents = agents.filter((a) => a.agent_type === "internal");
  const externalAgents = agents.filter((a) => a.agent_type === "external");

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-[#1d2129] shadow-sm transition-all hover:bg-gray-50 hover:border-gray-300"
      >
        <ServerIcon />
        <span className="font-medium">{getDisplayName()}</span>
        {isAgentMode ? (
          <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-600">Agent</span>
        ) : getInstanceStatus() === "running" ? (
          <span className="h-2 w-2 rounded-full bg-green-500" />
        ) : null}
        <ChevronDownIcon />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1 w-80 rounded-xl border border-gray-200 bg-white shadow-lg">
          <div className="flex border-b border-gray-100">
            <button
              onClick={() => setModeTab("instance")}
              className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                modeTab === "instance" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500"
              }`}
            >
              实例
            </button>
            <button
              onClick={() => setModeTab("agent")}
              className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                modeTab === "agent" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500"
              }`}
            >
              智能体
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto p-1">
            {modeTab === "instance" ? (
              <>
                {runningInstances.length > 0 && (
                  <>
                    <div className="px-3 py-1 text-xs font-medium text-gray-400">运行中</div>
                    {runningInstances.map((inst) => (
                      <button
                        key={inst.id}
                        onClick={() => {
                          onSelect({ mode: "instance", id: inst.id });
                          setIsOpen(false);
                        }}
                        className={`flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left transition-colors ${
                          selectedTarget?.mode === "instance" && selectedTarget.id === inst.id
                            ? "bg-blue-50 text-blue-600"
                            : "hover:bg-gray-50"
                        }`}
                      >
                        <ServerIcon />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate font-medium">{inst.name}</p>
                            <span className="h-2 w-2 rounded-full bg-green-500" />
                          </div>
                          <p className="truncate text-xs text-gray-500">{inst.description || "暂无描述"}</p>
                        </div>
                        {selectedTarget?.mode === "instance" && selectedTarget.id === inst.id && (
                          <span className="size-2 shrink-0 rounded-full bg-blue-500" />
                        )}
                      </button>
                    ))}
                  </>
                )}

                {stoppedInstances.length > 0 && (
                  <>
                    <div className="my-2 border-t border-gray-100" />
                    <div className="px-3 py-1 text-xs font-medium text-gray-400">已停止</div>
                    {stoppedInstances.map((inst) => (
                      <button
                        key={inst.id}
                        onClick={() => {
                          onSelect({ mode: "instance", id: inst.id });
                          setIsOpen(false);
                        }}
                        className={`flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left transition-colors ${
                          selectedTarget?.mode === "instance" && selectedTarget.id === inst.id
                            ? "bg-blue-50 text-blue-600"
                            : "hover:bg-gray-50"
                        }`}
                      >
                        <ServerIcon />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{inst.name}</p>
                          <p className="truncate text-xs text-gray-500">{inst.description || "暂无描述"}</p>
                        </div>
                        {selectedTarget?.mode === "instance" && selectedTarget.id === inst.id && (
                          <span className="size-2 shrink-0 rounded-full bg-blue-500" />
                        )}
                      </button>
                    ))}
                  </>
                )}

                {instances.length === 0 && (
                  <div className="p-4 text-center text-sm text-gray-500">还没有实例</div>
                )}
              </>
            ) : (
              <>
                {internalAgents.length > 0 && (
                  <>
                    <div className="px-3 py-1 text-xs font-medium text-gray-400">Internal</div>
                    {internalAgents.map((agent) => (
                      <button
                        key={agent.id}
                        onClick={() => {
                          onSelect({ mode: "agent", id: agent.id, name: agent.name });
                          setIsOpen(false);
                        }}
                        className={`flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left transition-colors ${
                          selectedTarget?.mode === "agent" && selectedTarget.id === agent.id
                            ? "bg-blue-50 text-blue-600"
                            : "hover:bg-gray-50"
                        }`}
                      >
                        <span className="mt-0.5 text-sm">🤖</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{agent.name}</p>
                          <p className="truncate text-xs text-gray-500">{agent.description || "暂无描述"}</p>
                        </div>
                        {selectedTarget?.mode === "agent" && selectedTarget.id === agent.id && (
                          <span className="size-2 shrink-0 rounded-full bg-blue-500" />
                        )}
                      </button>
                    ))}
                  </>
                )}

                {externalAgents.length > 0 && (
                  <>
                    <div className="my-2 border-t border-gray-100" />
                    <div className="px-3 py-1 text-xs font-medium text-gray-400">External</div>
                    {externalAgents.map((agent) => (
                      <button
                        key={agent.id}
                        onClick={() => {
                          onSelect({ mode: "agent", id: agent.id, name: agent.name });
                          setIsOpen(false);
                        }}
                        className={`flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left transition-colors ${
                          selectedTarget?.mode === "agent" && selectedTarget.id === agent.id
                            ? "bg-blue-50 text-blue-600"
                            : "hover:bg-gray-50"
                        }`}
                      >
                        <span className="mt-0.5 text-sm">🌐</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{agent.name}</p>
                          <p className="truncate text-xs text-gray-500">{agent.description || "暂无描述"}</p>
                        </div>
                        {selectedTarget?.mode === "agent" && selectedTarget.id === agent.id && (
                          <span className="size-2 shrink-0 rounded-full bg-blue-500" />
                        )}
                      </button>
                    ))}
                  </>
                )}

                {agents.length === 0 && (
                  <div className="p-4 text-center text-sm text-gray-500">还没有智能体</div>
                )}
              </>
            )}
          </div>
          <div className="border-t border-gray-100 p-1">
            <button
              onClick={() => {
                setIsOpen(false);
                onCreateNew();
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-blue-600 transition-colors hover:bg-blue-50"
            >
              <PlusIcon />
              创建新实例
            </button>
            {onManageAll && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  onManageAll();
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50"
              >
                <ServerIcon />
                管理所有实例
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============ 主组件 ============
type InstanceInfo = {
  id: string;
  name: string;
  description?: string;
  status?: string;
  image_id?: string;
  model_name?: string;
};

type AgentInfo = {
  id: string;
  name: string;
  agent_type: string;
  description?: string;
};

// ============ Chat 主内容组件 ============
function ChatContent() {
  const searchParams = useSearchParams();
  const paramInstance = searchParams.get("instance");
  const paramAgentId = searchParams.get("agent_id");

  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionId, setSessionId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [prompt, setPrompt] = useState("");
  const [streaming, setStreaming] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [channelId] = useState("web");
  const [historyCollapsed, setHistoryCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  // thinking / tool 事件统一存为页面本地消息，不依赖 setThinking/setStreamingTools
  const [thinkingMessages, setThinkingMessages] = useState<{ id: string; description: string; timestamp: number }[]>([]);
  const [toolMessages, setToolMessages] = useState<{ toolCallId: string; name: string; status: "running" | "ok" | "error"; timestamp: number }[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const composingRef = useRef(false);

  // 实例相关状态
  const [instances, setInstances] = useState<InstanceInfo[]>([]);
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<SelectedTarget | null>(null);

  const loadInstances = useCallback(async () => {
    try {
      const res = await meowoneApi.listAgentInstances();
      const instList = (res.instances || []) as InstanceInfo[];
      setInstances(instList);

      // URL ?instance= 支持
      if (paramInstance) {
        const found = instList.find((i) => i.id === paramInstance);
        if (found) {
          setSelectedTarget({ mode: "instance", id: found.id });
        }
      } else if (!paramAgentId) {
        // 默认选第一个实例
        setSelectedTarget(instList[0] ? { mode: "instance", id: instList[0].id } : null);
      }
    } catch (e) {
      console.error("加载实例失败:", e);
    }
  }, [paramInstance, paramAgentId]);

  const loadAgents = useCallback(async () => {
    try {
      const res = await meowoneApi.listAgents();
      const agentList = (res.agents || []).map((a: Record<string, unknown>) => ({
        id: String(a.id || a.name),
        name: String(a.name || ""),
        agent_type: String(a.agent_type || "internal"),
        description: a.description ? String(a.description) : undefined,
      })) as AgentInfo[];
      setAgents(agentList);

      // URL ?agent_id= 支持
      if (paramAgentId) {
        const found = agentList.find((ag) => ag.id === paramAgentId);
        if (found) {
          setSelectedTarget({ mode: "agent", id: found.id, name: found.name });
        }
      }
    } catch (e) {
      console.error("加载智能体失败:", e);
    }
  }, [paramAgentId]);

  const loadSessions = async () => {
    const list = await meowoneApi.listSessions();
    setSessions(list);
    if (!sessionId && list[0]) setSessionId(list[0].id);
  };

  useEffect(() => {
    void loadInstances();
    void loadAgents();
    loadSessions().catch((e: Error) => setError(e.message));
  }, [loadInstances, loadAgents]);

  useEffect(() => {
    if (!sessionId) return;
    meowoneApi.listMessages(sessionId).then(setMessages).catch((e: Error) => setError(e.message));
  }, [sessionId]);

  const onStreamEvent = (evt: ChatEvent) => {
    switch (evt.event) {
      case "thinking": {
        const desc = evt.data.description;
        const text = typeof desc === "string" ? desc : "思考中...";
        setThinkingMessages((prev) => {
          if (prev.length === 0) {
            return [{ id: crypto.randomUUID(), description: text, timestamp: Date.now() }];
          }
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, description: text, timestamp: Date.now() } : m,
          );
        });
        break;
      }
      case "delta": {
        const delta = evt.data.content;
        if (typeof delta === "string") setStreaming((v) => v + delta);
        if (evt.data.done === true) {
          setThinkingMessages((prev) => {
            if (prev.length === 0) return prev;
            return prev.map((m, i) =>
              i === prev.length - 1 ? { ...m, description: m.description + " ✓", timestamp: Date.now() } : m,
            );
          });
        }
        break;
      }
      case "tool_call": {
        const toolCallId = evt.data.toolCallId;
        const name = evt.data.name;
        if (typeof toolCallId === "string" && typeof name === "string") {
          setToolMessages((prev) => [
            ...prev,
            { toolCallId, name, status: "running", timestamp: Date.now() },
          ]);
        }
        break;
      }
      case "tool_result": {
        const toolCallId = evt.data.toolCallId;
        const ok = evt.data.ok === true;
        if (typeof toolCallId === "string") {
          setToolMessages((prev) =>
            prev.map((row) =>
              row.toolCallId === toolCallId ? { ...row, status: ok ? "ok" : "error" } : row,
            ),
          );
        }
        break;
      }
      case "done":
      case "error":
        // 保留所有消息，不清空
        break;
      default:
        break;
    }
  };

  const stopGenerating = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setLoading(false);
    // 保留所有消息，不清空
  };

  const send = async () => {
    if (!prompt.trim() || loading) return;

    // 检查是否选择了实例或智能体
    if (!selectedTarget) {
      setError("请先选择一个实例或智能体");
      return;
    }

    const text = prompt.trim();
    let targetSessionId = sessionId;
    if (!targetSessionId) {
      const created = await meowoneApi.createSession();
      targetSessionId = created.id;
      setSessionId(created.id);
      await loadSessions();
    }
    const controller = new AbortController();
    abortRef.current = controller;
    setPrompt("");
    setError("");
    setLoading(true);
    setStreaming("");
    setThinkingMessages([]);
    setToolMessages([]);
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        session_id: targetSessionId,
        role: "user",
        content_type: "text",
        content: text,
        card_data: null,
        created_at: new Date().toISOString(),
      },
    ]);
    try {
      await meowoneApi.streamChat(targetSessionId, {
        content: text,
        channel_id: "web",
        // 根据 mode 选择 instance_id 或 agent_id
        ...(selectedTarget.mode === "instance"
          ? { instance_id: selectedTarget.id }
          : { agent_id: selectedTarget.id }),
      }, onStreamEvent, {
        signal: controller.signal,
      });
      const fresh = await meowoneApi.listMessages(targetSessionId);
      setMessages(fresh);
      await loadSessions();
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError((e as Error).message);
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setLoading(false);
      setStreaming("");
      // 保留 thinking 和 tool 消息，不清空
    }
  };

  const handleA2UIAction = async (action: A2UIAction) => {
    if (!sessionId || loading || !selectedTarget) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setStreaming("");
    setError("");
    setLoading(true);
    setThinkingMessages([]);
    setToolMessages([]);

    try {
      await meowoneApi.streamA2UIAction(
        sessionId,
        {
          action: action as unknown as Record<string, unknown>,
          channel_id: "web",
          ...(selectedTarget.mode === "instance"
            ? { instance_id: selectedTarget.id }
            : { agent_id: selectedTarget.id }),
        },
        onStreamEvent,
        { signal: controller.signal },
      );
      const fresh = await meowoneApi.listMessages(sessionId);
      setMessages(fresh);
      await loadSessions();
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError((e as Error).message);
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setLoading(false);
      setStreaming("");
      // 保留 thinking 和 tool 消息，不清空
    }
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, streaming, thinkingMessages, toolMessages]);

  const adjustTextareaHeight = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  };

  const currentTitle = sessions.find((s) => s.id === sessionId)?.title || "新对话";
  const currentTargetInfo = selectedTarget?.mode === "instance"
    ? instances.find((i) => i.id === selectedTarget.id)
    : selectedTarget?.mode === "agent"
      ? agents.find((a) => a.id === selectedTarget.id)
      : null;
  const currentTargetName = selectedTarget?.mode === "agent" ? selectedTarget.name : (currentTargetInfo as InstanceInfo | null)?.name;
  const currentTargetStatus = selectedTarget?.mode === "agent" ? "agent" : (currentTargetInfo as InstanceInfo | null)?.status;
  const hasConversation = messages.length > 0 || Boolean(streaming);
  const suggestionPrompts = [
    "帮我总结一下今天的工作重点",
    "写一段包含代码高亮的前端示例",
    "用 Mermaid 画一个登录流程图",
    "生成一个 A2UI 示例界面",
  ];

  const handleSelectTarget = (target: SelectedTarget) => {
    setSelectedTarget(target);
    setError("");
  };

  const handleMentionSelect = (agent: { id: string; name: string; agent_type: string }) => {
    setSelectedTarget({ mode: "agent", id: agent.id, name: agent.name });
  };

  return (
    <>
    <style jsx global>{`
      /* Keep A2UI dropdown/popover above chat layers */
      [data-slot="select-content"] { z-index: 350 !important; }
      .a2ui-standalone-card,
      .a2ui-standalone-card * { overflow: visible; }
      /* A2UI text on light cards (avoid inheriting invisible / wrong theme colors) */
      #meow-chat-scroll .a2ui-standalone-card { color: #1d2129; }
      /* github.css + prose: ensure code blocks stay readable on white bubbles */
      #meow-chat-scroll .meow-chat-md pre code.hljs,
      #meow-chat-scroll .meow-chat-md code.hljs {
        color: #111827 !important;
        background: transparent !important;
      }
      #meow-chat-scroll .meow-chat-md .hljs-comment,
      #meow-chat-scroll .meow-chat-md .hljs-quote { color: #6b7280 !important; }
      #meow-chat-scroll .meow-chat-md .hljs-keyword,
      #meow-chat-scroll .meow-chat-md .hljs-selector-tag,
      #meow-chat-scroll .meow-chat-md .hljs-title { color: #2563eb !important; }
      #meow-chat-scroll .meow-chat-md .hljs-string,
      #meow-chat-scroll .meow-chat-md .hljs-attr { color: #059669 !important; }
    `}</style>
    <div
      className={cn("grid h-full min-h-0 flex-1 grid-cols-1 overflow-hidden bg-[#f5f6f7]", historyCollapsed ? "md:grid-cols-1" : "md:grid-cols-[268px_1fr]")}
    >
      <aside className={cn("hidden min-h-0 flex-col border-r border-gray-100 bg-[#fafbfc] md:flex", historyCollapsed && "md:hidden")}>
        <div className={`flex items-center ${historyCollapsed ? "justify-center px-1" : "justify-between px-3"} pb-2 pt-3`}>
          {!historyCollapsed ? (
          <button
            title="新建会话"
            aria-label="新建会话"
            className="flex size-9 items-center justify-center rounded-xl text-[#4e5969] transition-colors hover:bg-gray-100 hover:text-[#1d2129]"
            onClick={async () => {
              const created = await meowoneApi.createSession();
              await loadSessions();
              setSessionId(created.id);
            }}
          >
            <NewChatIcon />
          </button>
          ) : null}
          <button
            title={historyCollapsed ? "展开历史栏" : "收起历史栏"}
            aria-label={historyCollapsed ? "展开历史栏" : "收起历史栏"}
            className="flex size-9 items-center justify-center rounded-xl text-[#4e5969] transition-colors hover:bg-gray-100 hover:text-[#1d2129]"
            onClick={() => setHistoryCollapsed((v) => !v)}
          >
            <SidebarToggleIcon collapsed={historyCollapsed} />
          </button>
        </div>
        {!historyCollapsed ? (
          <>
        <div className="mx-3 mb-2">
          <input
            type="search"
            readOnly
            placeholder="搜索历史对话"
            className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-3 pr-2 text-[12px] text-[#1d2129] placeholder:text-[#c9cdd4] outline-none transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <div className="px-3 pb-1 text-[11px] font-medium uppercase tracking-[0.06em] text-[#86909c]">历史对话</div>
        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-2 pb-4">
          {sessions.map((s) => {
            const active = sessionId === s.id;
            return (
              <button
                key={s.id}
                className={cn(
                  "group mb-1 flex w-full items-center gap-2 truncate rounded-xl px-3 py-2.5 text-left text-[13px] transition-all",
                  active
                    ? "bg-white font-medium text-[#1d2129] shadow-[0_2px_8px_rgba(0,0,0,0.07)]"
                    : "text-[#4e5969] hover:bg-gray-100 hover:text-[#1d2129]"
                )}
                onClick={() => setSessionId(s.id)}
              >
                <span className={active ? "text-blue-500" : "text-[#d0d5dd]"}>
                  <ChatBubbleIcon />
                </span>
                <span className="inline-flex w-full items-center justify-between gap-2">
                  <span className="truncate">{s.title || "新对话"}</span>
                  <span
                    role="button"
                    tabIndex={0}
                    className="hidden rounded p-0.5 text-[#9aa0a6] opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-50 hover:text-red-500"
                    onClick={async (e) => {
                      e.stopPropagation();
                      await meowoneApi.deleteSession(s.id);
                      await loadSessions();
                      if (sessionId === s.id) setSessionId("");
                    }}
                    onKeyDown={async (e) => {
                      if (e.key !== "Enter") return;
                      e.stopPropagation();
                      await meowoneApi.deleteSession(s.id);
                      await loadSessions();
                      if (sessionId === s.id) setSessionId("");
                    }}
                  >
                    <TrashIcon />
                  </span>
                </span>
              </button>
            );
          })}
        </div>
          </>
        ) : (
          <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-1 pb-4">
            {sessions.map((s, idx) => {
              const active = sessionId === s.id;
              return (
                <button
                  key={s.id}
                  title={s.title || "新对话"}
                  className={cn(
                    "mb-1 flex h-10 w-full items-center justify-center rounded-xl text-[12px] transition-all",
                    active
                      ? "bg-white text-[#1d2129] shadow-[0_2px_8px_rgba(0,0,0,0.07)] font-medium"
                      : "text-[#4e5969] hover:bg-gray-100"
                  )}
                  onClick={() => setSessionId(s.id)}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        )}
      </aside>

      {mobileSidebarOpen ? (
        <div className="fixed inset-0 z-40 bg-black/35 md:hidden" onClick={() => setMobileSidebarOpen(false)}>
          <div className="h-full w-[260px] bg-[#fafbfc] p-2" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex items-center justify-between px-1">
              <button
                type="button"
                className="flex size-8 items-center justify-center rounded-xl text-[#4e5969] hover:bg-gray-100"
                onClick={() => setMobileSidebarOpen(false)}
              >
                <CloseIcon />
              </button>
              <button
                type="button"
                className="flex size-8 items-center justify-center rounded-xl text-[#4e5969] hover:bg-gray-100"
                onClick={async () => {
                  const created = await meowoneApi.createSession();
                  await loadSessions();
                  setSessionId(created.id);
                  setMobileSidebarOpen(false);
                }}
              >
                <NewChatIcon />
              </button>
            </div>
            <div className="custom-scrollbar h-[calc(100%-40px)] overflow-y-auto px-1">
              {sessions.map((s) => {
                const active = sessionId === s.id;
                return (
                  <button
                    key={`mobile-${s.id}`}
                    className={`group mb-1 flex w-full items-center gap-2 truncate rounded-xl px-3 py-2.5 text-left text-[13px] ${active ? "bg-white font-medium text-[#1d2129] shadow-sm" : "text-[#4e5969] hover:bg-gray-100"}`}
                    onClick={() => {
                      setSessionId(s.id);
                      setMobileSidebarOpen(false);
                    }}
                  >
                    <span className={active ? "text-blue-500" : "text-[#d0d5dd]"}>
                      <ChatBubbleIcon />
                    </span>
                    <span className="truncate">{s.title || "新对话"}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      <section className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
        {/* 实例选择栏 */}
        <div className="border-b border-gray-100 bg-gradient-to-r from-white to-gray-50 px-4 py-3">
          <div className="mx-auto flex w-full max-w-[760px] flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <InstanceSelector
                instances={instances}
                agents={agents}
                selectedTarget={selectedTarget}
                onSelect={handleSelectTarget}
                onCreateNew={() => {
                  window.location.href = "/meowone/instances/create";
                }}
                onManageAll={() => {
                  window.location.href = "/meowone/instances";
                }}
              />
              {currentTargetInfo && (
                <div className="flex items-center gap-2 text-xs text-[#6b7280]">
                  <span className={`rounded-full px-2 py-0.5 ${
                    currentTargetStatus === "running"
                      ? "bg-green-100 text-green-600"
                      : currentTargetStatus === "agent"
                        ? "bg-blue-100 text-blue-600"
                        : "bg-gray-100 text-gray-500"
                  }`}>
                    {currentTargetStatus === "running" ? "运行中" : currentTargetStatus === "agent" ? "智能体" : "已停止"}
                  </span>
                  {selectedTarget?.mode === "instance" && (currentTargetInfo as InstanceInfo).model_name && (
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-blue-600">
                      {(currentTargetInfo as InstanceInfo).model_name}
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="text-[12px] text-[#6b7280]">
              {!selectedTarget && instances.length > 0 && (
                <span className="text-amber-600">请选择一个实例或智能体开始对话</span>
              )}
              {!selectedTarget && instances.length === 0 && (
                <Link href="/meowone/instances/create" className="text-blue-500 hover:underline">
                  创建第一个实例
                </Link>
              )}
            </div>
          </div>
        </div>

        <header className="relative border-b border-gray-100 bg-gray-50/50 px-4 py-2.5 text-center">
          <button
            type="button"
            className="absolute left-4 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-xl text-[#4e5969] hover:bg-gray-100 md:hidden"
            onClick={() => setMobileSidebarOpen(true)}
            aria-label="打开会话列表"
          >
            <MenuIcon />
          </button>
          {historyCollapsed ? (
            <button
              title="展开历史栏"
              aria-label="展开历史栏"
              className="absolute left-4 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-xl text-[#4e5969] transition-all hover:bg-gray-100 hover:text-[#1d2129]"
              onClick={() => setHistoryCollapsed(false)}
            >
              <SidebarToggleIcon collapsed />
            </button>
          ) : null}
          <h1 className="text-[15px] font-semibold text-[#1d2129]">{currentTitle}</h1>
          <p className="text-[12px] text-[#6b7280]">内容由 AI 生成 · MeowOne</p>
        </header>
        <div id="meow-chat-scroll" ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-8 pt-8 sm:px-6 sm:pt-12">
          <div className="mx-auto w-full max-w-[760px] space-y-4">
            {!hasConversation ? (
              <div className="px-2 pb-10 pt-8 text-center sm:pt-14">
                <div className="mb-6 flex size-18 mx-auto items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white ring-8 ring-blue-50">
                  <ServerIcon />
                </div>
                <h2 className="text-[32px] font-semibold tracking-tight text-[#1d2129]">
                  {currentTargetName
                    ? `与 ${currentTargetName} 对话`
                    : "有什么我能帮你的吗？"}
                </h2>
                <p className="mt-3 text-[14px] text-[#86909c]">
                  {currentTargetName
                    ? "开始对话，测试你的目标"
                    : "请先选择一个实例或智能体"}
                </p>
                {!currentTargetName && instances.length === 0 && (
                  <Link
                    href="/meowone/instances/create"
                    className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-3 font-medium text-white transition-all hover:from-blue-600 hover:to-purple-700"
                  >
                    <PlusIcon />
                    创建第一个实例
                  </Link>
                )}
                <div className="mt-8 flex flex-wrap justify-center gap-2">
                  {suggestionPrompts.map((item) => (
                    <button
                      key={item}
                      onClick={() => setPrompt(item)}
                      className="rounded-xl border border-[#e5e6eb] bg-white px-4 py-2 text-[13px] text-[#4e5969] transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 hover:shadow-md"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            {messages.map((m) => {
              if (m.role !== "assistant") {
                return (
                  <div key={m.id} className="flex justify-end mb-6">
                    <div className="relative max-w-[80%] overflow-visible rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 px-6 py-4 pr-12 text-[14px] leading-6 text-white shadow-[0_4px_20px_rgba(59,130,246,0.3)]">
                      <CopyMessageButton text={m.content || ""} variant="user" />
                      <div className="whitespace-pre-wrap">{m.content}</div>
                    </div>
                  </div>
                );
              }

              const parts = filterRenderableParts(parseSegments(m.content || ""));
              const hasA2UI = parts.some((p) => p.type === "a2ui");
              if (!hasA2UI) {
                return (
                  <div key={m.id} className="flex justify-start mb-6">
                    <div className="relative w-full max-w-[80%] overflow-visible rounded-2xl border border-gray-100 bg-white px-6 py-4 pr-12 text-[14px] leading-6 text-[#1d2129] shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
                      <CopyMessageButton text={m.content || ""} variant="assistant" />
                      <RichContent content={m.content || ""} onA2UIAction={handleA2UIAction} />
                    </div>
                  </div>
                );
              }

              return (
                <div key={m.id} className="flex justify-start mb-6">
                  <div className="relative flex w-full max-w-[80%] flex-col gap-3 overflow-visible pr-10">
                    <CopyMessageButton text={m.content || ""} variant="assistant" />
                    {parts.map((part, idx) => {
                      if (part.type === "a2ui") {
                        const a2msgs = normalizeA2UIMessages(parseA2UIMessages(part.value));
                        if (!canRenderA2UI(a2msgs)) {
                          return (
                            <div key={`${m.id}-a2ui-invalid-${idx}`} className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                              A2UI 数据不完整，已跳过渲染（避免页面卡顿）。
                            </div>
                          );
                        }
                        return (
                          <div key={`${m.id}-a2ui-${idx}`} className="a2ui-standalone-card not-prose relative z-30 w-full overflow-visible rounded-2xl border border-gray-100 bg-white p-4 shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
                            <A2UIProvider messages={a2msgs} catalog={meowoneCatalog}>
                              <A2UIRenderer onAction={handleA2UIAction} />
                            </A2UIProvider>
                          </div>
                        );
                      }
                      if (part.type === "mermaid") {
                        return (
                          <div key={`${m.id}-mermaid-${idx}`} className="w-full rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
                            <MermaidBlock source={part.value} />
                          </div>
                        );
                      }
                      return (
                        <div key={`${m.id}-md-${idx}`} className="w-full rounded-2xl border border-gray-100 bg-white px-5 py-3.5 text-[14px] leading-6 text-[#1d2129] shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
                          <RichContent content={part.value} onA2UIAction={handleA2UIAction} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {/* 持久化的 thinking 消息 */}
            {thinkingMessages.map((m) => (
              <div
                key={`thinking-${m.id}`}
                className="max-w-[80%] rounded-2xl border border-blue-100 bg-blue-50 px-5 py-3.5 text-[13px] text-blue-800 mb-4 shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-400 [animation-delay:0ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-400 [animation-delay:150ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-400 [animation-delay:300ms]" />
                  </div>
                  <span>{m.description}</span>
                </div>
              </div>
            ))}
            {/* 持久化的 tool 消息 */}
            {toolMessages.length > 0 && (
              <div className="max-w-[80%] rounded-2xl border border-purple-100 bg-purple-50 px-5 py-3.5 text-[13px] text-purple-800 mb-4 shadow-sm">
                <div className="mb-2 font-medium">工具调用</div>
                <div className="flex flex-wrap gap-2">
                  {toolMessages.map((t) => (
                    <span
                      key={`tool-${t.toolCallId}`}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 shadow-sm ring-1 ring-purple-100"
                    >
                      {t.name}
                      {t.status === "running" && (
                        <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-purple-500 align-middle" />
                      )}
                      {t.status === "ok" && <span className="text-emerald-600">✓</span>}
                      {t.status === "error" && <span className="text-red-600">✗</span>}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {streaming ? (
              <div className="flex justify-start mb-6">
                <div className="relative w-full max-w-[80%] overflow-visible rounded-2xl border border-gray-100 bg-white px-6 py-4 pr-12 text-[14px] leading-6 text-[#1d2129] shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
                  <CopyMessageButton text={streaming} variant="assistant" />
                  <RichContent content={streaming} onA2UIAction={handleA2UIAction} />
                </div>
              </div>
            ) : null}
            {error ? <p className="text-sm text-red-500">{error}</p> : null}
          </div>
        </div>

        <div className="border-t border-gray-100 bg-white px-4 py-4 sm:px-6">
          <div className="mx-auto w-full max-w-[760px]">
            <div className="rounded-2xl border border-gray-200 bg-white px-3 py-2.5 shadow-[0_4px_24px_rgba(59,130,246,0.1)]">
              <div className="flex items-end gap-2">
                <textarea
                  ref={textareaRef}
                  value={prompt}
                  onCompositionStart={() => {
                    composingRef.current = true;
                  }}
                  onCompositionEnd={() => {
                    composingRef.current = false;
                  }}
                  onChange={(e) => {
                    setPrompt(e.target.value);
                    adjustTextareaHeight();
                  }}
                  placeholder={selectedTarget ? "输入消息... (输入 @ 召唤智能体)" : "选择实例后开始对话"}
                  rows={1}
                  disabled={!selectedTarget}
                  className="max-h-40 min-h-[48px] w-full resize-none border-0 bg-transparent py-2.5 text-[14px] font-normal leading-6 text-[#1d2129] antialiased outline-none placeholder:text-[#9aa0a6] disabled:cursor-not-allowed disabled:opacity-50"
                  onKeyDown={async (e) => {
                    if (composingRef.current || (e.nativeEvent as KeyboardEvent).isComposing) return;
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      await send();
                    }
                  }}
                />
                {loading ? (
                  <button
                    type="button"
                    onClick={stopGenerating}
                    className="mb-0.5 flex size-10 items-center justify-center rounded-full bg-gray-100 text-[#4e5969] transition-colors hover:bg-gray-200"
                    title="停止生成"
                    aria-label="停止生成"
                  >
                    <StopIcon />
                  </button>
                ) : (
                  <button
                    type="button"
                    className="mb-0.5 flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 text-white transition-all hover:from-blue-600 hover:to-indigo-600 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={!prompt.trim() || loading || !selectedTarget}
                    onClick={send}
                    aria-label="发送"
                  >
                    <SendIcon />
                  </button>
                )}
              </div>
              <MentionPicker inputRef={textareaRef} onSelect={handleMentionSelect} />
            </div>
          </div>
        </div>
      </section>
    </div>
    </>
  );
}

function ChatLoading() {
  return (
    <div className="flex h-full items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-3">
        <div className="size-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        <span className="text-sm text-gray-500">加载中...</span>
      </div>
    </div>
  );
}

export default function MeowChatPage() {
  return (
    <Suspense fallback={<ChatLoading />}>
      <ChatContent />
    </Suspense>
  );
}
