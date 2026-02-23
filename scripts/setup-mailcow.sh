#!/bin/bash
# ============================================================================
# Mailcow Setup Script for dmokb.info
# Run this on the Strato VPS as root AFTER DNS records are configured
# Usage: sudo ./scripts/setup-mailcow.sh
# ============================================================================

set -euo pipefail

DOMAIN="dmokb.info"
MAIL_HOSTNAME="mail.${DOMAIN}"
MAILCOW_DIR="/home/dmokb/mailcow-dockerized"
TIMEZONE="Europe/Berlin"

echo "=========================================="
echo "  Mailcow Setup for ${MAIL_HOSTNAME}"
echo "=========================================="

# ---- Pre-flight checks ----
echo ""
echo "[1/7] Pre-flight checks..."

# Check running as root
if [ "$EUID" -ne 0 ]; then
  echo "ERROR: Please run as root (sudo)"
  exit 1
fi

# Check DNS
echo "  Checking DNS records..."
MX_RECORD=$(dig MX ${DOMAIN} +short 2>/dev/null || true)
A_RECORD=$(dig A ${MAIL_HOSTNAME} +short 2>/dev/null || true)

if [ -z "$MX_RECORD" ]; then
  echo "  WARNING: No MX record found for ${DOMAIN}"
  echo "  Make sure you've added: MX @ → ${MAIL_HOSTNAME} (priority 10)"
  read -p "  Continue anyway? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then exit 1; fi
else
  echo "  MX record: ${MX_RECORD} ✓"
fi

if [ -z "$A_RECORD" ]; then
  echo "  WARNING: No A record found for ${MAIL_HOSTNAME}"
  read -p "  Continue anyway? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then exit 1; fi
else
  echo "  A record: ${A_RECORD} ✓"
fi

# ---- Install Docker if needed ----
echo ""
echo "[2/7] Checking Docker..."

if ! command -v docker &> /dev/null; then
  echo "  Installing Docker..."
  curl -fsSL https://get.docker.com | sh
  usermod -aG docker dmokb
  echo "  Docker installed ✓"
else
  echo "  Docker already installed ✓"
fi

if ! docker compose version &> /dev/null; then
  echo "  Installing Docker Compose plugin..."
  apt install -y docker-compose-plugin
  echo "  Docker Compose installed ✓"
else
  echo "  Docker Compose already installed ✓"
fi

# ---- Stop conflicting services ----
echo ""
echo "[3/7] Stopping conflicting services..."

systemctl stop postfix 2>/dev/null && echo "  Stopped postfix" || true
systemctl disable postfix 2>/dev/null || true

# ---- Clone & Configure Mailcow ----
echo ""
echo "[4/7] Setting up Mailcow..."

if [ -d "$MAILCOW_DIR" ]; then
  echo "  Mailcow directory already exists at ${MAILCOW_DIR}"
  read -p "  Remove and reinstall? (y/N) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    cd "$MAILCOW_DIR"
    docker compose down 2>/dev/null || true
    cd /home/dmokb
    rm -rf "$MAILCOW_DIR"
  else
    echo "  Keeping existing installation"
  fi
fi

if [ ! -d "$MAILCOW_DIR" ]; then
  su - dmokb -c "cd /home/dmokb && git clone https://github.com/mailcow/mailcow-dockerized.git"
fi

cd "$MAILCOW_DIR"

# Generate config non-interactively
if [ ! -f mailcow.conf ]; then
  MAILCOW_HOSTNAME="${MAIL_HOSTNAME}" \
  MAILCOW_TZ="${TIMEZONE}" \
  ./generate_config.sh
fi

# Patch mailcow.conf for reverse proxy setup
sed -i "s|^HTTP_PORT=.*|HTTP_PORT=8080|" mailcow.conf
sed -i "s|^HTTPS_PORT=.*|HTTPS_PORT=8443|" mailcow.conf
sed -i "s|^HTTP_BIND=.*|HTTP_BIND=127.0.0.1|" mailcow.conf
sed -i "s|^HTTPS_BIND=.*|HTTPS_BIND=127.0.0.1|" mailcow.conf
sed -i "s|^SKIP_LETS_ENCRYPT=.*|SKIP_LETS_ENCRYPT=y|" mailcow.conf
sed -i "s|^SKIP_CLAMD=.*|SKIP_CLAMD=y|" mailcow.conf
sed -i "s|^SKIP_SOLR=.*|SKIP_SOLR=y|" mailcow.conf

