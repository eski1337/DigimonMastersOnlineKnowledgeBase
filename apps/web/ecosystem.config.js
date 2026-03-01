module.exports = {
  apps: [{
    name: 'web',
    script: 'npm',
    args: 'start -- -p 3000',
    cwd: '/home/deploy/app/apps/web',
    env: {
      NODE_ENV: 'production',
      CMS_ADMIN_EMAIL: 'svc@dmokb.info',
      CMS_ADMIN_PASSWORD: 'DmokbService2026SecurePass',
      CMS_INTERNAL_URL: 'http://localhost:3001',
    },
  }],
};
