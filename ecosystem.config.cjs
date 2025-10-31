// ─── Info ─────────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ecosystem.config.cjs ────────────────

const isDevelopment = process.argv.includes('--env') && process.argv[process.argv.indexOf('--env') + 1] === 'development';
const isWatchFlagPresent = process.argv.includes('--watch');
const watchMode = isDevelopment || isWatchFlagPresent;

module.exports = {
  apps: [
    {
      name: 'fnbots',
      script: './core/main.js',
      node_args: '--max-old-space-size=4096 --expose-gc',
      max_memory_restart: '3G',
      instances: 1,
      exec_mode: 'fork',
      min_uptime: '10s',
      max_restarts: 10,
      autorestart: true,
      watch: watchMode,
      ignore_watch: [
        '.git',
        '.github',
        'logs',
        'node_modules',
        'src/sampah',
        'build',
        '*.log'
      ],
      watch_options: {
        usePolling: true,
        interval: 1000
      },
      env: {
        NODE_ENV: watchMode ? 'development' : 'production',
        TZ: 'Asia/Jakarta'
      },
      exp_backoff_restart_delay: 100,
      listen_timeout: 10000,
      kill_timeout: 5000
    }
  ]
};
