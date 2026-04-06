import { A2UI_BLOCK_END, A2UI_BLOCK_START } from "@/lib/a2uiDelimiters";

/**
 * 将助手正文按 Markdown 水平线分段，用于拆成多条独立气泡（替代单条消息内的 `---` 视觉分割）。
 */
export function splitAssistantSegments(content: string): string[] {
  const trimmed = content.trim();
  if (!trimmed) return [];
  const parts = trimmed.split(/\n-{3,}\s*\n/);
  if (parts.length <= 1) return [content];
  return parts.map((p) => p.trim()).filter((p) => p.length > 0);
}

/** 与 Markdown 中 ```json``` 启发式一致，用于识别误标的 A2UI JSON。 */
function looksLikeA2UIPayload(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  return (
    t.includes('"surfaceUpdate"') ||
    t.includes('"beginRendering"') ||
    t.includes('"surfaceId"')
  );
}

function isA2UIFence(lang: string, body: string): boolean {
  const l = lang.trim().toLowerCase();
  if (l === "a2ui") return true;
  if (l === "json" && looksLikeA2UIPayload(body)) return true;
  return false;
}

export type AssistantContentPart =
  | { type: "markdown"; content: string }
  | { type: "a2ui"; source: string };

/**
 * MeowOne 约定：---A2UI-START--- … ---A2UI-END--- 之间为裸 JSON（无围栏），整块交给 A2UI 渲染。
 */
function splitByA2UIDelimiters(raw: string): AssistantContentPart[] {
  const out: AssistantContentPart[] = [];
  let pos = 0;
  while (pos < raw.length) {
    const startIdx = raw.indexOf(A2UI_BLOCK_START, pos);
    if (startIdx === -1) {
      const rest = raw.slice(pos);
      if (rest.trim()) out.push({ type: "markdown", content: rest });
      break;
    }
    const before = raw.slice(pos, startIdx);
    if (before.trim()) {
      out.push({ type: "markdown", content: before });
    }
    const contentStart = startIdx + A2UI_BLOCK_START.length;
    const endIdx = raw.indexOf(A2UI_BLOCK_END, contentStart);
    if (endIdx === -1) {
      /** 流式未完成：不要把 START 后的 JSON 当 Markdown 露出，交给 A2UI 区段（可显示「加载中」） */
      const inner = raw.slice(contentStart).trim();
      if (inner) {
        out.push({ type: "a2ui", source: inner });
      }
      break;
    }
    const inner = raw.slice(contentStart, endIdx).trim();
    if (inner) {
      out.push({ type: "a2ui", source: inner });
    }
    pos = endIdx + A2UI_BLOCK_END.length;
  }
  return out;
}

/** 从一段 Markdown 中拆出 ```a2ui``` / ```json```(A2UI) 围栏块。 */
function splitA2UIFencedBlocks(raw: string): AssistantContentPart[] {
  const s = raw;
  const out: AssistantContentPart[] = [];
  let pos = 0;

  while (pos < s.length) {
    const tick = s.indexOf("```", pos);
    if (tick === -1) {
      const rest = s.slice(pos);
      if (rest.trim()) out.push({ type: "markdown", content: rest });
      break;
    }

    const before = s.slice(pos, tick);
    if (before.trim()) {
      out.push({ type: "markdown", content: before });
    }

    const afterTicks = s.slice(tick + 3);
    const nl = afterTicks.indexOf("\n");
    if (nl === -1) {
      out.push({ type: "markdown", content: s.slice(pos) });
      break;
    }

    const lang = afterTicks.slice(0, nl).trim();
    const bodyStart = tick + 3 + nl + 1;
    const closeIdx = s.indexOf("```", bodyStart);
    if (closeIdx === -1) {
      out.push(...splitTrailingOpenFence(s.slice(pos)));
      break;
    }

    const body = s.slice(bodyStart, closeIdx);
    const endFence = closeIdx + 3;

    if (isA2UIFence(lang, body)) {
      out.push({ type: "a2ui", source: body });
    } else {
      out.push({ type: "markdown", content: s.slice(tick, endFence) });
    }
    pos = endFence;
  }

  return out;
}

/** 未闭合的 ``` 围栏：流式时避免整段当 Markdown 把 JSON 露给用户 */
function splitTrailingOpenFence(raw: string): AssistantContentPart[] {
  const tick = raw.indexOf("```");
  if (tick === -1) {
    if (raw.trim()) return [{ type: "markdown", content: raw }];
    return [];
  }
  const before = raw.slice(0, tick);
  const afterTicks = raw.slice(tick + 3);
  const nl = afterTicks.indexOf("\n");
  if (nl === -1) {
    if (before.trim()) return [{ type: "markdown", content: raw }];
    return [];
  }
  const lang = afterTicks.slice(0, nl).trim();
  const body = afterTicks.slice(nl + 1);
  if (lang.toLowerCase() === "a2ui" || (lang.toLowerCase() === "json" && looksLikeA2UIPayload(body))) {
    const out: AssistantContentPart[] = [];
    if (before.trim()) out.push({ type: "markdown", content: before });
    out.push({ type: "a2ui", source: body });
    return out;
  }
  return [{ type: "markdown", content: raw }];
}

/**
 * 先按 ---A2UI-START/END--- 拆出裸 JSON，再对剩余 Markdown 拆 ```a2ui``` 围栏。
 */
export function splitA2UIBlocks(raw: string): AssistantContentPart[] {
  const byDelim = splitByA2UIDelimiters(raw);
  const out: AssistantContentPart[] = [];
  for (const part of byDelim) {
    if (part.type === "a2ui") {
      out.push(part);
    } else {
      out.push(...splitA2UIFencedBlocks(part.content));
    }
  }
  return out;
}
