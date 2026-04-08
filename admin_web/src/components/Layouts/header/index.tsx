"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebarContext } from "../sidebar/sidebar-context";
import { MenuIcon } from "./icons";
import { HeaderSettingsMenu } from "./header-settings-menu";
import { Notification } from "./notification";
import { ThemeToggleSwitch } from "./theme-toggle";

export function Header() {
  const { toggleSidebar, toggleRail, isMobile } = useSidebarContext();
  const pathname = usePathname();
  const isChatPage = pathname === "/meowone/chat";

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[#e3e8f2] bg-[#f8faff]/96 px-4 py-3 backdrop-blur dark:border-[#2a3c61] dark:bg-[#101d35]/96 md:px-5 2xl:px-10">
      <button
        type="button"
        onClick={() => (isMobile ? toggleSidebar() : toggleRail())}
        className="rounded-lg border border-[#dbe3f1] bg-white px-1.5 py-1 dark:border-[#3a5688] dark:bg-[#142542] hover:bg-[#eef3ff] hover:dark:bg-[#1b3157]"
        aria-label={isMobile ? "打开或关闭菜单" : "收起或展开侧栏"}
      >
        <MenuIcon />
        <span className="sr-only">导航</span>
      </button>

      {isMobile && (
        <Link href={"/"} className="ml-2 max-[430px]:hidden min-[375px]:ml-4">
          <span className="text-sm font-extrabold tracking-[0.14em] text-dark dark:text-white">
            MEOWONE
          </span>
        </Link>
      )}

      <div className="max-xl:hidden">
        <h1 className="mb-0.5 text-heading-5 font-bold text-dark dark:text-white">
          MEOWONE
        </h1>
        <p className="font-medium text-slate-500 dark:text-slate-300">AI 操作系统管理后台</p>
      </div>

      <div className="flex flex-1 items-center justify-end gap-2 min-[375px]:gap-4">
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
