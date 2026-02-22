# Environment Variables Reference

Complete guide to all environment variables used in the DMO Knowledge Base.

---

## Required Variables

### Database

```env
# MongoDB connection string
MONGODB_URI=mongodb://localhost:27017/dmo-kb

# Production example:
# MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/dmo-kb?retryWrites=true&w=majority
```

**Used by**: Payload CMS (apps/cms), Health check (apps/web)

### Application URLs

```env
# Node environment
NODE_ENV=development  # development | production | test

# Frontend URL (exposed to browser)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Backend/CMS URL (exposed to browser)
NEXT_PUBLIC_CMS_URL=http://localhost:3001
```

**Used by**: Both apps, CORS config, API calls

### Authentication Secrets

```env
# NextAuth JWT signing secret (REQUIRED)
NEXTAUTH_SECRET=<generate-with-openssl-rand-base64-32>

# NextAuth base URL
NEXTAUTH_URL=http://localhost:3000

# Payload CMS secret (REQUIRED)
PAYLOAD_SECRET=<generate-with-openssl-rand-base64-32>
```

**Generate**: `openssl rand -base64 32`

---

## Optional Variables

### Discord OAuth

```env
DISCORD_CLIENT_ID=your-app-client-id
DISCORD_CLIENT_SECRET=your-app-client-secret
DISCORD_GUILD_ID=your-server-id

# Role mapping
DISCORD_OWNER_ROLE_ID=role-id
DISCORD_ADMIN_ROLE_ID=role-id
DISCORD_EDITOR_ROLE_ID=role-id
DISCORD_MEMBER_ROLE_ID=role-id
DISCORD_GUEST_ROLE_ID=role-id
```

**Setup**: See [DISCORD_SETUP.md](./DISCORD_SETUP.md)

### Email (SMTP)

```env
# Development (Mailpit)
EMAIL_SERVER=smtp://localhost:1025
EMAIL_FROM=noreply@dmokb.local

# Production examples:
# Gmail: smtp://user@gmail.com:app-password@smtp.gmail.com:587
# SendGrid: smtp://apikey:API_KEY@smtp.sendgrid.net:587

# Alternative: Resend
# RESEND_API_KEY=re_your_api_key
```

### Rate Limiting

```env
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=60000
```

### Data Import

```env
OFFICIAL_SITE_URL=https://dmo.gameking.com
INGEST_THROTTLE_MS=2000
DMOWIKI_USERNAME=username
DMOWIKI_PASSWORD=password
CMS_ADMIN_EMAIL=admin@example.com
CMS_ADMIN_PASSWORD=password
```

---

## Variable Prefixes

### `NEXT_PUBLIC_*`

**Exposed to browser** - Embedded in client-side JavaScript at build time.

- Use for: Public URLs, API endpoints, feature flags
- Never use for: Secrets, API keys, passwords

**Examples**:
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_CMS_URL`
- `NEXT_PUBLIC_ALGOLIA_SEARCH_KEY` (search-only key)

### No Prefix

**Server-side only** - Not accessible in browser.

- Use for: Secrets, database URLs, private API keys

**Examples**:
- `MONGODB_URI`
- `NEXTAUTH_SECRET`
- `PAYLOAD_SECRET`
- `DISCORD_CLIENT_SECRET`

---

## Environment Files

| File | Purpose | Committed |
|------|---------|-----------|
| `.env` | Local development | ❌ No |
| `.env.example` | Template | ✅ Yes |
| `.env.local` | Local overrides | ❌ No |
| `.env.production` | Production (if used) | ❌ No |
| `apps/web/.env.local` | Web-specific | ❌ No |

**Loading order**: System env → .env → .env.local → runtime

---

## Setup Instructions

### 1. Copy Template

```bash
cp .env.example .env
```

### 2. Generate Secrets

```bash
# Generate NEXTAUTH_SECRET
openssl rand -base64 32

