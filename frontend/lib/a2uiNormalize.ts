/**
 * 将模型输出的 A2UI JSON 规范化为 @a2ui-sdk/react v0.8 可消费的形态。
 * 解决：仅 surfaceUpdate、root 为空、组件 type 小写、缺少 id、蛇形字段名等导致的空白渲染。
 */
import type {
  A2UIMessage,
  ComponentDefinition,
  BeginRenderingPayload,
  DataEntry,
} from "@a2ui-sdk/types/0.8";

const TYPE_ALIASES: Record<string, string> = {
  text: "Text",
  image: "Image",
  icon: "Icon",
  video: "Video",
  audioplayer: "AudioPlayer",
  divider: "Divider",
  row: "Row",
  column: "Column",
  /** 模型/文档中的容器名，标准目录无 Surface，映射为 Column */
  surface: "Column",
  list: "List",
  card: "Card",
  tabs: "Tabs",
  modal: "Modal",
  button: "Button",
  checkbox: "CheckBox",
  textfield: "TextField",
  datetimeinput: "DateTimeInput",
  multiplechoice: "MultipleChoice",
  /** 模型常写 Select/Dropdown，标准目录只有 MultipleChoice */
  select: "MultipleChoice",
  dropdown: "MultipleChoice",
  combobox: "MultipleChoice",
  slider: "Slider",
};

function pascalComponentKey(key: string): string {
  const k = key.trim();
  const lower = k.toLowerCase();
  return TYPE_ALIASES[lower] ?? (k.charAt(0).toUpperCase() + k.slice(1));
}

function normalizeComponentMap(
  component: Record<string, unknown> | undefined,
): ComponentDefinition["component"] {
  if (!component || typeof component !== "object") {
    return { Text: { text: { literalString: "" } } };
  }
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(component)) {
    out[pascalComponentKey(key)] = val;
  }
  return out as ComponentDefinition["component"];
}

/**
 * SDK 要求 Column/Row/List 的 children 为 `{ explicitList: ["id1","id2"] }`，
 * 子组件必须是 surface.components 里的**平铺**条目。模型常把子节点嵌在 children 数组里 → 空白容器。
 */
function flattenLayoutChildren(
  components: ComponentDefinition[],
  surfaceId: string,
): ComponentDefinition[] {
  const out: ComponentDefinition[] = [];

  for (const comp of components) {
    const entries = Object.entries(comp.component ?? {});
    if (entries.length !== 1) {
      out.push(comp);
      continue;
    }
    const [typeName, rawProps] = entries[0] as [string, Record<string, unknown>];
    if (!["Column", "Row", "List", "Surface"].includes(typeName)) {
      out.push(comp);
      continue;
    }
    const layoutType = typeName === "Surface" ? "Column" : typeName;
    const props = { ...rawProps };
    const ch = props.children;

    if (
      ch &&
      typeof ch === "object" &&
      !Array.isArray(ch) &&
      Array.isArray((ch as { explicitList?: unknown }).explicitList) &&
      (ch as { explicitList: unknown[] }).explicitList.every((x) => typeof x === "string")
    ) {
      out.push(comp);
      continue;
    }

    if (!Array.isArray(ch) || ch.length === 0) {
      out.push(comp);
      continue;
    }

    const first = ch[0];
    if (typeof first !== "object" || first === null) {
      out.push(comp);
      continue;
    }

    const looksNested =
      "component" in first ||
      inferLooseComponent(first as Record<string, unknown>) !== null;
    if (!looksNested) {
      out.push(comp);
      continue;
    }

    const ids: string[] = [];
    const nestedOut: ComponentDefinition[] = [];
    for (let i = 0; i < ch.length; i++) {
      const nested = coerceComponentDefinition(
        ch[i],
        out.length + nestedOut.length + i,
      );
      ids.push(nested.id);
      nestedOut.push(nested);
    }
    props.children = { explicitList: ids };
    nestedOut.forEach((n) => out.push(n));
    out.push({
      ...comp,
      component: { [layoutType]: props } as ComponentDefinition["component"],
    });
  }

  return out;
}

/**
 * SDK `resolveValue` 对 source 使用 `'literalString' in source`；
 * 原始类型里只有 **boolean**（及少数情况）会对 `in` 抛错，**必须**包成 ValueSource 对象。
 */
function coerceValueSource(v: unknown): unknown {
  if (v === null || v === undefined) return { literalString: "" };
  if (typeof v === "string") return { literalString: v };
  if (typeof v === "number") return { literalNumber: v };
  if (typeof v === "boolean") return { literalBoolean: v };
  return v;
}

