# Deployment Guide - Strato VPS

Complete guide for local development and production deployment to Strato VPS.

---

## 🏠 Local Development Setup

### Prerequisites
- Node.js >= 18.17.0
- pnpm >= 8.0.0
- Docker Desktop (for Windows)
- Git

### Quick Start

1. **Clone and install:**
   ```powershell
   cd d:\DMOKBNEW
   pnpm install
   ```

2. **Configure environment:**
   ```powershell
   # .env is already created, update these values:
   NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32
   PAYLOAD_SECRET=another-random-secret-here
   ```

3. **Start infrastructure:**
   ```powershell
   pnpm docker:up
   ```

4. **Start development servers:**
   ```powershell
   # Terminal 1 - CMS
   pnpm dev:cms

   # Terminal 2 - Web App
   pnpm dev
   ```

5. **Create admin user:**
   - Visit http://localhost:3001/admin
   - Register your admin account

6. **Develop:**
   - Web: http://localhost:3000
   - CMS: http://localhost:3001
   - Mailpit: http://localhost:8025
   - MongoDB: localhost:27017

---

## 🚀 Production Deployment to Strato VPS

### Architecture Overview

```
Strato VPS
├── nginx (Reverse Proxy + SSL)
│   ├── dmokb.com → Next.js (Port 3000)
│   └── cms.dmokb.com → Payload CMS (Port 3001)
├── Node.js Applications
│   ├── Web App (Next.js standalone)
│   └── CMS (Payload Express)
├── MongoDB (Port 27017)
└── PM2 (Process Manager)
```

---

## 📋 VPS Prerequisites

### Step 1: Provision Strato VPS

Recommended specs:
- **RAM**: 4GB minimum (8GB recommended)
- **Storage**: 50GB SSD
- **OS**: Ubuntu 22.04 LTS
- **CPU**: 2 vCPU minimum

### Step 2: Connect to VPS

```bash
ssh root@your-vps-ip
```

### Step 3: Initial Server Setup

```bash
# Update system
apt update && apt upgrade -y

# Create non-root user
adduser dmokb
usermod -aG sudo dmokb

# Switch to new user
su - dmokb
```

### Step 4: Install Dependencies

```bash
# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install pnpm
curl -fsSL https://get.pnpm.io/install.sh | sh -
source ~/.bashrc

# Install MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update
sudo apt install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Install nginx
sudo apt install -y nginx

# Install PM2
sudo npm install -g pm2

# Install git
sudo apt install -y git
```

---

## 🔧 Application Setup on VPS

### Step 1: Clone Repository

```bash
cd /home/dmokb
git clone https://github.com/yourusername/dmo-kb.git
cd dmo-kb
```

### Step 2: Install Dependencies

```bash
pnpm install
```

### Step 3: Configure Production Environment

```bash
nano .env
```

Update with production values:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/dmo-kb-prod

# NextAuth
NEXTAUTH_URL=https://dmokb.com
NEXTAUTH_SECRET=GENERATE_STRONG_SECRET_HERE

# Discord OAuth (configure in Discord Developer Portal)
DISCORD_CLIENT_ID=your_production_discord_client_id
DISCORD_CLIENT_SECRET=your_production_discord_client_secret

# Email (configure with real SMTP)
EMAIL_SERVER=smtp://smtp.strato.com:465
EMAIL_FROM=noreply@dmokb.com

# Payload
PAYLOAD_SECRET=GENERATE_ANOTHER_STRONG_SECRET

# App
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://dmokb.com
NEXT_PUBLIC_CMS_URL=https://cms.dmokb.com

# Rate Limiting
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=60000

# Data Ingestion
OFFICIAL_SITE_URL=https://dmo.gameking.com
INGEST_THROTTLE_MS=2000
```

### Step 4: Build Applications

```bash
# Build all workspaces
pnpm build
```

This creates:
- `apps/web/.next/` - Next.js production build
- `apps/cms/dist/` - Payload CMS compiled code
- `packages/shared/dist/` - Shared package

### Step 5: Setup PM2 Ecosystem

Create `ecosystem.config.js` in project root:

```javascript
module.exports = {
  apps: [
    {
      name: 'dmo-kb-web',
      cwd: '/home/dmokb/dmo-kb/apps/web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      instances: 2,
      exec_mode: 'cluster',
      max_memory_restart: '1G',
      error_file: '/home/dmokb/logs/web-error.log',
      out_file: '/home/dmokb/logs/web-out.log',
    },
    {
      name: 'dmo-kb-cms',
      cwd: '/home/dmokb/dmo-kb/apps/cms',
      script: 'dist/server.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '1G',
      error_file: '/home/dmokb/logs/cms-error.log',
      out_file: '/home/dmokb/logs/cms-out.log',
    },
  ],
};
```

### Step 6: Start Applications

```bash
# Create log directory
mkdir -p /home/dmokb/logs

