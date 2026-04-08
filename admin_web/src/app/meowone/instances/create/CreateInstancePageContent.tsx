"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { meowoneApi } from "@/lib/meowone-api";

type ImageItem = {
  id: string;
  name: string;
  description?: string;
  agent_ids?: string[];
  loop_id?: string;
  strategy_id?: string;
  environment_id?: string;
};

type ModelItem = {
  name: string;
  provider?: string;
};

export default function CreateInstancePageContent() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // 基础信息
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  // 选择镜像
  const [images, setImages] = useState<ImageItem[]>([]);
  const [selectedImageId, setSelectedImageId] = useState("");
  const [selectedImage, setSelectedImage] = useState<ImageItem | null>(null);

  // 模型
  const [models, setModels] = useState<ModelItem[]>([]);
  const [selectedModel, setSelectedModel] = useState("");

  useEffect(() => {
    // 从 URL 获取预选的镜像 ID
    const params = new URLSearchParams(window.location.search);
    const preSelectedImageId = params.get("image_id") || "";
    setSelectedImageId(preSelectedImageId);
    void loadData(preSelectedImageId);
  }, []);

  const loadData = async (preSelectedImageId: string) => {
    setLoading(true);
    setError("");
    
    try {
      const imageData = await meowoneApi.listAgentImages(true);
      setImages((imageData.images || []) as ImageItem[]);

      // 如果有预选的镜像，自动选中
      if (preSelectedImageId) {
        const img = (imageData.images || []).find((i: any) => i.id === preSelectedImageId);
        if (img) {
          setSelectedImage(img as ImageItem);
        }
      }
    } catch (e) {
      console.error("加载镜像失败:", e);
    }

    try {
      const modelData = await meowoneApi.listModels();
      setModels((modelData.models || []) as ModelItem[]);
    } catch (e) {
      console.error("加载模型失败:", e);
    }

    setLoading(false);
  };

  const handleImageSelect = (imageId: string) => {
    setSelectedImageId(imageId);
    const img = images.find((i) => i.id === imageId);
    setSelectedImage(img || null);
    // 自动设置实例名称
    if (img && !name) {
      setName(img.name + "-实例");
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("请输入实例名称");
      return;
    }
    if (!selectedImageId) {
      setError("请选择镜像");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await meowoneApi.createAgentInstance({
        name: name.trim(),
        description: description.trim(),
        image_id: selectedImageId,
        model_name: selectedModel,
      });
      router.push("/meowone/instances");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading && images.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="size-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        <span className="ml-3 text-gray-500">加载选项...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">创建智能体实例</h1>
        <p className="mt-1 text-sm text-gray-500">选择一个镜像和模型，创建一个可运行的实例</p>
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
                实例名称 <span className="text-red-500">*</span>
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：我的助手实例"
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
                placeholder="描述这个实例的用途..."
                rows={2}
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm dark:border-dark-3 dark:bg-dark"
              />
            </div>
          </div>
        </div>

        {/* 镜像选择 */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
          <h2 className="mb-4 text-lg font-semibold">
            选择镜像 <span className="text-red-500">*</span>
          </h2>
          {images.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {images.map((img) => {
                const isSelected = selectedImageId === img.id;
                return (
                  <button
                    key={img.id}
                    onClick={() => handleImageSelect(img.id)}
                    className={`rounded-lg border p-4 text-left transition-all ${
                      isSelected
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                        : "border-gray-200 hover:border-blue-300 dark:border-dark-3"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        checked={isSelected}
                        onChange={() => handleImageSelect(img.id)}
                        className="mt-1 h-4 w-4"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-gray-900 dark:text-white">{img.name}</div>
                        <div className="mt-1 text-sm text-gray-500">{img.description || "无描述"}</div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {img.agent_ids && img.agent_ids.length > 0 && (
                            <span className="rounded bg-purple-100 px-1.5 py-0.5 text-xs text-purple-600">
                              {img.agent_ids.length} 智能体
                            </span>
                          )}
                          {img.loop_id && (
                            <span className="rounded bg-pink-100 px-1.5 py-0.5 text-xs text-pink-600">Loop</span>
                          )}
                          {img.strategy_id && (
                            <span className="rounded bg-yellow-100 px-1.5 py-0.5 text-xs text-yellow-600">策略</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
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

        {/* 模型选择 */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
          <h2 className="mb-4 text-lg font-semibold">选择模型</h2>
          {models.length > 0 ? (
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm dark:border-dark-3 dark:bg-dark"
            >
              <option value="">默认模型</option>
              {models.map((m) => (
                <option key={m.name} value={m.name}>
                  {m.name} {m.provider ? `(${m.provider})` : ""}
                </option>
              ))}
            </select>
          ) : (
            <div className="rounded-lg border-2 border-dashed border-gray-200 p-8 text-center">
              <p className="text-gray-500">还没有配置模型</p>
              <a
                href="/meowone/models"
                className="mt-2 inline-block text-blue-500 hover:underline"
              >
                添加模型
              </a>
            </div>
          )}
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
            disabled={saving || !name.trim() || !selectedImageId}
            className="rounded-lg bg-gradient-to-r from-green-500 to-teal-600 px-6 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? "创建中..." : "创建实例"}
          </button>
        </div>
      </div>
    </div>
  );
}