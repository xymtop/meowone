"use client";

/**
 * A2UI `useFormBinding` 只在绑定对象含 `path` 时写入数据模型；模型若只给 `literalString` 等字面量，
 * setter 为空操作 → 输入框/下拉表现为「无法输入」。本 hook 在无 `path` 时用 React 本地 state 承接编辑。
 */
import { useState } from "react";
import { useDataBinding, useFormBinding } from "@a2ui-sdk/react/0.8";

function bindingHasPath(binding: unknown): boolean {
  return (
    binding !== null &&
    binding !== undefined &&
    typeof binding === "object" &&
    !Array.isArray(binding) &&
    "path" in binding
  );
}

export function useLiteralAwareFormBinding<T>(
  surfaceId: string,
  binding: unknown,
  defaultVal: T,
): [T, (next: T) => void] {
  const hasPath = bindingHasPath(binding);

  const [fromForm, setFromForm] = useFormBinding(surfaceId, binding as never, defaultVal);
  const resolved = useDataBinding(surfaceId, binding, defaultVal);

  const [local, setLocal] = useState<T>(() => ((resolved as T) ?? defaultVal) as T);

  if (hasPath) {
    return [fromForm as T, setFromForm as (next: T) => void];
  }
  return [local, setLocal];
}
