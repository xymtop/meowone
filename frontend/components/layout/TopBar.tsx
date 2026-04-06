"use client";

import { Menu, PanelLeft, PanelLeftClose, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/stores/ui";
import { SettingsDialog } from "@/components/settings/SettingsDialog";

export function TopBar() {
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggleSidebarCollapsed = useUIStore((s) => s.toggleSidebarCollapsed);
  const setSettingsOpen = useUIStore((s) => s.setSettingsOpen);

  return (
    <>
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:h-16 md:px-5">
      <div className="flex min-w-0 items-center gap-2 md:gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={toggleSidebar}
          aria-label="打开会话列表"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="hidden md:inline-flex"
          onClick={toggleSidebarCollapsed}
          aria-label={sidebarCollapsed ? "展开侧栏" : "折叠侧栏"}
        >
          {sidebarCollapsed ? (
            <PanelLeft className="h-5 w-5 text-foreground" />
          ) : (
            <PanelLeftClose className="h-5 w-5 text-foreground" />
          )}
        </Button>
        <span className="text-xl" role="img" aria-label="cat">🐱</span>
        <span className="text-lg font-semibold tracking-tight text-foreground md:text-xl">MeowOne</span>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-9 w-9"
        onClick={() => setSettingsOpen(true)}
        aria-label="设置"
      >
        <Settings className="h-5 w-5 text-foreground" />
      </Button>
    </header>
    <SettingsDialog />
    </>
  );
}
