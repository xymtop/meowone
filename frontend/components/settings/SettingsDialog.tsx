"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Moon, Sun, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useUIStore } from "@/stores/ui";
import { fetchApi } from "@/lib/api";
import { cn } from "@/lib/utils";

type ConfigFile = { path: string; content: string };

type TabId = "appearance" | "config";

export function SettingsDialog() {
  const open = useUIStore((s) => s.settingsOpen);
  const setOpen = useUIStore((s) => s.setSettingsOpen);
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);
  const [tab, setTab] = useState<TabId>("appearance");
  const [files, setFiles] = useState<ConfigFile[]>([]);
  const [root, setRoot] = useState("");
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchApi<{ root: string; files: ConfigFile[] }>("/api/meowone/config");
      setRoot(data.root);
      setFiles(data.files);
      setSelectedPath(data.files[0]?.path ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
      setFiles([]);
      setSelectedPath(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && tab === "config") void loadConfig();
  }, [open, tab, loadConfig]);

  if (!open) return null;

  const selected = files.find((f) => f.path === selectedPath);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
      onClick={() => setOpen(false)}
    >
      <div
        className="flex max-h-[min(90vh,720px)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 id="settings-title" className="text-lg font-semibold text-foreground">
            设置
          </h2>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setOpen(false)}
            aria-label="关闭"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex border-b border-border px-3">
          <button
            type="button"
            className={cn(
              "border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
              tab === "appearance"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
            onClick={() => setTab("appearance")}
          >
            外观
          </button>
          <button
            type="button"
            className={cn(
              "border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
              tab === "config"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
            onClick={() => setTab("config")}
          >
            配置（只读）
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden p-5">
          {tab === "appearance" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">选择界面配色方案。</p>
              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  variant={theme === "light" ? "default" : "outline"}
                  className="gap-2"
                  onClick={() => setTheme("light")}
                >
                  <Sun className="h-4 w-4" />
                  白天模式
                </Button>
                <Button
                  type="button"
                  variant={theme === "dark" ? "default" : "outline"}
                  className="gap-2"
                  onClick={() => setTheme("dark")}
                >
                  <Moon className="h-4 w-4" />
                  夜晚模式
                </Button>
              </div>
            </div>
          )}

          {tab === "config" && (
            <div className="flex h-[min(60vh,480px)] flex-col gap-3 md:flex-row">
              <div className="flex w-full shrink-0 flex-col md:w-48">
                {loading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    加载中…
                  </div>
                ) : error ? (
                  <p className="text-sm text-destructive">{error}</p>
                ) : (
                  <ScrollArea className="h-48 rounded-lg border border-border md:h-full">
                    <ul className="p-1 text-sm">
                      {files.map((f) => (
                        <li key={f.path}>
                          <button
                            type="button"
                            className={cn(
                              "w-full rounded-md px-2 py-1.5 text-left hover:bg-muted",
                              selectedPath === f.path && "bg-muted font-medium",
                            )}
                            onClick={() => setSelectedPath(f.path)}
                          >
                            {f.path}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </ScrollArea>
                )}
                {root ? (
                  <p className="mt-2 truncate text-xs text-muted-foreground" title={root}>
                    根目录: {root}
                  </p>
                ) : null}
              </div>
              <div className="min-h-0 flex-1 rounded-lg border border-border bg-muted/30">
                <ScrollArea className="h-full max-h-[min(60vh,480px)]">
                  <pre className="whitespace-pre-wrap break-words p-4 text-xs leading-relaxed text-foreground md:text-sm">
                    {selected ? selected.content : "选择左侧文件"}
                  </pre>
                </ScrollArea>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
