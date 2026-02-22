# Architecture Documentation

## Overview

DMO KB is a modern, monorepo-based knowledge base built with:

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **CMS**: Payload CMS v2 with MongoDB
- **Authentication**: NextAuth with Discord OAuth + Email Magic Links
- **Styling**: TailwindCSS with Gruvbox theme
- **Package Manager**: pnpm workspaces

## Project Structure

```
dmo-kb/
├── apps/
│   ├── web/                    # Next.js frontend application
│   │   ├── src/
│   │   │   ├── app/           # App Router pages
│   │   │   ├── components/    # React components
│   │   │   └── lib/           # Utilities (auth, RBAC, filters)
│   │   ├── public/            # Static assets
│   │   └── package.json
│   │
│   └── cms/                    # Payload CMS backend
│       ├── src/
│       │   ├── collections/   # Payload collections
│       │   ├── payload.config.ts
│       │   └── server.ts
│       └── package.json
│
├── packages/
│   └── shared/                 # Shared types, schemas, constants
│       ├── src/
│       │   ├── types.ts       # TypeScript types
│       │   ├── schemas.ts     # Zod schemas
│       │   └── constants.ts   # Shared constants
│       └── package.json
│
├── scripts/                    # Utility scripts
│   ├── seed.ts                # Database seeding
│   ├── ingest-patch.ts        # Patch notes importer
│   └── ingest-events.ts       # Events importer
│
└── docs/                       # Documentation
```

## System Map

```
┌─────────────────────────────────────────────────────────────┐
│                         User Browser                        │
│  (React Components, NextAuth Session, Service Worker)      │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   │ HTTPS/Fetch
                   ↓
┌─────────────────────────────────────────────────────────────┐
│              Next.js App (apps/web) :3000                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  App Router (Server + Client Components)            │   │
│  │  - Pages: /digimon, /maps, /quests, /guides         │   │
│  │  - API Routes: /api/search, /api/health, /api/auth  │   │
│  │  - Middleware: Auth guards, CORS, Rate limiting     │   │
│  └────────────────┬────────────────────────────────────┘   │
│                   │                                          │
│  ┌────────────────┴───────────────────────────────────┐    │
│  │  NextAuth (JWT Sessions)                           │    │
│  │  - Providers: Discord OAuth, Payload Credentials   │    │
│  │  - Session Strategy: JWT (no database sessions)    │    │
│  └────────────────┬───────────────────────────────────┘    │
└───────────────────┼──────────────────────────────────────────┘
                    │ HTTP/REST
                    ↓
┌─────────────────────────────────────────────────────────────┐
│           Payload CMS API (apps/cms) :3001                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Express Server + Payload CMS                       │   │
│  │  - Admin UI: /admin                                 │   │
│  │  - REST API: /api/{collection}                      │   │
│  │  - Collections: Digimon, Maps, Quests, etc.         │   │
│  │  - Access Control: RBAC (guest→owner)               │   │
│  └────────────────┬────────────────────────────────────┘   │
└───────────────────┼──────────────────────────────────────────┘
                    │ Mongoose ODM
                    ↓
┌─────────────────────────────────────────────────────────────┐
│              MongoDB :27017                                 │
│  Collections: users, digimon, evolution-lines, media,       │
│               items, maps, quests, guides, tools,           │
│               patch-notes, events                           │
└─────────────────────────────────────────────────────────────┘
```

## Request Lifecycle

### 1. Page Request (SSR/SSG)
```
1. Browser → GET /digimon/agumon
2. Next.js Server Component:
   a. Check cache (ISR revalidation time)
   b. If stale → fetch(`CMS_URL/api/digimon?where[slug][equals]=agumon`)
   c. CMS → MongoDB query
   d. MongoDB → return doc
   e. CMS → validate with Payload schemas → return JSON
   f. Next.js → render React to HTML
3. Browser ← HTML + hydration data
4. React hydrates → interactive page
```

### 2. API Request (Client-Side)
```
1. User types in search box
2. Browser → GET /api/search?q=greymon
3. Next.js API Route:
   a. Validate query with Zod schema
   b. Apply rate limiting (100 req/min per IP)
   c. Parallel fetch to CMS collections (digimon, guides, quests, maps, tools)
   d. Each fetch → CMS → MongoDB text search
   e. Aggregate results
4. Browser ← JSON { results: [...] }
5. React updates UI
```

### 3. Authentication Flow
```
1. User → clicks "Sign in with Discord"
2. Browser → NextAuth → Discord OAuth redirect
3. User authorizes on Discord
4. Discord → callback to /api/auth/callback/discord
5. NextAuth:
   a. Validates OAuth token
   b. Fetches Discord user + roles (optional)
   c. Maps Discord role → app role (member/editor/admin)
   d. Generates JWT with user data + role
   e. Sets HTTP-only cookie
6. Browser ← redirect to /auth/welcome
7. All subsequent requests include JWT cookie
8. Middleware validates JWT on protected routes
```

### 4. Content Creation Flow
```
1. Editor → Payload Admin /admin/collections/digimon/create
2. Fill form + upload images
3. Click Save
4. Payload:
   a. Validate fields (Zod + Payload validators)
   b. Check RBAC: user.role in ['editor','admin','owner']
   c. Process images with Sharp (resize, optimize)
   d. Save to media collection
   e. Save Digimon doc to MongoDB with media refs
   f. Trigger hooks (if any)
5. Admin UI ← success + redirect to edit page
6. Next.js pages auto-revalidate on next request (ISR)
```

