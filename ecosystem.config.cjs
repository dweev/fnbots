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
      node_args: '--max-old-space-size=4096',
      max_memory_restart: '3G',
      watch: watchMode,
      ignore_watch: [
        '.git',
        '.github',
        'logs',
        'node_modules',
        'src/sampah'
      ],
      watch_options: {
        usePolling: true,
        interval: 1000
      },
      env: {
        NODE_ENV: watchMode ? 'development' : 'production'
      }
    }
  ]
};