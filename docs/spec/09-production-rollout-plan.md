# Evolution Graph System — Production Rollout Plan

> Zero-downtime migration for a live system with real traffic, real data, and active editors.

---

## 0. System Inventory (Current State)

| Component | Location | What It Does |
|-----------|----------|--------------|
| `EvolutionTreeV2` | `/digimon/[slug]/page.tsx` line 261 | Inline evolution tree on profile page |
| `VisualEvolutionEditor` | `/digimon/[slug]/page.tsx` line 273 | Canvas editor for admins on profile page |
| `DigivolutionTreeButton` | `/digimon/[slug]/page.tsx` line 165 | Link to `/digimon/[slug]/digivolutions` |
| `/digivolutions` page | `/digimon/[slug]/digivolutions/page.tsx` | Full-page Cytoscape graph |
| `DigivolutionChart` | `components/DigivolutionChart.tsx` | Cytoscape renderer |
| `digivolution-editor.tsx` | `components/digimon/` | Form-based editor (v1) |
| `digivolution-editor-v2.tsx` | `components/digimon/` | Form-based editor (v2) |
| `digivolution-editor-wrapper.tsx` | `components/digimon/` | Wrapper |
| `evolution-tree.tsx` | `components/digimon/` | Old tree renderer |
| `evolution-tree-v2.tsx` | `components/digimon/` | Current tree renderer |
| `digivolution-chain.tsx` | `components/digimon/` | Chain display |
| CMS API | `GET /api/digimon/:slug/digivolution-tree` | BFS via `digivolvesFrom`/`digivolvesTo` |
| Digimon fields | `digivolutions.digivolvesFrom[]`, `.digivolvesTo[]`, `.jogress[]` | Embedded evolution data |
| `evolution-lines` collection | CMS | Visual layout storage |
| `visualEvolutionLayout` field | Digimon document | Per-Digimon layout JSON |

**Deployment**: VPS, `git pull` → `pnpm build` → `pm2 restart ecosystem.config.js`
**PM2**: Web (2 cluster instances, port 3000), CMS (1 fork, port 3001)
**ISR**: Digimon pages revalidate every 5 seconds
**Google**: Pages are indexed. `/digimon/[slug]/digivolutions` has indexed URLs.

---

## 1. Implementation Phases

### Phase 1 — Backend Foundation (no user-visible changes)

**Goal**: New collections and API exist, old system untouched.

| Step | Action | Risk | Rollback |
|------|--------|------|----------|
| 1.1 | Create `EvolutionEdges.ts` collection file | None | Delete file |
| 1.2 | Create `EvolutionGraphLayouts.ts` collection file | None | Delete file |
| 1.3 | Register both in `payload.config.ts` | CMS restart required | Remove lines, restart |
| 1.4 | Create `evolution.routes.ts` + `evolution.controller.ts` | None until registered | Delete files |
| 1.5 | Create `evolution-cache.service.ts` | None | Delete file |
| 1.6 | Register routes in `app.ts` → `registerPostInitRoutes()` | CMS restart required | Remove line, restart |
| 1.7 | Add cascading delete hook to `Digimon.ts` | Must not break existing delete flow | Remove hook |
| 1.8 | Deploy to VPS: `git pull && pnpm build && pm2 restart dmo-kb-cms` | CMS ~10s restart | Revert commit, restart |

**Verification after Phase 1**:
```bash
# On VPS:
curl https://cms.dmokb.info/api/evolution-edges?limit=1
# Should return: { "docs": [], "totalDocs": 0, ... }

curl "https://cms.dmokb.info/api/evolution-graph?digimon=agumon-classic&depth=3"
# Should return: { "success": true, "nodes": [], "edges": [] }
# (empty because no edges exist yet)

# Verify old system still works:
curl https://cms.dmokb.info/api/digimon/agumon-classic/digivolution-tree
# Should return existing tree data
```

**Downtime**: ~10 seconds during CMS restart. Web unaffected.

---

### Phase 2 — Data Migration (old data → new edges)

**Goal**: All existing evolution data replicated into `evolution-edges` collection.