# Add settings if not present
grep -q "^SKIP_LETS_ENCRYPT" mailcow.conf || echo "SKIP_LETS_ENCRYPT=y" >> mailcow.conf
grep -q "^SKIP_CLAMD" mailcow.conf || echo "SKIP_CLAMD=y" >> mailcow.conf
grep -q "^SKIP_SOLR" mailcow.conf || echo "SKIP_SOLR=y" >> mailcow.conf

echo "  Mailcow configured ✓"

# ---- Start Mailcow ----
echo ""
echo "[5/7] Starting Mailcow (this may take a few minutes)..."

docker compose pull
docker compose up -d

echo "  Waiting for services to start..."
sleep 30

# Check if containers are running
RUNNING=$(docker compose ps --format json 2>/dev/null | grep -c '"running"' || docker compose ps | grep -c "Up" || echo "0")
echo "  ${RUNNING} containers running"

# ---- Configure Nginx ----
echo ""
echo "[6/7] Configuring Nginx for ${MAIL_HOSTNAME}..."

NGINX_CONF="/etc/nginx/sites-available/${MAIL_HOSTNAME}"

cat > "$NGINX_CONF" << 'NGINX_EOF'
server {
    listen 80;
    server_name mail.dmokb.info;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name mail.dmokb.info;

    ssl_certificate /etc/letsencrypt/live/mail.dmokb.info/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mail.dmokb.info/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }
}
NGINX_EOF

# Enable site
ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/

# Get SSL cert (need HTTP-only config first for certbot challenge)
# Temporarily create HTTP-only config
cat > "${NGINX_CONF}.temp" << 'TEMP_EOF'
server {
    listen 80;
    server_name mail.dmokb.info;
    location / {
        proxy_pass http://127.0.0.1:8080;
    }
}
TEMP_EOF

ln -sf "${NGINX_CONF}.temp" /etc/nginx/sites-enabled/${MAIL_HOSTNAME}
nginx -t && systemctl reload nginx

echo "  Obtaining SSL certificate..."
certbot certonly --nginx -d "${MAIL_HOSTNAME}" --non-interactive --agree-tos --email "admin@${DOMAIN}" || {
  echo "  WARNING: SSL cert failed. You may need to run certbot manually."
  echo "  Command: sudo certbot --nginx -d ${MAIL_HOSTNAME}"
}

# Restore full config with SSL
ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/${MAIL_HOSTNAME}
rm -f "${NGINX_CONF}.temp"
nginx -t && systemctl reload nginx

echo "  Nginx configured ✓"

# ---- Firewall ----
echo ""
echo "[7/7] Configuring firewall..."

ufw allow 25/tcp   2>/dev/null && echo "  Port 25 (SMTP) opened" || true
ufw allow 587/tcp  2>/dev/null && echo "  Port 587 (Submission) opened" || true
ufw allow 993/tcp  2>/dev/null && echo "  Port 993 (IMAPS) opened" || true
ufw allow 143/tcp  2>/dev/null && echo "  Port 143 (IMAP) opened" || true
ufw allow 4190/tcp 2>/dev/null && echo "  Port 4190 (Sieve) opened" || true

# ---- Done ----
echo ""
echo "=========================================="
echo "  Mailcow Setup Complete!"
echo "=========================================="
echo ""
echo "  Next steps:"
echo ""
echo "  1. Open https://${MAIL_HOSTNAME}"
echo "     Login: admin / moohoo"
echo "     *** CHANGE THE ADMIN PASSWORD ***"
echo ""
echo "  2. Add domain: ${DOMAIN}"
echo "     Go to: Configuration → Mail Setup → Domains → Add domain"
echo ""
echo "  3. Create mailboxes:"
echo "     Go to: Configuration → Mail Setup → Mailboxes → Add mailbox"
echo "     Suggested: admin@${DOMAIN}, noreply@${DOMAIN}, info@${DOMAIN}"
echo ""
echo "  4. Set up DKIM:"
echo "     Go to: Configuration → ARC/DKIM Keys"
echo "     Generate key for ${DOMAIN}"
echo "     Add the TXT record to Strato DNS"
echo ""
echo "  5. Update app .env:"
echo "     EMAIL_SERVER=smtp://noreply@${DOMAIN}:PASSWORD@127.0.0.1:587"
echo "     EMAIL_FROM=noreply@${DOMAIN}"
echo "     Then: pm2 restart all"
echo ""
echo "  6. Test: Send email from webmail to Gmail and back"
echo ""
