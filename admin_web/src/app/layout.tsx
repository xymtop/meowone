import "@/css/satoshi.css";
import "@/css/style.css";

import { AppShell } from "@/components/Layouts/app-shell";
import { Sidebar } from "@/components/Layouts/sidebar";

import "flatpickr/dist/flatpickr.min.css";
import "jsvectormap/dist/jsvectormap.css";
/* Light theme: matches white cards in admin; github-dark makes light text on light bg (invisible). */
import "highlight.js/styles/github.css";
import type { Metadata } from "next";
import NextTopLoader from "nextjs-toploader";
import type { PropsWithChildren } from "react";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: {
    template: "%s | MeowOne - 构建你的AI智能体操作系统",
    default: "MeowOne - 构建你的AI智能体操作系统",
  },
  description:
    "Next.js admin dashboard toolkit with 200+ templates, UI components, and integrations for fast dashboard development.",
};

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          <NextTopLoader color="#5750F1" showSpinner={false} />

          <div className="flex min-h-screen">
            <Sidebar />

            <AppShell>{children}</AppShell>
          </div>
        </Providers>
      </body>
    </html>
  );
}
