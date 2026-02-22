# Project Overview - DMO Knowledge Base

## TL;DR

**What is this?**
A modern Progressive Web App (PWA) serving as a comprehensive knowledge base for Digimon Masters Online, featuring CMS-backed content management, visual evolution editors, and automated data import from DMO Wiki.

**Tech Stack**
- Frontend: Next.js 14 (App Router) + React 18 + TypeScript
- Backend: Payload CMS 2.x + Express
- Database: MongoDB 6.20
- Monorepo: pnpm workspaces

**Current Status**
✅ Fully functional development build with extensive features implemented

**Key Features**
- 📊 Comprehensive Digimon database (500+ entries possible)
- 🎨 Visual evolution tree editor (Cytoscape-based graph)
- 🔐 Discord OAuth + role-based access control (5 roles)
- 🤖 Automated DMO Wiki scraper/importer
- ✏️ Rich-text MDX editor (TipTap)
- 📱 PWA-ready (offline support, installable)
- 🎨 Gruvbox dark theme throughout

**Primary Risks**
- ⚠️ No automated tests (manual testing only)
- ⚠️ 155KB monolithic `server.ts` file (maintainability concern)
- ⚠️ Role auto-upgrade hook in development mode needs careful production handling
- ⚠️ MongoDB configured for localhost only (no production deployment active)

**Notable Achievements**
- Complete visual evolution editor with drag-and-drop
- Multi-language Digimon name support (JP, KR, CN, TH)
- Advanced RBAC with Discord role sync
- Image deduplication and localhost URL system for CMS preview
- Extensive documentation (11 essential guides + this technical reference)

---

## Project Purpose

Build a fan-made, community-driven knowledge base for Digimon Masters Online players to:
1. Browse comprehensive Digimon information (stats, skills, evolutions)
2. View visual evolution trees and chains
3. Access guides, maps, quests, tools, and patch notes
4. Contribute content through role-based permissions

Target users:
- DMO players seeking game information
- Content editors creating guides
- Administrators managing the knowledge base
- Discord community members (OAuth integration)

---

## Architecture Summary

**Monorepo Structure** (pnpm workspaces)
```
dmo-kb/
├── apps/
│   ├── web/          # Next.js 14 frontend (localhost:3000)
│   └── cms/          # Payload CMS backend (localhost:3001)
└── packages/
    └── shared/       # Shared TypeScript library
```

**3-Tier Architecture**
1. **Presentation** - Next.js SSR/SSG pages with React components
2. **API Layer** - Express server with Payload CMS REST API
3. **Data** - MongoDB with Mongoose ODM

**Communication**
- Frontend → Backend: HTTP REST API calls to `localhost:3001/api`
- Auth: NextAuth JWT sessions with Discord OAuth
- Image handling: Download to Payload media, serve via localhost URLs

---

## Current Status Details

### What's Working ✅
- User authentication (Discord OAuth + Payload credentials)
- Digimon CRUD operations (Create, Read, Update, Delete)
- Visual evolution editor (save/load from database)
- DMO Wiki import pipeline (5 different import methods)
- Image management (deduplication, localhost serving)
- Role-based access control (guest → member → editor → admin → owner)
- Email verification system (Mailpit for dev)
- Rich-text content editing (TipTap)
- Search functionality
- Responsive UI with TailwindCSS

### Known Limitations ⚠️
- No automated test coverage
- Production deployment not configured (MongoDB localhost only)
- Large server.ts file needs refactoring (155KB)
- Email system uses Mailpit (dev only, needs production SMTP)
- No CI/CD pipeline
- Documentation was scattered (now consolidated)

### Performance Notes
- Development mode runs 2 servers (web + CMS)
- Hot reload works via nodemon (CMS) and Next.js dev server
- Build time: ~30-60 seconds for full monorepo
- Database seeding: ~2-5 minutes for 100 Digimon via import

---

