# Development Guide - DMO Knowledge Base

Complete setup, build, and development workflow instructions.

---

## Prerequisites

### Required Software
- **Node.js**: >=18.17.0 (recommend 20.x LTS)
- **pnpm**: >=8.0.0 (install: `npm install -g pnpm`)
- **MongoDB**: 6.x (local instance or Docker)
- **Git**: For version control

### Optional Tools
- **Mailpit**: Email testing (download from mailpit.axllent.org)
- **MongoDB Compass**: GUI for database inspection
- **VS Code**: Recommended IDE with extensions:
  - ESLint
  - Prettier
  - Tailwind CSS IntelliSense
  - TypeScript and JavaScript

---

## Initial Setup

### 1. Clone and Install
```bash
# Clone repository
git clone <repository-url>
cd DMOKBNEW

# Install all dependencies
pnpm install
```

### 2. Configure Environment
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your settings
# At minimum, configure:
# - MONGODB_URI
# - NEXTAUTH_SECRET
# - PAYLOAD_SECRET
```

### 3. Start MongoDB
```bash
# Option A: Docker
docker-compose up -d

# Option B: Local MongoDB
# Ensure MongoDB is running on localhost:27017

# Verify connection
mongosh mongodb://localhost:27017/dmo-kb
```

### 4. Start Development Servers
```bash
# Terminal 1: Start CMS
pnpm dev:cms

# Wait for: "Payload Admin URL: http://localhost:3001"

# Terminal 2: Start web app
pnpm dev

# Open: http://localhost:3000
```

### 5. Create Initial User
```bash
# In a new terminal
pnpm create-owner

# Creates owner account:
# Email: eski@dmokb.local
# Password: (you'll be prompted)
```

---

## Development Workflow

### Daily Development
```bash
# Start both servers concurrently
pnpm dev:all

# Or separately:
pnpm dev:cms    # CMS on :3001
pnpm dev        # Web on :3000
```

### Making Changes

#### Frontend Changes (apps/web)
1. Edit files in `apps/web/src/`
2. Next.js auto-reloads on save
3. Check browser console for errors
4. Lint: `pnpm --filter web lint`

#### Backend Changes (apps/cms)
1. Edit files in `apps/cms/src/`
2. Nodemon auto-restarts server
3. Check terminal for errors
4. Test in CMS admin: http://localhost:3001/admin

#### Shared Package Changes (packages/shared)
1. Edit files in `packages/shared/src/`
2. Run: `pnpm --filter @dmo-kb/shared build`
3. Restart both servers to pick up changes

---

## Build Commands

### Development Build
```bash
# Build all workspaces
pnpm build

# Build specific workspace
pnpm --filter web build
pnpm --filter cms build
pnpm --filter @dmo-kb/shared build
```

### Production Build
```bash
# Set environment
export NODE_ENV=production

# Build
pnpm build

# Start production servers
pnpm --filter cms start    # CMS
pnpm --filter web start    # Web
```

---

## Testing & Quality

### Linting
```bash
# Lint all workspaces
pnpm lint

# Lint specific workspace
pnpm --filter web lint
pnpm --filter cms lint

# Auto-fix issues
pnpm lint --fix
```

### Type Checking
```bash
# Type check all workspaces
pnpm typecheck

# Type check specific workspace
pnpm --filter web typecheck
pnpm --filter cms typecheck
```

### Format Code
```bash
# Prettier is integrated with ESLint
# Format on save (VS Code) or:
npx prettier --write "**/*.{ts,tsx,js,jsx,json,md}"
```

---

## Database Management

### Seeding Data
```bash
# Seed all initial data
pnpm seed

# Seed Digimon only
pnpm seed:digimon
```

### Import from DMO Wiki
```bash
# Import single Digimon (interactive)
pnpm import:dmowiki

# Bulk import (various methods)
pnpm import:all-digimon       # All Digimon
pnpm import:optimized         # Optimized bulk
pnpm import:authenticated     # With DMO Wiki auth
pnpm import:session           # Session-based
pnpm import:puppeteer         # Headless browser
```

### Data Fixes
```bash
# Fix skill data
pnpm fix:skills

# Fix user roles
pnpm fix:roles

# Fix missing icons
pnpm fix:icons
```

### Database Access
```bash
# MongoDB Shell
mongosh mongodb://localhost:27017/dmo-kb

# List collections
show collections

# Query Digimon
db.digimon.find().limit(5)

