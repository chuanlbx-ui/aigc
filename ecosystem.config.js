module.exports = {
  apps: [
    {
      name: 'remotion-backend',
      script: 'dist/index.js',
      cwd: '/www/wwwroot/aigc.wenbita.cn/backend',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '2G',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: '/www/wwwroot/aigc.wenbita.cn/logs/backend-error.log',
      out_file: '/www/wwwroot/aigc.wenbita.cn/logs/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000,
      source_map_support: true,
      disable_logs: false
    }
  ]
};
