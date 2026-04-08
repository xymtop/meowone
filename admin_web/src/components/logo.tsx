import type { IconProps } from "@/types/icon-props";

export function MeowoneLogo(props: IconProps) {
  return (
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <rect width="32" height="32" rx="8" fill="currentColor" opacity="0.12" />
      <rect x="4" y="6" width="24" height="20" rx="5" fill="currentColor" opacity="0.2" />
      <path
        d="M4 6C4 4.34315 5.34315 3 7 3H9C9 5.20914 10.7909 7 13 7H19C21.2091 7 23 5.20914 23 3H25C26.6569 3 28 4.34315 28 6V10C28 11.6569 26.6569 13 25 13H7C5.34315 13 4 11.6569 4 10V6Z"
        fill="currentColor"
        opacity="0.85"
      />
      <circle cx="11" cy="14" r="2.5" fill="currentColor" />
      <circle cx="21" cy="14" r="2.5" fill="currentColor" />
      <path
        d="M14 18.5C14 18.5 15.5 20 16 20C16.5 20 18 18.5 18 18.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

type LogoProps = {
  /** 侧栏收起时仅显示图标徽章 */
  compact?: boolean;
};

export function Logo({ compact }: LogoProps) {
  if (compact) {
    return (
      <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 text-primary shadow-sm ring-1 ring-primary/15 dark:from-primary/25 dark:via-primary/15 dark:ring-primary/25">
        <MeowoneLogo className="size-8" />
      </span>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-3">
      <MeowoneLogo className="size-10 shrink-0 text-primary" />
      <div className="min-w-0 leading-tight">
        <span className="block text-base font-bold tracking-tight text-dark dark:text-white">
          MeowOne
        </span>
        <span className="mt-0.5 block text-[11px] font-medium tracking-wide text-slate-500 dark:text-slate-400">
          AI OS
        </span>
      </div>
    </div>
  );
}