/** 若已是 `{ path }` / `{ literalString }` 等对象则保留 */
function ensureValueSourceField(v: unknown): unknown {
  if (v === null || v === undefined) return { literalString: "" };
  if (typeof v === "object" && !Array.isArray(v)) {
    return v;
  }
  return coerceValueSource(v);
}

function normalizeMultipleChoiceProps(props: Record<string, unknown>): Record<string, unknown> {
  const out = { ...props };
  if (out.label !== undefined) {
    out.label = ensureValueSourceField(out.label);
  }
  if (typeof out.selections === "string") {
    out.selections = coerceValueSource(out.selections);
  }
  if (out.maxAllowedSelections === undefined) {
    out.maxAllowedSelections = 1;
  }
  const opts = out.options;
  if (!Array.isArray(opts) || opts.length === 0) {
    return out;
  }
  const first = opts[0];
  if (typeof first === "string") {
    out.options = opts.map((s: string) => ({
      value: s,
      label: { literalString: s },
    }));
    return out;
  }
  if (typeof first === "object" && first !== null) {
    out.options = opts.map((item: unknown, i: number) => {
      if (typeof item === "string") {
        return { value: item, label: { literalString: item } };
      }
      const o = item as Record<string, unknown>;
      const value = String(o.value ?? o.id ?? o.key ?? `opt-${i}`);
      if (o.label !== undefined) {
        return { value, label: ensureValueSourceField(o.label) };
      }
      return { value, label: { literalString: value } };
    });
  }
  return out;
}

function normalizeTextProps(props: Record<string, unknown>): Record<string, unknown> {
  const out = { ...props };
  if ("text" in out && out.text !== undefined) {
    out.text = ensureValueSourceField(out.text);
  }
  return out;
}

function normalizeButtonProps(props: Record<string, unknown>): Record<string, unknown> {
  const out = { ...props };
  const rawAction = out.action;
  if (rawAction && typeof rawAction === "object" && !Array.isArray(rawAction)) {
    const a = { ...(rawAction as Record<string, unknown>) };
    const name = String(a.name ?? a.type ?? "button.click");
    let context = a.context;

    // Common model output: { action: { name, arguments: {...} } } or payload/data.
    // A2UI v0.8 expects `context` to be an iterable array of { key, value }.
    if (!Array.isArray(context)) {
      const obj =
        (a.arguments as Record<string, unknown>) ??
        (a.payload as Record<string, unknown>) ??
        (a.data as Record<string, unknown>) ??
        null;
      if (obj && typeof obj === "object" && !Array.isArray(obj)) {
        context = Object.entries(obj).map(([k, v]) => ({
          key: k,
          value: ensureValueSourceField(v),
        }));
      } else {
        context = [];
      }
    } else {
      context = context
        .map((item) => {
          if (!item || typeof item !== "object" || Array.isArray(item)) return null;
          const e = item as Record<string, unknown>;
          const key = String(e.key ?? e.name ?? "");
          if (!key) return null;
          return { key, value: ensureValueSourceField(e.value) };
        })
        .filter(Boolean);
    }

    out.action = { name, context };
  }

  if (out.label !== undefined) {
    out.label = ensureValueSourceField(out.label);
    return out;
  }

  const candidate = out.text ?? out.title ?? out.name ?? out.value;
  if (
    candidate !== undefined &&
    candidate !== null &&
    (typeof candidate === "string" || typeof candidate === "number" || typeof candidate === "boolean")
  ) {
    out.label = ensureValueSourceField(candidate);
  }
  return out;
}

/** 兜底：任意组件里常见的 ValueSource 字段若仍是原始类型，统一包一层 */
function sanitizeGenericComponentProps(props: Record<string, unknown>): Record<string, unknown> {
  const out = { ...props };
  const keys = [
    "label",
    "text",
    "title",
    "placeholder",
    "description",
    "caption",
    "hint",
    "alt",
    "name",
    "value",
  ] as const;
  for (const k of keys) {
    if (!(k in out) || out[k] === undefined) continue;
    const v = out[k];
    if (v === null || typeof v === "boolean" || typeof v === "number" || typeof v === "string") {
      (out as Record<string, unknown>)[k] = coerceValueSource(v);
    }
  }
  if ("selections" in out && out.selections !== undefined) {
    const sv = out.selections;
    if (sv === null || typeof sv === "boolean") {
      out.selections = coerceValueSource(sv);
    }
  }
  if (Array.isArray(out.options)) {
    out.options = (out.options as unknown[]).map((item, i) => {
      if (typeof item === "string") {
        return { value: item, label: { literalString: item } };
      }
      if (item && typeof item === "object" && !Array.isArray(item)) {
        const o = item as Record<string, unknown>;
        const value = String(o.value ?? o.id ?? o.key ?? `opt-${i}`);
        if (o.label !== undefined) {
          return { ...o, value, label: ensureValueSourceField(o.label) };
        }
        return { ...o, value, label: { literalString: value } };
      }
      return item;
    });
  }
  return out;
}