| Step | Action | Risk | Rollback |
|------|--------|------|----------|
| 2.1 | Create `scripts/migrate-evolution-edges.ts` | None | Delete file |
| 2.2 | Run dry-run locally against production DB backup | None (read-only) | — |
| 2.3 | Run dry-run on VPS: `DRY_RUN=true npx ts-node scripts/migrate-evolution-edges.ts` | Read-only | — |
| 2.4 | Review dry-run output: check unresolved names, self-loops, edge count | — | — |
| 2.5 | Fix any unresolved names in CMS (manual data quality) | — | — |
| 2.6 | Run live migration on VPS: `npx ts-node scripts/migrate-evolution-edges.ts` | Creates documents | See below |
| 2.7 | Run MongoDB indexes: `mongosh < scripts/create-evolution-indexes.js` | Creates indexes | Drop indexes |

**Migration rollback** (if edges are corrupt):
```bash
# Nuclear option: drop all edges and re-run
mongosh dmo-kb-prod --eval 'db.getCollection("evolution-edges").deleteMany({})'
# Then fix the script and re-run
```

**Why migration runs AFTER deploying collections (not before)**:
The `evolution-edges` collection must exist in Payload's config before we can use `payload.create()` in the migration script. Payload validates against registered collections. Deploying the collection config (Phase 1) is a zero-risk operation — it just creates an empty collection.

**Concurrent editor safety**:
Editors may be editing Digimon `digivolvesFrom`/`digivolvesTo` during migration. This is safe because:
- Migration reads from `digivolvesFrom`/`digivolvesTo` (not modified by the migration)
- Migration writes to `evolution-edges` (new collection, no contention)
- No locks are held on Digimon documents during migration
- If an editor changes evolution data mid-migration, the change won't be reflected in edges. Solution: re-run migration after Phase 2, or manually fix.

**Verification after Phase 2**:
```bash
# Count edges created
mongosh dmo-kb-prod --eval 'db.getCollection("evolution-edges").countDocuments()'
# Expected: several hundred to low thousands

# Verify a known evolution path
curl "https://cms.dmokb.info/api/evolution-graph?digimon=agumon-classic&depth=5"
# Should return nodes + edges matching the old tree

# Compare old vs new for a sample Digimon
curl https://cms.dmokb.info/api/digimon/agumon-classic/digivolution-tree | jq '.edges | length'
curl "https://cms.dmokb.info/api/evolution-graph?digimon=agumon-classic&depth=5" | jq '.edges | length'
# Edge counts should be close (new system may have more from bidirectional discovery)
```

**Downtime**: Zero. Migration runs in background. Old system unaffected.

---

### Phase 3 — Frontend Build (feature-flagged, invisible to users)

**Goal**: New React Flow components exist in codebase, hidden behind env var.

| Step | Action | Risk | Rollback |
|------|--------|------|----------|
| 3.1 | Install deps: `pnpm add @xyflow/react @dagrejs/dagre --filter web` | Build size increase | Remove packages |
| 3.2 | Create all files in `components/evolution-graph/` | None (unused) | Delete directory |
| 3.3 | Add feature flag env var: `NEXT_PUBLIC_USE_NEW_EVOLUTION=false` | None | — |
| 3.4 | Modify `/digimon/[slug]/page.tsx` to conditionally render old vs new | See below | Revert file |
| 3.5 | Deploy to VPS with flag OFF | No user-visible change | Revert commit |

**Feature flag implementation** (no library needed):

```tsx
// In /digimon/[slug]/page.tsx

const USE_NEW_EVOLUTION = process.env.NEXT_PUBLIC_USE_NEW_EVOLUTION === 'true';

// Replace the EvolutionTree + VisualEvolutionEditor section:
{USE_NEW_EVOLUTION ? (
  <EvolutionGraph
    mode={isEditor ? 'edit' : 'view'}
    digimonSlug={d.slug}
    depth={5}
    height={500}
    userRole={session?.user?.role}
  />
) : (
  <>
    <EvolutionTree
      currentDigimon={{ name: d.name, slug: d.slug, icon: iconUrl, rank: d.rank }}
      digivolvesFrom={d.digivolutions?.digivolvesFrom || []}
      digivolvesTo={d.digivolutions?.digivolvesTo || []}
    />
    <VisualEvolutionEditor
      digimonId={d.id}
      digimonName={d.name}
      digimonSlug={d.slug}
      userRole={session?.user?.role}
    />
  </>
)}
```

