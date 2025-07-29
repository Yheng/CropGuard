module.exports = {
  apps: [
    {
      name: 'cropguard-api',
      script: './backend/src/index.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 8080
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      max_memory_restart: '1G',
      node_args: '--max-old-space-size=4096',
      kill_timeout: 5000,
      listen_timeout: 10000,
      max_restarts: 10,
      min_uptime: '10s',
      autorestart: true,
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'data'],
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Health monitoring
      health_check_url: 'http://localhost:8080/api/health',
      health_check_grace_period: 10000,
      
      // Environment-specific settings
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 8080,
        LOG_LEVEL: 'debug'
      }
    }
  ],

  deploy: {
    production: {
      user: 'deploy',
      host: 'your-server.com',
      ref: 'origin/main',
      repo: 'git@github.com:your-org/cropguard.git',
      path: '/var/www/cropguard',
      'pre-deploy-local': 'npm run test',
      'post-deploy': 'npm run install:all && npm run build:frontend && pm2 reload ecosystem.config.js --env production && pm2 save',
      'pre-setup': 'sudo apt-get update && sudo apt-get install -y git nodejs npm'
    },
    
    staging: {
      user: 'deploy',
      host: 'staging.your-server.com',
      ref: 'origin/develop',
      repo: 'git@github.com:your-org/cropguard.git',
      path: '/var/www/cropguard-staging',
      'post-deploy': 'npm run install:all && npm run build:frontend && pm2 reload ecosystem.config.js --env staging && pm2 save'
    }
  }
};