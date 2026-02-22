# Architecture - DMO Knowledge Base

Project structure, file organization, and architectural patterns.

---

## Monorepo Structure

```
d:\DMOKBNEW/
├── apps/
│   ├── cms/                    # Payload CMS Backend
│   │   ├── src/
│   │   │   ├── collections/    # 12 Payload collection configs
│   │   │   ├── server.ts       # Express + DMO Wiki scraper (155KB)
│   │   │   ├── payload.config.ts
│   │   │   ├── endpoints/      # Custom API endpoints
│   │   │   ├── access/         # RBAC policies
│   │   │   ├── components/     # Admin UI components
│   │   │   ├── lib/            # Utilities
│   │   │   └── scripts/        # Admin scripts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── web/                    # Next.js Frontend
│       ├── src/
│       │   ├── app/            # App Router pages & API routes
│       │   ├── components/     # React components
│       │   ├── lib/            # Utilities, auth, CMS client
│       │   └── types/          # TypeScript definitions
│       ├── public/             # Static assets
│       ├── package.json
│       └── next.config.mjs
│
├── packages/
│   └── shared/                 # Shared TypeScript library
│       ├── src/
│       │   ├── constants.ts    # Digimon enums
│       │   ├── schemas.ts      # Zod validation
│       │   ├── types.ts        # Shared types
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
│
├── scripts/                    # Data management scripts (29 files)
├── documentation/              # Technical documentation (this folder)
├── docs/                       # Legacy docs + archive
├── package.json                # Root workspace config
├── pnpm-workspace.yaml
└── tsconfig.json
```

---

## Frontend Architecture (apps/web)

### App Router Structure
```
src/app/
├── layout.tsx                  # Root layout
├── page.tsx                    # Homepage
├── globals.css                 # Global styles
├── loading.tsx                 # Loading UI
├── error.tsx                   # Error boundary
├── not-found.tsx               # 404 page
│
├── api/                        # API Routes
│   ├── auth/[...nextauth]/     # NextAuth handler
│   ├── digimon/                # Digimon API
│   ├── evolution-lines/        # Evolution API
│   ├── search/                 # Search endpoint
│   └── health/                 # Health check
│
├── auth/                       # Auth pages
│   ├── signin/
│   ├── register/
│   ├── verify/
│   └── welcome/
│
├── digimon/                    # Digimon pages
│   ├── page.tsx                # List view
│   └── [slug]/                 # Dynamic routes
│       ├── page.tsx            # Detail view
│       └── digivolutions/
│
├── guides/
├── maps/
├── quests/
├── patch-notes/
├── profile/
├── settings/
└── tools/
```

### Component Organization
```
src/components/
├── ui/                         # shadcn/ui components
│   ├── button.tsx
│   ├── card.tsx
│   ├── dialog.tsx
│   └── ...
│
├── digimon/                    # Digimon-specific
│   ├── digimon-card.tsx
│   ├── digimon-filters.tsx
│   ├── digivolution-chain.tsx
│   ├── visual-evolution-editor.tsx
│   └── skills-section.tsx
│
├── layout/                     # Layout components
│   ├── header.tsx
│   ├── footer.tsx
│   └── sidebar.tsx
│
├── auth/                       # Auth components
│   └── session-provider.tsx
│
└── common/                     # Reusable components
    ├── pagination.tsx
    └── empty-state.tsx
```

---

## Backend Architecture (apps/cms)

### Collections (Database Schema)
```
src/collections/
├── Users.ts                    # User accounts + RBAC
├── Digimon.ts                  # Digimon data model (558 lines)
├── EvolutionLines.ts           # Evolution tree structures
├── Media.ts                    # Image/file uploads
├── Items.ts                    # In-game items
├── Maps.ts                     # Game maps
├── Quests.ts                   # Quest data
├── Guides.ts                   # User guides
├── Tools.ts                    # Calculators/utilities
├── PatchNotes.ts               # Patch notes
├── Events.ts                   # In-game events
└── DigimonImporter.ts          # Import interface
```

### Access Control
```
src/access/
├── index.ts                    # Export all policies
├── isOwner.ts                  # Owner-only access
├── isAdmin.ts                  # Admin-level access
└── isEditor.ts                 # Editor-level access
```

### Custom Endpoints
```
src/endpoints/
├── resendVerification.ts       # Email verification resend
└── update-digimon-skills.ts    # Bulk skill updates
```

---

## Data Flow Patterns

