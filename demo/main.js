/**
 * Electron 主进程入口文件
 * 主进程负责创建窗口、管理应用生命周期等核心功能
 */
const { app, BrowserWindow } = require('electron');
const path = require('path');

// 应用准备就绪后创建窗口
app.whenReady().then(() => {
  // 创建浏览器窗口
  const mainWindow = new BrowserWindow({
    width: 800,          // 窗口宽度
    height: 600,         // 窗口高度
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')  // 预加载脚本
    }
  });

  // 加载 index.html
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // 打开开发者工具（可选，便于调试）
  mainWindow.webContents.openDevTools();
});

// 所有窗口关闭时退出应用（macOS 除外）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// macOS 上点击 Dock 图标时重建窗口
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    app.whenReady().then(() => {
      const mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
          preload: path.join(__dirname, 'preload.js')
        }
      });
      mainWindow.loadFile(path.join(__dirname, 'index.html'));
    });
  }
});
