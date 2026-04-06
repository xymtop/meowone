/** One row in the live tool-activity strip (names only; ids for correlation). */
export interface StreamingToolRow {
  toolCallId: string;
  name: string;
  status: "running" | "ok" | "error";
}