# Start with PM2
pm2 start ecosystem.config.js

# Check status
pm2 status

# View logs
pm2 logs

# Setup PM2 to start on boot
pm2 startup
pm2 save
```

---

## 🌐 Nginx Configuration

### Step 1: Configure Main Domain (dmokb.com)

```bash
sudo nano /etc/nginx/sites-available/dmokb.com
```

```nginx
# Web App - dmokb.com
server {
    listen 80;
    server_name dmokb.com www.dmokb.com;

    # Redirect to HTTPS (will be configured later)
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name dmokb.com www.dmokb.com;

    # SSL certificates (configure after obtaining)
    ssl_certificate /etc/letsencrypt/live/dmokb.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/dmokb.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/rss+xml font/truetype font/opentype application/vnd.ms-fontobject image/svg+xml;

    # Next.js static files
    location /_next/static {
        alias /home/dmokb/dmo-kb/apps/web/.next/static;
        expires 365d;
        add_header Cache-Control "public, immutable";
    }

    # Public assets
    location /static {
        alias /home/dmokb/dmo-kb/apps/web/public;
        expires 7d;
        add_header Cache-Control "public";
    }

    # Proxy to Next.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Step 2: Configure CMS Subdomain (cms.dmokb.com)

```bash
sudo nano /etc/nginx/sites-available/cms.dmokb.com
```

```nginx
# CMS - cms.dmokb.com
server {
    listen 80;
    server_name cms.dmokb.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name cms.dmokb.com;

    ssl_certificate /etc/letsencrypt/live/cms.dmokb.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/cms.dmokb.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Increase upload size for media
    client_max_body_size 50M;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Proxy to Payload CMS
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Media files
    location /media {
        alias /home/dmokb/dmo-kb/apps/cms/media;
        expires 7d;
        add_header Cache-Control "public";
    }
}
```

### Step 3: Enable Sites

```bash
# Enable configurations
sudo ln -s /etc/nginx/sites-available/dmokb.com /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/cms.dmokb.com /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

---

## 🔒 SSL Certificates (Let's Encrypt)

### Install Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### Obtain Certificates

```bash
# For main domain
sudo certbot --nginx -d dmokb.com -d www.dmokb.com

# For CMS subdomain
sudo certbot --nginx -d cms.dmokb.com
```

### Auto-Renewal

```bash
# Test renewal
sudo certbot renew --dry-run

# Certbot automatically sets up a cron job for renewal
```

---

## 🔐 Security Hardening

### Firewall Setup

```bash
# Install UFW
sudo apt install -y ufw

# Allow SSH, HTTP, HTTPS
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

### MongoDB Security

```bash
# Edit MongoDB config
sudo nano /etc/mongod.conf
```

```yaml
# Bind to localhost only
net:
  bindIp: 127.0.0.1
  port: 27017

# Enable authentication
security:
  authorization: enabled
```

```bash
# Restart MongoDB
sudo systemctl restart mongod

# Create admin user
mongosh
```

```javascript
use admin
db.createUser({
  user: "admin",
  pwd: "STRONG_PASSWORD_HERE",
  roles: ["userAdminAnyDatabase", "dbAdminAnyDatabase", "readWriteAnyDatabase"]
})

use dmo-kb-prod
db.createUser({
  user: "dmokb_user",
  pwd: "ANOTHER_STRONG_PASSWORD",
  roles: ["readWrite"]
})
```

Update `.env` with authenticated connection:

```env
MONGODB_URI=mongodb://dmokb_user:ANOTHER_STRONG_PASSWORD@localhost:27017/dmo-kb-prod
```

---

## 📊 Monitoring & Logs

### PM2 Monitoring

```bash
# Real-time monitoring
pm2 monit

# Detailed status
pm2 show dmo-kb-web
pm2 show dmo-kb-cms

# View logs
pm2 logs dmo-kb-web --lines 100
pm2 logs dmo-kb-cms --lines 100

# Flush logs
pm2 flush
```

### Nginx Logs

```bash
# Access logs
sudo tail -f /var/log/nginx/access.log

# Error logs
sudo tail -f /var/log/nginx/error.log
```

### MongoDB Logs

```bash
sudo tail -f /var/log/mongodb/mongod.log
```

---

## 🔄 Deployment Workflow

### Manual Deployment

```bash
# On VPS
cd /home/dmokb/dmo-kb

# Pull latest changes
git pull origin main

# Install dependencies
pnpm install

# Build
pnpm build

# Restart applications
pm2 restart ecosystem.config.js
```

### Automated Deployment Script

Create `deploy.sh`:

```bash
#!/bin/bash

echo "🚀 Starting deployment..."

# Navigate to project
cd /home/dmokb/dmo-kb

# Pull latest
echo "📥 Pulling latest changes..."
git pull origin main

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Build
echo "🔨 Building applications..."
pnpm build

# Restart PM2
echo "♻️  Restarting applications..."
pm2 restart ecosystem.config.js

echo "✅ Deployment complete!"
```

```bash
chmod +x deploy.sh
```

---

## 🔧 Maintenance

### Backup MongoDB

```bash
# Create backup script
nano /home/dmokb/backup-db.sh
```

```bash
#!/bin/bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/dmokb/backups"
mkdir -p $BACKUP_DIR

mongodump --uri="mongodb://dmokb_user:PASSWORD@localhost:27017/dmo-kb-prod" --out="$BACKUP_DIR/backup_$TIMESTAMP"

# Keep only last 7 days
find $BACKUP_DIR -type d -mtime +7 -exec rm -rf {} +
```

```bash
chmod +x /home/dmokb/backup-db.sh

# Add to crontab (daily at 2 AM)
crontab -e
```

```cron
0 2 * * * /home/dmokb/backup-db.sh
```

### Update Dependencies

```bash
cd /home/dmokb/dmo-kb

# Check for updates
pnpm outdated

# Update (test locally first!)
pnpm update

# Rebuild and restart
pnpm build
pm2 restart all
```

---

## 🎯 Domain Configuration (Strato)

### DNS Records

In your Strato domain panel, add:

```
Type    Name    Value               TTL
A       @       YOUR_VPS_IP         3600
A       www     YOUR_VPS_IP         3600
A       cms     YOUR_VPS_IP         3600
CNAME   www     dmokb.com           3600
```

Wait for DNS propagation (up to 24 hours, usually faster).

---

## ✅ Post-Deployment Checklist

- [ ] Applications running (`pm2 status`)
- [ ] Nginx configured and running (`sudo nginx -t`)
- [ ] SSL certificates active (visit https://dmokb.com)
- [ ] MongoDB secure and accessible
- [ ] Firewall configured (`sudo ufw status`)
- [ ] PM2 startup enabled (`pm2 startup`)
- [ ] Backups scheduled (`crontab -l`)
- [ ] Logs rotating properly
- [ ] Admin user created in CMS
- [ ] Test all pages and features
- [ ] Monitor resource usage (`htop`)

---

## 🐛 Troubleshooting

### Application won't start

```bash
# Check PM2 logs
pm2 logs dmo-kb-web --lines 50

# Check if port is in use
sudo lsof -i :3000

# Restart PM2
pm2 restart all
```

### Nginx 502 Bad Gateway

```bash
# Check if apps are running
pm2 status

# Check nginx error log
sudo tail -f /var/log/nginx/error.log

# Test nginx config
sudo nginx -t
```

### Database connection issues

```bash
# Check MongoDB status
sudo systemctl status mongod

# Test connection
mongosh mongodb://localhost:27017/dmo-kb-prod
```

### SSL certificate issues

```bash
# Renew certificates
sudo certbot renew

# Check certificate expiry
sudo certbot certificates
```

---

## 📚 Additional Resources

- **Strato VPS Docs**: https://www.strato.de/server/
- **PM2 Documentation**: https://pm2.keymetrics.io/
- **Nginx Documentation**: https://nginx.org/en/docs/
- **Let's Encrypt**: https://letsencrypt.org/
- **MongoDB Security**: https://www.mongodb.com/docs/manual/security/

---

## 🎉 Success!

Your DMO Knowledge Base is now running on Strato VPS with:

✅ Production-grade setup  
✅ SSL/HTTPS enabled  
✅ Process management (PM2)  
✅ Reverse proxy (Nginx)  
✅ Database security  
✅ Automated backups  
✅ Monitoring tools  

**Your site is live at https://dmokb.com!** 🚀