# Count documents
db.digimon.countDocuments()
```

---

## Debugging

### Frontend Debugging
1. **Browser DevTools**: F12 or Cmd+Option+I
2. **React DevTools**: Install browser extension
3. **Next.js Debug Mode**: `DEBUG=* pnpm dev`
4. **VS Code Debugger**: Use launch configuration

### Backend Debugging
1. **Console Logs**: Check terminal output
2. **Payload Admin**: http://localhost:3001/admin
3. **MongoDB Logs**: Check MongoDB output
4. **Node Inspector**: `node --inspect`

### Common Issues

**Port Already in Use**
```bash
# Find and kill process
# Windows:
netstat -ano | findstr :3000
taskkill /PID <pid> /F

# Linux/Mac:
lsof -i :3000
kill -9 <pid>
```

**MongoDB Connection Refused**
```bash
# Check if MongoDB is running
mongosh --eval "db.version()"

# Start MongoDB
# Docker: docker-compose up -d
# Local: systemctl start mongod (Linux)
```

**Build Errors**
```bash
# Clear all caches
rm -rf node_modules pnpm-lock.yaml
rm -rf apps/*/node_modules
rm -rf apps/*/.next apps/*/dist
pnpm install
pnpm build
```

---

## Scripts Reference

### Root Scripts (package.json)
| Script | Description |
|--------|-------------|
| `pnpm dev` | Start web app |
| `pnpm dev:cms` | Start CMS |
| `pnpm dev:all` | Start both concurrently |
| `pnpm build` | Build all workspaces |
| `pnpm lint` | Lint all code |
| `pnpm typecheck` | Type check all |
| `pnpm seed` | Seed database |
| `pnpm create-owner` | Create owner account |
| `pnpm import:*` | Various import methods |
| `pnpm fix:*` | Data fix utilities |

### Windows Batch Files
| File | Purpose |
|------|---------|
| `START_ALL_SERVERS.bat` | Start CMS + web |
| `RUN_COMMANDS.bat` | Common commands |

---

## Hot Reload Behavior

### Next.js (Web App)
- **File Changes**: Auto-reloads in <1 second
- **Config Changes**: Requires manual restart
- **Environment Changes**: Requires restart

### Nodemon (CMS)
- **TypeScript Files**: Auto-compiles and restarts
- **Config Files**: Auto-restarts
- **Ignores**: `node_modules/`, `dist/`, `.next/`

### Shared Package
- **Manual Step**: Run `pnpm --filter @dmo-kb/shared build`
- **Then**: Restart both servers

---

## Performance Tips

### Development Speed
1. Use `pnpm dev:all` to run both servers
2. Keep MongoDB running (don't stop/start)
3. Use SSD for `node_modules/`
4. Increase Node.js memory: `NODE_OPTIONS=--max-old-space-size=4096`

### Build Optimization
1. Use `pnpm build` (not `npm` or `yarn`)
2. Enable incremental TypeScript compilation (already on)
3. Skip lint during build: `pnpm build --no-lint`

---

## Environment Variables

See [07-ENVIRONMENT.md](./07-ENVIRONMENT.md) for complete reference.

### Required for Development
```env
MONGODB_URI=mongodb://localhost:27017/dmo-kb
NEXTAUTH_SECRET=<generate with: openssl rand -base64 32>
PAYLOAD_SECRET=<generate with: openssl rand -base64 32>
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_CMS_URL=http://localhost:3001
```

### Optional for Development
```env
# Discord OAuth (optional)
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
DISCORD_GUILD_ID=

# Email (Mailpit for dev)
EMAIL_SERVER=smtp://localhost:1025
EMAIL_FROM=noreply@dmokb.local
```

---

## Git Workflow

### Branches
- `main` - Production-ready code
- `develop` - Active development
- `feature/*` - New features
- `fix/*` - Bug fixes

### Commit Conventions
```bash
# Format: type(scope): message

# Examples:
git commit -m "feat(digimon): add visual evolution editor"
git commit -m "fix(auth): resolve Discord OAuth redirect"
git commit -m "docs: update development guide"
git commit -m "chore: upgrade dependencies"
```

### Pre-commit Hooks
- Runs lint-staged automatically
- Lints and formats changed files
- Configured in `.husky/` and `.lintstagedrc.js`

---

## Useful Commands Cheat Sheet

```bash
# Quick Start
pnpm install && pnpm dev:all

# Fresh Install
rm -rf node_modules pnpm-lock.yaml && pnpm install

# Clean Build
pnpm run clean && pnpm build

# Database Reset
mongosh mongodb://localhost:27017/dmo-kb --eval "db.dropDatabase()"
pnpm seed

# Check Package Versions
pnpm list --depth=0

# Update Dependencies
pnpm update --latest --recursive

# Add Dependency
pnpm --filter web add <package>
pnpm --filter cms add <package>

# Remove Dependency
pnpm --filter web remove <package>
```
