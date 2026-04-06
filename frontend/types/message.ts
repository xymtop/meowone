import type { Card } from "./card";

export interface Message {
  id: string;
  session_id: string;
  role: "user" | "assistant" | "system";
  content_type: "text" | "card" | "cards";
  content: string | null;
  card_data: Card | Card[] | null;
  created_at: string;
  /** 流式阶段：卡片 SSE 早于正文 delta 时为 true，用于与出现顺序一致的排版 */
  cards_before_text?: boolean;
}
