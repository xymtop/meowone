"use client";

import dynamic from "next/dynamic";

const CreateInstancePageContent = dynamic(
  () => import("./CreateInstancePageContent"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center py-12">
        <div className="size-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        <span className="ml-3 text-gray-500">加载中...</span>
      </div>
    )
  }
);

export default function CreateInstancePage() {
  return <CreateInstancePageContent />;
}