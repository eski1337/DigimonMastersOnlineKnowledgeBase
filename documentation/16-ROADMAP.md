# Roadmap - DMO Knowledge Base

Top 10 next steps with concrete paths and owners.

---

## Critical Priority (Sprint 1-2)

### 1. Refactor Monolithic server.ts

**Issue**: Single 155KB file (`apps/cms/src/server.ts`) contains Express server, DMO Wiki scraper, and API logic.

**Tasks**:
- [ ] Split into `server.ts` (Express bootstrap only, <200 lines)
- [ ] Extract to `services/logger.ts` (structured logging)
- [ ] Extract to `services/image-service.ts` (image download/processing)
- [ ] Extract to `scrapers/dmowiki/index.ts` (main scraper)
- [ ] Extract to `scrapers/dmowiki/parser.ts` (HTML parsing)
- [ ] Extract to `scrapers/dmowiki/extractors/*.ts` (stats, skills, evolutions, images)
- [ ] Extract to `services/import-service.ts` (import orchestration)
- [ ] Extract to `utils/error-handler.ts` (error handling)

**Owner**: Backend team  
**Path**: `apps/cms/src/**`  
**Priority**: 🔴 CRITICAL  
**Effort**: 2-3 days

---

### 2. Implement Automated Tests

**Issue**: Zero test coverage - high risk of regression bugs.

**Tasks**:
- [ ] Install Vitest + Testing Library + Playwright
- [ ] Create `vitest.config.ts` + `tests/setup.ts`
- [ ] Create `playwright.config.ts`
- [ ] Write unit tests for utilities (`apps/web/tests/unit/lib/`)
- [ ] Write component tests (`apps/web/tests/unit/components/`)
- [ ] Write API integration tests (`apps/web/tests/integration/api/`)
- [ ] Write E2E smoke tests (`apps/web/tests/e2e/`)
- [ ] Achieve 80%+ coverage on critical paths

**Owner**: Full-stack team  
**Path**: `apps/web/tests/`, `apps/cms/tests/`  
**Priority**: 🔴 CRITICAL  
**Effort**: 3-5 days

---

### 3. Production Deployment Setup

**Issue**: Not configured for production deployment.

**Tasks**:
- [ ] Set up MongoDB Atlas cluster
- [ ] Configure production SMTP (SendGrid/Resend)
- [ ] Deploy CMS to VPS/Railway/Render
- [ ] Deploy frontend to Vercel
- [ ] Set up error tracking (Sentry)
- [ ] Configure logging (Winston/Pino)
- [ ] Implement database backups
- [ ] Create deployment documentation
- [ ] Set up monitoring/alerting

**Owner**: DevOps/Owner  
**Path**: `docs/DEPLOYMENT.md`, `.github/workflows/deploy.yml`  
**Priority**: 🟡 HIGH  
**Effort**: 3-4 days

---

## High Priority (Sprint 3-4)

### 4. Enforce Rate Limiting

**Issue**: Configured but not enforced - vulnerable to abuse.

**Tasks**:
- [ ] Create `apps/web/src/lib/rate-limiter.ts`
- [ ] Apply to `/api/search` (already has placeholder)
- [ ] Apply to `/api/auth/*`
- [ ] Apply to all Payload API proxies
- [ ] Add rate limit headers (`X-RateLimit-*`)
- [ ] Log rate limit violations
- [ ] Test with load testing tool

**Owner**: Backend team  
**Path**: `apps/web/src/lib/rate-limiter.ts`, `apps/web/src/middleware.ts`  
**Priority**: 🟡 HIGH  
**Effort**: 1 day

---

### 5. Implement Structured Logging

**Issue**: Using `console.log` everywhere - no log levels, no structured data.

**Tasks**:
- [ ] Install `pino` or `winston`
- [ ] Create `apps/cms/src/services/logger.ts`
- [ ] Create `apps/web/src/lib/logger.ts`
- [ ] Replace all `console.*` calls
- [ ] Add `LOG_LEVEL` env var
- [ ] Configure log rotation (production)
- [ ] Integrate with monitoring (e.g., DataDog, LogDNA)

**Owner**: Backend team  
**Path**: `apps/{cms,web}/src/**/logger.ts`  
**Priority**: 🟡 HIGH  
**Effort**: 1-2 days

---

### 6. Security Hardening

**Issue**: Dev-only role auto-upgrade could run in production; missing security headers.

**Tasks**:
- [ ] Add feature flag `DEV_AUTO_ELEVATE` (default: false) to `Users.ts`
- [ ] Guard role auto-upgrade behind `NODE_ENV === 'development' && DEV_AUTO_ELEVATE`
- [ ] Add security headers to `next.config.mjs` (HSTS, CSP, etc.)
- [ ] Enable CSRF protection in Payload (verify config)
- [ ] Audit CORS configuration
- [ ] Add input sanitization to rich text fields
- [ ] Review file upload size limits

**Owner**: Security team/Backend  
**Path**: `apps/cms/src/collections/Users.ts`, `apps/web/next.config.mjs`  
**Priority**: 🟡 HIGH  
**Effort**: 1 day

---

## Medium Priority (Sprint 5-6)

### 7. CI/CD Pipeline

**Issue**: No automated checks on commits/PRs.

**Tasks**:
- [ ] Create `.github/workflows/ci.yml`
- [ ] Add Node.js 20 + pnpm setup
- [ ] Add MongoDB service for tests
- [ ] Run `pnpm typecheck` (all workspaces)
- [ ] Run `pnpm lint` (all workspaces)
- [ ] Run `pnpm test` (unit + integration)
- [ ] Run `pnpm test:e2e` (Playwright)
- [ ] Upload test artifacts on failure
- [ ] Add status badges to README

