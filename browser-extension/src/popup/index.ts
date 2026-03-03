/**
 * 弹窗页面脚本
 */

// 显示扩展版本
const versionElement = document.getElementById('version');
if (versionElement) {
  versionElement.textContent = chrome.runtime.getManifest().version;
}

// 检查后台服务状态
async function checkStatus() {
  const statusElement = document.getElementById('status');
  if (!statusElement) return;

  try {
    const response = await fetch('http://localhost:3001/api/extension/status');

    if (response.ok) {
      const data = await response.json();

      if (data.online) {
        statusElement.className = 'status online';
        statusElement.innerHTML = `
          <span class="status-icon">🟢</span>
          <span class="status-text">已连接到服务器</span>
        `;
      } else {
        statusElement.className = 'status offline';
        statusElement.innerHTML = `
          <span class="status-icon">🔴</span>
          <span class="status-text">扩展离线</span>
        `;
      }
    } else {
      throw new Error('服务器响应错误');
    }
  } catch (error) {
    statusElement.className = 'status offline';
    statusElement.innerHTML = `
      <span class="status-icon">🔴</span>
      <span class="status-text">无法连接到服务器</span>
    `;
  }
}

// 页面加载时检查状态
checkStatus();

// 每5秒更新一次状态
setInterval(checkStatus, 5000);
