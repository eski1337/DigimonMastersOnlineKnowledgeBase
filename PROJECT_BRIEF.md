# DMOKB.info — Project Brief & Action Plan

> Generated: 2025-02-21 | Analyst: Cascade (senior full-stack engineer + technical writer)

---

## A) Executive Summary

1. **Monorepo** (pnpm workspaces): two apps — `apps/web` (Next.js 14 frontend) and `apps/cms` (Payload CMS v2 backend). Both use TypeScript. (`package.json:1-92`, `pnpm-workspace.yaml:1-4`)
2. **Database**: MongoDB 7 via Docker Compose; Payload uses Mongoose adapter. (`docker-compose.yml:4-13`, `apps/cms/src/payload.config.ts:42-44`)
3. **CMS collections** (12 total): Digimon, EvolutionLines, Items, Maps, Quests, Guides, Tools, PatchNotes, Events, Media, Users, DigimonImporter. (`apps/cms/src/payload.config.ts:35`)
4. **Digimon profiles** are the richest entity (~560-line collection config) with slug, stats, skills, digivolution chains, localized names, and images. (`apps/cms/src/collections/Digimon.ts:1-558`)
5. **Rendering**: Digimon detail pages are **SSR with ISR** (revalidate: 10s). The Digimon list page is a **CSR client component** that fetches up to 1000 records. (`apps/web/src/app/digimon/[slug]/page.tsx:24`, `apps/web/src/app/digimon/page.tsx:1`)
6. **Auth**: NextAuth v4 with JWT strategy; Credentials (Payload CMS login) + Discord OAuth with role sync. (`apps/web/src/lib/auth.ts:1-245`)
7. **Search**: Custom server-side search API that queries Payload CMS `like` operator across 5 collections. No dedicated search engine. (`apps/web/src/app/api/search/route.ts:1-164`)
8. **Guides page**: Uses **hardcoded mock data** — not wired to CMS. (`apps/web/src/app/guides/page.tsx:7-24`)
9. **Patch notes ingestion**: Script references exist in `package.json` (`scrape:patch`, `ingest:patch`, `ingest:events`) but **no actual script files** found in the repo — they are missing or were never created.
10. **CRITICAL SECURITY**: `.env` file contains **real secrets** (Discord OAuth, admin passwords, wiki credentials) and is readable in the workspace. `.gitignore` does list `.env` (line 34), but the file exists and contains plaintext credentials. (`/.env:1-49`)
11. **Shared package** (`@dmo-kb/shared`) is referenced by both apps but **no `packages/` directory exists** in the repo — the workspace declaration in `pnpm-workspace.yaml:3` points to `packages/*` but that directory is absent. This likely works via a symlink or was lost.
12. **Testing**: Vitest (unit) + Playwright (e2e) configured with CI pipeline. Tests are minimal — 1 smoke spec, scaffold dirs for unit/integration. (`apps/web/tests/`, `.github/workflows/ci.yml`)
13. **Homepage** "Latest Updates" section shows static "Coming Soon" placeholders. (`apps/web/src/app/page.tsx:119,135`)
14. **No sitemap, robots.txt, or structured data (JSON-LD)** found. OpenGraph is partially configured in layout metadata. (`apps/web/src/app/layout.tsx:26-33`)
15. **HTML sanitizer is regex-based** (custom implementation) — the code itself notes it should be replaced with DOMPurify for production. (`apps/web/src/lib/sanitize-html.ts:1-8`)

---

## B) Repository Map

