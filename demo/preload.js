/**
 * 预加载脚本 - 在渲染进程和主进程之间建立安全通信桥
 * 使用 contextBridge 暴露安全的 API 给渲染进程
 */
const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 获取 Electron 版本
  getVersion: () => process.versions.electron,
  // 获取 Chrome 版本
  getChromeVersion: () => process.versions.chrome,
  // 获取 Node 版本
  getNodeVersion: () => process.versions.node,
  // 获取平台信息
  getPlatform: () => process.platform
});
