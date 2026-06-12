// PM2 ecosystem config — usar con: pm2 start ecosystem.config.js --env production
module.exports = {
  apps: [
    {
      name      : 'api-oniultrahost',
      script    : 'server.js',
      instances : 'max',        // un proceso por CPU core
      exec_mode : 'cluster',    // cluster mode para balanceo
      watch     : false,
      env_production: {
        NODE_ENV: 'production',
        PORT    : 5000,
      },
      // Reiniciar si supera 300MB de RAM
      max_memory_restart: '300M',
      // Logs
      out_file       : './logs/out.log',
      error_file     : './logs/err.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
}