```
DMOKBNEW/
├── .env                          # ⚠️  REAL SECRETS — must rotate
├── .env.example                  # Template (156 lines, well-documented)
├── .env.local                    # Local overrides
├── .github/workflows/ci.yml     # GitHub Actions CI (lint, test, build, e2e)
├── .gitignore                    # Lists .env (line 34)
├── docker-compose.yml            # MongoDB 7 + Mailpit (dev email)
├── package.json                  # Root: scripts, deps (cheerio, sharp, mongodb)
├── pnpm-workspace.yaml           # apps/* + packages/* (packages/ missing!)
├── tsconfig.json                 # Root TS config (ES2022, strict)
├── vitest.config.ts              # Unit test config (jsdom, @/ alias)
├── playwright.config.ts          # E2E config (Chromium + Firefox)
├── ecosystem.config.js           # PM2 config (production process manager)
│
├── apps/
│   ├── web/                      # ── NEXT.JS 14 FRONTEND ──
│   │   ├── package.json          # next 14.1.0, next-auth, radix-ui, tiptap, cytoscape
│   │   ├── next.config.mjs       # Images: localhost:3001 + Cloudinary
│   │   ├── tailwind.config.ts    # Tailwind + custom Gruvbox theme
│   │   ├── src/
│   │   │   ├── app/              # App Router
│   │   │   │   ├── page.tsx              # Homepage (static hero + cards)
│   │   │   │   ├── layout.tsx            # Root layout (Inter font, Header/Footer)
│   │   │   │   ├── digimon/
│   │   │   │   │   ├── page.tsx          # List page (CSR, client-side filter)
│   │   │   │   │   └── [slug]/page.tsx   # Detail page (SSR, ISR 10s)
│   │   │   │   ├── patch-notes/
│   │   │   │   │   ├── page.tsx          # List (SSR via CMS)
│   │   │   │   │   └── [slug]/page.tsx   # Detail (SSR via CMS)
│   │   │   │   ├── guides/page.tsx       # ⚠️  MOCK DATA only
│   │   │   │   ├── maps/                 # Placeholder
│   │   │   │   ├── quests/               # Placeholder
│   │   │   │   ├── tools/                # Placeholder
│   │   │   │   ├── auth/                 # signin, register, verify, welcome, error
│   │   │   │   ├── profile/              # User profile
│   │   │   │   ├── settings/             # User settings
│   │   │   │   ├── verify-email/         # Email verification
│   │   │   │   └── api/
│   │   │   │       ├── auth/[...nextauth]  # NextAuth handler
│   │   │   │       ├── digimon/route.ts    # Proxy to CMS with filtering
│   │   │   │       ├── search/route.ts     # Multi-collection search
│   │   │   │       ├── health/             # Health check
│   │   │   │       ├── healthz/            # K8s-style health
│   │   │   │       └── evolution-lines/    # Evolution line API
│   │   │   ├── components/
│   │   │   │   ├── digimon/ (14 files)     # Cards, filters, skills, evolution tree
│   │   │   │   ├── search/global-search.tsx # Debounced search dropdown
│   │   │   │   ├── layout/ (header, footer, user-nav)
│   │   │   │   ├── ui/ (14 shadcn components)
│   │   │   │   └── auth/, common/, providers/
│   │   │   ├── lib/
│   │   │   │   ├── auth.ts               # NextAuth config (Credentials + Discord)
│   │   │   │   ├── cms-client.ts         # Payload CMS fetch helpers
│   │   │   │   ├── config.ts             # Centralized constants (312 lines)
│   │   │   │   ├── sanitize-html.ts      # ⚠️  Regex-based HTML sanitizer
│   │   │   │   ├── rate-limit.ts         # In-memory rate limiter
│   │   │   │   ├── mongodb.ts            # Direct MongoDB client
│   │   │   │   ├── validation-schemas.ts # Zod schemas
│   │   │   │   └── ...
│   │   │   └── types/ (digimon.ts, payload-responses.ts, next-auth.d.ts)
│   │   ├── tests/
│   │   │   ├── e2e/smoke.spec.ts         # 5 basic smoke tests
│   │   │   ├── unit/components/, unit/lib/
│   │   │   └── integration/api/
│   │   └── public/                       # Static assets (icons, manifest)
│   │
│   └── cms/                      # ── PAYLOAD CMS v2 BACKEND ──
│       ├── package.json          # payload ^2.26, express, slate editor
│       ├── src/
│       │   ├── payload.config.ts # 12 collections, Mongoose, Slate editor
│       │   ├── server.ts         # Express server (155KB — likely generated/bundled)
│       │   ├── collections/
│       │   │   ├── Digimon.ts        # 558 lines — primary entity
│       │   │   ├── Users.ts          # Auth, roles, email verification
│       │   │   ├── PatchNotes.ts     # title, slug, version, richText, publishedDate
│       │   │   ├── Guides.ts         # title, slug, content, tags, author
│       │   │   ├── EvolutionLines.ts # Visual layout JSON, digimon relationships
│       │   │   ├── Events.ts         # title, dateRange, rewards, sourceUrl
│       │   │   ├── Items.ts          # name, slug, category, auto-slug hook
│       │   │   ├── Maps.ts           # name, region, bosses, NPCs, portals
│       │   │   ├── Quests.ts         # title, type, steps, rewards, prereqs
│       │   │   ├── Tools.ts          # title, slug, description
│       │   │   ├── Media.ts          # Upload collection
│       │   │   └── DigimonImporter.ts
│       │   ├── endpoints/            # Custom API endpoints
│       │   ├── components/           # CMS admin UI components
│       │   ├── scripts/              # CMS-side import scripts
│       │   └── access/, lib/, utils/, services/
│       └── build/                    # Compiled output
│
├── Images/                       # Static icon assets (organized by category)
│   ├── AttackerType/, Attributes/, Elements/
│   ├── Families/, Placeholder/, Ranks/, Stats/
│
├── docs/                         # Documentation (97 items)
├── documentation/                # Additional docs (20 items)
├── MDs/                          # Markdown content
│
├── *.md (root)                   # Various guides:
│   ├── README.md, CHANGELOG.md, GETTING_STARTED.md
│   ├── AUTHENTICATION_GUIDE.md, BULK_IMPORT_GUIDE.md
│   ├── DEPLOYMENT_CHECKLIST.md, ENVIRONMENT_VARIABLES.md
│   └── DISCORD_INVITE_SYSTEM.md, HOW_TO_USE_VISUAL_EDITOR.md
│
├── RUN_COMMANDS.bat              # Windows dev launcher
└── START_ALL_SERVERS.bat         # Windows multi-server starter
```

