# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Rate limiting**: Enforced across all /api/* routes via middleware (100 req/min, env-driven)
- **Structured logging**: Pino logger with LOG_LEVEL support in CMS backend
- **Test infrastructure**: Vitest + Playwright configs and minimal test scaffold
- **Security guards**: DEV_AUTO_ELEVATE feature flag for role auto-upgrade in development
- **Environment utilities**: Centralized env validation in apps/cms/src/utils/env.ts
- **Error handling**: Unified error handler in apps/cms/src/utils/error-handler.ts
- Documentation: 18 comprehensive guides in /documentation folder
- Dependencies: bcryptjs for password hashing (replaced native bcrypt)

### Changed
- **CMS API routes**: Converted from Next.js to Express types (batch-import, import-digimon routes)
- **Middleware**: Refactored to use plain rate limiting + JWT auth (removed withAuth wrapper)
- **Users.ts**: Auto-upgrade now requires NODE_ENV==='development' AND DEV_AUTO_ELEVATE==='true'
- **Server.ts**: Wired env.PAYLOAD_SECRET and pino logger (replaced console.* calls)
- **Package.json**: Added test/test:e2e/test:all/build:all/generate/migrate scripts
- **.env.example**: Added LOG_LEVEL, DEV_AUTO_ELEVATE, SEARCH_ADAPTER variables
- **.gitignore**: Added test-results/, playwright-report/, .vitest entries

### Fixed
- **CMS typecheck**: All 8 type errors resolved (NextRequest/NextResponse, payload.init secret, user.role typing)
- **Middleware**: TypeScript error (withAuth 2-args requirement)
- **Import paths**: Fixed relative imports for payload.config and utils/env
- **Scripts**: check-user.ts and reset-password-direct.ts now use proper payload init
- Environment variable documentation gaps
- Test dependencies installation (added -w flag)

---

## [0.1.0] - 2025-10-30

### Added

