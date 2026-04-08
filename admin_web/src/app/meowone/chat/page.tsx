"use client";

import { A2UIProvider, A2UIRenderer, standardCatalog, useDataBinding, useDispatchAction, type A2UIAction } from "@a2ui-sdk/react/0.8";
import type { A2UIMessage } from "@a2ui-sdk/types/0.8";
import { useEffect, useMemo, useRef, useState } from "react";
import Markdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import { meowoneApi, type ChatEvent, type Message, type Session } from "@/lib/meowone-api";
import { cn } from "@/lib/utils";

type Segment = { type: "markdown" | "a2ui" | "mermaid"; value: string };
type StreamingTool = { toolCallId: string; name: string; status: "running" | "ok" | "error" };
const A2UI_BLOCK_START = "---A2UI-START---";
const A2UI_BLOCK_END = "---A2UI-END---";

function looksLikeA2UIPayload(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  return t.includes("\"surfaceUpdate\"") || t.includes("\"beginRendering\"") || t.includes("\"surfaceId\"");
}

function parseSegments(content: string): Segment[] {
  const chunks: Segment[] = [];

  // 1) Split custom transport blocks: ---A2UI-START--- ... ---A2UI-END---
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

  // 2) Further split markdown chunks by fenced blocks.
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
      // Model output often has trailing commas.
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
    // Heuristic: if only one explicit surface exists, treat "default" surfaceUpdate as that surface.
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
    // Fix invalid/empty root: point to first component id in same surface.
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

  // Parse whole JSON first.
  const parsed = tryParseJSON(src);
  if (parsed !== null) return ensureRenderable(expandAny(parsed));

  // Fallback: JSONL / SSE lines.
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

    // alias common model names
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

function RichContent({ content, onA2UIAction }: { content: string; onA2UIAction?: (action: A2UIAction) => void }) {
  const parts = useMemo(() => parseSegments(content), [content]);
  return (
    <div className="space-y-3">
      {parts.map((part, idx) => {
        if (part.type === "markdown") {
          return (
            <div
              key={`md-${idx}`}
              className="prose prose-sm max-w-none text-[#111827] [&_p]:my-2 [&_p]:text-[#111827] [&_li]:text-[#111827] [&_strong]:text-[#030712] [&_code]:rounded [&_code]:bg-[#f3f4f6] [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[#111827] [&_pre]:rounded-xl [&_pre]:border [&_pre]:border-[#d1d5db] [&_pre]:bg-[#f8fafc] [&_pre]:p-4 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-[#111827] [&_.hljs]:bg-transparent [&_.hljs]:text-[#111827]"
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

export default function MeowChatPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionId, setSessionId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [prompt, setPrompt] = useState("");
  const [streaming, setStreaming] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [defaultModelName, setDefaultModelName] = useState("未配置");
  const [schedulerMode] = useState("direct");
  const [channelId] = useState("web");
  const [historyCollapsed, setHistoryCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [thinking, setThinking] = useState<string | null>(null);
  const [streamingTools, setStreamingTools] = useState<StreamingTool[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const composingRef = useRef(false);

  const loadSessions = async () => {
    const list = await meowoneApi.listSessions();
    setSessions(list);
    if (!sessionId && list[0]) setSessionId(list[0].id);
  };

  useEffect(() => {
    loadSessions().catch((e: Error) => setError(e.message));
    meowoneApi
      .listModels()
      .then((res) => {
        const found = (res.models || []).find((m) => Boolean((m as Record<string, unknown>).is_default));
        setDefaultModelName(String((found as Record<string, unknown> | undefined)?.name || "未配置"));
      })
      .catch(() => setDefaultModelName("未配置"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    meowoneApi.listMessages(sessionId).then(setMessages).catch((e: Error) => setError(e.message));
  }, [sessionId]);

  const onStreamEvent = (evt: ChatEvent) => {
    switch (evt.event) {
      case "thinking": {
        const desc = evt.data.description;
        setThinking(typeof desc === "string" ? desc : "思考中...");
        break;
      }
      case "delta": {
        const delta = evt.data.content;
        if (typeof delta === "string") setStreaming((v) => v + delta);
        if (evt.data.done === true) setThinking(null);
        break;
      }
      case "tool_call": {
        const toolCallId = evt.data.toolCallId;
        const name = evt.data.name;
        if (typeof toolCallId === "string" && typeof name === "string") {
          setStreamingTools((prev) => [...prev, { toolCallId, name, status: "running" }]);
        }
        break;
      }
      case "tool_result": {
        const toolCallId = evt.data.toolCallId;
        const ok = evt.data.ok === true;
        if (typeof toolCallId === "string") {
          setStreamingTools((prev) =>
            prev.map((row) => (row.toolCallId === toolCallId ? { ...row, status: ok ? "ok" : "error" } : row)),
          );
        }
        break;
      }
      case "done":
      case "error":
        setThinking(null);
        setStreamingTools([]);
        break;
      default:
        break;
    }
  };

  const stopGenerating = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setLoading(false);
    setThinking(null);
    setStreamingTools([]);
  };

  const send = async () => {
    if (!prompt.trim() || loading) return;
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
    setStreaming("");
    setError("");
    setLoading(true);
    setThinking(null);
    setStreamingTools([]);
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
      await meowoneApi.streamChat(targetSessionId, { content: text, channel_id: "web" }, onStreamEvent, {
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
      setThinking(null);
      setStreamingTools([]);
    }
  };

  const handleA2UIAction = async (action: A2UIAction) => {
    if (!sessionId || loading) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setStreaming("");
    setError("");
    setLoading(true);
    setThinking(null);
    setStreamingTools([]);
    try {
      await meowoneApi.streamA2UIAction(
        sessionId,
        { action: action as unknown as Record<string, unknown>, channel_id: "web" },
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
      setThinking(null);
      setStreamingTools([]);
    }
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, streaming, thinking, streamingTools]);

  const adjustTextareaHeight = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  };

  const currentTitle = sessions.find((s) => s.id === sessionId)?.title || "新对话";
  const hasConversation = messages.length > 0 || Boolean(streaming);
  const suggestionPrompts = [
    "帮我总结一下今天的工作重点",
    "写一段包含代码高亮的前端示例",
    "用 Mermaid 画一个登录流程图",
    "生成一个 A2UI 示例界面",
  ];

  return (
    <>
    <style jsx global>{`
      /* Keep A2UI dropdown/popover above chat layers */
      [data-slot="select-content"] { z-index: 350 !important; }
      .a2ui-standalone-card,
      .a2ui-standalone-card * { overflow: visible; }
    `}</style>
    <div
      className={cn("grid h-full min-h-0 flex-1 grid-cols-1 overflow-hidden bg-[#f5f6f7]", historyCollapsed ? "md:grid-cols-1" : "md:grid-cols-[268px_1fr]")}
    >
      <aside className={cn("hidden min-h-0 flex-col border-r border-[#e9edf3] bg-[#f7f8fa] md:flex", historyCollapsed && "md:hidden")}>
        <div className={`flex items-center ${historyCollapsed ? "justify-center px-1" : "justify-between px-3"} pb-2 pt-3`}>
          {!historyCollapsed ? (
          <button
            title="新建会话"
            aria-label="新建会话"
            className="flex size-9 items-center justify-center rounded-[10px] text-[#4e5969] transition-colors hover:bg-[#e9edf3] hover:text-[#1d2129]"
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
            className="flex size-9 items-center justify-center rounded-[10px] text-[#4e5969] transition-colors hover:bg-[#e9edf3] hover:text-[#1d2129]"
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
            className="w-full rounded-[10px] border-0 bg-white py-2 pl-3 pr-2 text-[12px] text-[#1d2129] shadow-[0_0_0_1px_rgba(0,0,0,0.05)] placeholder:text-[#c9cdd4] outline-none"
          />
        </div>
        <div className="px-3 pb-1 text-[11px] font-medium uppercase tracking-[0.06em] text-[#86909c]">历史对话</div>
        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-2 pb-3">
          {sessions.map((s) => {
            const active = sessionId === s.id;
            return (
              <button
                key={s.id}
                className={`group mb-1 block w-full truncate rounded-[10px] px-3 py-2 text-left text-[13px] ${active ? "bg-white font-medium text-[#1d2129] shadow-[0_0_0_1px_rgba(0,0,0,0.06)]" : "text-[#4e5969] hover:bg-[#eceff3] hover:text-[#1d2129]"}`}
                onClick={() => setSessionId(s.id)}
              >
                <span className="inline-flex w-full items-center justify-between gap-2">
                  <span className="truncate">{s.title || "新对话"}</span>
                  <span
                    role="button"
                    tabIndex={0}
                    className="hidden rounded p-0.5 text-[#9aa0a6] hover:bg-black/[0.04] hover:text-[#ef4444] group-hover:inline-flex"
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
          <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-1 pb-3">
            {sessions.map((s, idx) => {
              const active = sessionId === s.id;
              return (
                <button
                  key={s.id}
                  title={s.title || "新对话"}
                  className={`mb-1 flex h-9 w-full items-center justify-center rounded-[10px] text-[12px] ${active ? "bg-white text-[#1d2129]" : "text-[#4e5969] hover:bg-[#eceff3]"}`}
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
          <div className="h-full w-[260px] bg-[#f7f8fa] p-2" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex items-center justify-between px-1">
              <button
                type="button"
                className="flex size-8 items-center justify-center rounded-[8px] text-[#4e5969] hover:bg-[#e9edf3]"
                onClick={() => setMobileSidebarOpen(false)}
              >
                <CloseIcon />
              </button>
              <button
                type="button"
                className="flex size-8 items-center justify-center rounded-[8px] text-[#4e5969] hover:bg-[#e9edf3]"
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
                    className={`mb-1 block w-full truncate rounded-[10px] px-3 py-2 text-left text-[13px] ${active ? "bg-white font-medium text-[#1d2129]" : "text-[#4e5969] hover:bg-[#eceff3]"}`}
                    onClick={() => {
                      setSessionId(s.id);
                      setMobileSidebarOpen(false);
                    }}
                  >
                    {s.title || "新对话"}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      <section className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
        <header className="relative border-b border-[#e5e7eb] px-4 py-2 text-center">
          <button
            type="button"
            className="absolute left-4 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-[9px] text-[#4e5969] hover:bg-[#f5f6f7] md:hidden"
            onClick={() => setMobileSidebarOpen(true)}
            aria-label="打开会话列表"
          >
            <MenuIcon />
          </button>
          {historyCollapsed ? (
            <button
              title="展开历史栏"
              aria-label="展开历史栏"
              className="absolute left-4 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-[9px] text-[#4e5969] transition-colors hover:bg-[#f5f6f7] hover:text-[#1d2129]"
              onClick={() => setHistoryCollapsed(false)}
            >
              <SidebarToggleIcon collapsed />
            </button>
          ) : null}
          <h1 className="text-[15px] font-semibold text-[#1d2129]">{currentTitle}</h1>
          <p className="text-[12px] text-[#6b7280]">内容由 AI 生成 · MeowOne</p>
        </header>
        <div className="border-b border-[#eef0f3] bg-[#fafbfc] px-4 py-2">
          <div className="mx-auto flex w-full max-w-[760px] flex-wrap items-center gap-2 text-[12px] text-[#4e5969]">
            <span className="rounded-full border border-[#dbe2ea] bg-white px-2 py-0.5">模型: {defaultModelName}</span>
            <span className="rounded-full border border-[#dbe2ea] bg-white px-2 py-0.5">调度: {schedulerMode}</span>
            <span className="rounded-full border border-[#dbe2ea] bg-white px-2 py-0.5">渠道: {channelId}</span>
          </div>
        </div>
        <div id="meow-chat-scroll" ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-8 pt-8 sm:px-6 sm:pt-12">
          <div className="mx-auto w-full max-w-[760px] space-y-4">
            {!hasConversation ? (
              <div className="px-2 pb-10 pt-8 text-center sm:pt-14">
                <h2 className="text-[40px] font-semibold tracking-tight text-[#1d2129]">有什么我能帮你的吗？</h2>
                <p className="mt-3 text-[14px] text-[#86909c]">支持 Markdown、代码高亮、Mermaid 和 A2UI。</p>
                <div className="mt-8 flex flex-wrap justify-center gap-2">
                  {suggestionPrompts.map((item) => (
                    <button
                      key={item}
                      onClick={() => setPrompt(item)}
                      className="rounded-full border border-[#e5e6eb] bg-white px-4 py-2 text-[13px] text-[#4e5969] hover:border-[#c9cdd4] hover:text-[#1d2129]"
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
                  <div key={m.id} className="flex justify-end">
                    <div className="max-w-[86%] rounded-[18px] bg-[#eaf2ff] px-4 py-3 text-[15px] leading-7 text-[#1d2129]">
                      <div className="whitespace-pre-wrap">{m.content}</div>
                    </div>
                  </div>
                );
              }

              const parts = parseSegments(m.content || "");
              const hasA2UI = parts.some((p) => p.type === "a2ui");
              if (!hasA2UI) {
                return (
                  <div key={m.id} className="flex justify-start">
                    <div className="w-full max-w-[92%] rounded-[18px] border border-[#e6eaf2] bg-white px-4 py-3 text-[15px] leading-7 text-[#1d2129]">
                      <RichContent content={m.content || ""} onA2UIAction={handleA2UIAction} />
                    </div>
                  </div>
                );
              }

              return (
                <div key={m.id} className="flex justify-start">
                  <div className="flex w-full max-w-[92%] flex-col gap-2">
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
                          <div key={`${m.id}-a2ui-${idx}`} className="a2ui-standalone-card not-prose relative z-30 w-full overflow-visible rounded-[18px] border border-[#e6eaf2] bg-[#fcfdff] p-4 shadow-[0_2px_10px_rgba(29,33,41,0.06)]">
                            <A2UIProvider messages={a2msgs} catalog={meowoneCatalog}>
                              <A2UIRenderer onAction={handleA2UIAction} />
                            </A2UIProvider>
                          </div>
                        );
                      }
                      if (part.type === "mermaid") {
                        return (
                          <div key={`${m.id}-mermaid-${idx}`} className="w-full rounded-[18px] border border-[#e6eaf2] bg-white px-4 py-3">
                            <MermaidBlock source={part.value} />
                          </div>
                        );
                      }
                      return (
                        <div key={`${m.id}-md-${idx}`} className="w-full rounded-[18px] border border-[#e6eaf2] bg-white px-4 py-3 text-[15px] leading-7 text-[#1d2129]">
                          <RichContent content={part.value} onA2UIAction={handleA2UIAction} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {streamingTools.length ? (
              <div className="max-w-[86%] rounded-[14px] border border-[#dbeafe] bg-[#eff6ff] px-3.5 py-2 text-[12px] text-[#1e3a8a]">
                <div className="mb-1 font-medium text-blue-800/90">工具</div>
                <div className="flex flex-wrap gap-2">
                  {streamingTools.map((t, idx) => (
                    <span
                      key={`${t.toolCallId}-${idx}`}
                      className="rounded-lg bg-white/90 px-2.5 py-0.5 shadow-sm ring-1 ring-blue-100"
                      title={t.toolCallId}
                    >
                      {t.name}
                      {t.status === "running" && (
                        <span className="ml-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500 align-middle" />
                      )}
                      {t.status === "ok" && <span className="ml-1 text-emerald-600">✓</span>}
                      {t.status === "error" && <span className="ml-1 text-red-600">✗</span>}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
            {streaming ? (
              <div className="max-w-[86%] rounded-[18px] border border-[#e6eaf2] bg-white px-4 py-3 text-[15px] leading-7 text-[#1d2129]">
                <RichContent content={streaming} onA2UIAction={handleA2UIAction} />
              </div>
            ) : null}
            {thinking ? (
              <div className="max-w-[86%] rounded-[14px] border border-[#e5e7eb] bg-[#f8fafc] px-3.5 py-2.5 text-[13px] text-[#4b5563]">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:0ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:150ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:300ms]" />
                  </div>
                  <span>{thinking}</span>
                </div>
              </div>
            ) : null}
            {error ? <p className="text-sm text-red">{error}</p> : null}
          </div>
        </div>

        <div className="border-t border-[#e5e7eb] bg-white/95 px-4 py-4 backdrop-blur sm:px-6">
          <div className="mx-auto w-full max-w-[760px]">
            <div className="rounded-[20px] border border-[#e5e7eb] bg-white px-3 py-2.5 shadow-[0_6px_20px_rgba(29,33,41,0.08)]">
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
                  placeholder="发消息..."
                  rows={1}
                  className="max-h-40 min-h-[48px] w-full resize-none border-0 bg-transparent py-2.5 text-[15px] font-normal leading-7 text-[#1d2129] antialiased outline-none placeholder:text-[#9aa0a6] placeholder:text-[14px]"
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
                    className="mb-0.5 flex size-10 items-center justify-center rounded-full bg-[#eef2f7] text-[#4e5969] transition-colors hover:bg-[#e7edf5]"
                    title="停止生成"
                    aria-label="停止生成"
                  >
                    <StopIcon />
                  </button>
                ) : (
                  <button
                    type="button"
                    className="mb-0.5 flex size-10 items-center justify-center rounded-full bg-[#2f7dff] text-white"
                    disabled={!prompt.trim() || loading}
                    onClick={send}
                    aria-label="发送"
                  >
                    <SendIcon />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
    </>
  );
}
