const { spawn, execSync } = require('child_process');
const path = require('path');

const PORTS = {
  backend: 3001,
  frontend: 5175,
};

// 检查并释放端口
function killPort(port) {
  console.log(`检查端口 ${port}...`);
  try {
    // Windows 命令：查找占用端口的进程
    const result = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf-8' });
    const lines = result.trim().split('\n');

    const pids = new Set();
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && pid !== '0') {
        pids.add(pid);
      }
    }

    for (const pid of pids) {
      console.log(`结束进程 PID: ${pid}`);
      try {
        execSync(`taskkill /F /PID ${pid}`, { encoding: 'utf-8' });
      } catch {
        // 进程可能已结束
      }
    }
    console.log(`端口 ${port} 已释放`);
  } catch {
    console.log(`端口 ${port} 未被占用`);
  }
}

// 启动服务
function startService(name, cwd, command, args) {
  console.log(`\n启动 ${name}...`);
  const proc = spawn(command, args, {
    cwd,
    shell: true,
    stdio: 'inherit',
  });

  proc.on('error', (err) => {
    console.error(`${name} 启动失败:`, err.message);
  });

  return proc;
}

// 主函数
async function main() {
  console.log('=== 视频混剪系统启动脚本 ===\n');

  // 释放端口
  killPort(PORTS.backend);
  killPort(PORTS.frontend);

  // 等待端口完全释放
  await new Promise((r) => setTimeout(r, 1000));

  const webDir = path.resolve(__dirname, '..');

  // 启动后端
  startService(
    '后端服务',
    path.join(webDir, 'backend'),
    'npm',
    ['run', 'dev']
  );

  // 等待后端启动
  await new Promise((r) => setTimeout(r, 2000));

  // 启动前端
  startService(
    '前端服务',
    path.join(webDir, 'frontend'),
    'npm',
    ['run', 'dev']
  );

  console.log('\n=== 服务启动中 ===');
  console.log(`后端: http://localhost:${PORTS.backend}`);
  console.log(`前端: http://localhost:${PORTS.frontend}`);
}

main();