### 1. Digimon Display Flow
```
User Request
  ↓
Next.js Page (SSR)
  ↓
Fetch from Payload API (localhost:3001/api/digimon)
  ↓
Payload CMS (Express)
  ↓
MongoDB Query (Mongoose)
  ↓
Return JSON
  ↓
Render React Components
```

### 2. Authentication Flow
```
User Sign-In (Discord/Credentials)
  ↓
NextAuth Provider
  ↓
Discord OAuth OR Payload CMS Login
  ↓
Generate JWT Token
  ↓
Store in HTTP-Only Cookie
  ↓
Middleware checks token on protected routes
```

### 3. DMO Wiki Import Flow
```
Run import script (scripts/bulk-import-*.ts)
  ↓
Scrape DMO Wiki with Cheerio
  ↓
Parse HTML → Extract data
  ↓
Download images to /media
  ↓
Call Payload API (POST /api/digimon)
  ↓
Validate with Zod schemas
  ↓
Save to MongoDB
  ↓
Return success/error
```

### 4. Image Handling Flow
```
DMO Wiki Image URL
  ↓
Download with node-fetch
  ↓
Check sourceUrl in Media collection (deduplication)
  ↓
If new: Save to Payload Media
  ↓
Process with Sharp (resize, optimize)
  ↓
Store in /media folder
  ↓
Return localhost URL (http://localhost:3001/media/filename.png)
  ↓
Frontend displays via localhost URL
```

---

## Key Architectural Patterns

### Monorepo with Workspace Protocol
- **Benefits**: Shared code, atomic changes, consistent versions
- **Tool**: pnpm workspaces
- **Pattern**: `@dmo-kb/shared` imported by both apps

### API-First Design
- Payload CMS exposes REST API
- Frontend consumes API (client-side + SSR)
- Easy to add mobile apps or other clients

### Type-Safe Full Stack
- Shared types in `packages/shared`
- TypeScript strict mode
- Zod runtime validation
- Payload generates types automatically

### Role-Based Access Control (RBAC)
- 5 roles: guest, member, editor, admin, owner
- Collection-level access policies
- Discord role sync (optional)
- Development auto-upgrade hook

### Image Optimization Strategy
- Download once, serve locally
- Deduplication by source URL
- Sharp processing (WebP, resizing)
- Next.js Image component (lazy loading, srcset)

---

## File Size Analysis

### Largest Files (Maintenance Concerns)
1. **server.ts** (155,683 bytes) - Monolithic scraper + Express server
   - Risk: Hard to maintain, test, and extend
   - TODO: Refactor into modules

2. **Digimon.ts** (14,696 bytes) - Collection schema
   - Status: Acceptable for complex schema

3. **pnpm-lock.yaml** (535,594 bytes) - Dependency lock
   - Status: Normal for large monorepo

### Module Boundaries
- Web app: Self-contained Next.js app
- CMS: Self-contained Payload app
- Shared: Pure library (no side effects)
- Scripts: Independent utilities

---

## Database Schema Design

### Collections Overview
```
MongoDB Database: dmo-kb
├── users                       # User accounts
├── digimon                     # Digimon entries
├── evolution-lines             # Evolution trees
├── media                       # Uploaded files
├── items                       # Game items
├── maps                        # Game maps
├── quests                      # Quests
├── guides                      # User guides
├── tools                       # Utilities
├── patch-notes                 # Patch notes
├── events                      # Events
└── payload-preferences         # Payload settings
```

### Relationships
```
Digimon
  └─> icon (Media)
  └─> mainImage (Media)
  └─> evolutionLine (EvolutionLines)

EvolutionLines
  └─> rootDigimon (Digimon)
  └─> digimonInLine (Digimon[])

Guides
  └─> author (Users)
```

---

## Deployment Architecture (Not Configured)

### Intended Production Setup
```
Frontend (Next.js)
  ↓ Deployed to: Vercel / Netlify / VPS
  ↓ Port: 443 (HTTPS)

Backend (Payload CMS)
  ↓ Deployed to: VPS / Railway / Render
  ↓ Port: Custom (internal)

Database (MongoDB Atlas)
  ↓ Hosted: Cloud
  ↓ Connection: TLS/SSL

Static Assets
  ↓ CDN: Cloudflare / S3 + CloudFront
```

### Current Development Setup
```
Everything on localhost:
- Web: localhost:3000
- CMS: localhost:3001
- MongoDB: localhost:27017
- Mailpit: localhost:8025
```
