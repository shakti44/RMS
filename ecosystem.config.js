module.exports = {
  apps: [
    {
      name:         'rms-server',
      script:       './server/src/index.js',
      cwd:          './server',
      instances:    'max',          // cluster mode — one per CPU core
      exec_mode:    'cluster',
      watch:        false,
      max_memory_restart: '512M',
      env_production: {
        NODE_ENV: 'production',
        PORT:     4000,
      },
      error_file:   './logs/pm2-error.log',
      out_file:     './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 10000,
      // Auto-restart on crash, but not in a loop
      max_restarts:  10,
      restart_delay: 4000,
    },
  ],
};