**Hydration mismatch prevention**:
The flag uses `NEXT_PUBLIC_*` which is baked into the Next.js build at compile time. It is NOT a runtime toggle. Both server and client render the same branch. No hydration mismatch possible because:
- Server renders with the build-time value of `NEXT_PUBLIC_USE_NEW_EVOLUTION`
- Client hydrates with the same build-time value
- Switching the flag requires `pnpm build` → new build artifact → PM2 restart

**Why not a runtime flag**: Runtime flags (e.g., from DB or cookie) would cause hydration mismatch because the server might render one branch while the client renders another. Build-time flags eliminate this entirely.

**Downtime**: ~30s during `pm2 restart` for web (PM2 cluster mode does rolling restart).

---

### Phase 4 — Internal Testing (flag ON for staging, OFF for production)

**Goal**: Validate new system with real data before public rollout.

| Step | Action |
|------|--------|
| 4.1 | On VPS, set `NEXT_PUBLIC_USE_NEW_EVOLUTION=true` in `.env` |
| 4.2 | Rebuild web ONLY: `cd apps/web && pnpm build` |
| 4.3 | Restart web ONLY: `pm2 restart dmo-kb-web` |
| 4.4 | Browse site — all Digimon pages now show React Flow graph |
| 4.5 | Run validation checklist (§5 below) |
| 4.6 | If issues found: set flag to `false`, rebuild, restart (instant rollback) |

**Alternative**: If you want to test without affecting all users, create a separate test route:

```
/digimon/[slug]/evolution-preview  ← temporary, only you access it
```

But given the site traffic level, the build-time flag approach is simpler.

**Downtime**: ~30s rolling restart for web.

---

### Phase 5 — Public Rollout (flag stays ON)

**Goal**: New system serves all traffic.

| Step | Action | Risk | Rollback |
|------|--------|------|----------|
| 5.1 | Keep `NEXT_PUBLIC_USE_NEW_EVOLUTION=true` | — | Set false, rebuild |
| 5.2 | Monitor for 48 hours (§7 below) | — | — |
| 5.3 | Add 301 redirect for `/digimon/[slug]/digivolutions` (§8 below) | SEO | Remove redirect |

**The `/digivolutions` redirect** — replace the page with a redirect, NOT a delete:

```tsx
// apps/web/src/app/digimon/[slug]/digivolutions/page.tsx
// REPLACE entire file with:
import { redirect } from 'next/navigation';

export default function DigivolutionsRedirect({ params }: { params: { slug: string } }) {
  redirect(`/digimon/${params.slug}`);
}
```

This sends a 308 (permanent redirect) by default in Next.js `redirect()`. Google will transfer SEO equity from the old URL to the new one.

**Downtime**: Zero (already running).

---

### Phase 6 — Dual-Write Period (2 weeks)

**Goal**: Keep old data fields updated alongside new edges as safety net.

**Should we dual-write?** No. Here's why:

- The old `digivolvesFrom`/`digivolvesTo` fields are text-based (Digimon names as strings)
- The new `evolution-edges` collection uses ObjectId relationships
- Keeping both in sync adds complexity and bug surface
- Instead: keep old fields **read-only but intact** for 2 weeks as a rollback safety net

**Prevent editors from modifying old fields during this period**:

```ts
// In Digimon.ts, add to the digivolvesFrom and digivolvesTo array configs:
admin: {
  readOnly: true,
  description: '⚠️ FROZEN — Evolution data has moved to the Evolution Edges system. Do not edit.',
},
```

This makes the fields visible but non-editable in the CMS admin UI. The data remains in MongoDB untouched.

---

### Phase 7 — Cleanup (after 2+ weeks of stable operation)