## Data Flow

### Content Management Flow

1. **Content Creation**
   - Editors create/edit content via Payload Admin UI (`/admin`)
   - Collections: Digimon, Maps, Quests, Guides, Tools, Patch Notes, Events
   - RBAC enforced at collection level

2. **Content Storage**
   - MongoDB stores all content
   - Payload handles validation and relationships
   - Media files stored in `/media` directory

3. **Content Delivery**
   - Next.js fetches data via Payload API
   - Server Components for initial load (ISR/SSG)
   - Client Components for interactive features

### Authentication Boundaries

**Public** (no auth required):
- All read-only pages (/digimon, /maps, /guides, etc.)
- Search API
- Health check API

**Authenticated** (JWT required):
- User profile (/profile)
- Settings (/settings)

**Role-Based** (specific roles required):
- Editor+ → Create/edit content via CMS
- Admin+ → Delete content, manage users
- Owner → Full system access

### Auth Flow Details

1. User initiates auth (Discord OAuth or Payload Credentials)
2. NextAuth handles provider flow
3. JWT session created with user roles
4. Middleware protects routes based on roles
5. RBAC utilities check permissions in components
6. CMS API enforces access control per collection

## Key Technologies

### Frontend (apps/web)

- **Next.js 14**: App Router for file-based routing, Server/Client Components
- **React 18**: UI library with modern patterns
- **TailwindCSS**: Utility-first styling with Gruvbox theme
- **shadcn/ui**: Pre-built, accessible component library
- **NextAuth**: Authentication with multiple providers
- **Zod**: Runtime validation

### Backend (apps/cms)

- **Payload CMS**: Headless CMS with admin UI
- **MongoDB**: NoSQL database via Mongoose
- **Express**: Web server for Payload
- **TypeScript**: Type safety across the stack

### Shared (packages/shared)

- **TypeScript**: Shared type definitions
- **Zod**: Shared validation schemas
- **Constants**: Taxonomies (elements, ranks, families)

## RBAC System

### Role Hierarchy

```
guest < member < editor < admin < owner
```

### Permissions Matrix

| Resource    | Guest | Member | Editor | Admin | Owner |
|-------------|-------|--------|--------|-------|-------|
| Read Public | ✓     | ✓      | ✓      | ✓     | ✓     |
| Save Items  | ✗     | ✓      | ✓      | ✓     | ✓     |
| Edit Content| ✗     | ✗      | ✓      | ✓     | ✓     |
| Publish     | ✗     | ✗      | ✗      | ✓     | ✓     |
| Manage Users| ✗     | ✗      | ✗      | ✓     | ✓     |
| Full Control| ✗     | ✗      | ✗      | ✗     | ✓     |

### Implementation

- **Payload**: `access` functions in collection configs
- **Next.js**: Middleware for route protection
- **Components**: `canEdit()`, `canAdmin()` utilities

## Data Ingestion

### Automated Importers

1. **Patch Notes** (`scripts/ingest-patch.ts`)
   - Fetches from official site
   - Respects robots.txt
   - Throttles requests (2s delay)
   - Stores with source attribution

2. **Events** (`scripts/ingest-events.ts`)
   - Similar to patch notes
   - Parses date ranges
   - Extracts rewards

### Manual Import Flow

1. Run script: `pnpm ingest:patch`
2. Script fetches + parses HTML
3. Validates with Zod schemas
4. POSTs to Payload API
5. Content reviewable in admin

## Performance Optimizations

### Next.js

- **ISR (Incremental Static Regeneration)**: Revalidate pages on-demand
- **SSG (Static Site Generation)**: Pre-render static pages at build
- **Image Optimization**: `next/image` with automatic optimization
- **Route Caching**: Cache API responses

### Database

- **Indexes**: On `slug`, `published`, common filters
- **Pagination**: Limit query results
- **Projections**: Only fetch needed fields

### PWA

- **Service Worker**: Cache static assets
- **Offline Support**: Fallback pages
- **Install Prompt**: Add to home screen

## Security

### Authentication

- **JWT Sessions**: Stateless, secure tokens
- **CSRF Protection**: Next.js middleware
- **Rate Limiting**: Protect API endpoints

### Authorization

- **Payload Access Control**: Collection-level permissions
- **Next.js Middleware**: Route-level guards
- **Component-Level**: RBAC utility checks

### Data Validation

- **Zod Schemas**: Runtime validation
- **TypeScript**: Compile-time type safety
- **Payload Hooks**: Pre-save validation

## Deployment

### Local Development

```bash
# Start MongoDB + Mailpit
pnpm docker:up

# Start CMS
pnpm dev:cms

# Start web app
pnpm dev
```

### Production (Vercel/Node)

1. **Build**: `pnpm build`
2. **Environment**: Set production env vars
3. **Database**: MongoDB Atlas or self-hosted
4. **Deploy**: 
   - Web: Vercel, Netlify, or Node server
   - CMS: VPS or PaaS (Railway, Render)

### Environment Variables

See `.env.example` for required variables:
- MongoDB connection
- NextAuth secrets + OAuth credentials
- Payload secret
- API URLs

## Future Enhancements

- **i18n**: Multi-language support
- **CDN**: Image hosting (Cloudinary, UploadThing)
- **Analytics**: Plausible or similar
- **Search**: Algolia or MeiliSearch
- **Real-time**: WebSocket updates for events
- **Mobile App**: React Native with shared types
