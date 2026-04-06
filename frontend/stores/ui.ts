import { create } from "zustand";

export type ThemeMode = "light" | "dark";

interface UIState {
  /** 移动端抽屉是否打开 */
  sidebarOpen: boolean;
  /** 桌面端左侧栏是否折叠（更宽对话区，类似豆包侧栏可收起） */
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  toggleSidebarCollapsed: () => void;
  /** 设置弹窗 */
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
  /** 浅色 / 深色 */
  theme: ThemeMode;
  setTheme: (mode: ThemeMode) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: false,
  sidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  toggleSidebarCollapsed: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  settingsOpen: false,
  setSettingsOpen: (open) => set({ settingsOpen: open }),
  theme: "light",
  setTheme: (mode) => set({ theme: mode }),
}));
