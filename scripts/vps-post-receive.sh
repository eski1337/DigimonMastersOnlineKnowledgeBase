#!/bin/bash
set -e
export PATH=/usr/local/bin:/usr/bin:/bin:/home/deploy/.local/share/pnpm:$PATH
export HOME=/home/deploy

echo '>>> Checking out code...'
git --work-tree=/home/deploy/app --git-dir=/home/deploy/dmo-kb.git checkout -f main

cd /home/deploy/app

# Auto-update the hook from repo so future deploys use the latest version
echo '>>> Updating post-receive hook...'
cp /home/deploy/app/scripts/vps-post-receive.sh /home/deploy/dmo-kb.git/hooks/post-receive 2>/dev/null || true
chmod +x /home/deploy/dmo-kb.git/hooks/post-receive 2>/dev/null || true

echo '>>> Installing dependencies...'
pnpm install 2>&1

echo '>>> Building CMS...'
cd /home/deploy/app/apps/cms && pnpm build 2>&1

echo '>>> Building web...'
cd /home/deploy/app/apps/web && pnpm build 2>&1

echo '>>> Seeding systems collection via mongosh...'
cd /home/deploy/app
mongosh mongodb://localhost:27017/dmo-kb scripts/seed-systems.js 2>&1 || echo '(seed skipped or failed, non-fatal)'

echo '>>> Restarting PM2...'
cd /home/deploy/app
pm2 restart all 2>&1

echo '>>> Deploy complete!'
pm2 status
