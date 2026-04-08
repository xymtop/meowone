"use client";

import { useEffect, useState, useCallback } from "react";
import { meowoneApi, type PromptsListResponse, type PromptItem } from "@/lib/meowone-api";
import { cn } from "@/lib/utils";

// ============ 图标组件 ============
function PlusIcon() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  );
}

function FolderOpenIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 8.25h15m-16.5 7.5h15m-1.8-13.5l-3.9 19.5m-2.1-19.5l-3.9 19.5" />
    </svg>
  );
}

// ============ 类型定义 ============
type PromptGroup = {
  name: string;
  prompts: PromptItem[];
};

type TreeNode = {
  id: string;
  name: string;
  type: "folder" | "prompt";
  children?: TreeNode[];
  prompt?: PromptItem;
};

// ============ 主组件 ============
export default function CapabilitiesPromptsPage() {
  const [data, setData] = useState<PromptsListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);

  // 树状结构相关
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [selectedPrompt, setSelectedPrompt] = useState<PromptItem | null>(null);
  const [editingPrompt, setEditingPrompt] = useState<PromptItem | null>(null);

  // 表单状态
  const [promptKey, setPromptKey] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [contentMd, setContentMd] = useState("");
  const [tags, setTags] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const result = await meowoneApi.listPrompts();
      setData(result);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /** 按 prompt_key 路径（a/b/c）构建多级文件夹树，叶节点保留完整 prompt_key */
  const buildTree = useCallback((): TreeNode[] => {
    if (!data?.prompts?.length) return [];

    const root: TreeNode[] = [];

    const ensureFolder = (parent: TreeNode[], segment: string, pathPrefix: string): TreeNode => {
      const id = `folder-${pathPrefix}`;
      let folder = parent.find((n) => n.type === "folder" && n.id === id);
      if (!folder) {
        folder = { id, name: segment, type: "folder", children: [] };
        parent.push(folder);
      }
      return folder;
    };

    for (const prompt of data.prompts) {
      const parts = prompt.prompt_key.split("/").filter(Boolean);
      if (parts.length === 0) continue;

      if (parts.length === 1) {
        root.push({
          id: `prompt-${prompt.prompt_key}`,
          name: prompt.name || parts[0],
          type: "prompt",
          prompt,
        });
        continue;
      }

      let level = root;
      let pathAcc = "";
      for (let i = 0; i < parts.length - 1; i++) {
        pathAcc = pathAcc ? `${pathAcc}/${parts[i]}` : parts[i];
        const folder = ensureFolder(level, parts[i], pathAcc);
        if (!folder.children) folder.children = [];
        level = folder.children;
      }

      const leafName = parts[parts.length - 1];
      level.push({
        id: `prompt-${prompt.prompt_key}`,
        name: prompt.name || leafName,
        type: "prompt",
        prompt,
      });
    }

    const sortNodes = (nodes: TreeNode[]) => {
      nodes.sort((a, b) => {
        if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
        return a.name.localeCompare(b.name, "zh-CN");
      });
      for (const n of nodes) {
        if (n.type === "folder" && n.children) sortNodes(n.children);
      }
    };
    sortNodes(root);
    return root;
  }, [data]);

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  };

  const selectPrompt = (prompt: PromptItem) => {
    setSelectedPrompt(prompt);
    setEditingPrompt(null);
  };

  const startEditing = () => {
    if (selectedPrompt) {
      setPromptKey(selectedPrompt.prompt_key);
      setName(selectedPrompt.name);
      setDescription(selectedPrompt.description || "");
      setContentMd(selectedPrompt.content_md || "");
      setTags((selectedPrompt.tags || []).join(", "));
      setEditingPrompt(selectedPrompt);
      setShowForm(true);
    }
  };

  const resetForm = () => {
    setPromptKey("");
    setName("");
    setDescription("");
    setContentMd("");
    setTags("");
    setEditingPrompt(null);
    setShowForm(false);
  };

  const handleSubmit = async () => {
    if (!promptKey.trim()) {
      setError("请输入提示词标识");
      return;
    }
    if (!name.trim()) {
      setError("请输入提示词名称");
      return;
    }

    try {
      setSaving(true);
      setError("");
      await meowoneApi.upsertPrompt({
        prompt_key: promptKey.trim(),
        name: name.trim(),
        content_md: contentMd.trim(),
        description: description.trim(),
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        enabled: true,
      });
      resetForm();
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (promptKeyToDelete: string) => {
    if (!confirm(`确定要删除提示词 "${promptKeyToDelete}" 吗？`)) return;
    try {
      await meowoneApi.deletePrompt(promptKeyToDelete);
      if (selectedPrompt?.prompt_key === promptKeyToDelete) {
        setSelectedPrompt(null);
      }
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const tree = buildTree();

  const renderTreeNode = (node: TreeNode, level: number = 0) => {
    const isExpanded = expandedFolders.has(node.id);
    const isSelected = selectedPrompt?.prompt_key === node.prompt?.prompt_key;

    if (node.type === "folder") {
      return (
        <div key={node.id}>
          <button
            onClick={() => toggleFolder(node.id)}
            className="flex w-full items-center gap-1 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
            style={{ paddingLeft: `${level * 16 + 12}px` }}
          >
            {isExpanded ? <FolderOpenIcon /> : <FolderIcon />}
            <span className="font-medium">{node.name}</span>
            <span className="text-xs text-gray-400 ml-auto">{node.children?.length}</span>
          </button>
          {isExpanded && node.children?.map((child) => renderTreeNode(child, level + 1))}
        </div>
      );
    }

    return (
      <button
        key={node.id}
        onClick={() => node.prompt && selectPrompt(node.prompt)}
        className={cn(
          "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
          isSelected ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50"
        )}
        style={{ paddingLeft: `${level * 16 + 28}px` }}
      >
        <FileIcon />
        <span className="truncate">{node.name}</span>
      </button>
    );
  };

  return (
    <div className="flex h-[calc(100vh-120px)] gap-6">
      {/* 左侧：树状列表 */}
      <div className="w-72 shrink-0 overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">提示词管理</h2>
            <button
              onClick={() => { resetForm(); setShowForm(true); }}
              className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-r from-yellow-500 to-orange-600 text-white hover:from-yellow-600 hover:to-orange-700"
            >
              <PlusIcon />
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-500">管理 AI 提示词模板</p>
        </div>

        <div className="custom-scrollbar h-[calc(100%-80px)] overflow-y-auto p-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="size-6 animate-spin rounded-full border-2 border-yellow-500 border-t-transparent" />
            </div>
          ) : tree.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-gray-400">
              <StarIcon />
              <p className="mt-2 text-sm">暂无提示词</p>
            </div>
          ) : (
            tree.map((node) => renderTreeNode(node))
          )}
        </div>
      </div>

      {/* 右侧：提示词详情 */}
      <div className="flex-1 overflow-hidden rounded-2xl border border-gray-200 bg-white">
        {selectedPrompt ? (
          <>
            <div className="flex items-center justify-between border-b border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-yellow-50 text-yellow-600">
                  <StarIcon />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{selectedPrompt.name}</h3>
                  <p className="text-xs text-gray-500">{selectedPrompt.prompt_key}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={startEditing}
                  className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
                >
                  <EditIcon /> 编辑
                </button>
                <button
                  onClick={() => void handleDelete(selectedPrompt.prompt_key)}
                  className="flex items-center justify-center rounded-lg border border-gray-200 p-1.5 text-red-500 hover:bg-red-50"
                >
                  <TrashIcon />
                </button>
              </div>
            </div>

            <div className="custom-scrollbar h-[calc(100%-73px)] overflow-y-auto p-4">
              {selectedPrompt.description && (
                <div className="mb-4 rounded-lg bg-gray-50 p-3">
                  <p className="text-sm text-gray-600">{selectedPrompt.description}</p>
                </div>
              )}

              {(selectedPrompt.tags || []).length > 0 && (
                <div className="mb-4 flex flex-wrap gap-2">
                  {(selectedPrompt.tags || []).map((tag, idx) => (
                    <span key={idx} className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="rounded-lg border border-gray-200 bg-white">
                <div className="border-b border-gray-200 bg-gray-50 px-4 py-2">
                  <h4 className="text-sm font-medium text-gray-700">提示词内容</h4>
                </div>
                <pre className="whitespace-pre-wrap p-4 text-sm text-gray-700">
                  {selectedPrompt.content_md || "暂无内容"}
                </pre>
              </div>
            </div>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-gray-400">
            <StarIcon />
            <p className="mt-2">选择一个提示词查看详情</p>
          </div>
        )}
      </div>

      {/* 编辑/创建弹窗 */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 p-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingPrompt ? "编辑提示词" : "创建提示词"}
              </h3>
              <button onClick={resetForm} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                <CloseIcon />
              </button>
            </div>

            <div className="custom-scrollbar h-[calc(100%-130px)] overflow-y-auto p-4 space-y-4">
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">提示词标识 *</label>
                  <input
                    type="text"
                    value={promptKey}
                    onChange={(e) => setPromptKey(e.target.value)}
                    placeholder="例如：customer-service/welcome"
                    className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/20"
                  />
                  <p className="mt-1 text-xs text-gray-500">用于唯一标识提示词，支持分层（用/分隔）</p>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">显示名称 *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="例如：客服欢迎语"
                    className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">描述</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="提示词的简短描述"
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/20"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">标签（逗号分隔）</label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="例如：客服, 欢迎, 常用"
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/20"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">提示词内容</label>
                <textarea
                  value={contentMd}
                  onChange={(e) => setContentMd(e.target.value)}
                  placeholder="输入系统提示词内容，支持 Markdown 格式..."
                  rows={12}
                  className="w-full rounded-lg border border-gray-200 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/20 font-mono text-sm"
                />
              </div>

              <div className="rounded-lg bg-yellow-50 p-4">
                <p className="text-sm font-medium text-yellow-800">提示词编写建议</p>
                <ul className="mt-2 space-y-1 text-sm text-yellow-700">
                  <li>- 明确智能体的身份和专长</li>
                  <li>- 说明回答问题的风格和语气</li>
                  <li>- 设定处理边界和限制</li>
                  <li>- 可以使用变量占位符，如 {"{{variable}}"}</li>
                </ul>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-gray-200 bg-gray-50 p-4">
              <button onClick={resetForm} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                取消
              </button>
              <button onClick={() => void handleSubmit()} disabled={saving}
                className="rounded-lg bg-gradient-to-r from-yellow-500 to-orange-600 px-4 py-2 text-sm font-medium text-white hover:from-yellow-600 hover:to-orange-700 disabled:opacity-50">
                {saving ? "保存中..." : editingPrompt ? "更新" : "创建"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