### Entrypoints

| Role | File | Evidence |
|------|------|----------|
| **Frontend dev** | `apps/web/` via `pnpm dev` → `next dev` | `package.json:7`, `apps/web/package.json:6` |
| **CMS dev** | `apps/cms/` via `pnpm dev:cms` → `nodemon` | `package.json:8`, `apps/cms/package.json:6` |
| **Both** | `pnpm dev:all` → concurrently | `package.json:9` |
| **Build** | `pnpm build` → recursive build | `package.json:10` |
| **Tests** | `pnpm test` (vitest), `pnpm test:e2e` (Playwright) | `package.json:16-21` |
| **Docker** | `docker-compose up -d` (MongoDB + Mailpit) | `docker-compose.yml:1-28` |

### Frameworks & Languages

| Tech | Version | Evidence |
|------|---------|----------|
| **Next.js** | 14.1.0 | `apps/web/package.json:39` |
| **Payload CMS** | ^2.26.0 | `apps/cms/package.json:24` |
| **TypeScript** | 5.9.3 | `package.json:68` |
| **React** | ^18.2.0 / ^18.3.1 | `apps/web/package.json:42`, `apps/cms/package.json:27` |
| **MongoDB** | ^6.20.0 (driver), Mongo 7 (Docker) | `package.json:81`, `docker-compose.yml:5` |
| **TailwindCSS** | ^3.4.1 | `apps/web/package.json:60` |
| **NextAuth** | ^4.24.11 | `apps/web/package.json:40` |
| **Radix UI** | Various | `apps/web/package.json:17-25` |
| **Tiptap** | ^2.1.13 | `apps/web/package.json:27-30` |
| **Cytoscape** | ^3.33.1 | `apps/web/package.json:35-36` |

---

## C) Architecture

### Text Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        BROWSER                               │
│  Next.js App (localhost:3000)                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────┐ │
│  │ Homepage  │  │ /digimon │  │/digimon/ │  │/patch-notes │ │
│  │ (SSR)     │  │ (CSR)    │  │ [slug]   │  │ (SSR+ISR)   │ │
│  │           │  │ fetch    │  │ (SSR+ISR)│  │             │ │
│  └─────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬──────┘ │
│        │              │             │               │        │
│        │   ┌──────────▼─────────────▼───────────────▼──┐     │
│        │   │     Next.js API Routes (middleware)        │     │
│        │   │  /api/digimon  /api/search  /api/auth      │     │
│        │   │  Rate-limited (in-memory Map)               │     │
│        │   └──────────────────┬──────────────────────────┘     │
└────────┼──────────────────────┼──────────────────────────────┘
         │                      │
         │              ┌───────▼────────┐
         │              │  Payload CMS   │
         │              │ localhost:3001  │
         │              │  Express +     │
         │              │  Payload v2    │
         │              │  Slate Editor  │
         │              │  Webpack       │
         │              │  12 collections│
         │              └───────┬────────┘
         │                      │
         │              ┌───────▼────────┐
         │              │   MongoDB 7    │
         │              │ localhost:27017 │
         │              │  dmo-kb DB     │
         │              └────────────────┘
         │
         │              ┌────────────────┐
         └──────────────│   Mailpit      │
                        │ localhost:8025  │
                        │ (dev email UI)  │
                        └────────────────┘
