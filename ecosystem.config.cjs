module.exports = {
  apps: [
    {
      name: 'fnbots',
      script: './core/main.js',
      node_args: '--max-old-space-size=4096',
      watch: false,
      ignore_watch: [
        'node_modules',
        'logs',
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