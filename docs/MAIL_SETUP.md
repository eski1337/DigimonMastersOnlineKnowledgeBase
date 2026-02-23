# Mail System Setup — @dmokb.info

Complete guide to set up a production mail server on your Strato VPS using **Mailcow**.

Mailcow provides: Postfix (SMTP), Dovecot (IMAP), SOGo (Webmail), Rspamd (Anti-spam), DKIM/SPF/DMARC.

---

## 1. DNS Records (Strato Domain Panel)

Add these DNS records for `dmokb.info` in your Strato control panel:

```
Type     Name                          Value                          TTL
──────── ───────────────────────────── ────────────────────────────── ─────
A        mail                          YOUR_VPS_IP                    3600
MX       @                             mail.dmokb.info (Priority 10)  3600
TXT      @                             v=spf1 mx a:mail.dmokb.info ~all  3600
TXT      _dmarc                        v=DMARC1; p=quarantine; rua=mailto:postmaster@dmokb.info  3600
SRV      _autodiscover._tcp            0 1 443 mail.dmokb.info       3600
CNAME    autoconfig                    mail.dmokb.info                3600
```

> **DKIM TXT record** will be added later after Mailcow generates the key (Step 5).

Wait for DNS propagation before proceeding (~15 min for Strato, up to 24h worst case).

Verify with:
```bash
dig MX dmokb.info +short
# Should return: 10 mail.dmokb.info.

dig A mail.dmokb.info +short
# Should return: YOUR_VPS_IP
```

---

## 2. Prepare VPS

SSH into your Strato VPS:

```bash
ssh root@YOUR_VPS_IP
```

### Install Docker & Docker Compose (if not already installed)

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh

# Add your user to docker group
usermod -aG docker dmokb

# Install Docker Compose plugin
apt install -y docker-compose-plugin

# Verify
docker --version
docker compose version
```

### Free up port 25 (if needed)

```bash
# Check if anything is using mail ports
ss -tlnp | grep -E ':25|:587|:993|:143|:443|:80'

# If postfix is running standalone, stop and disable it
systemctl stop postfix 2>/dev/null
systemctl disable postfix 2>/dev/null
```

---

## 3. Install Mailcow

```bash
# Switch to dmokb user
su - dmokb

# Clone Mailcow
cd /home/dmokb
git clone https://github.com/mailcow/mailcow-dockerized.git
cd mailcow-dockerized

# Run interactive setup
./generate_config.sh
```

When prompted:
- **Mail server hostname (FQDN)**: `mail.dmokb.info`
- **Timezone**: `Europe/Berlin` (or your timezone)
- **HTTP_PORT**: `8080` (we'll use nginx as reverse proxy)
- **HTTPS_PORT**: `8443`

### Adjust Mailcow config

Edit `mailcow.conf`:

```bash
nano mailcow.conf
```

Ensure these values:

```ini
MAILCOW_HOSTNAME=mail.dmokb.info
TZ=Europe/Berlin

# Use non-standard ports since nginx handles 80/443
HTTP_PORT=8080
HTTPS_PORT=8443
HTTP_BIND=127.0.0.1
HTTPS_BIND=127.0.0.1

# Skip Let's Encrypt inside Mailcow (nginx handles SSL)
SKIP_LETS_ENCRYPT=y

# Memory optimization for 4GB VPS
SKIP_CLAMD=y
SKIP_SOLR=y
```

### Start Mailcow

```bash
docker compose pull
docker compose up -d
```

Wait ~2 minutes for all containers to start:

```bash
docker compose ps
# All containers should show "running"
```

---

## 4. Nginx Reverse Proxy for Webmail

Add nginx config for `mail.dmokb.info`:

```bash
sudo nano /etc/nginx/sites-available/mail.dmokb.info
```

```nginx
# Webmail - mail.dmokb.info
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

    # Proxy to Mailcow web UI (SOGo webmail + admin)
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
```

Enable and get SSL certificate:

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/mail.dmokb.info /etc/nginx/sites-enabled/

# Get SSL cert (temporarily allow HTTP for challenge)
sudo certbot --nginx -d mail.dmokb.info

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

---

## 5. Configure Mailcow (Admin Panel)

### Access Admin Panel

Open `https://mail.dmokb.info` in your browser.

