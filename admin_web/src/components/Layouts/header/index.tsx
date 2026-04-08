"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebarContext } from "../sidebar/sidebar-context";
import { MeowoneLogo } from "@/components/logo";
import { MenuIcon } from "./icons";
import { HeaderSettingsMenu } from "./header-settings-menu";
import { Notification } from "./notification";
import { ThemeToggleSwitch } from "./theme-toggle";

export function Header() {
  const { toggleSidebar, toggleRail, isMobile } = useSidebarContext();
  const pathname = usePathname();
  const isChatPage = pathname === "/meowone/chat";

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[#e3e8f2] bg-[#f8faff]/96 px-4 py-2.5 backdrop-blur dark:border-[#2a3c61] dark:bg-[#101d35]/96 md:px-5 2xl:px-10">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => (isMobile ? toggleSidebar() : toggleRail())}
          className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-[#dbe3f1] bg-white text-dark/70 hover:border-primary/40 hover:bg-primary/5 hover:text-primary dark:border-[#3a5688] dark:bg-[#142542] dark:text-white/70 dark:hover:border-primary/40 dark:hover:bg-primary/10 dark:hover:text-primary"
          aria-label={isMobile ? "打开或关闭菜单" : "收起或展开侧栏"}
        >
          <MenuIcon />
          <span className="sr-only">导航</span>
        </button>

        <Link href={"/"} className="flex items-center gap-2.5">
          <MeowoneLogo className="size-8 shrink-0 text-primary" />
          <div>
            <p className="text-sm font-bold tracking-[0.08em] text-dark dark:text-white md:text-base">
              MeowOne
            </p>
            <p className="hidden text-[10px] leading-tight font-medium tracking-wide text-slate-400 dark:text-slate-500 sm:block">
              AI OS
            </p>
          </div>
        </Link>
      </div>

      <div className="hidden text-center max-xl:block">
        <h1 className="text-sm font-semibold text-dark dark:text-white">
          管理后台
        </h1>
      </div>

      <div className="flex flex-1 items-center justify-end gap-1 min-[375px]:gap-3">
        {isChatPage ? (
          <HeaderSettingsMenu />
        ) : (
          <>
            <ThemeToggleSwitch />
            <Notification />
          </>
        )}
      </div>
    </header>
  );
}
