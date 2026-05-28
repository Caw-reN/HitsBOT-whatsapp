module.exports = {
  apps: [
    {
      name: 'hitsbot-backend',
      script: 'dist/index.js',
      node_args: '--max-old-space-size=4096',
      env: {
        NODE_ENV: 'production',
      },
      watch: false,
      ignore_watch: ['node_modules', 'sessions'],
      max_memory_restart: '4G',
      instances: 1, // Baileys must run in a single instance to prevent session conflicts
      exec_mode: 'fork',
    }
  ]
};
