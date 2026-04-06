import type { Card } from "./card";

export type SSEEvent =
  | { event: "thinking"; data: { step: number; description: string } }
  | { event: "delta"; data: { messageId: string; content: string; done: boolean } }
  | { event: "card"; data: { messageId: string; card: Card } }
  | { event: "done"; data: { messageId: string; loopRounds: number; totalDuration: number } }
  | { event: "error"; data: { code: string; message: string } };
