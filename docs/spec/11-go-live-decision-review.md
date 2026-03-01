# Go-Live Decision Review — Evolution Graph System

> Final production readiness evaluation before enabling `NEXT_PUBLIC_USE_NEW_EVOLUTION=true`.
> Date: Pre-launch
> Reviewer role: CTO
> Decision authority: GO / HOLD / NO-GO

---

## 1. Executive Risk Summary

| Risk Area | Rating | Rationale |
|-----------|--------|-----------|
| **Data integrity** | **MEDIUM** | Migration completed. Compound unique index in place. Self-loop validator active. Risk: ~5-10% of edges may have null metadata where old system had level/item data. Not user-facing-critical (graph still shows the connection, just missing the label). |
| **API stability** | **MEDIUM** | BFS with batched `$in` queries is sound. Request coalescing prevents stampede. Single CMS instance is the bottleneck. A depth=10 request on a highly-connected Digimon could block for 2-3s. Acceptable with the 5s timeout guard. |
| **Frontend rendering** | **LOW-MEDIUM** | React Flow v12 is mature. Error boundary catches crashes. CSS containment prevents overflow. Mobile Safari touch handling is the remaining unknown — must be manually verified. |
| **SEO impact** | **LOW** | Main URL `/digimon/[slug]` unchanged. Evolution content moves from a child page to inline. 308 redirect preserves equity. Risk is limited to Google interpreting inline graph as "less content" than the old full-page chart. Monitored via Search Console. |
| **Operational** | **LOW** | Feature flag rollback is < 3 minutes. Old API remains active. MongoDB backup exists. Redis failure is already graceful. PM2 auto-restarts on crash. |
| **Security** | **LOW** | `conditions` field validated (size, depth, prototype keys). Batch endpoints auth-gated. Self-loop blocked at validation + DB level. Rate limit on graph endpoint. |

**Overall risk: MEDIUM. Acceptable for launch with monitoring.**

---

## 2. Mandatory Pre-Go-Live Checklist

Every item must be verified TRUE. Any FALSE is a hard NO-GO.

### Infrastructure

| # | Check | Command / Method | Expected |
|---|-------|-----------------|----------|
| 1 | MongoDB backup exists from today | `ls -la /root/backups/pre-migration-*` | File exists, < 24h old |
| 2 | `evolution-edges` collection has documents | `mongosh dmo-kb-prod --eval 'db["evolution-edges"].countDocuments()'` | > 100 |
| 3 | Compound unique index exists | `mongosh dmo-kb-prod --eval 'db["evolution-edges"].getIndexes()'` | `ux_source_target_type` present |
| 4 | Self-loop count = 0 | `mongosh dmo-kb-prod --eval 'db["evolution-edges"].countDocuments({$expr:{$eq:["$source","$target"]}})'` | 0 |
| 5 | CMS process stable | `pm2 show dmo-kb-cms \| grep restarts` | 0 restarts in last 1h |
| 6 | Web process stable | `pm2 show dmo-kb-web \| grep restarts` | 0 restarts in last 1h |
| 7 | VPS memory headroom | `free -m \| grep Mem` | Available > 500MB |
| 8 | Redis responding | `redis-cli PING` | PONG |
| 9 | Old API still works | `curl -s https://cms.dmokb.info/api/digimon/agumon-classic/digivolution-tree \| jq '.success'` | `true` |

### New System API

| # | Check | Command | Expected |
|---|-------|---------|----------|
| 10 | Graph endpoint returns data | `curl -s "https://cms.dmokb.info/api/evolution-graph?digimon=agumon-classic&depth=5" \| jq '.success'` | `true` |
| 11 | Response time acceptable | `time curl -s -o /dev/null "https://cms.dmokb.info/api/evolution-graph?digimon=agumon-classic&depth=5"` | < 1s |
| 12 | Deep traversal bounded | `curl -s "https://cms.dmokb.info/api/evolution-graph?digimon=agumon-classic&depth=10" \| jq '.nodes \| length'` | ≤ 500 |
| 13 | Missing param handled | `curl -s "https://cms.dmokb.info/api/evolution-graph" \| jq '.error'` | Non-null error string |
| 14 | Nonexistent Digimon handled | `curl -s "https://cms.dmokb.info/api/evolution-graph?digimon=zzz" \| jq '.error'` | 404 response |
| 15 | Cache header present | `curl -sI "https://cms.dmokb.info/api/evolution-graph?digimon=agumon-classic&depth=5" \| grep Cache-Control` | Header present |

### Frontend (Manual Verification)

