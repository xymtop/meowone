import type { Card } from "./card";

export interface Message {
  id: string;
  session_id: string;
  role: "user" | "assistant" | "system";
  content_type: "text" | "card" | "cards";
  content: string | null;
  card_data: Card | Card[] | null;
  created_at: string;
}
