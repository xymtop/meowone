"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { meowoneApi } from "@/lib/meowone-api";

type Image = { id: string; name: string; description?: string; agent_ids?: string[]; strategy_id?: string };
type Strategy = { id: string; name: string; description?: string };
type Agent = { id: string; name: string; description?: string; agent_type: string };

export default function CreateStrategyConfigPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [images, setImages] = useState<Image[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // 表单
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedImage, setSelectedImage] = useState("");
  const [selectedStrategy, setSelectedStrategy] = useState("");
  const [configRaw, setConfigRaw] = useState("{}");

  useEffect(() => {
    void loadOptions();
  }, []);

  const loadOptions = async () => {
    setLoading(true);
    try {
      const [imageData, agentData, strategyData] = await Promise.all([
        meowoneApi.listAgentImages(),
        meowoneApi.listAgents(),
        meowoneApi.listStrategies(),
      ]);
      setImages((imageData as { images: Image[] }).images || []);
      setAgents((agentData as { agents: Agent[] }).agents || []);
      setStrategies((strategyData as { strategies: Strategy[] }).strategies || []);
      
      // 从 URL 获取预选的镜像 ID
      const params = new URLSearchParams(window.location.search);
      const preSelectedImageId = params.get("image_id") || "";
      if (preSelectedImageId) {
        setSelectedImage(preSelectedImageId);
        const img = (imageData as { images: Image[] }).images?.find((i) => i.id === preSelectedImageId);
        if (img?.strategy_id) {
          setSelectedStrategy(img.strategy_id);
        }
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("请输入配置名称");
      return;
    }
    if (!selectedImage) {
      setError("请选择一个镜像");
      return;
    }

    setSaving(true);
    setError("");

    try {
      let config: Record<string, unknown> = {};
      if (configRaw.trim()) {
        try {
          config = JSON.parse(configRaw);
        } catch {
          setError("配置 JSON 格式错误");
          setSaving(false);
          return;
        }
      }

      await meowoneApi.createStrategyConfig({
        name: name.trim(),
        description: description.trim(),
        image_id: selectedImage,
        strategy_id: selectedStrategy || undefined,
        config,
      });
      router.push("/meowone/scheduler/strategy-configs");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const selectedImageData = images.find((img) => img.id === selectedImage);
  const imageAgents = selectedImageData?.agent_ids
    ? agents.filter((a) => selectedImageData.agent_ids?.includes(a.id))
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="size-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        <span className="ml-3 text-gray-500">加载中...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">创建策略配置</h1>
        <p className="mt-1 text-sm text-gray-500">选择一个镜像，为其创建策略配置。创建实例时可快速选择</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {/* 基础信息 */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
          <h2 className="mb-4 text-lg font-semibold">基础信息</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                配置名称 <span className="text-red-500">*</span>
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：主-智能体A配置"
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm dark:border-dark-3 dark:bg-dark"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                描述
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="描述这个配置的用途..."
                rows={2}
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm dark:border-dark-3 dark:bg-dark"
              />
            </div>
          </div>
        </div>

        {/* 选择镜像 */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
          <h2 className="mb-4 text-lg font-semibold flex items-center gap-2">
            <span className="size-2 rounded-full bg-blue-500"></span>
            选择镜像 <span className="text-red-500">*</span>
          </h2>
          {images.length > 0 ? (
            <div className="space-y-2">
              {images.map((image) => (
                <label
                  key={image.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedImage === image.id
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                      : "border-gray-200 hover:border-blue-300 hover:bg-gray-50 dark:border-dark-3 dark:hover:bg-dark"
                  }`}
                >
                  <input
                    type="radio"
                    name="image"
                    checked={selectedImage === image.id}
                    onChange={() => {
                      setSelectedImage(image.id);
                      setSelectedStrategy(image.strategy_id || "");
                    }}
                    className="mt-1 h-4 w-4"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{image.name}</div>
                    <div className="text-xs text-gray-500">{image.description || ""}</div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {image.agent_ids && image.agent_ids.length > 0 && (
                        <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-600">
                          {image.agent_ids.length} 个智能体
                        </span>
                      )}
                      {image.strategy_id && (
                        <span className="rounded bg-purple-100 px-1.5 py-0.5 text-xs text-purple-600">
                          有策略
                        </span>
                      )}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border-2 border-dashed border-gray-200 p-8 text-center">
              <p className="text-gray-500">还没有镜像</p>
              <a
                href="/meowone/images/create"
                className="mt-2 inline-block text-blue-500 hover:underline"
              >
                创建一个镜像
              </a>
            </div>
          )}
        </div>

        {/* 镜像的智能体 */}
        {selectedImage && imageAgents.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
            <h2 className="mb-4 text-lg font-semibold flex items-center gap-2">
              <span className="size-2 rounded-full bg-green-500"></span>
              镜像中的智能体
            </h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {imageAgents.map((agent) => (
                <div
                  key={agent.id}
                  className="rounded-lg border border-gray-200 p-3 dark:border-dark-3"
                >
                  <div className="font-medium text-sm">{agent.name}</div>
                  <div className="text-xs text-gray-500">{agent.agent_type}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 关联策略（可选，自动填充镜像的策略） */}
        {selectedImage && selectedStrategy && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
            <h2 className="mb-4 text-lg font-semibold flex items-center gap-2">
              <span className="size-2 rounded-full bg-purple-500"></span>
              关联策略（已自动填充）
            </h2>
            <div className="rounded-lg border border-dashed border-purple-200 bg-purple-50 p-3 dark:bg-purple-900/20">
              <span className="text-sm font-medium">{selectedStrategy}</span>
            </div>
          </div>
        )}

        {/* 配置内容 */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
          <h2 className="mb-4 text-lg font-semibold">配置内容</h2>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              配置 JSON
            </label>
            <textarea
              value={configRaw}
              onChange={(e) => setConfigRaw(e.target.value)}
              placeholder='{"leader_agent_id": "xxx", "timeout": 30}'
              rows={6}
              className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-mono dark:border-dark-3 dark:bg-dark"
            />
            <p className="mt-1 text-xs text-gray-500">输入有效的 JSON 格式</p>
          </div>
        </div>

        {/* 提交按钮 */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-6 dark:border-dark-3">
          <button
            onClick={() => router.back()}
            className="rounded-lg border border-gray-200 px-6 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-dark-3 dark:text-gray-300"
          >
            取消
          </button>
          <button
            onClick={() => void handleSubmit()}
            disabled={saving || !name.trim() || !selectedImage}
            className="rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? "创建中..." : "创建"}
          </button>
        </div>
      </div>
    </div>
  );
}
