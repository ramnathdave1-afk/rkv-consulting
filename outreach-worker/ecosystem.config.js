module.exports = {
  apps: [
    {
      name: 'outreach-worker',
      script: 'dist/index.js',
      cwd: '/opt/outreach-worker',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        TZ: 'America/New_York',
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/opt/outreach-worker/logs/error.log',
      out_file: '/opt/outreach-worker/logs/out.log',
      merge_logs: true,
      restart_delay: 5000,
      max_restarts: 10,
      min_uptime: '10s',
    },
  ],
};
