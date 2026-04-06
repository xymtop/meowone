"use client";

/**
 * 单选（maxAllowedSelections===1）：使用原生 <select>，避免 Radix Select 在聊天布局里触发器/占位/选项文字叠在一起。
 * 多选仍用 SDK 的 Checkbox 列表。
 */
import type { ComponentProps } from "react";
import { memo, useEffect, useRef } from "react";
import type { ValueSource } from "@a2ui-sdk/types/0.8";
import { MultipleChoiceComponent } from "@a2ui-sdk/react/0.8/standard-catalog";
import { useDataBinding, useDispatchAction } from "@a2ui-sdk/react/0.8";
import { useLiteralAwareFormBinding } from "@/hooks/useLiteralAwareFormBinding";
import { cn } from "@/lib/utils";

type Props = ComponentProps<typeof MultipleChoiceComponent>;

function toValueSource(val: unknown): ValueSource {
  if (Array.isArray(val)) {
    return { literalArray: val.map(String) };
  }
  if (typeof val === "string") return { literalString: val };
  if (typeof val === "number") return { literalNumber: val };
  if (typeof val === "boolean") return { literalBoolean: val };
  return { literalString: String(val ?? "") };
}

type Option = NonNullable<Props["options"]>[number];

function NativeSingleSelect({
  surfaceId,
  componentId,
  label,
  options,
  value,
  onValueChange,
}: {
  surfaceId: string;
  componentId: string;
  label: Props["label"];
  options: NonNullable<Props["options"]>;
  value: string;
  onValueChange: (v: string) => void;
}) {
  const labelText = useDataBinding(surfaceId, label, "");
  const id = `multiplechoice-${componentId}`;

  return (
    <div className={cn("flex min-w-0 max-w-full flex-col gap-2")}>
      {labelText ? (
        <label htmlFor={id} className="text-sm font-medium leading-snug text-foreground">
          {labelText}
        </label>
      ) : null}
      <select
        id={id}
        className={cn(
          "h-10 w-full min-w-0 max-w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs",
          "text-foreground outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
          "disabled:cursor-not-allowed disabled:opacity-50",
        )}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
      >
        <option value="">请选择…</option>
        {options.map((opt) => (
          <OptionRow key={opt.value} surfaceId={surfaceId} option={opt} />
        ))}
      </select>
    </div>
  );
}

function OptionRow({ surfaceId, option }: { surfaceId: string; option: Option }) {
  const text = useDataBinding(surfaceId, option.label, option.value);
  return <option value={option.value}>{text}</option>;
}

export const MultipleChoiceMeowOne = memo(function MultipleChoiceMeowOne(props: Props) {
  const { surfaceId, componentId, selections, maxAllowedSelections, label, options } = props;
  const dispatch = useDispatchAction();
  const defaultVal = maxAllowedSelections === 1 ? "" : [];
  const [bound, setBound] = useLiteralAwareFormBinding(surfaceId, selections, defaultVal);
  const prev = useRef<unknown>(Symbol("unset"));
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      prev.current = bound;
      return;
    }
    if (JSON.stringify(prev.current) === JSON.stringify(bound)) return;
    prev.current = bound;
    dispatch(surfaceId, componentId, {
      name: "meowone.selectionChange",
      context: [{ key: "value", value: toValueSource(bound) }],
    });
  }, [bound, surfaceId, componentId, dispatch]);

  if (!options || options.length === 0) {
    return null;
  }

  if (maxAllowedSelections === 1) {
    const strVal = Array.isArray(bound) ? (bound[0] ?? "") : ((bound as string) ?? "");
    return (
      <NativeSingleSelect
        surfaceId={surfaceId}
        componentId={componentId}
        label={label}
        options={options}
        value={strVal}
        onValueChange={(v) => setBound(v)}
      />
    );
  }

  return <MultipleChoiceComponent {...props} />;
});

MultipleChoiceMeowOne.displayName = "MeowOne.MultipleChoice";