**Owner**: DevOps  
**Path**: `.github/workflows/ci.yml`  
**Priority**: 🟠 MEDIUM  
**Effort**: 1 day

---

### 8. Database Indexing & Optimization

**Issue**: No explicit indexes - potential performance issues at scale.

**Tasks**:
- [ ] Create `scripts/migrations/001-add-indexes.ts`
- [ ] Add text indexes to Digimon (name, introduction)
- [ ] Add text indexes to Guides (title, summary, content)
- [ ] Add compound indexes (rank+element, form+published)
- [ ] Add unique indexes (slugs)
- [ ] Verify index usage with `.explain()`
- [ ] Document in `docs/CONTENT_MODELS.md`

**Owner**: Backend team  
**Path**: `scripts/migrations/`, `docs/CONTENT_MODELS.md`  
**Priority**: 🟠 MEDIUM  
**Effort**: 1 day

---

### 9. Component Documentation (Storybook)

**Issue**: Complex components lack visual documentation.

**Tasks**:
- [ ] Install Storybook for Next.js
- [ ] Create stories for UI components (`components/ui/*.tsx`)
- [ ] Create stories for Digimon components
- [ ] Add controls and variants
- [ ] Deploy Storybook to static hosting
- [ ] Add to CI (build Storybook)

**Owner**: Frontend team  
**Path**: `apps/web/.storybook/`, `apps/web/src/**/*.stories.tsx`  
**Priority**: 🟠 MEDIUM  
**Effort**: 2-3 days

---

### 10. Enhanced Search (Text Indexes)

**Issue**: Using simple substring match - slow and limited.

**Tasks**:
- [ ] Add MongoDB text indexes (see `docs/SEARCH.md`)
- [ ] Update search route to use `$text` operator
- [ ] Sort results by text score
- [ ] Add search analytics (track queries)
- [ ] Implement search suggestions (autocomplete)
- [ ] Add fuzzy matching for typos

**Owner**: Full-stack team  
**Path**: `apps/web/src/app/api/search/route.ts`, `scripts/migrations/002-text-indexes.ts`  
**Priority**: 🟠 MEDIUM  
**Effort**: 2 days

---

## Future Enhancements (Backlog)

### Internationalization (i18n)
- Enable Payload localization for Digimon (Japanese, Korean, Chinese)
- Install `next-intl` for frontend
- Translate UI strings
- Add language switcher

**Path**: `docs/I18N.md`, `apps/cms/src/payload.config.ts`  
**Effort**: 1-2 weeks

### Advanced Search (Algolia/Meilisearch)
- Set up search adapter interface
- Migrate from MongoDB to dedicated search service
- Add faceted search, filters, autocomplete
- Implement search analytics dashboard

**Path**: `docs/SEARCH.md`, `apps/web/src/lib/search/`  
**Effort**: 1 week

### Content Versioning
- Add draft/publish workflow
- Implement revision history
- Scheduled publishing
- Content preview URLs

**Path**: `apps/cms/src/collections/*.ts`  
**Effort**: 1-2 weeks

### Mobile App (React Native)
- Share types from `packages/shared`
- Consume Payload API
- Offline-first with local cache
- Push notifications for events

**Path**: `apps/mobile/` (new)  
**Effort**: 1-2 months

### User Contributions
- User-submitted guides
- Moderation workflow
- Reputation/badges system
- Comment system

**Path**: `apps/cms/src/collections/UserGuides.ts` (new)  
**Effort**: 2-3 weeks

### Analytics Dashboard
- Track page views, searches, popular content
- User behavior metrics
- Performance monitoring
- Custom reports

**Path**: `apps/web/src/app/admin/analytics/`  
**Effort**: 1-2 weeks

---

## Open Issues from Codebase

### From `documentation/09-ISSUES-TODOS.md`:

1. ✅ **Monolithic server.ts** → Covered in #1
2. ✅ **No automated tests** → Covered in #2
3. ✅ **Production deployment** → Covered in #3
4. ✅ **Rate limiting** → Covered in #4
5. ✅ **Logging strategy** → Covered in #5
6. ✅ **Security hardening** → Covered in #6
7. **No error boundaries** → Add to Sprint 7
8. **No database migrations** → Covered in #8
9. **Missing security headers** → Covered in #6
10. **Duplicate code in import scripts** → Address post-refactor

---

## Ownership Guide

| Team | Focus Areas |
|------|-------------|
| **Backend** | server.ts refactor, logging, rate limiting, security |
| **Frontend** | Tests (E2E), component docs, i18n UI |
| **Full-stack** | Tests (integration), search enhancements, API routes |
| **DevOps** | Deployment, CI/CD, monitoring, infrastructure |
| **Security** | Hardening, audits, CORS/CSRF, input validation |
| **Owner** | Production setup, roadmap prioritization, architecture |

---

## Sprint Planning

**Sprint 1-2 (Weeks 1-2)**: Critical items #1-3  
**Sprint 3-4 (Weeks 3-4)**: High priority items #4-6  
**Sprint 5-6 (Weeks 5-6)**: Medium priority items #7-10  
**Backlog**: Future enhancements as capacity allows

---

## Progress Tracking

Update this file quarterly. Mark completed items with ✅. Add new items from:
- GitHub Issues
- User feedback
- Performance metrics
- Security audits
