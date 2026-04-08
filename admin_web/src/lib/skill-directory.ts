/** 从 SKILL.md 全文取出 frontmatter 之后的正文（L2 指令层） */
export function bodyAfterFrontmatter(raw: string): string {
  const text = raw.replace(/^\ufeff/, "");
  if (!text.startsWith("---")) return text.trim();
  const parts = text.split("---");
  if (parts.length < 3) return text.trim();
  return parts.slice(2).join("---").trim();
}
