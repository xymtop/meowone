"use client";

/**
 * 无 `path` 的 TextField 字面量绑定时，SDK 的 useFormBinding 无法更新 → 输入框锁死。
 * 有 `path` 时仍用官方 TextFieldComponent。
 */
import type { ComponentProps } from "react";
import { memo, useCallback } from "react";
import { TextFieldComponent } from "@a2ui-sdk/react/0.8/standard-catalog";
import { useDataBinding } from "@a2ui-sdk/react/0.8";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useLiteralAwareFormBinding } from "@/hooks/useLiteralAwareFormBinding";

type Props = ComponentProps<typeof TextFieldComponent>;

const FIELD_TYPES: Record<string, string> = {
  shortText: "text",
  longText: "text",
  number: "number",
  date: "date",
  obscured: "password",
};

function TextFieldPath(props: Props) {
  return <TextFieldComponent {...props} />;
}

function TextFieldLiteral(props: Props) {
  const { surfaceId, componentId, label, text, textFieldType = "shortText" } = props;
  const r = useDataBinding(surfaceId, label, "");
  const [a, m] = useLiteralAwareFormBinding(surfaceId, text, "");
  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      m(e.target.value);
    },
    [m],
  );
  const id = `textfield-${componentId}`;
  const inputType = FIELD_TYPES[textFieldType] ?? "text";
  const isLong = textFieldType === "longText";
  const val = String(a ?? "");

  return (
    <div className={cn("flex flex-col gap-2")}>
      {r ? <Label htmlFor={id}>{r}</Label> : null}
      {isLong ? (
        <Textarea id={id} value={val} onChange={onChange} className="min-h-[100px]" />
      ) : (
        <Input id={id} type={inputType} value={val} onChange={onChange} />
      )}
    </div>
  );
}

export const TextFieldMeowOne = memo(function TextFieldMeowOne(props: Props) {
  const hasPath = props.text && typeof props.text === "object" && "path" in props.text;
  return hasPath ? <TextFieldPath {...props} /> : <TextFieldLiteral {...props} />;
});

TextFieldMeowOne.displayName = "MeowOne.TextField";
