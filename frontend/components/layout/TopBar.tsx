"use client";

import { Menu, PanelLeft, PanelLeftClose, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useUIStore } from "@/stores/ui";

export function TopBar() {
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggleSidebarCollapsed = useUIStore((s) => s.toggleSidebarCollapsed);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-gray-100 bg-white/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-white/80 md:h-16 md:px-5">
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
            <PanelLeft className="h-5 w-5 text-gray-700" />
          ) : (
            <PanelLeftClose className="h-5 w-5 text-gray-700" />
          )}
        </Button>
        <span className="text-xl" role="img" aria-label="cat">🐱</span>
        <span className="text-lg font-semibold tracking-tight text-gray-900 md:text-xl">MeowOne</span>
      </div>
      <Avatar className="h-8 w-8">
        <AvatarFallback>
          <User className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>
    </header>
  );
}
