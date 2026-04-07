/**
 * MeowOne 约定：在助手正文中用成对标记包裹 **裸 A2UI v0.8 JSON**（无需 Markdown 代码围栏），
 * 前端解析后单独渲染为卡片，用户不会看到原始 JSON。
 *
 * 注意：这只是 **传输/嵌入方式** 的约定，不属于 Google A2UI 协议本身。
 * 官方 A2UI（a2ui.org）在传输层通常用 JSONL/SSE（或 A2A 扩展）直接传 JSON 消息流。
 */
export const A2UI_BLOCK_START = "---A2UI-START---";
export const A2UI_BLOCK_END = "---A2UI-END---";
