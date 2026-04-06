import { create } from "zustand";

interface UIState {
  /** 移动端抽屉是否打开 */
  sidebarOpen: boolean;
  /** 桌面端左侧栏是否折叠（更宽对话区，类似豆包侧栏可收起） */
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  toggleSidebarCollapsed: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: false,
  sidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  toggleSidebarCollapsed: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
}));