**Goal**: Remove all old evolution code.

| Step | Action | Verify Before |
|------|--------|---------------|
| 7.1 | Delete `DigivolutionChart.tsx` | No imports remain |
| 7.2 | Delete `evolution-tree.tsx` | No imports remain |
| 7.3 | Delete `evolution-tree-v2.tsx` | No imports remain |
| 7.4 | Delete `digivolution-editor.tsx` | No imports remain |
| 7.5 | Delete `digivolution-editor-v2.tsx` | No imports remain |
| 7.6 | Delete `digivolution-editor-wrapper.tsx` | No imports remain |
| 7.7 | Delete `visual-evolution-editor.tsx` | No imports remain |
| 7.8 | Delete `digivolution-chain.tsx` | No imports remain |
| 7.9 | Delete `digivolution-tree-button.tsx` | No imports remain |
| 7.10 | Delete `/digimon/[slug]/digivolutions/` directory (redirect was in Phase 5) | — |
| 7.11 | Remove feature flag check from `page.tsx` (keep new code only) | — |
| 7.12 | Remove `NEXT_PUBLIC_USE_NEW_EVOLUTION` from `.env` | — |
| 7.13 | Remove `cytoscape` and `cytoscape-dagre` from web `package.json` | No other usage |
| 7.14 | Remove old `digivolvesFrom`/`digivolvesTo`/`jogress` fields from Digimon collection | Backup first |
| 7.15 | Remove `visualEvolutionLayout` field from Digimon collection | — |
| 7.16 | Remove `evolution-lines` collection (replaced by `evolution-graph-layouts`) | — |
| 7.17 | Remove old `getDigivolutionTree` from `digimon.controller.ts` | — |
| 7.18 | Remove old route from `digimon.routes.ts` | — |
| 7.19 | Deploy and verify | — |

**Step 7.14 is high-risk**. Before removing old fields:
```bash
# Export old evolution data as backup
mongosh dmo-kb-prod --eval '
  const docs = db.digimon.find({}, { name: 1, slug: 1, "digivolutions": 1, "visualEvolutionLayout": 1 }).toArray();
  printjson(docs);
' > /root/backups/evolution-data-backup-$(date +%Y%m%d).json
```

---

## 2. Branching Strategy

```
main ──────────────────────────────────────────────────────►
  │
  └── feat/evolution-graph ─────────────────────────────────►
        │
        ├── Phase 1 commits (collections, routes, controller)
        │     → PR #1: "Backend: evolution-edges + graph API"
        │     → Merge to main, deploy CMS
        │
        ├── Phase 2 commits (migration script, indexes)
        │     → PR #2: "Migration: evolution edges data"
        │     → Merge to main, run on VPS
        │
        ├── Phase 3 commits (React Flow components, feature flag)
        │     → PR #3: "Frontend: React Flow evolution graph"
        │     → Merge to main, deploy with flag OFF
        │
        ├── Phase 5 commits (redirect)
        │     → PR #4: "Redirect /digivolutions → profile"
        │     → Merge to main
        │
        └── Phase 7 commits (cleanup)
              → PR #5: "Cleanup: remove old evolution system"
              → Merge to main
```

**Rules**:
- Feature branch `feat/evolution-graph` is long-lived
- Each phase is a separate PR for reviewability
- Never merge cleanup (Phase 7) until Phase 5 has been stable for 2+ weeks
- Main always deploys — no other feature work should touch evolution files during rollout

---

## 3. Feature Flag Strategy

| Flag | Type | Scope | Default |
|------|------|-------|---------|
| `NEXT_PUBLIC_USE_NEW_EVOLUTION` | Build-time env var | Web app only | `false` |

**Lifecycle**:
1. Created in Phase 3 (set to `false`)
2. Flipped to `true` in Phase 4 (testing) or Phase 5 (public)
3. Removed in Phase 7 (cleanup)

**Switching procedure**:
```bash
# On VPS:
cd /root/dmo-kb
nano .env  # Change NEXT_PUBLIC_USE_NEW_EVOLUTION=true (or false)
cd apps/web && pnpm build
pm2 restart dmo-kb-web
```

