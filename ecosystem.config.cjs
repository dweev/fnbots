module.exports = {
  apps: [
    {
      name: 'fnbots',
      script: './core/main.js',
      node_args: '--max-old-space-size=4096',
      max_memory_restart: '3G',
      watch: false,
      ignore_watch: [
        'logs',
        'node_modules',
        'src/plugins',
        'src/sampah'
      ],
      env: {
        NODE_ENV: 'production'
      },
      env_development: {
        NODE_ENV: 'development'
      }
    }
  ]
};