Default login:
- **User**: `admin`
- **Password**: `moohoo`

**Change the admin password immediately!**

### Add Domain

1. Go to **Configuration → Mail Setup → Domains**
2. Click **Add domain**
3. Enter: `dmokb.info`
4. Click **Add domain and restart SOGo**

### Create Mailboxes

1. Go to **Configuration → Mail Setup → Mailboxes**
2. Click **Add mailbox**
3. Create your mailboxes, e.g.:
   - `admin@dmokb.info` — Admin mailbox
   - `noreply@dmokb.info` — For application emails
   - `info@dmokb.info` — Public contact

### Set up DKIM

1. Go to **Configuration → ARC/DKIM Keys**
2. Select `dmokb.info`
3. Click **Generate** (use 2048-bit)
4. Copy the generated DKIM TXT record
5. Add it to your Strato DNS:

```
Type: TXT
Name: dkim._domainkey
Value: v=DKIM1; k=rsa; p=LONG_KEY_HERE...
TTL: 3600
```

---

## 6. Update Application Email Config

### Production `.env` on VPS

Update the mail settings in `/home/dmokb/dmo-kb/.env`:

```env
# Use Mailcow SMTP (localhost since it's on the same server)
EMAIL_SERVER=smtp://noreply@dmokb.info:YOUR_MAILBOX_PASSWORD@127.0.0.1:587
EMAIL_FROM=noreply@dmokb.info
```

Then restart the apps:

```bash
cd /home/dmokb/dmo-kb
pm2 restart all
```

### Update Payload CMS email config

The CMS at `apps/cms/src/payload.config.ts` already uses `EMAIL_FROM` from env — no code changes needed.

---

## 7. Verify Everything

### Test DNS

```bash
# MX record
dig MX dmokb.info +short
# Expected: 10 mail.dmokb.info.

# SPF
dig TXT dmokb.info +short
# Should include: v=spf1 mx a:mail.dmokb.info ~all

# DKIM
dig TXT dkim._domainkey.dmokb.info +short
# Should return the DKIM key

# DMARC
dig TXT _dmarc.dmokb.info +short
# Should return: v=DMARC1; p=quarantine; ...
```

### Test Webmail

1. Open `https://mail.dmokb.info`
2. Log in with `admin@dmokb.info` and your password
3. Send a test email to a Gmail/Outlook address
4. Reply from Gmail/Outlook back to `admin@dmokb.info`
5. Verify it appears in webmail inbox

### Test Application Emails

1. Register a new account on `https://dmokb.info`
2. Check that the verification email arrives via Mailcow
3. Check PM2 logs for any SMTP errors: `pm2 logs dmo-kb-cms`

### Test Deliverability

Visit [mail-tester.com](https://www.mail-tester.com/):
1. Get a test address from the site
2. Send an email from `noreply@dmokb.info` to that address
3. Check your score (aim for 8+/10)

---

## 8. Firewall Rules

Ensure these ports are open on your VPS:

```bash
sudo ufw allow 25/tcp    # SMTP (incoming mail)
sudo ufw allow 587/tcp   # SMTP submission (sending)
sudo ufw allow 993/tcp   # IMAPS (secure IMAP)
sudo ufw allow 143/tcp   # IMAP (optional, IMAPS preferred)
sudo ufw allow 4190/tcp  # Sieve (mail filtering)
sudo ufw reload
```

> **Note**: Some VPS providers (including Strato) block outbound port 25 by default. If you can't send mail, contact Strato support to unblock it.

---

## 9. Quick Reference

| Service          | URL / Port                              |
|------------------|-----------------------------------------|
| Webmail (SOGo)   | https://mail.dmokb.info                 |
| Admin Panel      | https://mail.dmokb.info (login as admin)|
| SMTP (send)      | mail.dmokb.info:587 (STARTTLS)          |
| IMAP (receive)   | mail.dmokb.info:993 (SSL/TLS)           |
| App SMTP (local) | 127.0.0.1:587                           |

---

## Automated Setup Script

For convenience, a one-shot script is available at `scripts/setup-mailcow.sh`.
Run it on the VPS after DNS records are configured:

```bash
chmod +x scripts/setup-mailcow.sh
sudo ./scripts/setup-mailcow.sh
```
