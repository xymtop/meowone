const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export function createSSEConnection(
  path: string,
  body: Record<string, unknown>,
  onEvent: (event: { event: string; data: Record<string, unknown> }) => void,
  onDone: () => void,
  onError: (error: Error) => void,
): AbortController {
  const controller = new AbortController();

  fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: controller.signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        onError(new Error(`SSE error: ${response.status}`));
        return;
      }
      const reader = response.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = "";
      let currentEvent = "";
      let currentData = "";

      const flushEvent = (ev: string, dataStr: string) => {
        const name = ev.replace(/\r$/, "").trim();
        const raw = dataStr.replace(/\r$/, "");
        if (!name || !raw) return;
        try {
          onEvent({ event: name, data: JSON.parse(raw) });
        } catch {
          // ignore parse errors
        }
      };

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const normalized = line.replace(/\r$/, "");
          if (normalized.startsWith("event: ")) {
            currentEvent = normalized.slice(7);
          } else if (normalized.startsWith("data: ")) {
            currentData = normalized.slice(6);
          } else if (normalized === "" && currentEvent && currentData) {
            flushEvent(currentEvent, currentData);
            currentEvent = "";
            currentData = "";
          }
        }
      }
      // Stream ended without a trailing blank line — still dispatch last event
      if (currentEvent && currentData) {
        flushEvent(currentEvent, currentData);
      }
      onDone();
    })
    .catch((err: Error) => {
      if (err.name !== "AbortError") onError(err);
    });

  return controller;
}