# Generate PAYLOAD_SECRET
openssl rand -base64 32
```

### 3. Fill Required Values

Minimum for local development:
- `MONGODB_URI` (MongoDB connection)
- `NEXTAUTH_SECRET` (authentication)
- `PAYLOAD_SECRET` (CMS)

### 4. Optional: Discord OAuth

See [DISCORD_SETUP.md](./DISCORD_SETUP.md) for complete setup.

### 5. Restart Servers

```bash
# Changes to NEXT_PUBLIC_* require rebuild
pnpm build

# Regular changes need restart
pnpm dev:all
```

---

## Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Generate new secrets (never reuse dev secrets)
- [ ] Update URLs to production domains
- [ ] Configure MongoDB Atlas or production DB
- [ ] Set up production SMTP
- [ ] Remove development-only variables
- [ ] Enable HTTPS (required for NextAuth)
- [ ] Configure Discord OAuth redirect URLs
- [ ] Set rate limits appropriately
- [ ] Enable error tracking (Sentry)
- [ ] Configure CDN/storage if needed

---

## Troubleshooting

### "Invalid secret" errors

- Ensure secrets are at least 32 characters
- No trailing spaces/newlines
- Restart dev server after changes

### "Cannot connect to MongoDB"

- Verify `MONGODB_URI` format
- Check MongoDB is running (local: port 27017)
- Test connection: `mongosh <MONGODB_URI>`

### "Discord OAuth fails"

- Check `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET`
- Verify redirect URLs in Discord dashboard
- Ensure `NEXTAUTH_URL` matches your domain

### "NEXT_PUBLIC_* not updating"

- These are inlined at **build time**
- Run `pnpm build` to apply changes
- Or restart dev server: `pnpm dev`

---

## Security Notes

### DO ✅

- Use `.env` files for local development
- Store production secrets in secure vault
- Generate strong random secrets (32+ chars)
- Rotate secrets periodically
- Use different secrets per environment

### DON'T ❌

- Commit `.env` to Git
- Share secrets in plain text (Slack, email)
- Use default/example secrets in production
- Expose secrets in client code (`NEXT_PUBLIC_`)
- Reuse secrets across projects
- Log secrets in error messages

---

## Reference: All Variables

### Core Application
- `NODE_ENV`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_CMS_URL`

### Database
- `MONGODB_URI`

### Authentication
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `PAYLOAD_SECRET`

### Discord OAuth
- `DISCORD_CLIENT_ID`
- `DISCORD_CLIENT_SECRET`
- `DISCORD_GUILD_ID`
- `DISCORD_OWNER_ROLE_ID`
- `DISCORD_ADMIN_ROLE_ID`
- `DISCORD_EDITOR_ROLE_ID`
- `DISCORD_MEMBER_ROLE_ID`
- `DISCORD_GUEST_ROLE_ID`

### Email
- `EMAIL_SERVER`
- `EMAIL_FROM`
- `RESEND_API_KEY` (optional)

### Rate Limiting
- `RATE_LIMIT_MAX`
- `RATE_LIMIT_WINDOW_MS`

### Data Import
- `OFFICIAL_SITE_URL`
- `INGEST_THROTTLE_MS`
- `DMOWIKI_USERNAME`
- `DMOWIKI_PASSWORD`
- `CMS_ADMIN_EMAIL`
- `CMS_ADMIN_PASSWORD`

### Storage (Optional)
- `STORAGE_S3_BUCKET`
- `STORAGE_S3_REGION`
- `STORAGE_S3_ACCESS_KEY_ID`
- `STORAGE_S3_SECRET_ACCESS_KEY`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

### Monitoring (Optional)
- `SENTRY_DSN`
- `PLAUSIBLE_DOMAIN`

### Search (Optional)
- `ALGOLIA_APP_ID`
- `ALGOLIA_ADMIN_API_KEY`
- `NEXT_PUBLIC_ALGOLIA_SEARCH_KEY`
- `MEILISEARCH_HOST`
- `MEILISEARCH_API_KEY`
