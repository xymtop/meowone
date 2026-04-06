import { create } from "zustand";
import type { Session } from "@/types/session";
import { fetchApi } from "@/lib/api";

interface SessionState {
  sessions: Session[];
  currentSessionId: string | null;
  fetchSessions: () => Promise<void>;
  createSession: () => Promise<Session>;
  deleteSession: (id: string) => Promise<void>;
  setCurrentSession: (id: string) => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  sessions: [],
  currentSessionId: null,

  fetchSessions: async () => {
    const sessions = await fetchApi<Session[]>("/api/sessions");
    set({ sessions });
  },

  createSession: async () => {
    const session = await fetchApi<Session>("/api/sessions", {
      method: "POST",
      body: JSON.stringify({}),
    });
    set((state) => ({ sessions: [session, ...state.sessions], currentSessionId: session.id }));
    return session;
  },

  deleteSession: async (id: string) => {
    await fetchApi(`/api/sessions/${id}`, { method: "DELETE" });
    set((state) => ({
      sessions: state.sessions.filter((s) => s.id !== id),
      currentSessionId: state.currentSessionId === id ? null : state.currentSessionId,
    }));
  },

  setCurrentSession: (id: string) => {
    set({ currentSessionId: id });
  },
}));
