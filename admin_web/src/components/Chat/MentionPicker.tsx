"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { meowoneApi } from "@/lib/meowone-api";
import { cn } from "@/lib/utils";

export type AgentItem = {
  id: string;
  name: string;
  agent_type: string;
  description?: string;
};

type MentionPickerProps = {
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  onSelect: (agent: AgentItem) => void;
};

export function MentionPicker({ inputRef, onSelect }: MentionPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [agents, setAgents] = useState<AgentItem[]>([]);
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [layout, setLayout] = useState({
    top: 0,
    left: 0,
    maxHeight: 360,
  });
  const [mentionStart, setMentionStart] = useState(0);
  const popupRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  const filteredAgents = agents.filter((agent) =>
    agent.name.toLowerCase().includes(search.toLowerCase())
  );

  const groupedAgents = {
    internal: filteredAgents.filter((a) => a.agent_type === "internal"),
    external: filteredAgents.filter((a) => a.agent_type === "external"),
  };

  const loadAgents = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      const res = await meowoneApi.listAgents();
      const agentList = (res.agents || []).map((a: Record<string, unknown>) => ({
        id: String(a.id || a.name),
        name: String(a.name || ""),
        agent_type: String(a.agent_type || "internal"),
        description: a.description ? String(a.description) : undefined,
      })) as AgentItem[];
      setAgents(agentList);
    } catch (e) {
      console.error("加载智能体失败:", e);
    } finally {
      loadingRef.current = false;
    }
  }, []);

  const openPicker = useCallback(
    (caretPosition: number) => {
      setIsOpen(true);
      setSearch("");
      setSelectedIndex(0);
      setMentionStart(caretPosition);

      const input = inputRef.current;
      if (input) {
        const rect = input.getBoundingClientRect();
        const value = input.value;
        const lines = value.substring(0, caretPosition).split("\n");
        const currentLine = lines[lines.length - 1];
        const atInLine = currentLine.lastIndexOf("@");

        let afterAtWidth = 0;
        if (atInLine !== -1) {
          const textAfterAt = currentLine.substring(atInLine + 1);
          afterAtWidth = textAfterAt.length * 8;
        }

        const popupWidth = 288;
        const gap = 8;
        const vh = window.innerHeight;

        const spaceAbove = rect.top - gap - 12;
        const spaceBelow = vh - rect.bottom - gap - 12;

        // 预估弹窗内容高度（搜索框 + 标题 + 列表 + 底部栏）
        const estimatedPopupHeight = Math.min(380, Math.max(spaceAbove, spaceBelow, 100));

        // 优先放上方；上方空间不够则放下方
        const placeAbove = spaceAbove >= 120;
        const top = placeAbove
          ? rect.top - estimatedPopupHeight - gap
          : rect.bottom + gap;

        let left = rect.left + afterAtWidth;
        if (left > window.innerWidth - popupWidth - 10) {
          left = window.innerWidth - popupWidth - 10;
        }
        if (left < 10) left = 10;

        setLayout({
          top,
          left,
          maxHeight: estimatedPopupHeight,
        });
      }

      if (agents.length === 0) {
        void loadAgents();
      }
    },
    [inputRef, agents.length, loadAgents]
  );

  const closePicker = useCallback(() => {
    setIsOpen(false);
    setSearch("");
    setSelectedIndex(0);
  }, []);

  const selectAgent = useCallback(
    (agent: AgentItem) => {
      const input = inputRef.current;
      if (input) {
        const value = input.value;
        // 找到 mentionStart 之前的最后一个 @ 符号位置
        const atIndex = value.lastIndexOf("@", mentionStart - 1);
        if (atIndex === -1) {
          closePicker();
          return;
        }
        const beforeMention = value.substring(0, atIndex);
        const afterMention = value.substring(mentionStart);
        const newValue = `${beforeMention}@${agent.name} ${afterMention}`;
        input.value = newValue;

        const newCursorPos = beforeMention.length + agent.name.length + 2;
        input.setSelectionRange(newCursorPos, newCursorPos);
        input.focus();

        const event = new Event("input", { bubbles: true });
        input.dispatchEvent(event);
      }
      onSelect(agent);
      closePicker();
    },
    [inputRef, mentionStart, onSelect, closePicker]
  );

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    const handleInput = () => {
      const cursorPos = input.selectionStart;
      const value = input.value;
      const beforeCursor = value.substring(0, cursorPos);

      const atIndex = beforeCursor.lastIndexOf("@");
      if (atIndex !== -1) {
        const afterAt = beforeCursor.substring(atIndex + 1);
        if (!afterAt.includes(" ") && !afterAt.includes("\n")) {
          setSearch(afterAt);
          void openPicker(cursorPos);
          return;
        }
      }
      if (isOpen) {
        closePicker();
      }
    };

    input.addEventListener("input", handleInput);
    return () => input.removeEventListener("input", handleInput);
  }, [inputRef, isOpen, openPicker, closePicker]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const totalItems = filteredAgents.length;
      if (totalItems === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((i) => (i + 1) % totalItems);
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((i) => (i - 1 + totalItems) % totalItems);
          break;
        case "Enter":
          e.preventDefault();
          if (filteredAgents[selectedIndex]) {
            selectAgent(filteredAgents[selectedIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          closePicker();
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filteredAgents, selectedIndex, selectAgent, closePicker]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  if (!isOpen) return null;

  const popup = (
    <div
      ref={popupRef}
      className="fixed z-[100] flex w-72 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl"
      style={{
        top: layout.top,
        left: layout.left,
        maxHeight: layout.maxHeight,
      }}
    >
      <div className="shrink-0 border-b border-gray-100 p-2">
        <input
          type="text"
          placeholder="搜索智能体..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
          autoFocus
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-1">
        {groupedAgents.internal.length > 0 && (
          <>
            <div className="px-3 py-1 text-xs font-medium text-gray-400">Internal</div>
            {groupedAgents.internal.map((agent, idx) => {
              const globalIdx = idx;
              return (
                <button
                  key={agent.id}
                  onClick={() => selectAgent(agent)}
                  className={cn(
                    "flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left transition-colors",
                    globalIdx === selectedIndex ? "bg-blue-50 text-blue-600" : "hover:bg-gray-50"
                  )}
                >
                  <span className="mt-0.5 text-sm">🤖</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{agent.name}</p>
                    <p className="truncate text-xs text-gray-500">{agent.description || "暂无描述"}</p>
                  </div>
                </button>
              );
            })}
          </>
        )}
        {groupedAgents.external.length > 0 && (
          <>
            <div className="my-2 border-t border-gray-100" />
            <div className="px-3 py-1 text-xs font-medium text-gray-400">External</div>
            {groupedAgents.external.map((agent, idx) => {
              const globalIdx = groupedAgents.internal.length + idx;
              return (
                <button
                  key={agent.id}
                  onClick={() => selectAgent(agent)}
                  className={cn(
                    "flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left transition-colors",
                    globalIdx === selectedIndex ? "bg-blue-50 text-blue-600" : "hover:bg-gray-50"
                  )}
                >
                  <span className="mt-0.5 text-sm">🌐</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{agent.name}</p>
                    <p className="truncate text-xs text-gray-500">{agent.description || "暂无描述"}</p>
                  </div>
                </button>
              );
            })}
          </>
        )}
        {filteredAgents.length === 0 && (
          <div className="p-4 text-center text-sm text-gray-500">没有找到匹配的智能体</div>
        )}
      </div>
      <div className="shrink-0 border-t border-gray-100 px-3 py-2 text-xs text-gray-400">
        按 Enter 选择 · Esc 关闭
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(popup, document.body);
}
