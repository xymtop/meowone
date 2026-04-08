import { cn } from "@/lib/utils";
import { cva } from "class-variance-authority";
import Link from "next/link";
import { useSidebarContext } from "./sidebar-context";

const menuItemBaseStyles = cva(
  "rounded-xl px-3.5 font-medium text-slate-600 transition-all duration-200 dark:text-slate-300",
  {
    variants: {
      isActive: {
        true: "bg-[rgba(87,80,241,0.12)] text-primary shadow-sm hover:bg-[rgba(87,80,241,0.14)] dark:border dark:border-[#4f68a8] dark:bg-[#23365e] dark:text-white",
        false:
          "hover:bg-[#edf2fd] hover:text-slate-900 hover:dark:bg-[#1a2a49] hover:dark:text-white",
      },
    },
    defaultVariants: {
      isActive: false,
    },
  },
);

export function MenuItem(
  props: {
    className?: string;
    children: React.ReactNode;
    isActive: boolean;
    /** 悬停提示（窄侧栏时用于 title） */
    linkTitle?: string;
  } & (
    | { as?: "button"; onClick: () => void }
    | { as: "link"; href: string; openInNewTab?: boolean }
  ),
) {
  const { toggleSidebar, isMobile, isRail } = useSidebarContext();
  const narrow = Boolean(!isMobile && isRail);

  if (props.as === "link") {
    const { openInNewTab, href, linkTitle } = props;
    return (
      <Link
        href={href}
        title={narrow ? linkTitle : undefined}
        {...(openInNewTab
          ? { target: "_blank" as const, rel: "noopener noreferrer" }
          : {})}
        onClick={() => isMobile && toggleSidebar()}
        className={cn(
          menuItemBaseStyles({
            isActive: props.isActive,
            className: narrow
              ? "relative my-1 flex justify-center border border-transparent py-2.5 hover:border-[#d9e2f3] dark:hover:border-[#345084]"
              : "relative block py-2",
          }),
          props.className,
        )}
      >
        {props.children}
      </Link>
    );
  }

  return (
    <button
      onClick={props.onClick}
      aria-expanded={props.isActive}
      className={menuItemBaseStyles({
        isActive: props.isActive,
        className: cn(
          "flex w-full items-center gap-3 py-3",
          narrow &&
            "justify-center px-0 [&_span]:hidden border border-transparent hover:border-[#d9e2f3] dark:hover:border-[#345084]",
        ),
      })}
    >
      {props.children}
    </button>
  );
}