function normalizeComponentProps(def: ComponentDefinition): ComponentDefinition {
  const entries = Object.entries(def.component ?? {});
  if (entries.length !== 1) return def;
  const [typeName, props] = entries[0] as [string, Record<string, unknown>];
  let nextProps: Record<string, unknown>;
  if (typeName === "Surface") {
    return normalizeComponentProps({
      ...def,
      component: { Column: props } as ComponentDefinition["component"],
    });
  }
  if (typeName === "MultipleChoice") {
    nextProps = normalizeMultipleChoiceProps(props);
  } else if (typeName === "Text") {
    nextProps = normalizeTextProps(props);
  } else if (typeName === "Button") {
    nextProps = normalizeButtonProps(props);
  } else if (typeName === "CheckBox") {
    const p = { ...props };
    if (p.label !== undefined) p.label = ensureValueSourceField(p.label);
    if (p.value !== undefined) p.value = ensureValueSourceField(p.value);
    nextProps = p;
  } else {
    nextProps = { ...props };
  }
  nextProps = sanitizeGenericComponentProps(nextProps);
  return {
    ...def,
    component: { [typeName]: nextProps } as ComponentDefinition["component"],
  };
}

/** 模型省略 `component` 包装，直接写 `{ "Text": { ... } }` 与 id 并列 */
function inferLooseComponent(o: Record<string, unknown>): ComponentDefinition["component"] | null {
  if (o.component && typeof o.component === "object") return null;
  const candidates: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) {
    if (k === "id" || k === "weight") continue;
    candidates[pascalComponentKey(k)] = v;
  }
  const keys = Object.keys(candidates);
  if (keys.length !== 1) return null;
  return normalizeComponentMap(candidates);
}

function coerceComponentDefinition(raw: unknown, index: number): ComponentDefinition {
  if (!raw || typeof raw !== "object") {
    return normalizeComponentProps({
      id: `auto-${index}`,
      component: { Text: { text: { literalString: "" } } },
    });
  }
  const o = raw as Record<string, unknown>;

  if (typeof o.type === "string" && !o.component) {
    const typeName = pascalComponentKey(o.type);
    const props = (o.props as Record<string, unknown>) ?? {};
    return normalizeComponentProps({
      id: String(o.id ?? `c${index}`),
      weight: typeof o.weight === "number" ? o.weight : undefined,
      component: { [typeName]: props } as ComponentDefinition["component"],
    });
  }

  let component: ComponentDefinition["component"];
  if (o.component && typeof o.component === "object" && Object.keys(o.component).length > 0) {
    component = normalizeComponentMap(o.component as Record<string, unknown>);
  } else {
    const inferred = inferLooseComponent(o);
    component = inferred ?? normalizeComponentMap(undefined);
  }

  const id = String(o.id ?? `c${index}`);
  return normalizeComponentProps({
    id,
    weight: typeof o.weight === "number" ? o.weight : undefined,
    component,
  });
}

function coerceSurfaceUpdate(raw: Record<string, unknown>): {
  surfaceId: string;
  components: ComponentDefinition[];
} {
  const sid = String(raw.surfaceId ?? raw.surface_id ?? "default");
  const arr = raw.components ?? raw.Components;
  const list = Array.isArray(arr) ? arr : [];
  let components = list.map((c, i) => coerceComponentDefinition(c, i));
  components = flattenLayoutChildren(components, sid);
  return { surfaceId: sid, components };
}

function coerceBeginRendering(raw: Record<string, unknown>): BeginRenderingPayload {
  return {
    surfaceId: String(raw.surfaceId ?? raw.surface_id ?? "default"),
    root: String(raw.root ?? ""),
    styles: (raw.styles as BeginRenderingPayload["styles"]) ?? {},
    catalogId: raw.catalogId as string | undefined,
  };
}

