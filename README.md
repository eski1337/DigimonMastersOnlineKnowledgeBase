# DMO Knowledge Base

A modern, PWA-first knowledge base for **Digimon Masters Online** built with Next.js 14, Payload CMS, and MongoDB.

## Features

- 🎮 **Comprehensive Digimon Database** - Browse, filter, and search all Digimon with detailed profiles
- 🗺️ **Maps & Quests** - Complete guides to in-game locations and quest lines
- 📚 **Guides & Tools** - Community guides, calculators, trackers, and utilities
- 🔐 **RBAC System** - Discord-like role-based permissions (Guest → Owner)
- ✏️ **On-site Editor** - Tiptap-powered MDX editor with schema-backed templates
- 📱 **PWA** - Offline support, installable, fast
- 🎨 **Gruvbox Dark Theme** - Beautiful, accessible dark mode palette
- 🌐 **Data Importers** - Automated ingestion of official patch notes and events

## Tech Stack

- **Framework**: Next.js 14 (App Router), React 18, TypeScript
- **CMS**: Payload CMS v2 with MongoDB
- **Auth**: NextAuth (Discord OAuth + Email Magic Links)
- **Styling**: TailwindCSS, shadcn/ui, Lucide icons
- **Validation**: Zod
- **Package Manager**: pnpm

## Getting Started

### 🚀 Quick Start (3 Steps!)

**Everything is built and ready to use!**

1. **Start CMS:**
   ```bash
   pnpm dev:cms
   ```
   Wait for: `Payload Admin URL: http://localhost:3001`

2. **Create owner account:**
   ```bash
   pnpm create-owner
   ```
   Login: `eski@dmokb.local`

3. **Start using!**
   - Admin/Editor Panel: http://localhost:3001/admin
   - Website: http://localhost:3000 (run `pnpm dev`)
   - Start adding content!

**👉 Read [README_COMPLETE.md](./README_COMPLETE.md) for full details**

### 📚 Essential Documentation

**Start Here:**
- **[README_COMPLETE.md](./README_COMPLETE.md)** ⭐ Complete status & quick start
- **[FINAL_STATUS.md](./FINAL_STATUS.md)** - What's implemented (94%!)
- **[IDEAS_STATUS.md](./IDEAS_STATUS.md)** - IDEAS.md breakdown
- **[ADMIN_EDITOR_GUIDE.md](./ADMIN_EDITOR_GUIDE.md)** - How to use CMS

**Development:**
- **[GETTING_STARTED.md](./GETTING_STARTED.md)** - Setup guide
- **[LOCAL_DEV_GUIDE.md](./LOCAL_DEV_GUIDE.md)** - Development workflow
- **[BUG_FIX_REPORT.md](./BUG_FIX_REPORT.md)** - Technical fixes

### Access Points

- Web App: http://localhost:3000
- CMS Admin: http://localhost:3001/admin
- Mailpit: http://localhost:8025

## Project Structure

```
dmo-kb/
├── apps/
│   ├── web/          # Next.js frontend
│   └── cms/          # Payload CMS backend
├── packages/
│   └── shared/       # Shared types, schemas, and utilities
├── scripts/          # Data ingestion and seeding scripts
├── docs/            # Architecture and contribution docs
└── docker-compose.yml
```

## Scripts

- `pnpm dev` - Start web app
- `pnpm dev:cms` - Start CMS
- `pnpm dev:all` - Start both concurrently
- `pnpm build` - Build for production
- `pnpm lint` - Lint all workspaces
- `pnpm typecheck` - Type check all workspaces
- `pnpm seed` - Seed initial data
- `pnpm ingest:patch` - Import patch notes
- `pnpm ingest:events` - Import events

## Deployment

### Local Development
```bash
pnpm docker:up && pnpm dev:all
```
Visit http://localhost:3000

### Production (Strato VPS)
See detailed guides:
- **[Quick Deploy Guide](./QUICK_DEPLOY.md)** - 45-minute setup
- **[Full Deployment Docs](./docs/DEPLOYMENT.md)** - Complete reference

**Quick deployment:**
```bash
cd /home/dmokb/dmo-kb
./.deployment/deploy.sh
```

## Contributing

See [docs/CONTRIBUTING.md](./docs/CONTRIBUTING.md) for contribution guidelines.

## Architecture

See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for technical architecture details.

## License

This is a fan-made project for educational and informational purposes. Digimon Masters Online and all related trademarks belong to their respective owners.

## Disclaimer

This project is not affiliated with or endorsed by Bandai Namco, WeMade Entertainment, Joymax, or any official Digimon Masters Online entities. All game data and images are property of their respective owners.