#### Digimon Attributes System (2025-10-13)
- **Complete Attribute Implementation**: All Digimon attributes from DigimonAttributes.md
  - **Forms**: 24 evolution stages (In-Training, Rookie, Champion, Ultimate, Mega, X-Antibody, Hybrids, Xros, etc.)
  - **Ranks**: 11 power tiers (N, A, A+, S, S+, SS, SS+, SSS, SSS+, U, U+)
  - **Attributes**: 5 type affinities (None, Virus, Vaccine, Data, Unknown)
  - **Elements**: 11 elemental types (Land, Fire, Ice, Light, Steel, Neutral, Pitch Black, Thunder, Water, Wind, Wood)
  - **Families**: 11 family classifications (Dark Area, Deep Savers, Dragon's Roar, Jungle Troopers, Metal Empire, Nature Spirits, Nightmare Soldiers, TBD, Unknown, Virus Busters, Wind Guardians)
  - **Attacker Types**: 4 combat roles (Quick Attacker, Short Attacker, Near Attacker, Defender)
  - **Stats**: 8 base statistics (HP, AT, DE, AS, DS, CT, HT, EV)
  - Files: `packages/shared/src/constants.ts`, `packages/shared/src/types.ts`

- **Badge Images System**: 50 badge images for visual indicators
  - Rank badges (11 images)
  - Attribute icons (5 images)
  - Element icons (11 images)
  - Family icons (11 images)
  - Attacker type icons (4 images)
  - Stat icons (8 images)
  - Location: `Images/` folder with organized subfolders

- **Badge Upload Script**: Automated badge image uploader
  - Uploads all 50 badge images to CMS Media collection
  - Sets proper alt text and descriptions
  - Command: `pnpm upload:badges`
  - File: `scripts/upload-badges.ts`

- **Enhanced Digimon Collection**: Updated CMS schema
  - Added `form` field (select with 24 options)
  - Updated `rank` field (11 power tier options)
  - Added `attackerType` field (4 combat role options)
  - Updated all attribute/element/family options
  - Enhanced `stats` group with labels (8 stat fields including new AS field)
  - Renamed `forms` array to `variants` (avoid confusion)
  - Added helpful descriptions for all fields
  - File: `apps/cms/src/collections/Digimon.ts`

#### Authentication System (2025-10-13)
- **Fully Functional Sign-In Page**: Complete authentication UI
  - Discord OAuth login with icon
  - Email magic link login with form
  - Loading states with spinners
  - Error handling with alerts
  - Success messages
  - File: `apps/web/src/app/auth/signin/page.tsx`

- **User Navigation Component**: Avatar-based user menu
  - Shows "Sign In" when logged out
  - Shows user avatar when logged in
  - Dropdown with Profile/Settings/Sign Out
  - Loading states
  - File: `apps/web/src/components/layout/user-nav.tsx`

- **Profile Page**: View account information
  - Shows user avatar, name, email
  - Displays role and permissions
  - Links to CMS for editors/admins
  - File: `apps/web/src/app/profile/page.tsx`

- **Settings Page**: Manage account settings
  - Account information
  - Notification preferences (coming soon)
  - Appearance settings (coming soon)
  - Data & privacy information
  - File: `apps/web/src/app/settings/page.tsx`

- **Authentication Pages**: Complete auth flow
  - Verification page for email magic links
  - Error page with helpful messages
  - Files: `apps/web/src/app/auth/verify/page.tsx`, `apps/web/src/app/auth/error/page.tsx`

- **UI Components**: All missing components created
  - Alert component with variants
  - Dropdown menu (Radix UI)
  - Avatar component with fallback
  - Files: `components/ui/alert.tsx`, `dropdown-menu.tsx`, `avatar.tsx`

- **Dependencies**: Added authentication support packages
  - `react-icons` ^5.5.0 - For Discord icon
  - `@radix-ui/react-dropdown-menu` - User menu
  - `@radix-ui/react-avatar` - Avatar component

#### Patch Notes System (2025-10-13)
- **Patch Notes List Page**: Browse all patch notes at `/patch-notes`
  - Shows version badges, publish dates
  - Links to official sources
  - Preview text with "Read more"
  - Empty state handling
  - File: `apps/web/src/app/patch-notes/page.tsx`

- **Patch Note Detail Page**: View individual patch notes at `/patch-notes/[slug]`
  - Full HTML content rendering
  - SEO metadata
  - Back navigation
  - Rich text styling with prose
  - File: `apps/web/src/app/patch-notes/[slug]/page.tsx`

- **CMS API Client**: Reusable utility for fetching from Payload CMS
  - `fetchCMSCollection<T>()` - Type-safe collection queries
  - `fetchCMSBySlug<T>()` - Fetch by slug
  - `fetchCMSById<T>()` - Fetch by ID
  - Smart caching (60s default)
  - Query parameter builder
  - File: `apps/web/src/lib/cms-client.ts`

- **Type Definitions**: Comprehensive types for CMS responses
  - `PayloadResponse<T>` - Generic pagination response
  - `DigimonDoc`, `GuideDoc`, `QuestDoc`, `MapDoc`, `ToolDoc`, `PatchNoteDoc`
  - Full type safety for all CMS data
  - File: `apps/web/src/types/payload-responses.ts`

#### Data Import Tools (2025-10-13)
- **DMOwiki Importer**: Import Digimon data from dmowiki.com
  - Single Digimon import: `pnpm import:dmowiki Agumon`
  - Batch import: `pnpm import:dmowiki Agumon Gabumon Greymon`
  - Extracts: name, stats, skills, families, element, attribute, images
  - Auto-detects duplicates and skips existing entries
  - Respects throttling to avoid rate limiting
  - File: `scripts/import-dmowiki.ts`

- **Patch Notes Scraper**: Scrape official DMO patch notes
  - Scrapes from dmo.gameking.com/News/News.aspx
  - Extracts: title, content, version, date, URL
  - Auto-detects duplicates
  - Throttled requests (2s default)
  - File: `scripts/scrape-patch-notes.ts`

- **Data Import Guide**: Comprehensive documentation for data import tools
  - File: `docs/DATA_IMPORT_GUIDE.md`

#### Discord Integration Configuration (2025-10-13)
- **Discord Server Setup**: Configured Discord role IDs in .env
  - Guild ID: 1427056567693476016
  - Owner Role: 1427056890008961166
  - Admin Role: 1427056820697960579
  - Editor Role: 1427056761029918761
  - Member Role: 1427056712690565181
  - Guest Role: 1427056679018696847

- **Discord Setup Guide**: Step-by-step guide for completing OAuth setup
  - Creating Discord application
  - Configuring OAuth2 redirect URIs
  - Setting up role sync
  - Testing login flow
  - Production deployment notes
  - File: `docs/DISCORD_SETUP.md`

- **Environment Validation**: Added Discord role ID validation
  - Updated `apps/web/src/env.ts` with all Discord role fields
  - Optional validation (won't fail without Discord configured)

#### Error Handling & UX (2025-10-13)
- **React Error Boundaries**: Added comprehensive error boundaries across the application
  - Global error boundary (`app/global-error.tsx`) for root layout errors
  - Page-level error boundary (`app/error.tsx`) for general errors
  - Route-specific error boundary (`app/digimon/error.tsx`) for Digimon pages
  - All error boundaries show user-friendly messages with retry/navigation options
  - Development mode shows detailed error messages for debugging

- **Loading States**: Added skeleton loading components for better perceived performance
  - Digimon list loading state (`app/digimon/loading.tsx`)
  - Digimon detail loading state (`app/digimon/[slug]/loading.tsx`)
  - Prevents layout shift and provides visual feedback during data fetching

- **API Error Handling**: Implemented centralized API error handling
  - Created `lib/api-handler.ts` with reusable error handling utilities
  - `withErrorHandler()` wrapper for consistent error responses across all API routes
  - `ApiErrorResponse` class for typed error throwing (badRequest, unauthorized, notFound, etc.)
  - Zod validation error handling with detailed field-level messages
  - `validateBody()` and `validateParams()` helpers for request validation
  - Updated `/api/search` route to use new error handling system

#### Environment Validation (2025-10-13)
- **CMS Environment Validation**: Added runtime validation for CMS environment variables
  - Created `apps/cms/src/env.ts` with Zod schema
  - Validates `MONGODB_URI`, `PAYLOAD_SECRET`, and other required variables on startup
  - Provides clear error messages when environment variables are missing or invalid
  - Prevents server startup with misconfigured environment

- **Web App Environment Validation**: Added runtime validation for web app environment variables
  - Created `apps/web/src/env.ts` with Zod schema  
  - Validates `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, OAuth credentials
  - Caches validated environment for performance
  - Server-side only validation to prevent exposing secrets

#### Documentation (2025-10-13)
- **Sharp Workaround Documentation**: Created comprehensive guide for Sharp module override
  - Documented the issue with Payload CMS dependency on `sharp@0.32.6`
  - Explained the pnpm override solution
  - Added verification steps and monitoring guidelines
  - File: `docs/SHARP_WORKAROUND.md`

### Changed

#### Type Safety Improvements (2025-10-13)
- **Eliminated all `any` types**: Replaced with proper typed interfaces
  - Updated `apps/web/src/app/api/search/route.ts` to use typed Payload responses
  - Updated `apps/web/src/app/api/digimon/route.ts` with proper type imports
  - All CMS API calls now fully typed
  - 0 ESLint warnings for TypeScript

- **Patch Notes Collection Schema**: Updated for better UX and scraper compatibility
  - Added `slug` field (unique identifier)
  - Added `version` field for version numbers
  - Renamed `date` → `publishedDate` (clearer naming)
  - Renamed `body` → `content` (consistency with other collections)
  - Renamed `sourceUrl` → `url` (simpler)
  - Added `published` checkbox for visibility control
  - Updated admin UI columns
  - File: `apps/cms/src/collections/PatchNotes.ts`

- **Navigation Structure**: Improved main navigation
  - Added "Patch Notes" link
  - Reordered links for better UX flow
  - File: `apps/web/src/components/layout/header.tsx`

#### TypeScript & Tooling (2025-10-13)
- **TypeScript Version Alignment**: Pinned TypeScript to `5.9.3` across all workspaces
  - Updated root `package.json`
  - Updated `apps/web/package.json`
  - Updated `apps/cms/package.json`
  - Updated `packages/shared/package.json`
  - Added pnpm override to ensure consistency across all dependencies

- **TypeScript ESLint Upgrade**: Upgraded to v7 for TypeScript 5.9 support
  - Upgraded `@typescript-eslint/eslint-plugin` from ^6.x to ^7.0.0
  - Upgraded `@typescript-eslint/parser` from ^6.x to ^7.0.0
  - Eliminates TypeScript version warnings during linting
  - Better type-aware lint rules

- **CI Workflow Update**: Updated GitHub Actions workflow
  - Changed pnpm version from 8 to 10 to match local development
  - File: `.github/workflows/ci.yml`

### Fixed

#### Build & Development (2025-10-13)
- **Digimon Page TypeScript Errors**: Fixed missing `digivolutions` property in mock data
  - Added empty `digivolutions` object with `digivolvesFrom`, `digivolvesTo`, and `jogress` arrays
  - File: `apps/web/src/app/digimon/[slug]/page.tsx`

- **ESLint in CMS Workspace**: Added missing ESLint dependencies
  - Installed `eslint`, `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser`
  - Created `.eslintrc.json` extending root config
  - File: `apps/cms/package.json`, `apps/cms/.eslintrc.json`

- **Unused Imports**: Removed unused imports to pass strict linting
  - Removed `CardContent` from `apps/web/src/app/tools/page.tsx`
  - Removed `useRouter` from `apps/web/src/components/search/global-search.tsx`
  - Changed `any` to `unknown` for better type safety in SearchResult metadata

- **Search Component Type Safety**: Improved type definitions
  - Changed `Record<string, any>` to `Record<string, unknown>`
  - Added `String()` conversion for rendering unknown values
  - File: `apps/web/src/components/search/global-search.tsx`

### Technical Debt Resolved
- ✅ All TypeScript errors fixed (0 errors across all workspaces)
- ✅ All lint errors fixed (only style warnings remain)
- ✅ All builds passing (shared, cms, web)
- ✅ Environment validation prevents misconfiguration
- ✅ Error boundaries prevent app crashes
- ✅ API error handling standardized

---

## Project Status

**Current Version**: 0.1.0  
**Status**: Development  
**Code Quality**:
- ✅ TypeScript: Strict mode, 0 errors
- ✅ ESLint: 0 errors, warnings only
- ✅ Build: All workspaces compile successfully
- ✅ Tests: Not yet implemented (planned)

**Completion**: ~94% of IDEAS.md features implemented

---

## Commit Message Format

This project uses [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `style:` Code style changes (formatting, etc.)
- `refactor:` Code refactoring
- `perf:` Performance improvements
- `test:` Test additions or changes
- `chore:` Build process or auxiliary tool changes
- `ci:` CI/CD changes

---

## References

- **Audit Report**: See initial codebase audit findings
- **Ideas**: See `IDEAS.md` for planned features
- **Tasklist**: See `Tasklist.md` for current work items
