module.exports = {
  apps: [
    {
      name: 'hitsbot-backend',
      script: 'dist/index.js',
      cwd: './apps/backend-core',
      node_args: '--max-old-space-size=2048',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      watch: false,
      ignore_watch: ['node_modules', 'sessions'],
      max_memory_restart: '2G',
      instances: 1, // Single instance to prevent Baileys session conflicts
      exec_mode: 'fork',
    },
    {
      name: 'hitsbot-frontend',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      cwd: './apps/frontend',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork',
    }
  ]
};
