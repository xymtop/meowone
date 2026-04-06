import * as React from "react";

import { cn } from "@/lib/utils";

export interface CheckboxProps
  extends Omit<React.ComponentPropsWithoutRef<"input">, "type" | "checked" | "onChange"> {
  checked?: boolean | "indeterminate";
  onCheckedChange?: (checked: boolean | "indeterminate") => void;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, onCheckedChange, ...props }, ref) => {
    const innerRef = React.useRef<HTMLInputElement>(null);
    React.useImperativeHandle(ref, () => innerRef.current as HTMLInputElement);

    React.useEffect(() => {
      const el = innerRef.current;
      if (!el) return;
      el.indeterminate = checked === "indeterminate";
    }, [checked]);

    return (
      <input
        type="checkbox"
        ref={innerRef}
        className={cn(
          "peer size-4 shrink-0 cursor-pointer rounded border border-primary accent-primary shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        checked={checked === "indeterminate" ? false : Boolean(checked)}
        onChange={(e) => {
          onCheckedChange?.(e.target.checked);
        }}
        {...props}
      />
    );
  },
);
Checkbox.displayName = "Checkbox";

export { Checkbox };
