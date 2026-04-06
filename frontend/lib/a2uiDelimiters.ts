/**
 * MeowOne 约定：在助手正文中用成对标记包裹 **裸 A2UI JSON**（无需 Markdown 代码围栏），
 * 前端解析后单独渲染为卡片，用户不会看到原始 JSON。
 *
 * 官方 A2UI（a2ui.org）在传输层通常用 JSON 消息流（SSE/A2A 等），不规定 Markdown 围栏；
 * 本约定是产品在聊天 Markdown 载体上的扩展。
 */
export const A2UI_BLOCK_START = "---A2UI-START---";
export const A2UI_BLOCK_END = "---A2UI-END---";
