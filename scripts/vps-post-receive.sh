#!/bin/bash
set -e
export PATH=/usr/local/bin:/usr/bin:/bin:/home/deploy/.local/share/pnpm:$PATH
export HOME=/home/deploy

echo '>>> Checking out code...'
git --work-tree=/home/deploy/app --git-dir=/home/deploy/dmo-kb.git checkout -f main

cd /home/deploy/app

echo '>>> Installing dependencies...'
pnpm install 2>&1

echo '>>> Building CMS...'
cd /home/deploy/app/apps/cms && pnpm build 2>&1

echo '>>> Building web...'
cd /home/deploy/app/apps/web && pnpm build 2>&1

echo '>>> Running post-deploy seed (direct MongoDB, one-shot)...'
cd /home/deploy/app
node scripts/post-deploy-seed.mjs 2>&1 || echo '(seed script failed, non-fatal)'

echo '>>> Restarting PM2...'
cd /home/deploy/app
pm2 restart all 2>&1

echo '>>> Deploy complete!'
pm2 status