**Time to switch**: ~2-3 minutes (build + restart).
**Time to rollback**: Same ~2-3 minutes.

**No dual-rendering**: At any given moment, ALL users see either old or new. There is no per-user rollout. This is intentional — the site doesn't have enough traffic to warrant canary deployments, and it avoids hydration mismatches entirely.

---

## 4. Data Migration Execution Plan

### Pre-migration checklist

- [ ] Phase 1 deployed (collections exist in CMS)
- [ ] MongoDB backup taken: `mongodump --db dmo-kb-prod --out /root/backups/pre-migration-$(date +%Y%m%d)`
- [ ] Dry-run executed and output reviewed
- [ ] Unresolved name count is acceptable (<5% of total edges)
- [ ] No active CMS bulk operations in progress
- [ ] `evolution-edges` collection is empty (fresh start)

### Execution

```bash
# On VPS, in project root:

# 1. Take backup
mongodump --db dmo-kb-prod --out /root/backups/pre-migration-$(date +%Y%m%d)

# 2. Dry run
cd /root/dmo-kb
DRY_RUN=true npx ts-node scripts/migrate-evolution-edges.ts 2>&1 | tee /tmp/migration-dry-run.log

# 3. Review output
cat /tmp/migration-dry-run.log
# Check: edgesCreated, unresolvedNames, errors

# 4. Live run
npx ts-node scripts/migrate-evolution-edges.ts 2>&1 | tee /tmp/migration-live.log

# 5. Create indexes
mongosh dmo-kb-prod < scripts/create-evolution-indexes.js

# 6. Verify
mongosh dmo-kb-prod --eval 'db.getCollection("evolution-edges").countDocuments()'
curl "https://cms.dmokb.info/api/evolution-graph?digimon=agumon-classic&depth=5" | jq '.nodes | length'
```

### Post-migration validation

```bash
# Sample 10 random Digimon and compare old vs new edge counts
for slug in agumon-classic gabumon-classic greymon wargreymon omnimon metalgarurumon gatomon angewomon veemon flamedramon; do
  OLD=$(curl -s "https://cms.dmokb.info/api/digimon/$slug/digivolution-tree" | jq '.edges | length')
  NEW=$(curl -s "https://cms.dmokb.info/api/evolution-graph?digimon=$slug&depth=5" | jq '.edges | length')
  echo "$slug: old=$OLD new=$NEW"
done
```

### If migration produces corrupt data

```bash
# Option A: Drop all edges and re-run
mongosh dmo-kb-prod --eval 'db.getCollection("evolution-edges").deleteMany({})'
# Fix script, re-run

# Option B: Drop specific bad edges
mongosh dmo-kb-prod --eval 'db.getCollection("evolution-edges").deleteMany({ evolutionType: "jogress", jogressPartner: null })'
```

**Partial graph corruption handling**: If only some edges are wrong, the old system is still fully operational. Fix the edges manually in CMS admin (`/admin/collections/evolution-edges`) or via script. The new frontend is behind a feature flag — users never see corrupt data until you flip the flag.

---

## 5. Validation Checklist (Before Flipping Flag)

### Data integrity

- [ ] Total edge count is reasonable (compare to sum of all `digivolvesTo` arrays)
- [ ] No self-loop edges exist: `db.getCollection("evolution-edges").find({ $expr: { $eq: ["$source", "$target"] } }).count()` = 0
- [ ] No orphan edges (source/target pointing to deleted Digimon)
- [ ] Compound unique index exists: `db.getCollection("evolution-edges").getIndexes()`
- [ ] Sample 20 Digimon: new graph contains all expected evolutions

### API health

- [ ] `GET /api/evolution-graph?digimon=agumon-classic&depth=5` returns 200 with nodes+edges
- [ ] `GET /api/evolution-graph?digimon=nonexistent` returns 404
- [ ] `GET /api/evolution-graph?depth=999` is clamped to MAX_DEPTH (10)
- [ ] Response time < 500ms for depth=5
- [ ] `Cache-Control` header present on response
- [ ] Old API still works: `GET /api/digimon/agumon-classic/digivolution-tree` returns 200

