"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { NAV_DATA, type NavItem } from "./data";
import { ChevronUp } from "./icons";
import { MenuItem } from "./menu-item";
import { useSidebarContext } from "./sidebar-context";

function isNavHrefActive(href: string, pathname: string, searchParams: URLSearchParams) {
  const q = href.indexOf("?");
  if (q === -1) return pathname === href;
  const path = href.slice(0, q);
  const query = href.slice(q + 1);
  if (pathname !== path) return false;
  const wanted = new URLSearchParams(query);
  for (const [key, value] of wanted.entries()) {
    if (searchParams.get(key) !== value) return false;
  }
  return true;
}

function SidebarContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { setIsOpen, isOpen, isMobile, isRail, toggleSidebar } = useSidebarContext();
  const narrow = Boolean(!isMobile && isRail);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [collapsedSections, setCollapsedSections] = useState<string[]>([]);
  const hideOnChat = pathname === "/meowone/chat";

  const toggleExpanded = (title: string) => {
    setExpandedItems((prev) => (prev.includes(title) ? [] : [title]));

    // Uncomment the following line to enable multiple expanded items
    // setExpandedItems((prev) =>
    //   prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title],
    // );
  };

  useEffect(() => {
    // Keep collapsible open, when it's subpage is active
    NAV_DATA.some((section) => {
      return section.items.some((item) => {
        return item.items.some((subItem) => {
          if (subItem.url === pathname) {
            if (!expandedItems.includes(item.title)) {
              toggleExpanded(item.title);
            }

            // Break the loop
            return true;
          }
        });
      });
    });
  }, [pathname]);

  const toggleSectionCollapsed = (label: string) => {
    setCollapsedSections((prev) =>
      prev.includes(label) ? prev.filter((x) => x !== label) : [...prev, label],
    );
  };

  if (hideOnChat) return null;

  return (
    <>
      {/* Mobile Overlay */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "shrink-0 overflow-hidden border-r border-[#e3e8f2] bg-[#f7f9fd] transition-[width] duration-200 ease-linear dark:border-[#23324e] dark:bg-[linear-gradient(180deg,#0f1b32_0%,#0c172b_65%,#0a1426_100%)]",
          isMobile ? "fixed bottom-0 top-0 z-50" : "sticky top-0 h-screen",
          isMobile ? (isOpen ? "w-full max-w-[290px]" : "w-0") : narrow ? "w-[76px]" : "w-[290px]",
        )}
        aria-label="Main navigation"
        aria-hidden={isMobile && !isOpen}
        inert={isMobile && !isOpen ? true : undefined}
      >
        <div
          className={cn(
            "flex h-full flex-col py-6",
            narrow ? "items-center px-1.5" : "pl-[25px] pr-[7px]",
          )}
        >
          {/* Navigation */}
          <div className="custom-scrollbar flex-1 overflow-y-auto pr-3">
            {NAV_DATA.map((section) => (
              <div
                key={section.label}
                className={cn(
                  "mb-4 rounded-xl border border-transparent px-2 py-1",
                  !narrow &&
                    "border-[#e8edf7] bg-white/70 shadow-sm dark:border-[#263757] dark:bg-[#13203a]/80 dark:shadow-[0_8px_24px_rgba(0,0,0,0.22)]",
                )}
              >
                <button
                  type="button"
                  onClick={() => toggleSectionCollapsed(section.label)}
                  className={cn(
                    "mb-3 flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm font-semibold text-slate-500 dark:text-slate-300",
                    narrow && "sr-only",
                  )}
                  aria-expanded={!collapsedSections.includes(section.label)}
                >
                  <span>{section.label}</span>
                  <ChevronUp
                    className={cn(
                      "size-4 shrink-0 transition-transform duration-200",
                      collapsedSections.includes(section.label) && "rotate-180",
                    )}
                    aria-hidden="true"
                  />
                </button>

                <nav
                  role="navigation"
                  aria-label={section.label}
                  className={cn(collapsedSections.includes(section.label) && "hidden")}
                >
                  <ul className="space-y-2">
                    {section.items.map((item: NavItem) => (
                      <li key={item.title}>
                        {item.items.length ? (
                          <div>
                            <MenuItem
                              isActive={item.items.some(
                                ({ url }) => url === pathname,
                              )}
                              onClick={() => toggleExpanded(item.title)}
                            >
                              <item.icon
                                className="size-6 shrink-0"
                                aria-hidden="true"
                              />

                              <span className={cn(narrow && "sr-only")}>{item.title}</span>

                              <ChevronUp
                                className={cn(
                                  "ml-auto rotate-180 transition-transform duration-200",
                                  expandedItems.includes(item.title) &&
                                    "rotate-0",
                                )}
                                aria-hidden="true"
                              />
                            </MenuItem>

                            {expandedItems.includes(item.title) && (
                              <ul
                                className="ml-9 mr-0 space-y-1.5 pb-[15px] pr-0 pt-2"
                                role="menu"
                              >
                                {item.items.map((subItem) => (
                                  <li key={subItem.title} role="none">
                                    <MenuItem
                                      as="link"
                                      href={subItem.url}
                                      isActive={pathname === subItem.url}
                                      linkTitle={subItem.title}
                                    >
                                      <span className={cn(narrow && "sr-only")}>{subItem.title}</span>
                                    </MenuItem>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ) : (
                          (() => {
                            const href = item.url;
                            const openInNewTab = Boolean(item.openInNewTab);

                            return (
                              <MenuItem
                                className="flex items-center gap-3 py-3"
                                as="link"
                                href={href}
                                isActive={isNavHrefActive(href, pathname, searchParams)}
                                linkTitle={item.title}
                                openInNewTab={openInNewTab}
                              >
                                <item.icon
                                  className="size-6 shrink-0"
                                  aria-hidden="true"
                                />

                                <span className={cn(narrow && "sr-only")}>{item.title}</span>
                              </MenuItem>
                            );
                          })()
                        )}
                      </li>
                    ))}
                  </ul>
                </nav>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </>
  );
}

function SidebarLoading() {
  return (
    <aside
      className="shrink-0 overflow-hidden border-r border-[#e3e8f2] bg-[#f7f9fd] w-[290px] h-screen dark:border-[#23324e] dark:bg-[#13203a]"
      aria-hidden="true"
    >
      <div className="flex h-full flex-col py-10 pl-[25px] pr-[7px]">
        <div className="h-10 w-32 animate-pulse rounded-xl bg-gray-200" />
        <div className="mt-6 space-y-4 pr-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-200" />
          ))}
        </div>
      </div>
    </aside>
  );
}

export function Sidebar() {
  return (
    <Suspense fallback={<SidebarLoading />}>
      <SidebarContent />
    </Suspense>
  );
}
