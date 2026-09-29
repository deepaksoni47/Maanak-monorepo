module.exports = {
  apps: [
    {
      name: 'maanak-api',
      script: './dist/server.js',
      cwd: './apps/api',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '700M',
      env: {
        NODE_ENV: 'production',
        PORT: 4000,
        API_HOST: '0.0.0.0',
      },
    },
  ],
};