### Frontend rendering

- [ ] Graph renders on desktop Chrome, Firefox, Safari
- [ ] Graph renders on mobile (iOS Safari, Android Chrome)
- [ ] Node click navigates to correct Digimon profile
- [ ] Graph shows loading state, then renders
- [ ] Empty evolution data shows fallback message (not blank/error)
- [ ] No horizontal scrollbar on the page (containment working)
- [ ] No console errors related to hydration mismatch
- [ ] No console errors related to React Flow

### Editor functionality (admin-only)

- [ ] Graph editor appears for editor/admin/owner roles
- [ ] Graph editor hidden for regular users
- [ ] Can drag nodes
- [ ] Can create new edge by dragging handle to handle
- [ ] Edge edit modal opens on edge click
- [ ] Save button persists layout to server
- [ ] Auto-layout button arranges nodes

### SEO

- [ ] `/digimon/[slug]` page still returns 200 with evolution content
- [ ] Page source (View Source) contains evolution-related text (for crawlers)
- [ ] No `noindex` accidentally added

---

## 6. Rollback Plan

### Level 1: Frontend rollback (< 3 min)

**Trigger**: UI broken, graph doesn't render, hydration errors.

```bash
# On VPS:
cd /root/dmo-kb
sed -i 's/NEXT_PUBLIC_USE_NEW_EVOLUTION=true/NEXT_PUBLIC_USE_NEW_EVOLUTION=false/' .env
cd apps/web && pnpm build
pm2 restart dmo-kb-web
```

Old evolution components render. Old API still works. Zero data loss.

### Level 2: API rollback (< 1 min)

**Trigger**: New API returns errors, crashes CMS.

```bash
# On VPS:
# Revert to previous commit that didn't have evolution routes
git stash  # or git revert <commit>
cd apps/cms && pnpm build
pm2 restart dmo-kb-cms
```

### Level 3: Data rollback (< 5 min)

**Trigger**: Edge data is corrupt and affecting old system (shouldn't happen since they're separate collections).

```bash
# Drop all new data
mongosh dmo-kb-prod --eval '
  db.getCollection("evolution-edges").deleteMany({});
  db.getCollection("evolution-graph-layouts").deleteMany({});
'
```

### Level 4: Full rollback (< 10 min)

**Trigger**: Everything is broken.

```bash
# Restore MongoDB from backup
mongorestore --db dmo-kb-prod --drop /root/backups/pre-migration-YYYYMMDD/dmo-kb-prod/

# Revert git to last known good
git log --oneline -5  # find last good commit
git reset --hard <good-commit>
pnpm build
pm2 restart ecosystem.config.js
```

---

## 7. Monitoring Strategy

### During rollout (first 48 hours)

| Metric | How to Check | Alert Threshold |
|--------|-------------|-----------------|
| CMS process health | `pm2 status` | Restart count > 2 |
| Web process health | `pm2 status` | Restart count > 2 |
| CMS error log | `pm2 logs dmo-kb-cms --err --lines 50` | Any `evolution` errors |
| Web error log | `pm2 logs dmo-kb-web --err --lines 50` | Any `@xyflow` or `evolution-graph` errors |
| API response time | `time curl -s "https://cms.dmokb.info/api/evolution-graph?digimon=agumon-classic&depth=5" > /dev/null` | > 2 seconds |
| Memory usage | `pm2 monit` | CMS > 800MB (max is 1G) |
| MongoDB connections | `mongosh --eval 'db.serverStatus().connections'` | current > 50 |
| Cache hit rate | Check `X-Cache` header on API responses | HIT rate < 50% after warmup |
| 404 rate on `/digivolutions` | Nginx access log: `grep "digivolutions" /var/log/nginx/access.log \| grep 308` | 308s should appear (redirect working) |

### Success metrics (after 1 week)