| # | Check | Method | Expected |
|---|-------|--------|----------|
| 16 | Graph renders on desktop Chrome | Browse `/digimon/agumon-classic` with flag ON | Graph visible with nodes + edges |
| 17 | Graph renders on mobile (any device) | Browse same page on phone | Graph visible, page scrollable past graph |
| 18 | Node click navigates | Click a node in the graph | Navigates to that Digimon's page |
| 19 | Empty evolution Digimon shows fallback | Browse a Digimon with no edges | "No evolution data" message, no error |
| 20 | Error boundary works | Temporarily break graph data, reload | Graceful error message, not white screen |
| 21 | No horizontal scrollbar | Check Digimon page with graph | No body-level horizontal scroll |
| 22 | Editor UI visible for admin | Log in as admin, browse Digimon page | Graph editor panel appears |
| 23 | Editor UI hidden for anonymous | Browse in incognito | No editor panel |

### Rollback Verification

| # | Check | Method | Expected |
|---|-------|--------|----------|
| 24 | Flag rollback tested today | Set `false`, rebuild, restart, verify old UI | Old evolution tree renders |
| 25 | Flag re-enable tested | Set `true`, rebuild, restart | New graph renders |
| 26 | Rollback time measured | Time the full procedure | < 5 minutes |

**Total: 26 checks. All must pass.**

---

## 3. Soft Readiness Indicators (Confidence Boosters)

These are NOT blockers but increase confidence:

| Indicator | Status | Notes |
|-----------|--------|-------|
| Migration validation script run, <5% missing metadata | ○ | Run `scripts/validate-migration.ts` |
| 10+ popular Digimon spot-checked visually | ○ | Compare graph against known evolution paths |
| Auto-layout produces readable results for 5 different Digimon | ○ | Dagre should handle linear + branching trees |
| Editor successfully saved a layout | ○ | Persist + reload shows saved positions |
| Concurrent request test (20 simultaneous) all return 200 | ○ | See Appendix A stress test in hardening review |
| CMS memory stays < 500MB after 50 graph requests | ○ | Check via metrics endpoint |
| React Flow memory stable after 20 page navigations | ○ | Browser DevTools Memory tab |
| Old `/digivolutions` page still accessible (pre-redirect) | ○ | Fallback during dual period |

If ≥6 of 8 pass: HIGH confidence.
If 4-5 pass: ACCEPTABLE confidence.
If <4 pass: HOLD — investigate before proceeding.

---

## 4. 24-Hour Monitoring Plan

### Hour 0-1: Critical Watch

Monitor continuously. One person on standby with VPS SSH access.

| Metric | Check Method | Frequency | Alert Threshold |
|--------|-------------|-----------|-----------------|
| CMS process alive | `pm2 status` | Every 5 min | Status ≠ `online` |
| CMS restart count | `pm2 show dmo-kb-cms` | Every 5 min | Restarts > 0 |
| CMS memory | `curl -s https://cms.dmokb.info/api/internal/metrics \| jq '.system.processMemMB'` | Every 5 min | > 700MB |
| API response time | `time curl -s -o /dev/null "https://cms.dmokb.info/api/evolution-graph?digimon=agumon-classic&depth=5"` | Every 10 min | > 3s |
| HTTP error rate | `pm2 logs dmo-kb-cms --err --lines 20` | Every 10 min | Any `evolution-graph` errors |
| Web error log | `pm2 logs dmo-kb-web --err --lines 20` | Every 10 min | Any `@xyflow` or `react-flow` errors |

### Hour 1-6: Active Monitoring

| Metric | Check Method | Frequency | Alert Threshold |
|--------|-------------|-----------|-----------------|
| All above | Same | Every 15 min | Same |
| Cache hit ratio | Check `X-Cache` headers on 5 requests | Once per hour | HIT ratio < 50% |
| MongoDB connections | `mongosh --eval 'db.serverStatus().connections.current'` | Every 30 min | > 30 |
| Nginx 5xx errors | `grep " 5[0-9][0-9] " /var/log/nginx/access.log \| tail -20` | Every 30 min | Any 5xx on `/digimon/` paths |

### Hour 6-24: Passive Monitoring

| Metric | Check Method | Frequency | Alert Threshold |
|--------|-------------|-----------|-----------------|
| CMS restarts | `pm2 show dmo-kb-cms` | Every 2 hours | Restarts > 0 since launch |
| VPS memory | `free -m` | Every 2 hours | Available < 300MB |
| User complaints | Check Discord / feedback channels | Continuously | Any "evolution tree broken" report |

### Day 1 End-of-Day Report

At the 24h mark, compile:

```
Evolution Graph — Day 1 Report
─────────────────────────────
CMS restarts:          [number]
Peak memory (CMS):     [MB]
Peak API latency:      [ms]
Total graph API calls: [approximate from logs]
5xx errors:            [count]
User complaints:       [count]
Cache hit ratio:       [%]
Decision:              CONTINUE / INVESTIGATE / ROLLBACK
```

---

## 5. Rollback Trigger Conditions (Quantified)

### Immediate Rollback (within minutes)

| Trigger | Threshold | Action |
|---------|-----------|--------|
| CMS crash loop | ≥3 restarts in 10 minutes | Rollback flag immediately |
| API returns 500 consistently | 5 consecutive 500 responses on graph endpoint | Rollback flag |
| White-screen on Digimon pages | Any user-reported or self-observed | Rollback flag |
| Horizontal scrollbar regression | Observed on any Digimon page | Rollback flag |

### Urgent Rollback (within 1 hour)

| Trigger | Threshold | Action |
|---------|-----------|--------|
| CMS memory > 900MB | Sustained for > 10 minutes | Rollback flag, investigate leak |
| API response time > 5s | Average over 10 requests | Rollback flag, investigate query |
| MongoDB connections > 50 | Sustained | Rollback flag, check connection leaks |
| Multiple user reports of missing evolutions | ≥3 independent reports | Rollback flag, audit edge data |

### Deferred Investigation (no rollback, but investigate)

| Signal | Threshold | Action |
|--------|-----------|--------|
| API response time 2-5s | Occasional spikes | Monitor, consider reducing MAX_DEPTH |
| Cache hit ratio < 30% | After 1 hour | Check cache invalidation logic |
| Google Search Console shows new 404s | Any `/digimon/` 404s not present before | Check redirect configuration |
| Single user report of visual glitch | 1 report | Investigate browser-specific issue |

---

## 6. Emergency Rollback Procedure

### Step-by-Step (Target: < 3 minutes)

```bash
# ── STEP 1: Disable feature flag (30 seconds) ──────────────
ssh root@212.227.103.86
cd /root/dmo-kb

# Edit .env — change true to false
sed -i 's/NEXT_PUBLIC_USE_NEW_EVOLUTION=true/NEXT_PUBLIC_USE_NEW_EVOLUTION=false/' .env

# Verify the change
grep "NEXT_PUBLIC_USE_NEW_EVOLUTION" .env
# Expected: NEXT_PUBLIC_USE_NEW_EVOLUTION=false

# ── STEP 2: Rebuild web app (90-120 seconds) ───────────────
cd apps/web
pnpm build
# Wait for build to complete. Do NOT interrupt.

# ── STEP 3: Restart web (10 seconds) ───────────────────────
pm2 restart dmo-kb-web

# ── STEP 4: Verify rollback (30 seconds) ───────────────────
# Open browser: https://dmokb.info/digimon/agumon-classic
# Verify: Old EvolutionTreeV2 component renders (not React Flow)
# Verify: No console errors
# Verify: No horizontal scrollbar

# ── STEP 5: Confirm CMS unaffected ─────────────────────────
curl -s "https://cms.dmokb.info/api/digimon/agumon-classic/digivolution-tree" | head -c 100
# Expected: JSON with success:true (old API still works)

# ── STEP 6: Communicate ────────────────────────────────────
# Post in team channel: "Evolution Graph rolled back. Old system restored. Investigating."
```

### If Rollback Itself Fails

```bash
# If pnpm build fails:
git stash                    # Stash any local changes
git checkout main            # Ensure clean main
pnpm install                 # Reinstall deps
cd apps/web && pnpm build    # Retry build
pm2 restart dmo-kb-web

# If PM2 restart fails:
pm2 delete dmo-kb-web
pm2 start ecosystem.config.js --only dmo-kb-web

# If everything is broken:
# Full system restore
pm2 delete all
git pull origin main
pnpm install
pnpm build
pm2 start ecosystem.config.js
```

### If Data Rollback Needed (Edge Data Corrupt)

```bash
# This does NOT require feature flag rollback.
# New edge data is in a separate collection.
# The old system reads from Digimon documents, which are untouched.

# To wipe and redo edges:
mongosh dmo-kb-prod --eval 'db["evolution-edges"].deleteMany({})'
mongosh dmo-kb-prod --eval 'db["evolution-graph-layouts"].deleteMany({})'
# Then re-run migration after fixing the issue.
```

---

## 7. Decision Matrix

### Conditions for GO

ALL of the following must be true:

| Condition | Verified? |
|-----------|-----------|
| All 26 mandatory checklist items pass | ○ |
| P0 hardening items implemented (error boundary, request coalescing, conditions validation, index-before-migration) | ○ |
| Feature flag rollback tested and confirmed < 5 min | ○ |
| MongoDB backup from today exists on VPS | ○ |
| One person available for 1-hour standby after flip | ○ |
| No active CMS deployments or migrations in progress | ○ |

**If all TRUE → GO.**

### Conditions for HOLD

Any of the following:

| Condition | Action |
|-----------|--------|
| 1-3 mandatory checklist items fail on non-critical checks | Fix and re-verify. Launch when all pass. |
| Soft indicators < 4 of 8 | Investigate, fix, re-test. Launch when ≥ 4 pass. |
| Mobile Safari touch issue confirmed | Fix CSS, rebuild, re-test. Launch when resolved. |
| CMS memory > 600MB at idle (before launch) | Investigate leak, fix, restart, monitor. |
| No person available for standby | Delay to next available window. |

**HOLD = delay, not cancel. Fix and re-evaluate within 24-48h.**

### Conditions for NO-GO

Any of the following:

| Condition | Reason |
|-----------|--------|
| Self-loop edges exist (check #4 fails) | Fundamental data integrity failure |
| Compound unique index missing (check #3 fails) | No duplicate prevention = data corruption risk |
| Graph endpoint returns 500 consistently (check #10 fails) | API broken, no point launching |
| Error boundary not implemented | React Flow crash = white-screen = site outage |
| Rollback takes > 10 minutes | Cannot safely recover from failure |
| CMS crash-loops when graph endpoint is hit | Fundamental stability failure |
| MongoDB backup does not exist | Cannot recover from any data issue |

**NO-GO = stop. Do not launch. Root-cause the failure first.**

---

## 8. Post-Launch Observation Window (7-Day Stabilization)

### Day 1 (Launch Day)

- **Active monitoring** for first 6 hours (see §4)
- Passive monitoring for remaining 18 hours
- End-of-day report compiled
- **Decision point**: CONTINUE / ROLLBACK

### Day 2-3

- Check CMS logs morning and evening
- Check Google Search Console for coverage changes
- Monitor for user feedback
- **Decision point**: If zero issues → proceed to redirect phase

### Day 3-4

- Deploy `/digivolutions` → 308 redirect (Phase 5.3 from rollout plan)
- Monitor redirect in Nginx logs: `grep "digivolutions" /var/log/nginx/access.log | grep 308`
- Check Google Search Console for redirect processing

### Day 5-7

- Set old evolution fields to `readOnly: true` in CMS (Phase 6 from rollout plan)
- Deploy readOnly change to CMS
- Monitor for editor confusion or complaints
- **Final Day 7 decision point**: STABLE / NEEDS ATTENTION

### Day 7 Report

```
Evolution Graph — Week 1 Report
─────────────────────────────────
Days since launch:     7
Total CMS restarts:    [number]
Peak CMS memory:       [MB]
P95 API latency:       [ms]
Total 5xx errors:      [count]
User complaints:       [count]
Google Search Console:
  - New 404s:          [count]
  - Position changes:  [notable changes]
  - Coverage issues:   [count]
/digivolutions 308s:   [count in nginx log]
Editor saves:          [count, if tracked]

Status:  STABLE / NEEDS ATTENTION / REGRESSED
Action:  PROCEED TO CLEANUP / HOLD / ROLLBACK
```

### Post-7-Day Actions (if STABLE)

- Begin Phase 7 cleanup (week 3+ per rollout plan)
- Remove old evolution components
- Remove feature flag
- Remove `cytoscape` dependency
- Keep `/digivolutions` redirect for 3+ months

### If NEEDS ATTENTION at Day 7

- Do NOT proceed to cleanup
- Investigate specific issue
- Extend observation window by 7 days
- Re-evaluate at Day 14

### If REGRESSED at Day 7

- Execute rollback procedure (§6)
- Post-mortem within 48 hours
- Fix root cause
- Re-enter at Phase 4 (internal testing) of rollout plan

---

## Summary

**The system is architecturally sound for launch** given:
- The old system remains fully operational as fallback
- The feature flag provides < 3-minute rollback
- Edge data is in a separate collection (cannot corrupt existing data)
- ISR revalidation at 5s means new content appears quickly

**The primary risks are operational, not architectural**:
- Single CMS instance as bottleneck (mitigated by request coalescing + caching)
- Mobile Safari touch handling (must be manually verified)
- Migration metadata completeness (cosmetic impact only)

**Recommendation: GO**, conditional on all 26 mandatory checks passing and one person available for 1-hour standby.
