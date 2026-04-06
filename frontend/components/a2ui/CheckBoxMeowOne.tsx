"use client";

import type { ComponentProps } from "react";
import { memo, useCallback } from "react";
import { CheckBoxComponent } from "@a2ui-sdk/react/0.8/standard-catalog";
import { useDataBinding } from "@a2ui-sdk/react/0.8";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useLiteralAwareFormBinding } from "@/hooks/useLiteralAwareFormBinding";

type Props = ComponentProps<typeof CheckBoxComponent>;

function CheckBoxPath(props: Props) {
  return <CheckBoxComponent {...props} />;
}

function CheckBoxLiteral(props: Props) {
  const { surfaceId, componentId, label, value } = props;
  const c = useDataBinding(surfaceId, label, "");
  const [checked, setChecked] = useLiteralAwareFormBinding(surfaceId, value, false);
  const onCheckedChange = useCallback(
    (v: boolean | "indeterminate") => {
      setChecked(v === true);
    },
    [setChecked],
  );
  const id = `checkbox-${componentId}`;

  return (
    <div className={cn("flex items-center gap-3")}>
      <Checkbox id={id} checked={checked} onCheckedChange={onCheckedChange} />
      {c ? (
        <Label htmlFor={id} className="cursor-pointer">
          {c}
        </Label>
      ) : null}
    </div>
  );
}

export const CheckBoxMeowOne = memo(function CheckBoxMeowOne(props: Props) {
  const hasPath = props.value && typeof props.value === "object" && "path" in props.value;
  return hasPath ? <CheckBoxPath {...props} /> : <CheckBoxLiteral {...props} />;
});

CheckBoxMeowOne.displayName = "MeowOne.CheckBox";