| Metric | Target | Indicates |
|--------|--------|-----------|
| Zero CMS crashes related to evolution | Stability | Backend is solid |
| API p95 < 300ms | Performance | BFS + caching working |
| No Google Search Console coverage drops | SEO | Redirect working |
| No user-reported broken evolutions | Correctness | Data migration was complete |
| Editor successfully saves graph layouts | Editor UX | Persistence working |
| Old `/digivolutions` URLs returning 308 | SEO | Redirect in place |

### Google Search Console checks

After Phase 5 deployment:
- Check **Coverage** report for new 404s on `/digivolutions` URLs
- Check **Core Web Vitals** for Digimon pages (LCP, CLS changes)
- Check **URL Inspection** for a sample Digimon page

---

## 8. SEO Protection Strategy

### URLs affected

| Old URL | Action | HTTP Code |
|---------|--------|-----------|
| `/digimon/[slug]` | **Kept** — same URL, new content | 200 (unchanged) |
| `/digimon/[slug]/digivolutions` | **Redirect** to `/digimon/[slug]` | 308 Permanent |

### Implementation

**Phase 5**: Replace `/digimon/[slug]/digivolutions/page.tsx` with redirect:

```tsx
import { redirect } from 'next/navigation';

export default function DigivolutionsRedirect({ params }: { params: { slug: string } }) {
  redirect(`/digimon/${params.slug}`);
}
```

Next.js `redirect()` sends **308 Permanent Redirect** by default. This tells Google:
- The old URL is permanently moved
- Transfer all ranking signals to the new URL
- Stop crawling the old URL

**Why 308 and not 301**: 308 preserves the HTTP method (GET→GET). 301 technically allows method change (GET→POST). For this case both work identically, but 308 is the modern correct choice.

### Sitemap

If you have a sitemap, remove `/digimon/[slug]/digivolutions` entries after Phase 5. The evolution data is now inline on `/digimon/[slug]`, which is already in the sitemap.

### Google transition timeline

- **Week 1**: Google starts seeing 308s on old URLs. Some cached versions still appear.
- **Week 2-4**: Google processes redirects, updates index.
- **Month 2+**: Old URLs fully de-indexed, equity transferred.

Do NOT delete the redirect page until Google Search Console shows zero impressions for `/digivolutions` URLs (typically 3+ months).

---

## 9. Cache Invalidation Strategy

### Layer 1: CMS In-Memory Cache

```
Location: evolution-cache.service.ts on CMS Express server
TTL: 5 minutes
Invalidation: Automatic on any evolution-edge create/update/delete (via afterChange hook)
```

PM2 restart also clears this cache (process memory reset).

### Layer 2: HTTP Cache Headers

```
Cache-Control: public, s-maxage=300, stale-while-revalidate=600
```

- Nginx (if configured as reverse proxy cache): caches for 5 min
- CDN (if added later): caches for 5 min
- Stale responses served for up to 10 min while background revalidation happens

**Force purge** (if Nginx caches):
```bash
# Restart Nginx to clear proxy cache
sudo systemctl restart nginx
```

### Layer 3: Redis (Web App)

```
Location: apps/web/src/lib/evolution-cache.ts (new file)
TTL: 5 minutes
Invalidation: TTL-based expiry. Manual purge:
```

```bash
# On VPS:
redis-cli KEYS "evo-graph:*" | xargs redis-cli DEL
```

### Layer 4: Next.js ISR

Current Digimon pages use `revalidate: 5` (5-second ISR). This means:
- First request after 5s triggers background revalidation
- Users see stale page for up to 5s
- No action needed — ISR handles itself

**After deploying new frontend**: The 5-second revalidation means users will see the new React Flow graph within 5 seconds of deployment. No explicit cache purge needed for ISR.

### Layer 5: Browser Cache

No `max-age` is set on API responses, so browsers don't cache. Each page load fetches fresh data (from ISR or API). No browser cache to invalidate.

### Cache invalidation during migration

Migration creates many edges. The CMS in-memory cache `afterChange` hook fires for each edge, calling `invalidateAll()` repeatedly. This is harmless — it just clears the Map. After migration completes, the first API request will populate the cache with the full graph.

---

## 10. Cleanup Phase

### Prerequisites (all must be true)

