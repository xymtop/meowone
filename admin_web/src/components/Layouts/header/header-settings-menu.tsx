"use client";

import {
  Dropdown,
  DropdownContent,
  DropdownTrigger,
} from "@/components/ui/dropdown";
import { useState } from "react";
import { Notification } from "./notification";
import { ThemeToggleSwitch } from "./theme-toggle";
import { SettingsIcon } from "./user-info/icons";

export function HeaderSettingsMenu() {
  const [open, setOpen] = useState(false);

  return (
    <Dropdown isOpen={open} setIsOpen={setOpen}>
      <DropdownTrigger
        className="grid size-12 place-items-center rounded-full border border-stroke bg-gray-2 text-dark outline-none hover:text-primary focus-visible:border-primary focus-visible:text-primary dark:border-dark-4 dark:bg-dark-3 dark:text-white dark:focus-visible:border-primary"
        aria-label="打开设置"
      >
        <SettingsIcon className="size-5" aria-hidden />
      </DropdownTrigger>

      <DropdownContent
        align="end"
        className="border border-stroke bg-white p-4 shadow-lg dark:border-dark-3 dark:bg-gray-dark min-[320px]:min-w-[18rem]"
      >
        <h2 className="sr-only">页面设置</h2>
        <div className="flex flex-col gap-5">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-dark-5 dark:text-dark-6">
              外观
            </p>
            <ThemeToggleSwitch />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-dark-5 dark:text-dark-6">
              通知
            </p>
            <div className="flex justify-start">
              <Notification />
            </div>
          </div>
        </div>
      </DropdownContent>
    </Dropdown>
  );
}
