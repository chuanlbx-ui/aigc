/**
 * 后台服务入口
 * Service Worker for Chrome Extension Manifest V3
 */

import { TaskManager } from './taskManager';

let taskManager: TaskManager | null = null;

// 扩展安装时
chrome.runtime.onInstalled.addListener(() => {
  console.log('Remotion Publisher 扩展已安装');
  startTaskManager();
});

// 扩展启动时
chrome.runtime.onStartup.addListener(() => {
  console.log('Remotion Publisher 扩展已启动');
  startTaskManager();
});

/**
 * 启动任务管理器
 */
function startTaskManager() {
  if (!taskManager) {
    taskManager = new TaskManager();
    taskManager.start();
  }
}

// 立即启动
startTaskManager();
