# Environment Variables - DMO Knowledge Base

Complete reference for all environment variables used in the project.

---

## Environment Files

| File | Purpose | Committed |
|------|---------|-----------|
| `.env` | Active configuration | ❌ No (.gitignore) |
| `.env.example` | Template with placeholders | ✅ Yes |
| `.env.local` | Local overrides | ❌ No (.gitignore) |
| `apps/web/.env.local` | Web app specific | ❌ No |

---

## Required Variables

### Database
```env
# MongoDB Connection String
MONGODB_URI=mongodb://localhost:27017/dmo-kb
# Production: mongodb+srv://user:pass@cluster.mongodb.net/dmo-kb
```

### Application URLs
```env
# Frontend URL (NEXT_PUBLIC_ = exposed to browser)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# CMS/Backend URL (NEXT_PUBLIC_ = exposed to browser)
NEXT_PUBLIC_CMS_URL=http://localhost:3001
```

### Authentication Secrets
```env
# NextAuth Secret (generate: openssl rand -base64 32)
NEXTAUTH_SECRET=gcOTWG5hfIFmR7xOIxkXj0wxZtbQI0eahvZQeF4Cq2w=

# NextAuth URL
NEXTAUTH_URL=http://localhost:3000

# Payload CMS Secret (generate: openssl rand -base64 32)
PAYLOAD_SECRET=gcOTWG5hfIFmR7xOIxkXj0wxZtbQI0eahvZQeF4Cq3A=
```

### Node Environment
```env
# development | production | test
NODE_ENV=development
```

---

## Optional Variables

### Discord OAuth (Authentication)
```env
# Discord Application Client ID
DISCORD_CLIENT_ID=1427322388357320836

# Discord Application Client Secret
DISCORD_CLIENT_SECRET=1mQISthYbiUs-sarB65GUf_mUUiQZd0B

# Discord Server (Guild) ID
DISCORD_GUILD_ID=1427056567693476016
```

### Discord Role Mapping (RBAC Sync)
```env
# Map Discord roles to app roles
DISCORD_OWNER_ROLE_ID=1427056890008961166
DISCORD_ADMIN_ROLE_ID=1427056820697960579
DISCORD_EDITOR_ROLE_ID=1427056761029918761
DISCORD_MEMBER_ROLE_ID=1427056712690565181
DISCORD_GUEST_ROLE_ID=1427056679018696847
```

### Email Configuration
```env
# SMTP Server (Mailpit for dev, real SMTP for production)
EMAIL_SERVER=smtp://localhost:1025
# Production example: smtp://username:password@smtp.gmail.com:587

# From address
EMAIL_FROM=noreply@dmokb.local
# Production: noreply@yourdomain.com
```

### DMO Wiki Import (Scraping)
```env
# DMO Wiki credentials for authenticated imports (better rate limits)
DMOWIKI_USERNAME=eski
DMOWIKI_PASSWORD=11x430a999lb
```

### CMS Admin (Bulk Import Scripts)
```env
# Admin credentials for API-based imports
CMS_ADMIN_EMAIL=lukas.bohn@icloud.com
CMS_ADMIN_PASSWORD=ilovecf123
```

### Rate Limiting
```env
# Max requests per window
RATE_LIMIT_MAX=100

# Window duration in milliseconds (60000 = 1 minute)
RATE_LIMIT_WINDOW_MS=60000
```

### Data Ingestion
```env
# Official DMO site URL for patch notes/events
OFFICIAL_SITE_URL=https://dmo.gameking.com

# Throttle delay between requests (ms)
INGEST_THROTTLE_MS=2000
```

---

## Variable Usage by Component

### Frontend (apps/web)
Reads from:
- `NEXT_PUBLIC_APP_URL` - Base URL for routing
- `NEXT_PUBLIC_CMS_URL` - API endpoint
- `NEXTAUTH_URL` - Auth callback URL
- `NEXTAUTH_SECRET` - JWT signing
- `DISCORD_CLIENT_ID` - OAuth client
- `DISCORD_CLIENT_SECRET` - OAuth secret
- `DISCORD_GUILD_ID` - Discord server
- `DISCORD_*_ROLE_ID` - Role mapping
- `MONGODB_URI` - Database connection

### Backend (apps/cms)
Reads from:
- `MONGODB_URI` - Database connection
- `PAYLOAD_SECRET` - CMS authentication
- `EMAIL_SERVER` - SMTP connection
- `EMAIL_FROM` - Email sender
- `NEXT_PUBLIC_APP_URL` - CORS whitelist
- `NEXT_PUBLIC_CMS_URL` - Server URL
- `NODE_ENV` - Environment mode

