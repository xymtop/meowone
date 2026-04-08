"use client";

import { Header } from "@/components/Layouts/header";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import type { PropsWithChildren } from "react";

export function AppShell({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const isStandaloneChat = pathname === "/meowone/chat";

  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 flex-col bg-[#f3f5f9] dark:bg-[radial-gradient(1100px_600px_at_15%_-10%,#1c2f52_0%,#0b1220_50%,#090f1c_100%)]",
        isStandaloneChat ? "h-screen overflow-hidden" : "min-h-screen",
      )}
    >
      {!isStandaloneChat ? <Header /> : null}
      <main
        className={cn(
          "isolate flex min-h-0 w-full flex-1 flex-col overflow-hidden",
          isStandaloneChat
            ? "max-w-none p-0"
            : "mx-auto max-w-screen-2xl p-3 md:p-5 2xl:p-8",
        )}
      >
        {children}
      </main>
    </div>
  );
}