export function coerceA2UIMessage(raw: unknown): A2UIMessage | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;

  if ("beginRendering" in o || "begin_rendering" in o) {
    const p = (o.beginRendering ?? o.begin_rendering) as Record<string, unknown>;
    return { beginRendering: coerceBeginRendering(p) };
  }
  if ("surfaceUpdate" in o || "surface_update" in o) {
    const p = (o.surfaceUpdate ?? o.surface_update) as Record<string, unknown>;
    return { surfaceUpdate: coerceSurfaceUpdate(p) };
  }
  if ("dataModelUpdate" in o || "data_model_update" in o) {
    const p = (o.dataModelUpdate ?? o.data_model_update) as Record<string, unknown>;
    return {
      dataModelUpdate: {
        surfaceId: String(p.surfaceId ?? p.surface_id ?? "default"),
        path: p.path as string | undefined,
        contents: Array.isArray(p.contents) ? (p.contents as DataEntry[]) : [],
      },
    };
  }
  if ("deleteSurface" in o || "delete_surface" in o) {
    const p = (o.deleteSurface ?? o.delete_surface) as Record<string, unknown>;
    return {
      deleteSurface: { surfaceId: String(p.surfaceId ?? p.surface_id ?? "default") },
    };
  }
  return null;
}

/**
 * 单个 JSON 对象里可能同时出现 beginRendering + surfaceUpdate（旧版 coerce 只认第一个分支会丢消息）。
 * 按协议顺序展开为多条消息。
 */
function expandCombinedObject(o: Record<string, unknown>): A2UIMessage[] {
  const br = o.beginRendering ?? o.begin_rendering;
  const su = o.surfaceUpdate ?? o.surface_update;
  const dm = o.dataModelUpdate ?? o.data_model_update;
  const ds = o.deleteSurface ?? o.delete_surface;
  const out: A2UIMessage[] = [];
  if (br)
    out.push({
      beginRendering: coerceBeginRendering(br as Record<string, unknown>),
    });
  if (dm) {
    const p = dm as Record<string, unknown>;
    out.push({
      dataModelUpdate: {
        surfaceId: String(p.surfaceId ?? p.surface_id ?? "default"),
        path: p.path as string | undefined,
        contents: Array.isArray(p.contents) ? (p.contents as DataEntry[]) : [],
      },
    });
  }
  if (su)
    out.push({
      surfaceUpdate: coerceSurfaceUpdate(su as Record<string, unknown>),
    });
  if (ds) {
    const p = ds as Record<string, unknown>;
    out.push({
      deleteSurface: { surfaceId: String(p.surfaceId ?? p.surface_id ?? "default") },
    });
  }
  if (out.length > 0) return out;
  const single = coerceA2UIMessage(o);
  return single ? [single] : [];
}

function expandItemToMessages(item: unknown): A2UIMessage[] {
  if (item === null || item === undefined) return [];
  if (Array.isArray(item)) {
    return item.flatMap((x) => expandItemToMessages(x));
  }
  if (typeof item !== "object") return [];
  const o = item as Record<string, unknown>;
  if (Array.isArray(o.messages)) {
    return expandItemToMessages(o.messages);
  }
  if (Array.isArray(o.a2ui)) {
    return expandItemToMessages(o.a2ui);
  }
  return expandCombinedObject(o);
}

/** 从「前面有说明文字」的文本里抠出第一个完整 JSON 对象/数组（支持多行）。 */
export function extractFirstJsonValue(s: string): string | null {
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
    if (c === '"') {
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
}

function parseJsonLenient(s: string): unknown | null {
  const t = s.trim();
  if (!t) return null;
  try {
    return JSON.parse(t);
  } catch {
    /* trailing commas — 模型常见 */
    let fixed = t;
    for (let i = 0; i < 8; i++) {
      const next = fixed.replace(/,(\s*[}\]])/g, "$1");
      if (next === fixed) break;
      fixed = next;
      try {
        return JSON.parse(fixed);
      } catch {
        /* continue */
      }
    }
  }
  return null;
}

function pickRootComponentId(components: ComponentDefinition[], surfaceId: string): string {
  if (!components.length) return `${surfaceId}-root`;
  const prefer = components.find((c) => {
    const keys = Object.keys(c.component ?? {});
    return keys.some((k) =>
      [
        "Column",
        "Row",
        "List",
        "Card",
        "Tabs",
        "Modal",
        "MultipleChoice",
      ].includes(k),
    );
  });
  const id = prefer?.id ?? components[0]?.id;
  return id?.trim() ? id : `${surfaceId}-root`;
}

