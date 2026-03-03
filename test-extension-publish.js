/**
 * 浏览器扩展发布功能测试脚本
 *
 * 使用方法：
 * node test-extension-publish.js
 */

const API_BASE = 'http://localhost:3001/api';

// 测试1：检查扩展状态
async function testExtensionStatus() {
  console.log('\n=== 测试1：检查扩展状态 ===');

  try {
    const response = await fetch(`${API_BASE}/extension/status`);
    const data = await response.json();

    console.log('扩展状态:', {
      安装: data.installed ? '✅' : '❌',
      启用: data.enabled ? '✅' : '❌',
      在线: data.online ? '✅' : '❌',
      版本: data.version,
      浏览器: data.browserType,
      最后心跳: data.lastPingAt,
    });

    return data.online;
  } catch (error) {
    console.error('❌ 检查失败:', error.message);
    return false;
  }
}

// 测试2：创建测试发布任务
async function createTestTask() {
  console.log('\n=== 测试2：创建测试发布任务 ===');

  try {
    // 创建一个简单的扩展任务
    const taskData = {
      publishRecordId: 'test-record-' + Date.now(),
      taskType: 'publish',
      priority: 0,
      payload: JSON.stringify({
        platformName: '微博',
        content: {
          title: '测试标题',
          text: '这是一条测试微博内容 #测试话题#',
          images: [],
        },
      }),
    };