- [ ] Phase 5 has been stable for ≥14 days
- [ ] Zero CMS crashes related to evolution in the last 7 days
- [ ] Google Search Console shows no coverage issues
- [ ] At least 3 editors have successfully used the new graph editor
- [ ] MongoDB backup taken immediately before cleanup

### Cleanup execution order

```bash
# 1. Backup
mongodump --db dmo-kb-prod --out /root/backups/pre-cleanup-$(date +%Y%m%d)

# 2. Export old evolution data (belt and suspenders)
mongosh dmo-kb-prod --eval '
  const cursor = db.digimon.find({}, { name:1, slug:1, digivolutions:1 });
  while (cursor.hasNext()) { printjson(cursor.next()); }
' > /root/backups/old-evolution-fields-$(date +%Y%m%d).json

# 3. Deploy cleanup commit (removes old files + fields)
git pull origin main
pnpm build
pm2 restart ecosystem.config.js

# 4. After confirming stable, remove old fields from MongoDB
# (Payload won't touch fields not in the schema, but they waste space)
mongosh dmo-kb-prod --eval '
  db.digimon.updateMany({}, {
    $unset: {
      "digivolutions": "",
      "visualEvolutionLayout": "",
      "evolutionLine": ""
    }
  })
'

# 5. Drop old evolution-lines collection
mongosh dmo-kb-prod --eval 'db.getCollection("evolution-lines").drop()'

# 6. Remove cytoscape packages
pnpm remove cytoscape cytoscape-dagre --filter web
pnpm build
pm2 restart dmo-kb-web
```

### Do NOT delete during cleanup

- The `/digimon/[slug]/digivolutions/page.tsx` redirect file — keep for 3+ months for SEO
- The `evolution-edges` collection obviously
- Any MongoDB backups

---

## Answers to Specific Questions

### Should migration run before or after deploying new collections?
**After.** The migration script uses `payload.create({ collection: 'evolution-edges' })` which requires the collection to be registered in Payload's config. Phase 1 deploys empty collections. Phase 2 runs migration.

### Should we dual-write to both systems temporarily?
**No.** Dual-write adds complexity. Instead, keep old fields frozen (read-only in CMS admin) as a rollback safety net for 2 weeks. Old system continues to read from old fields. New system reads from edges.

### How to prevent editors from modifying old fields during migration?
Set `admin.readOnly: true` on `digivolvesFrom`, `digivolvesTo`, and `jogress` fields in `Digimon.ts` during Phase 5. Add a description: "⚠️ FROZEN — use Evolution Graph editor instead."

### How to handle partial graph corruption?
The old system runs in parallel until Phase 7 cleanup. If new edges are corrupt, flip the feature flag to `false` (Level 1 rollback, < 3 min). Fix edges via CMS admin or script. Flip flag back.

### How to safely delete /digimon/[slug]/digivolutions?
Replace the page component with `redirect('/digimon/${params.slug}')` in Phase 5. This returns 308 Permanent Redirect. Google transfers SEO equity. Keep the redirect file for 3+ months. Delete in a future cleanup.

### How to prevent React hydration mismatch during feature flag rollout?
Use `NEXT_PUBLIC_*` env var (build-time constant). Both server and client evaluate the same value. No runtime branching. No mismatch possible.

### What metrics indicate rollout success?
- Zero CMS crashes for 48h
- API p95 < 300ms
- No Google Search Console coverage drops
- No user-reported missing evolutions
- Editors can save graph layouts
- Old `/digivolutions` URLs return 308

---

## Timeline Estimate

| Phase | Duration | Cumulative |
|-------|----------|------------|
| Phase 1: Backend | 1 day | Day 1 |
| Phase 2: Migration | 1 day | Day 2 |
| Phase 3: Frontend | 2-3 days | Day 4-5 |
| Phase 4: Testing | 1 day | Day 5-6 |
| Phase 5: Public rollout | 1 day | Day 6-7 |
| Phase 6: Dual period | 14 days | Day 21 |
| Phase 7: Cleanup | 1 day | Day 22 |

**Total: ~3 weeks** from first commit to full cleanup.