function patchEmptyBeginRoots(messages: A2UIMessage[]): A2UIMessage[] {
  const result = [...messages];
  for (let i = 0; i < result.length; i++) {
    const m = result[i];
    if (!m?.beginRendering) continue;
    const br = m.beginRendering;
    if (br.root && String(br.root).trim() !== "") continue;
    const sid = br.surfaceId;
    for (let j = i + 1; j < result.length; j++) {
      const su = result[j]?.surfaceUpdate;
      if (su?.surfaceId === sid && su.components?.length) {
        const root = pickRootComponentId(su.components, sid);
        result[i] = { beginRendering: { ...br, root } };
        break;
      }
    }
  }
  return result;
}

/** 注入缺失的 beginRendering、修正指向不存在组件的 root */
export function ensureSurfacesRenderable(messages: A2UIMessage[]): A2UIMessage[] {
  const componentIdsBySurface = new Map<string, Set<string>>();
  for (const m of messages) {
    if (!m.surfaceUpdate) continue;
    const { surfaceId, components } = m.surfaceUpdate;
    if (!componentIdsBySurface.has(surfaceId)) {
      componentIdsBySurface.set(surfaceId, new Set());
    }
    const set = componentIdsBySurface.get(surfaceId)!;
    for (const c of components ?? []) {
      if (c?.id) set.add(c.id);
    }
  }

  const hasBegin = new Set<string>();
  for (const m of messages) {
    if (m.beginRendering) hasBegin.add(m.beginRendering.surfaceId);
  }

  const out: A2UIMessage[] = [];
  const injected = new Set<string>();

  for (const m of messages) {
    if (m.surfaceUpdate) {
      const sid = m.surfaceUpdate.surfaceId;
      const comps = m.surfaceUpdate.components ?? [];
      if (!hasBegin.has(sid) && !injected.has(sid) && comps.length > 0) {
        const root = pickRootComponentId(comps, sid);
        out.push({ beginRendering: { surfaceId: sid, root, styles: {} } });
        injected.add(sid);
        hasBegin.add(sid);
      }
    }
    out.push(m);
  }

  const fixed = out.map((m) => {
    if (!m.beginRendering) return m;
    const br = m.beginRendering;
    const ids = componentIdsBySurface.get(br.surfaceId);
    if (!ids || ids.size === 0) return m;
    const root = br.root?.trim();
    if (root && ids.has(root)) return m;
    const comps = out.flatMap((x) =>
      x.surfaceUpdate?.surfaceId === br.surfaceId ? x.surfaceUpdate!.components ?? [] : [],
    );
    return {
      beginRendering: {
        ...br,
        root: pickRootComponentId(comps, br.surfaceId),
      },
    };
  });

  return patchEmptyBeginRoots(fixed);
}

export function parseAndNormalizeA2UISource(raw: string): A2UIMessage[] {
  let t = raw.trim();
  if (!t) return [];

  if (t.startsWith("```")) {
    t = t.replace(/^```[a-zA-Z0-9_-]*\s*\n?/, "").replace(/\n?```\s*$/, "").trim();
  }

  let parsed: unknown | null = null;

  if (t.startsWith("[") || t.startsWith("{")) {
    parsed = parseJsonLenient(t);
    if (parsed === null) {
      const extracted = extractFirstJsonValue(t);
      if (extracted) parsed = parseJsonLenient(extracted);
    }
  }

  if (parsed === null) {
    const lines = t.split("\n");
    const lineItems: unknown[] = [];
    for (const line of lines) {
      const s = line.trim();
      if (!s || s.startsWith("//")) continue;
      const one = parseJsonLenient(s);
      if (one !== null) lineItems.push(one);
    }
    if (lineItems.length > 0) {
      parsed = lineItems.length === 1 ? lineItems[0] : lineItems;
    }
  }

  if (parsed === null) {
    const extracted = extractFirstJsonValue(t);
    if (extracted) parsed = parseJsonLenient(extracted);
  }

  if (parsed === null) return [];

  let items: unknown[];
  if (Array.isArray(parsed)) {
    items = parsed;
  } else {
    items = [parsed];
  }

  const messages: A2UIMessage[] = [];
  for (const item of items) {
    messages.push(...expandItemToMessages(item));
  }

  return ensureSurfacesRenderable(messages);
}