### Scripts (scripts/)
Reads from:
- `MONGODB_URI` - Database access
- `NEXT_PUBLIC_CMS_URL` - API endpoint
- `DMOWIKI_USERNAME` - DMO Wiki login
- `DMOWIKI_PASSWORD` - DMO Wiki password
- `CMS_ADMIN_EMAIL` - Admin login
- `CMS_ADMIN_PASSWORD` - Admin password

---

## Security Best Practices

### DO ✅
- Use `.env` for local development
- Generate strong random secrets (32+ characters)
- Use `NEXT_PUBLIC_` prefix only for client-safe values
- Keep production secrets in secure vault (not in code)
- Rotate secrets periodically
- Use different secrets for dev/staging/prod

### DON'T ❌
- Commit `.env` to Git
- Share secrets in plain text
- Use default/example secrets in production
- Expose secrets in client-side code
- Reuse secrets across environments
- Include secrets in error messages

---

## Production Checklist

### Before Deploying
- [ ] Generate new `NEXTAUTH_SECRET`
- [ ] Generate new `PAYLOAD_SECRET`
- [ ] Set `NODE_ENV=production`
- [ ] Update `NEXT_PUBLIC_APP_URL` to production domain
- [ ] Update `NEXT_PUBLIC_CMS_URL` to production API
- [ ] Update `NEXTAUTH_URL` to production domain
- [ ] Configure production MongoDB URI (MongoDB Atlas)
- [ ] Set up production SMTP server
- [ ] Remove development-only variables
- [ ] Enable HTTPS (required for NextAuth)
- [ ] Configure Discord OAuth redirect URLs
- [ ] Review CORS settings

---

## Generating Secrets

### OpenSSL (Linux/Mac/WSL)
```bash
# Generate 32-byte base64 secret
openssl rand -base64 32

# Example output:
# gcOTWG5hfIFmR7xOIxkXj0wxZtbQI0eahvZQeF4Cq2w=
```

### PowerShell (Windows)
```powershell
# Generate random bytes and convert to base64
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

### Node.js
```javascript
require('crypto').randomBytes(32).toString('base64')
```

---

## Environment Loading Order

1. System environment variables
2. `.env` file (project root)
3. `.env.local` (overrides .env)
4. `apps/web/.env.local` (web-specific)
5. Runtime environment (Vercel, Railway, etc.)

**Note**: `NEXT_PUBLIC_*` variables are inlined at build time.

---

## Discord OAuth Setup

### 1. Create Discord Application
1. Go to https://discord.com/developers/applications
2. Click "New Application"
3. Name it (e.g., "DMO Knowledge Base")
4. Copy Application ID → `DISCORD_CLIENT_ID`

### 2. Generate Client Secret
1. Go to OAuth2 → General
2. Click "Reset Secret"
3. Copy secret → `DISCORD_CLIENT_SECRET`

### 3. Configure Redirects
Add OAuth2 redirect URLs:
- Development: `http://localhost:3000/api/auth/callback/discord`
- Production: `https://yourdomain.com/api/auth/callback/discord`

### 4. Get Guild ID
1. Enable Developer Mode in Discord
2. Right-click your server → Copy ID
3. Paste → `DISCORD_GUILD_ID`

### 5. Get Role IDs
1. Right-click each role → Copy ID
2. Map to environment variables

---

## Email Configuration

### Development (Mailpit)
```env
EMAIL_SERVER=smtp://localhost:1025
EMAIL_FROM=noreply@dmokb.local
```

Install Mailpit: https://mailpit.axllent.org
Web UI: http://localhost:8025

### Production Options

**Gmail**
```env
EMAIL_SERVER=smtp://username@gmail.com:app-password@smtp.gmail.com:587
EMAIL_FROM=noreply@yourdomain.com
```

**SendGrid**
```env
EMAIL_SERVER=smtp://apikey:YOUR_SENDGRID_API_KEY@smtp.sendgrid.net:587
EMAIL_FROM=noreply@yourdomain.com
```

**Resend** (Recommended)
```env
RESEND_API_KEY=re_your_api_key_here
EMAIL_FROM=noreply@yourdomain.com
```

---

## Troubleshooting

### "Invalid NEXTAUTH_SECRET"
- Ensure secret is set in `.env`
- Restart dev server after changing
- Check for trailing spaces

### "Cannot connect to MongoDB"
- Verify `MONGODB_URI` is correct
- Ensure MongoDB is running
- Check network/firewall settings
- Verify credentials (if using auth)

### "Discord OAuth fails"
- Check `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET`
- Verify redirect URL in Discord dashboard
- Ensure `NEXTAUTH_URL` matches your domain

### "Email not sending"
- Check `EMAIL_SERVER` connection string
- Verify SMTP port is not blocked
- For Mailpit: ensure it's running
- Check email credentials

### "NEXT_PUBLIC_ variable not updating"
- These are inlined at build time
- Restart dev server: `pnpm dev`
- For production: rebuild app