## Key Achievements

### Technical Implementations
1. **Monolithic Scraper** - 155KB `server.ts` containing complete DMO Wiki parser with Cheerio
2. **Visual Editor** - Cytoscape.js integration for interactive evolution tree editing
3. **Image System** - Smart deduplication by source URL, localhost preview URLs
4. **Multi-Auth** - NextAuth supporting Discord OAuth + Payload CMS credentials
5. **RBAC** - 5-tier role system with Discord server role sync
6. **Type Safety** - Full TypeScript across monorepo with shared types

### User Experience
1. **Dark Theme** - Complete Gruvbox palette implementation
2. **Responsive Design** - Mobile-first with Radix UI primitives
3. **PWA Features** - Manifest, offline capability, installable
4. **Rich Editing** - TipTap WYSIWYG for guides and content
5. **Search** - Global search across Digimon, guides, and content

### Developer Experience
1. **Monorepo** - Clean workspace protocol with pnpm
2. **Hot Reload** - Both servers support live reload
3. **Scripts** - 30+ automation scripts for data management
4. **Documentation** - Comprehensive guides (now organized)
5. **TypeScript** - Strict mode with full type coverage

---

## Next Steps (Prioritized)

### Critical (Production Readiness)
1. Add automated tests (unit + integration + E2E)
2. Refactor server.ts into modular scraper components
3. Configure production MongoDB (Atlas or hosted)
4. Set up production SMTP for emails
5. Review and test role auto-upgrade hook behavior
6. Add CI/CD pipeline (GitHub Actions or similar)

### High Priority (Stability)
7. Add error boundaries and fallback UIs
8. Implement rate limiting on API endpoints
9. Add logging and monitoring (production)
10. Database backup strategy

### Medium Priority (Features)
11. Add more comprehensive search (Algolia/MeiliSearch?)
12. Implement content versioning
13. Add user profiles and activity tracking
14. Build mobile app (React Native?)
15. Add real-time features (WebSocket for live updates)

### Low Priority (Enhancements)
16. Add more themes beyond Gruvbox
17. Internationalization (i18n)
18. Advanced analytics and metrics
19. Content recommendation engine
20. Community features (comments, ratings)

---

## Technology Decisions

### Why Next.js 14?
- App Router for better routing and layouts
- Built-in SSR/SSG for SEO and performance
- Image optimization out of the box
- Large ecosystem and community

### Why Payload CMS?
- TypeScript-first CMS
- MongoDB native support
- Flexible schema definitions
- Great admin UI
- Self-hosted (no vendor lock-in)

### Why MongoDB?
- Flexible schema for evolving data models
- Good performance for read-heavy workloads
- Native JSON support (perfect for Digimon data)
- Easy local development

### Why pnpm?
- Faster than npm/yarn
- Efficient disk space usage
- Excellent monorepo support
- Workspace protocol for internal packages

### Why Gruvbox?
- Accessibility (contrast ratios)
- Developer-friendly (familiar to many)
- Complete color palette
- Aesthetically pleasing dark theme

---

## Documentation Philosophy

This documentation follows these principles:
1. **Concrete over Abstract** - Real file paths, actual commands, specific examples
2. **Complete over Minimal** - Cover all aspects, even if verbose
3. **Accurate over Assumptive** - Based on actual code inspection
4. **Organized over Scattered** - Structured reference vs. scattered notes
5. **Maintained over Stale** - Regular cleanup (89 outdated files removed)

Each documentation file serves a specific purpose:
- **Overview** (this file) - Big picture, status, decisions
- **Tech Stack** - Dependencies and versions
- **Architecture** - Structure and organization  
- **Development** - How to build and run
- **API Routes** - Endpoint reference
- **Data Models** - Schema definitions
- **Environment** - Configuration reference
- **Security** - Auth and permissions
- **Issues** - Known problems and TODOs
- **Metrics** - Project statistics