```

### Rendering Modes

| Page | Mode | Cache | Evidence |
|------|------|-------|----------|
| `/` (Homepage) | SSR (static-like, no data fetch) | Default | `apps/web/src/app/page.tsx` |
| `/digimon` (list) | **CSR** (`'use client'`) | None — fetches all on mount | `apps/web/src/app/digimon/page.tsx:1` |
| `/digimon/[slug]` | **SSR + ISR** | revalidate: 10s | `apps/web/src/app/digimon/[slug]/page.tsx:24` |
| `/patch-notes` | **SSR + ISR** | revalidate: 60s (via cms-client) | `apps/web/src/app/patch-notes/page.tsx:15` |
| `/patch-notes/[slug]` | **SSR + ISR** | revalidate: 60s | `apps/web/src/app/patch-notes/[slug]/page.tsx:34` |
| `/guides` | **CSR** (mock data) | N/A | `apps/web/src/app/guides/page.tsx:7-24` |

### API Style

- **Web → CMS**: Server-side `fetch()` calls from Next.js to Payload CMS REST API (no GraphQL used despite schema output configured)
- **Browser → Web**: Next.js API routes at `/api/*` that proxy to CMS with added rate limiting
- **Auth**: NextAuth JWT sessions; CMS has its own auth (Payload built-in)

### Deploy Targets

| Target | Evidence | Status |
|--------|----------|--------|
| Docker (MongoDB + Mailpit) | `docker-compose.yml` | Development only |
| PM2 (production) | `ecosystem.config.js` | Configured but Unknown if used |
| Vercel | `.vercel` in `.gitignore:41` | Prepared but no `vercel.json` found |
| VPS / bare metal | `START_ALL_SERVERS.bat`, `RUN_COMMANDS.bat` | Windows scripts present |

---

## D) Current Features

| Feature | Status | Evidence |
|---------|--------|----------|
| **Digimon list page** (browse, filter, paginate) | ✅ Working | `apps/web/src/app/digimon/page.tsx` — CSR with client-side filtering by element/attribute/rank/family/search |
| **Digimon detail profiles** (stats, skills, evo tree, infobox) | ✅ Working | `apps/web/src/app/digimon/[slug]/page.tsx` — rich layout with sidebar |
| **Digimon data import** (bulk from DMO Wiki) | ✅ Working | Multiple scripts: `import:all-digimon`, `import:optimized`, `import:auth`, `import:puppeteer`, etc. (`package.json:39-44`) |
| **Evolution tree visualization** | ✅ Working | `apps/web/src/components/digimon/evolution-tree-v2.tsx` + Cytoscape dependency |
| **Visual evolution editor** (admin) | ✅ Working | `apps/web/src/components/digimon/visual-evolution-editor.tsx` — role-gated |
| **Patch notes listing** | ✅ Working | `apps/web/src/app/patch-notes/page.tsx` — SSR from CMS |
| **Patch notes detail** | ✅ Working | `apps/web/src/app/patch-notes/[slug]/page.tsx` — with HTML sanitization |
| **Authentication** (credentials + Discord OAuth) | ✅ Working | `apps/web/src/lib/auth.ts` — JWT sessions, role hierarchy |
| **Role-based access control** | ✅ Working | 5-tier: guest → member → editor → admin → owner (`apps/web/src/lib/config.ts:177-191`) |
| **Global search** (multi-collection) | ⚠️ Partial | Works but uses CMS `like` queries — no index, no fuzzy, no relevance scoring (`apps/web/src/app/api/search/route.ts`) |
| **Rate limiting** | ✅ Working | In-memory Map-based limiter on all API routes (`apps/web/src/middleware.ts:11-39`) |
| **Email verification** | ✅ Working | Payload built-in + Mailpit for dev (`apps/cms/src/collections/Users.ts:7-38`) |
| **Guides** | ❌ Missing | Page exists but uses **mock data** — not wired to CMS (`apps/web/src/app/guides/page.tsx:7-24`) |
| **Quests** | ❌ Missing | CMS collection exists (`apps/cms/src/collections/Quests.ts`) but no frontend page |
| **Maps** | ❌ Missing | CMS collection exists (`apps/cms/src/collections/Maps.ts`) but no frontend page |
| **Tools** | ❌ Missing | CMS collection exists (`apps/cms/src/collections/Tools.ts`) but no frontend page |
| **Events** | ❌ Missing | CMS collection exists (`apps/cms/src/collections/Events.ts`) but no frontend page; homepage says "Coming Soon" |
| **Patch notes ingestion** (automated scraping) | ❌ Missing | Scripts referenced (`scrape:patch`, `ingest:patch`, `ingest:events` in `package.json:28,37-38`) but **no script files found** in the repo |
| **Sitemap / robots.txt** | ❌ Missing | No `sitemap.ts`, no `robots.ts` in app directory |
| **Structured data (JSON-LD)** | ❌ Missing | No schema.org markup found |
| **PWA** | ⚠️ Partial | `manifest.json` referenced in layout (`apps/web/src/app/layout.tsx:34`), `next.config.mjs:24` has PWA comment, but `next-pwa` not installed |
| **Dark mode** | ⚠️ Partial | `next-themes` installed (`apps/web/package.json:41`) but no theme toggle found in header |
| **Mobile nav** | ⚠️ Partial | Hamburger button exists but no mobile menu implementation (`apps/web/src/components/layout/header.tsx:61-64`) |
| **CI/CD** | ⚠️ Partial | GitHub Actions CI configured (`ci.yml`) but no CD/deploy step |

---

## E) Data Model & Content Sources

### Content Storage

All content lives in **MongoDB** via Payload CMS. No Markdown/MDX files, no headless CMS besides Payload, no static JSON data files for content.

Static icons are in `/Images/` directory (Attributes, Elements, Families, Ranks, Stats, AttackerType, Placeholder). These are referenced from `public/icons/` in the web app.

### Schemas

#### 1. Digimon (Primary Entity)

> Source: `apps/cms/src/collections/Digimon.ts:1-558`

```
Digimon {
  name:          text (required)
  slug:          text (required, unique)  ← URL identifier
  names: {                                ← Localized
    japanese:    text
    katakana:    text
    korean:      text
    chinese:     text
    thai:        text
  }
  introduction:  textarea                 ← Lore/description
  form:          select (required)        ← DIGIMON_FORMS from @dmo-kb/shared
  rank:          select                   ← DIGIMON_RANKS (N, A, S, SS, SSS, U, etc.)
  type:          text                     ← Classification (Holy Knight, Dragon, etc.)
  attackerType:  select                   ← DIGIMON_ATTACKER_TYPES (QA, SA, NA, DE)
  icon:          upload → media
  mainImage:     upload → media
  images:        array[upload → media]
  attribute:     select (required)        ← DIGIMON_ATTRIBUTES (Vaccine, Virus, Data, etc.)
  element:       select (required)        ← DIGIMON_ELEMENTS (Fire, Water, etc.)
  families:      select (hasMany)         ← DIGIMON_FAMILIES
  variants:      array[{ name, description, image }]
  digivolutions: {
    digivolvesFrom:  array[{ name, requirements }]        ← text-based (not relationship!)
    digivolvesTo:    array[{ name, requiredLevel, requiredItem }]
    jogress:         array[{ partner → digimon, result → digimon, requirements }]
  }
  skills:        array[{ name, icon, description, type, element, cooldown,
                         dsConsumption, skillPointsPerUpgrade, animationTime,
                         damagePerLevel }]
  stats:         group { hp, at, de, as, ds, ct, ht, ev }  ← Base stats
  maxStats:      group { hp, at, de, as, ds, ct, ht, ev }  ← Level 140 / 100% size
  sizePct:       number
  obtain:        textarea
  unlockedAtLevel:   number
  unlockedWithItem:  text
  requiredToEvolve:  textarea
  rideability:   group { canBeRidden, rideableWithItem, rideSpeed }
  availability:  group { canBeHatched, available, limitedTime }
  visualEvolutionLayout: json             ← Cytoscape layout data
  evolutionLine: relationship → evolution-lines
  notes:         richText (Slate)
  sources:       array[{ source: text }]
  published:     checkbox (default: false)
}
```

**Slug rules**: The `slug` field is `required: true, unique: true` (`Digimon.ts:46-47`). No auto-generation hook — slugs must be set manually or by import scripts. The detail page resolves via `?where[slug][equals]=${slug}` query (`[slug]/page.tsx:22`).

**Key observation**: `digivolvesFrom` and `digivolvesTo` use **text names** (not relationships), while `jogress` uses proper Payload relationships. This is an inconsistency.

#### 2. Patch Notes

> Source: `apps/cms/src/collections/PatchNotes.ts:1-82`

```
PatchNotes {
  title:         text (required)
  slug:          text (required, unique)
  version:       text                     ← e.g., "1.2.3"
  publishedDate: date (required)
  content:       richText (required)      ← Slate rich text
  images:        array[upload → media]
  url:           text                     ← Original source URL
  published:     checkbox (default: true)
}
```

#### 3. Guides

> Source: `apps/cms/src/collections/Guides.ts:1-40`

```
Guides {
  title:      text (required)
  slug:       text (required, unique)
  summary:    textarea
  content:    richText (required)
  tags:       array[{ tag: text }]
  coverImage: upload → media
  author:     relationship → users
  published:  checkbox (default: false)
}
```

#### 4. Events

> Source: `apps/cms/src/collections/Events.ts:1-45`

```
Events {
  title:     text (required)
  dateRange: group { start: date (required), end: date }
  summary:   textarea
  rewards:   array[{ reward: text }]
  sourceUrl: text (required)
  locale:    text (default: 'en')
}
```

**Missing**: No `slug` field, no `published` flag.

#### 5. Other Collections

| Collection | Key Fields | Notes |
|------------|-----------|-------|
| **EvolutionLines** | name, rootDigimon (→ digimon), visualLayout (JSON), digimonInLine (→ digimon[]) | Auto-updates Digimon.evolutionLine on save (`EvolutionLines.ts:94-116`) |
| **Items** | name, slug (auto-generated hook), category (select), icon, description | Has `beforeValidate` slug auto-gen (`Items.ts:36-44`) |
| **Maps** | name, slug, region, levelRange, bosses[], npcs[], portals[] | Standard CRUD |
| **Quests** | title, slug, type (from shared QUEST_TYPES), steps[], rewards[], prereqs[] | Uses `@dmo-kb/shared` types (`Quests.ts:2`) |
| **Tools** | title, slug, description | Minimal schema |
| **Users** | email, username (auto-gen), name, role (5-tier), avatar, discordId | Email verification, dev auto-elevate hook (`Users.ts:43-70`) |
| **Media** | Standard Payload upload collection | |

#### 6. Taxonomy Constants

> Source: `@dmo-kb/shared` package (referenced but `packages/` dir missing from repo)

Used in: `Digimon.ts:3-8`, `Quests.ts:2`, `digimon-filters.tsx`, `route.ts`

Values can be inferred from `apps/web/src/lib/config.ts:197-217`:
- **Elements**: Fire, Water, Plant, Wind, Earth, Thunder, Light, Dark, Neutral
- **Attributes**: Vaccine, Virus, Data, Free, Unknown
- **Ranks**: Listed in CMS as: N, A, A+, S, S+, SS, SS+, SSS, SSS+, U, U+ (inferred from `[slug]/page.tsx:122-134`)
- **Families**: Nature Spirits, Deep Savers, Nightmare Soldiers, Wind Guardians, Metal Empire, Virus Busters, Dragon's Roar, Jungle Troopers, Dark Area, Unknown

---

## F) Digimon Slug Pages

### Current Behavior

1. **Route**: `/digimon/[slug]` — dynamic segment resolved at request time (`apps/web/src/app/digimon/[slug]/page.tsx:40`)
2. **Data fetching**: SSR function `getDigimon(slug)` calls Payload CMS REST API with `?where[slug][equals]=${slug}&where[published][equals]=true&limit=1` (`[slug]/page.tsx:19-38`)
3. **Caching**: ISR with `revalidate: 10` seconds (`[slug]/page.tsx:24`)
4. **404 handling**: Returns `notFound()` if no doc matches (`[slug]/page.tsx:46-48`)
5. **Slug field**: Defined as `required: true, unique: true` on the CMS collection (`Digimon.ts:46-47`). Uniqueness enforced at DB level by Payload/Mongoose.
6. **No `generateStaticParams`**: Pages are **not** pre-generated at build time. Every digimon page is rendered on-demand and then cached via ISR. No static generation.
7. **No `generateMetadata`**: The digimon detail page has **no dynamic metadata function** — no per-digimon `<title>`, no OpenGraph image, no description. This is a significant SEO gap.
8. **Slug generation**: No auto-slug hook exists on the Digimon collection (unlike Items which has one at `Items.ts:36-44`). Slugs come from import scripts.
9. **Collision handling**: The `unique: true` constraint prevents duplicate slugs at the DB level. No application-level collision detection or suffix logic.
10. **Canonical URLs**: No `<link rel="canonical">` tag generated. No redirect logic for slug changes.

### Link generation in evolution chains

When rendering digivolution links, the code falls back to generating slugs from names: `prev.slug || prev.name?.toLowerCase().replace(/\s+/g, '-')` (`[slug]/page.tsx:465,481`). This is fragile — the generated slug may not match the actual DB slug.

### Gaps for "Every Digimon Should Have a Profile"

| Gap | Severity | Detail |
|-----|----------|--------|
| No `generateStaticParams` | Medium | All pages are on-demand SSR. For full coverage, should pre-generate from CMS at build time. |
| No `generateMetadata` | High | No per-page SEO metadata (title, description, OG image). |
| No auto-slug hook on Digimon collection | Medium | Slugs depend entirely on import scripts. Manual CMS entries could have missing/bad slugs. |
| No canonical URL | Medium | Risk of duplicate content if slugs change. |
| `published: false` default | Low | New Digimon entries are unpublished by default — editors must explicitly publish. |
| Fallback slug derivation in evo links | Medium | `name.toLowerCase().replace()` may not match actual slugs (`[slug]/page.tsx:465`). |
| No redirect from old slugs | Low | If a slug is changed, old URLs will 404. |

---

## G) Patch Notes Pipeline

### Current Behavior

**Patch notes display** works — the `PatchNotes` CMS collection stores content as Slate rich text, and the frontend renders it with HTML sanitization (`apps/web/src/app/patch-notes/[slug]/page.tsx:92`).

**Patch notes ingestion** is **completely missing**:

- `package.json:28` defines `scrape:patch` → `tsx scripts/scrape-patch-notes.ts` — **file does not exist**
- `package.json:37` defines `ingest:patch` → `tsx scripts/ingest-patch.ts` — **file does not exist**
- `package.json:38` defines `ingest:events` → `tsx scripts/ingest-events.ts` — **file does not exist**
- No cron job, no webhook, no RSS feed integration found anywhere

The `.env.example` does reference `OFFICIAL_SITE_URL=https://dmo.gameking.com` (`line 107`) and `INGEST_THROTTLE_MS=2000` (`line 110`), confirming that scraping was planned but never implemented.

### Proposed Implementation Options (Compatible with Current Stack)

#### Option A: Cheerio-based Scraper Script (Recommended — simplest)

- **Tech**: `cheerio` (already installed at `package.json:78`) + `node-fetch` (at `package.json:82`)
- **Approach**: Create `scripts/scrape-patch-notes.ts` that:
  1. Fetches the official patch notes page from `OFFICIAL_SITE_URL`
  2. Parses HTML with Cheerio to extract title, date, content, version
  3. Dedupes by checking existing PatchNotes slugs via CMS API
  4. Creates new entries via Payload REST API (authenticated with `CMS_ADMIN_EMAIL/PASSWORD`)
  5. Respects `INGEST_THROTTLE_MS` between requests
- **Scheduling**: Run via cron (Linux) or Windows Task Scheduler, or add to PM2 ecosystem as a cron-triggered script
- **Pros**: Zero new dependencies, fits existing script pattern, works today
- **Cons**: Fragile if official site HTML structure changes; no real-time updates

#### Option B: RSS/Atom Feed Parser

- **Tech**: Add `rss-parser` package
- **Approach**: If `dmo.gameking.com` exposes an RSS feed, parse it for new entries
- **Pros**: More robust than HTML scraping; standard format
- **Cons**: Unknown if official site has RSS; still needs polling

#### Option C: Discord Bot Webhook → CMS

- **Tech**: Discord webhook listener (since Discord integration already exists)
- **Approach**: A Discord bot posts patch notes in a designated channel; a webhook handler creates CMS entries
- **Pros**: Leverages existing Discord infrastructure; community can contribute
- **Cons**: Requires additional bot setup; content may need manual formatting

**Recommendation**: Start with **Option A** (Cheerio scraper). The dependencies are already present, the `.env` config is pre-planned, and it matches the existing import script pattern.

---

## H) Risks & Tech Debt (Prioritized)

### CRITICAL

| # | Issue | File | Detail |
|---|-------|------|--------|
| 1 | **Secrets in `.env` committed to workspace** | `.env:1-49` | Contains Discord OAuth secret (`1mQISthYbiUs-sarB65GUf_mUUiQZd0B`), NEXTAUTH_SECRET, admin email/password, wiki credentials. Even if `.gitignore` excludes it, the file is in the workspace and could be exposed. **Rotate ALL secrets immediately.** |
| 2 | **Regex-based HTML sanitizer** | `apps/web/src/lib/sanitize-html.ts:1-55` | Custom regex sanitizer is known to be bypassable. The code itself acknowledges this (line 4-8). Patch notes use `dangerouslySetInnerHTML` with this sanitizer (`patch-notes/[slug]/page.tsx:92`). **Replace with `isomorphic-dompurify` or `sanitize-html` npm package.** |
| 3 | **`@dmo-kb/shared` package missing from repo** | `pnpm-workspace.yaml:3` | Both apps import from `@dmo-kb/shared` (15 imports across 13 files). The `packages/` directory doesn't exist. Build will fail on fresh clone. Must be restored or recreated. |

### HIGH

| # | Issue | File | Detail |
|---|-------|------|--------|
| 4 | **Digimon list fetches ALL 1000 records client-side** | `apps/web/src/app/digimon/page.tsx:24` | Every page load downloads up to 1000 Digimon documents. No server-side pagination or filtering. Scales poorly and hurts mobile performance. |
| 5 | **No SEO metadata on Digimon profiles** | `apps/web/src/app/digimon/[slug]/page.tsx` | No `generateMetadata` export. Every Digimon page has the same generic title/description. Massive SEO opportunity lost. |
| 6 | **No sitemap or robots.txt** | `apps/web/src/app/` | Search engines can't discover pages efficiently. |
| 7 | **Users collection `read: () => true`** | `apps/cms/src/collections/Users.ts:73` | All user data (emails, roles, discord IDs) is publicly readable via the Payload API. Should restrict to authenticated users or omit sensitive fields. |
| 8 | **Patch notes ingestion scripts missing** | `package.json:28,37-38` | Referenced scripts don't exist. Core feature gap. |
| 9 | **In-memory rate limiter resets on deploy** | `apps/web/src/middleware.ts`, `apps/web/src/lib/rate-limit.ts` | Uses a JavaScript `Map` — cleared on every restart/deploy. Not suitable for production with multiple instances. |

### MEDIUM

| # | Issue | File | Detail |
|---|-------|------|--------|
| 10 | **`server.ts` is 155KB** | `apps/cms/src/server.ts` | This appears to be a generated/bundled file committed to source. Should be in `.gitignore` or `build/`. |
| 11 | **Digivolution links use fragile slug fallback** | `apps/web/src/app/digimon/[slug]/page.tsx:465,481` | `name.toLowerCase().replace(/\s+/g, '-')` may not match actual DB slugs. |
| 12 | **No image optimization pipeline for CMS images** | `next.config.mjs:6-19` | Images from CMS are served from localhost:3001. In production, no CDN or optimization. Cloudinary pattern is configured but not used. |
| 13 | **Guides page uses mock data** | `apps/web/src/app/guides/page.tsx:7-24` | Hardcoded array instead of CMS fetch. |
| 14 | **Events collection missing slug and published fields** | `apps/cms/src/collections/Events.ts` | Cannot create URL-based detail pages; cannot filter unpublished. |
| 15 | **Mobile hamburger menu has no implementation** | `apps/web/src/components/layout/header.tsx:61-64` | Button renders but does nothing. |
| 16 | **Test coverage is minimal** | `apps/web/tests/` | Only 5 smoke e2e tests, empty unit/integration dirs. |
| 17 | **Duplicate config constants** | `apps/web/src/lib/config.ts` vs `@dmo-kb/shared` | Elements, attributes, ranks are defined in both places. |

### LOW

| # | Issue | File | Detail |
|---|-------|------|--------|
| 18 | **No `<link rel="canonical">` on any page** | — | Risk of duplicate URLs in search engines. |
| 19 | **`next-themes` installed but no theme toggle** | `apps/web/package.json:41` | Dark mode toggle not implemented. |
| 20 | **OpenGraph URL hardcoded to `dmokb.local`** | `apps/web/src/app/layout.tsx:29` | Should use env variable or real domain. |
| 21 | **No error monitoring (Sentry)** | `.env.example:140-141` | Configured as optional but not installed. |
| 22 | **CI uses Mongo 6 while Docker uses Mongo 7** | `.github/workflows/ci.yml:17` vs `docker-compose.yml:5` | Minor version mismatch. |

---

## I) Roadmap

### Horizon 1: Next 1 Day (Critical Fixes)

1. **Rotate all secrets** — regenerate `NEXTAUTH_SECRET`, `PAYLOAD_SECRET`, Discord OAuth credentials, change admin passwords. Update `.env` (keep out of source control).
2. **Restore `@dmo-kb/shared` package** — recreate `packages/shared/` with the exported constants (DIGIMON_ELEMENTS, DIGIMON_ATTRIBUTES, etc.) and a `package.json`. Verify both apps build.
3. **Replace HTML sanitizer** — `pnpm add isomorphic-dompurify` in `apps/web`, replace `sanitize-html.ts` with DOMPurify wrapper.
4. **Add `generateMetadata` to `/digimon/[slug]`** — dynamic title (`{name} | DMO KB`), description (from `introduction`), OG image (from `mainImage`).
5. **Restrict Users collection read access** — hide email and sensitive fields from public API, or change `read: () => true` to authenticated-only.

### Horizon 2: Next 1 Week (Core Features)

6. **Create patch notes scraper** (`scripts/scrape-patch-notes.ts`) — Cheerio-based, using existing dependencies. Include deduplication, throttling, error handling.
7. **Wire Guides page to CMS** — replace mock data with `fetchCMSCollection('guides')`, add `[slug]` detail page.
8. **Add `sitemap.ts` and `robots.ts`** — auto-generate from all published Digimon, patch notes, guides.
9. **Add `generateStaticParams` to `/digimon/[slug]`** — pre-render all published Digimon at build time for SEO.
10. **Server-side pagination for Digimon list** — replace client-side 1000-record fetch with paginated API calls.
11. **Implement mobile navigation** — add sliding drawer or sheet menu for the hamburger button.
12. **Add `slug` and `published` fields to Events collection** — enable frontend Events page.

### Horizon 3: Next 1 Month (Polish & Scale)

13. **Implement remaining content pages** — Quests, Maps, Tools, Events with list + detail views.
14. **Upgrade search** — add MongoDB text indexes on name/title fields, or integrate Meilisearch for fuzzy search and relevance scoring.
15. **Add structured data (JSON-LD)** — VideoGame schema on homepage, Article schema on guides, Product-like schema on Digimon profiles.
16. **Production deployment pipeline** — add CD step to CI, configure Vercel or VPS deployment.
17. **Redis-backed rate limiting** — replace in-memory Map with Redis for multi-instance production.
18. **Image CDN** — configure Cloudinary adapter for Payload CMS media, update `next.config.mjs`.
19. **Comprehensive test suite** — unit tests for sanitizer, CMS client, filters; integration tests for API routes; expand e2e coverage.
20. **Homepage dynamic content** — replace "Coming Soon" with real latest patch notes and events from CMS.
21. **Dark mode toggle** — wire up `next-themes` with a toggle in the header.
22. **Convert digivolutions to relationships** — migrate `digivolvesFrom`/`digivolvesTo` from text names to Payload relationships for data integrity.

---

## J) Next Recommended Prompt

Copy and paste this as your next message to start implementation:

---

**Prompt:**

```
I want to start with the critical Day-1 fixes from the PROJECT_BRIEF.md roadmap. Do these in order:

1. Create the missing `packages/shared/` package:
   - Create `packages/shared/package.json` with name "@dmo-kb/shared"
   - Create `packages/shared/src/index.ts` exporting all constants currently imported
     by `apps/cms/src/collections/Digimon.ts` (DIGIMON_ELEMENTS, DIGIMON_ATTRIBUTES,
     DIGIMON_RANKS, DIGIMON_FAMILIES, DIGIMON_FORMS, DIGIMON_ATTACKER_TYPES),
     `apps/cms/src/collections/Quests.ts` (QUEST_TYPES),
     `apps/web/src/lib/auth.ts` (UserRole type),
     and `apps/web/src/app/digimon/page.tsx` (DigimonFilters type).
   - Infer the actual values from `apps/web/src/lib/config.ts:197-217` and
     `apps/web/src/app/digimon/[slug]/page.tsx:122-134`.
   - Add a `tsconfig.json` and ensure both apps can resolve the workspace package.

2. Replace the regex HTML sanitizer:
   - Install `isomorphic-dompurify` in `apps/web`
   - Rewrite `apps/web/src/lib/sanitize-html.ts` to use DOMPurify
   - Keep the same function signatures (sanitizeHTML, stripHTML, escapeHTML, sanitizeURL)

3. Add `generateMetadata` to `apps/web/src/app/digimon/[slug]/page.tsx`:
   - Title: "{name} — DMO Knowledge Base"
   - Description: first 160 chars of `introduction` field
   - OpenGraph image from `mainImage` URL

4. Add `sitemap.ts` and `robots.ts` to `apps/web/src/app/`:
   - Sitemap: fetch all published digimon + patch notes slugs from CMS
   - robots.txt: allow all, reference sitemap URL

After each step, confirm the change compiles with `pnpm typecheck`.
```

---

*End of Project Brief*
