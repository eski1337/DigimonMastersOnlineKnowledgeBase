#!/bin/bash
set -e

echo "=== DMO KB VPS Setup ==="

# 1. Fix SSH: unban and whitelist Mac IP
echo "[1/6] Fixing fail2ban..."
fail2ban-client set sshd unbanip 77.37.102.152 2>/dev/null || true
fail2ban-client set sshd addignoreip 77.37.102.152 2>/dev/null || true

# 2. Add Mac SSH key
echo "[2/6] Adding SSH key..."
mkdir -p /root/.ssh
KEY="ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAII7dmA+LjEKDv4FUwQU36vPw0pnhNkhaQD/gznuZHqzr lubo@macbook"
grep -q "lubo@macbook" /root/.ssh/authorized_keys 2>/dev/null && sed -i '/lubo@macbook/d' /root/.ssh/authorized_keys
echo "$KEY" >> /root/.ssh/authorized_keys
chmod 600 /root/.ssh/authorized_keys
echo "SSH key added."

# 3. Ensure password auth works
echo "PasswordAuthentication yes" > /etc/ssh/sshd_config.d/pw.conf 2>/dev/null || true
systemctl restart ssh

# 4. Install pnpm if missing
echo "[3/6] Checking pnpm..."
if ! command -v pnpm &>/dev/null; then
  npm install -g pnpm@9
fi
pnpm --version

# 5. Clone repo
echo "[4/6] Cloning repository..."
REPO=https://github.com/eski1337/DigimonMastersOnlineKnowledgeBase.git
PROJECT=/root/dmo-kb
if [ -d "$PROJECT/.git" ]; then
  echo "Repo exists, pulling latest..."
  cd "$PROJECT" && git pull origin main
else
  rm -rf "$PROJECT"
  git clone "$REPO" "$PROJECT"
  cd "$PROJECT"
fi

# 6. Install deps and build
echo "[5/6] Installing dependencies..."
cd "$PROJECT"
pnpm install

echo "[6/6] Building..."
pnpm build

# 7. Start with PM2
echo "Starting services with PM2..."
if command -v pm2 &>/dev/null; then
  pm2 delete all 2>/dev/null || true
  if [ -f ecosystem.config.js ]; then
    pm2 start ecosystem.config.js
  else
    cd apps/web && pm2 start "pnpm start" --name web &
    cd ../cms && pm2 start "pnpm start" --name cms &
  fi
  pm2 save
fi

echo ""
echo "=== DONE! ==="
echo "Project: $PROJECT"
echo "SSH should now work from your Mac"
echo "Run: ssh root@212.227.103.86"
