# Evolution Graph System — Technical Specification Index

> Stack: Payload CMS v2.26 + MongoDB (mongoose) + Express | Next.js 14 | React Flow (@xyflow/react) | Redis (ioredis)

## Documents

| # | File | Contents |
|---|------|----------|
| 1 | [01-cms-collections.md](./01-cms-collections.md) | `evolution-edges` + `evolution-graph-layouts` Payload collection configs, i18n labels, access control, hooks (self-loop prevention, compound uniqueness, cascading delete), registration in `payload.config.ts` |
| 2 | [02-mongodb-indexes.md](./02-mongodb-indexes.md) | MongoDB indexes for query performance, compound unique constraint, DB-level self-loop validator |
| 3 | [03-api-routes.md](./03-api-routes.md) | Express routes, BFS graph traversal controller, batch edge CRUD, layout save endpoint, query complexity analysis |
| 4 | [04-react-flow-architecture.md](./04-react-flow-architecture.md) | File structure, types, constants, custom node/edge components, data fetching hook, Dagre auto-layout, main wrapper, viewer (public), editor (admin), CSS module, re-render prevention |
| 5 | [05-migration-script.md](./05-migration-script.md) | Script to migrate `digivolvesFrom[]` / `digivolvesTo[]` / `jogress[]` → `evolution-edges`, dry-run support, dedup, error logging |
| 6 | [06-layout-bug-fix.md](./06-layout-bug-fix.md) | Root cause analysis of `visual-evolution-editor.tsx` overflow bug, containment model, CSS fix, JSX replacement |
| 7 | [07-performance-strategy.md](./07-performance-strategy.md) | In-memory LRU cache, Redis optional layer, HTTP caching, N+1 prevention, large graph handling, debounced layout, React Flow virtualization, persistence hook |
| 8 | [08-edge-cases.md](./08-edge-cases.md) | Jogress (two parents), multiple edge types, slide evolution, mode changes, X-Antibody, variants, cross-tree shared Digimon, self-loop prevention, orphan/duplicate/disconnected detection, type validation rules |

## Key Corrections from Blueprint

- **Database is MongoDB** (not PostgreSQL) — `@payloadcms/db-mongodb v1.7.2`
- **CMS uses Express** endpoints (not Next.js App Router on CMS side)
- **Redis already available** in web app via `ioredis` + `apps/web/src/lib/redis.ts`
- **Payload v2.26** with webpack bundler and mongoose adapter

## Implementation Order

1. Create `EvolutionEdges.ts` + `EvolutionGraphLayouts.ts` collections → register in config
2. Run MongoDB index creation script
3. Add cascading delete hook to `Digimon.ts`
4. Create `evolution.routes.ts` + `evolution.controller.ts` + `evolution-cache.service.ts`
5. Register routes in `app.ts`
6. Run migration script (dry-run first, then live)
7. Install `@xyflow/react` + `@dagrejs/dagre` in web app
8. Build React Flow components (types → constants → layout → node → edge → hooks → viewer → editor)
9. Replace current evolution display on `/digimon/[slug]` page
10. Apply layout bug fix to `visual-evolution-editor.tsx` (stopgap until React Flow editor is ready)
11. Delete old components: `DigivolutionChart`, `evolution-tree.tsx`, `evolution-tree-v2.tsx`, `digivolution-editor.tsx`, `digivolution-editor-v2.tsx`, `visual-evolution-editor.tsx`
12. Delete `/digimon/[slug]/digivolutions` page
