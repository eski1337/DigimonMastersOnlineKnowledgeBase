# Evolution Graph System — Complete Redesign Blueprint

> Generated from codebase analysis on 2026-03-01.
> Covers: data model, CMS editor, public display, URL strategy, performance, migration, layout bug fix.

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    PAYLOAD CMS (v2)                      │
│                                                         │
│  ┌──────────────┐   ┌──────────────────┐                │
│  │   digimon    │   │  evolution-edges  │  ← NEW        │
│  │  collection  │   │    collection     │                │
│  └──────┬───────┘   └────────┬─────────┘                │
│         │  (node)            │  (edge)                   │
│         └────────┬───────────┘                           │
│                  ▼                                       │
│  ┌──────────────────────────┐                           │
│  │  evolution-graph-layouts │  ← NEW                    │
│  │   (visual positions)     │                           │
│  └──────────────────────────┘                           │
│                                                         │
│  ┌──────────────────────────┐                           │
│  │  GET /api/evolution-graph│  ← NEW endpoint           │
│  │  ?digimon=<slug>         │                           │
│  │  &depth=<n>              │                           │
│  │  &direction=both|up|down │                           │
│  └──────────────────────────┘                           │
└─────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────┐
│                   NEXT.JS WEB APP                        │
│                                                         │
│  ┌──────────────────────────────────────────────┐       │
│  │  <EvolutionGraph />   (React Flow)           │       │
│  │                                               │       │
│  │  CMS mode:  editable, drag, connect, modals  │       │
│  │  Public mode: read-only, auto-layout, filters│       │
│  └──────────────────────────────────────────────┘       │
│                                                         │
│  Replaces ALL of:                                       │
│  - evolution-tree.tsx                                    │
│  - evolution-tree-v2.tsx                                 │
│  - DigivolutionChart.tsx  (Cytoscape)                   │
│  - visual-evolution-editor.tsx                           │
│  - digivolution-editor.tsx                               │
│  - digivolution-editor-v2.tsx                            │
│  - digivolution-tree-button.tsx                          │
└─────────────────────────────────────────────────────────┘
```

### Key principles

1. **Graph = edges collection, not per-node arrays.** Each evolution relationship is a first-class document.
2. **One component, two modes.** A single `<EvolutionGraph />` React Flow component serves both CMS editing and public display.
3. **Layout is stored separately from graph topology.** You can change positions without touching the data model.
4. **Backward-compatible migration.** Old `digivolvesFrom`/`digivolvesTo` arrays are converted to edges, then deprecated.

---

## 2. Data Model

### 2.1 New collection: `evolution-edges`

This is the **core** of the system. Each document = one directed edge in the evolution graph.

```ts
// apps/cms/src/collections/EvolutionEdges.ts
import { CollectionConfig } from 'payload/types';

const EvolutionEdges: CollectionConfig = {
  slug: 'evolution-edges',
  labels: {
    singular: { en: 'Evolution Edge', zhTw: '進化連結' },
    plural:   { en: 'Evolution Edges', zhTw: '進化連結' },
  },
  admin: {
    useAsTitle: 'id',
    group: { en: 'Game Data', zhTw: '遊戲資料' },
    defaultColumns: ['source', 'target', 'evolutionType', 'requiredLevel'],
  },
  // Compound unique index prevents duplicate edges
  indexes: [
    {
      fields: { source: 1, target: 1, evolutionType: 1 },
      options: { unique: true },
    },
  ],
  fields: [
    // ── Endpoints ──
    {
      name: 'source',
      label: { en: 'Source Digimon', zhTw: '來源數碼獸' },
      type: 'relationship',
      relationTo: 'digimon',
      required: true,
      index: true,
    },
    {
      name: 'target',
      label: { en: 'Target Digimon', zhTw: '目標數碼獸' },
      type: 'relationship',
      relationTo: 'digimon',
      required: true,
      index: true,
    },

    // ── Edge metadata ──
    {
      name: 'evolutionType',
      label: { en: 'Evolution Type', zhTw: '進化類型' },
      type: 'select',
      required: true,
      defaultValue: 'normal',
      options: [
        { label: { en: 'Normal',        zhTw: '普通' },       value: 'normal' },
        { label: { en: 'Jogress / DNA', zhTw: '合體進化' },   value: 'jogress' },
        { label: { en: 'Digi-Egg',      zhTw: '數碼蛋' },     value: 'digi-egg' },
        { label: { en: 'X-Antibody',    zhTw: 'X抗體' },      value: 'x-antibody' },
        { label: { en: 'Variant',       zhTw: '變種' },       value: 'variant' },
        { label: { en: 'Alternate',     zhTw: '替代路線' },   value: 'alternate' },
        { label: { en: 'Slide',         zhTw: '滑行進化' },   value: 'slide' },
        { label: { en: 'Mode Change',   zhTw: '模式變更' },   value: 'mode-change' },
      ],
    },
    {
      name: 'requiredLevel',
      label: { en: 'Required Level', zhTw: '需求等級' },
      type: 'number',
      admin: { description: { en: 'Minimum level to evolve', zhTw: '進化所需最低等級' } },
    },
    {
      name: 'requiredItem',
      label: { en: 'Required Item', zhTw: '需求道具' },
      type: 'text',
      admin: { description: { en: 'Item needed to evolve (e.g. Digi-Egg of Courage)', zhTw: '進化所需道具' } },
    },
    {
      name: 'jogressPartner',
      label: { en: 'Jogress Partner', zhTw: '合體夥伴' },
      type: 'relationship',
      relationTo: 'digimon',
      admin: {
        condition: (data) => data.evolutionType === 'jogress',
        description: { en: 'Second Digimon needed for Jogress', zhTw: '合體進化所需的第二隻數碼獸' },
      },
    },
    {
      name: 'conditions',
      label: { en: 'Extra Conditions', zhTw: '額外條件' },
      type: 'json',
      admin: {
        description: {
          en: 'Future-proof: any extra conditions as JSON (e.g. quest completion, stats threshold)',
          zhTw: '預留欄位：任何額外條件（JSON格式）',
        },
      },
    },
    {
      name: 'notes',
      label: { en: 'Notes', zhTw: '備註' },
      type: 'textarea',
    },
  ],
  access: {
    read: () => true,
    create: ({ req: { user } }) => !!user && ['editor', 'admin', 'owner'].includes(user.role),
    update: ({ req: { user } }) => !!user && ['editor', 'admin', 'owner'].includes(user.role),
    delete: ({ req: { user } }) => !!user && ['admin', 'owner'].includes(user.role),
  },
};

export default EvolutionEdges;
```

**Why this works:**

| Problem | Solution |
|---------|----------|
| Branching (Veemon → ExVeemon, Flamedramon, ...) | Multiple edges with same `source`, different `target` |
| Jogress | `evolutionType: 'jogress'` + `jogressPartner` field |
| X-Antibody | `evolutionType: 'x-antibody'` edge |
| Shared trees | Edges reference the same Digimon documents — no duplication |
| Circular detection | Handled at query time (see §5) |
| Multiple independent lines | Just different connected components in the graph |

### 2.2 Graph layout storage: `evolution-graph-layouts`

Positions are stored **separately** from topology. This means:
- Two editors can share the same graph data but have different visual layouts
- Auto-layout doesn't corrupt user data
- You can reset layout without losing edges

```ts
// apps/cms/src/collections/EvolutionGraphLayouts.ts
const EvolutionGraphLayouts: CollectionConfig = {
  slug: 'evolution-graph-layouts',
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      admin: { description: 'e.g. "Agumon Line Layout", "Veemon Full Tree"' },
    },
    {
      name: 'rootDigimon',
      type: 'relationship',
      relationTo: 'digimon',
      required: true,
      index: true,
      admin: { description: 'Primary Digimon this layout is centered on' },
    },
    {
      name: 'positions',
      type: 'json',
      required: true,
      // Schema: Record<digimonId, { x: number, y: number }>
      admin: { description: 'Node positions keyed by Digimon ID' },
    },
    {
      name: 'viewport',
      type: 'json',
      // Schema: { x: number, y: number, zoom: number }
      admin: { description: 'Saved camera position' },
    },
    {
      name: 'isDefault',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'Use as the default layout for this root Digimon' },
    },
  ],
  access: {
    read: () => true,
    create: ({ req: { user } }) => !!user && ['editor', 'admin', 'owner'].includes(user.role),
    update: ({ req: { user } }) => !!user && ['editor', 'admin', 'owner'].includes(user.role),
    delete: ({ req: { user } }) => !!user && ['admin', 'owner'].includes(user.role),
  },
};
```

### 2.3 Deprecate old fields

The old `EvolutionLines` collection and `Digimon.digivolutions` group become deprecated after migration. Removal happens in a later phase.

```
Phase 1: Create evolution-edges, migrate data, keep old fields read-only
Phase 2: Update all consumers to use evolution-edges
Phase 3: Remove old digivolutions group + EvolutionLines collection
```

### 2.4 API endpoint: `GET /api/evolution-graph`

```
GET /api/evolution-graph?digimon=agumon-classic&depth=5&direction=both

Response:
{
  "nodes": [
    { "id": "abc123", "slug": "agumon-classic", "name": "Agumon (Classic)", "icon": "/media/...", "form": "Rookie" },
    { "id": "def456", "slug": "greymon-classic", "name": "Greymon (Classic)", "icon": "/media/...", "form": "Champion" },
    ...
  ],
  "edges": [
    { "id": "edge1", "source": "abc123", "target": "def456", "evolutionType": "normal", "requiredLevel": 11, "requiredItem": null },
    ...
  ],
  "layout": {
    "positions": { "abc123": { "x": 0, "y": 0 }, "def456": { "x": 250, "y": 0 } },
    "viewport": { "x": 0, "y": 0, "zoom": 1 }
  }
}
```

**Query algorithm** (server-side):

```ts
async function getEvolutionGraph(slug: string, depth: number, direction: 'both' | 'up' | 'down') {
  // 1. Find the root Digimon
  const root = await payload.find({ collection: 'digimon', where: { slug: { equals: slug } }, limit: 1 });
  if (!root.docs[0]) throw new NotFoundError();
  const rootId = root.docs[0].id;

  // 2. BFS with depth limit + visited set (prevents cycles)
  const visited = new Set<string>();
  const queue: Array<{ id: string; depth: number }> = [{ id: rootId, depth: 0 }];
  const nodeIds = new Set<string>();
  const edgeDocs: any[] = [];

  while (queue.length > 0) {
    const { id, depth: d } = queue.shift()!;
    if (visited.has(id) || d > depth) continue;
    visited.add(id);
    nodeIds.add(id);

    // Forward edges (this Digimon evolves INTO something)
    if (direction === 'both' || direction === 'down') {
      const forward = await payload.find({
        collection: 'evolution-edges',
        where: { source: { equals: id } },
        limit: 100,
      });
      for (const edge of forward.docs) {
        edgeDocs.push(edge);
        const targetId = typeof edge.target === 'string' ? edge.target : edge.target.id;
        nodeIds.add(targetId);
        queue.push({ id: targetId, depth: d + 1 });
      }
    }

    // Backward edges (something evolves INTO this Digimon)
    if (direction === 'both' || direction === 'up') {
      const backward = await payload.find({
        collection: 'evolution-edges',
        where: { target: { equals: id } },
        limit: 100,
      });
      for (const edge of backward.docs) {
        edgeDocs.push(edge);
        const sourceId = typeof edge.source === 'string' ? edge.source : edge.source.id;
        nodeIds.add(sourceId);
        queue.push({ id: sourceId, depth: d + 1 });
      }
    }
  }

  // 3. Batch-fetch all Digimon docs for the collected IDs
  const nodes = await payload.find({
    collection: 'digimon',
    where: { id: { in: Array.from(nodeIds) } },
    limit: nodeIds.size,
    depth: 0, // No deep population — just id, name, slug, icon, form
  });

  // 4. Load saved layout (if any)
  const layout = await payload.find({
    collection: 'evolution-graph-layouts',
    where: { rootDigimon: { equals: rootId }, isDefault: { equals: true } },
    limit: 1,
  });

  return {
    nodes: nodes.docs.map(d => ({ id: d.id, slug: d.slug, name: d.name, icon: d.icon?.url, form: d.form })),
    edges: dedupEdges(edgeDocs),
    layout: layout.docs[0] || null,
  };
}
```

**Cycle prevention:**
- The `visited` set in BFS guarantees each node is processed once.
- `depth` parameter caps traversal (default: 5, max: 10).
- Compound unique index on `(source, target, evolutionType)` prevents duplicate edges at the data layer.
- The graph is *directed* — A→B and B→A are distinct edges (not a cycle, just bidirectional).

---

## 3. CMS Editor Design (Grid-Based Graph Editor)

### 3.1 Technology: React Flow

**React Flow** is the correct choice. Here's why:

| Requirement | React Flow | Cytoscape.js | D3.js |
|------------|------------|--------------|-------|
| React-native | ✅ First-class | ❌ Wrapper | ❌ Wrapper |
| Drag nodes | ✅ Built-in | ✅ Built-in | ❌ Manual |
| Zoom / Pan | ✅ Built-in | ✅ Built-in | ❌ Manual |
| Edge creation by dragging | ✅ Built-in | ❌ Manual | ❌ Manual |
| Custom node components | ✅ JSX nodes | ❌ HTML labels | ❌ SVG |
| Auto-layout (Dagre/ELK) | ✅ Plugin | ✅ Plugin | ❌ Manual |
| Mini-map | ✅ Built-in | ❌ Plugin | ❌ N/A |
| Container isolation | ✅ Contained canvas | ⚠️ Requires care | ⚠️ SVG bounds |
| Bundle size | ~45KB | ~180KB | ~60KB |

### 3.2 Component structure

```
apps/web/src/components/evolution-graph/
├── EvolutionGraph.tsx          ← Main wrapper (mode: 'edit' | 'view')
├── EvolutionGraphEditor.tsx    ← CMS editor with all controls
├── EvolutionGraphViewer.tsx    ← Public read-only display
├── DigimonNode.tsx             ← Custom React Flow node (icon + name + form badge)
├── EvolutionEdge.tsx           ← Custom React Flow edge (colored by type, label)
├── EdgeModal.tsx               ← Modal for editing edge conditions
├── DigimonSearchPanel.tsx      ← Search sidebar for adding nodes
├── GraphToolbar.tsx            ← Zoom, snap, auto-layout, save controls
├── useEvolutionGraph.ts        ← Hook: fetches graph data, manages state
├── useGraphLayout.ts           ← Hook: Dagre/ELK auto-layout
├── graph-utils.ts              ← Layout algorithms, type maps, color maps
└── evolution-graph.module.css  ← Scoped styles (containment!)
```

### 3.3 Editor behavior

```tsx
// EvolutionGraphEditor.tsx — conceptual structure

<div className={styles.editorContainer}>  {/* CRITICAL: overflow containment */}
  <GraphToolbar
    onAutoLayout={runDagreLayout}
    onSave={saveLayoutAndEdges}
    onZoomFit={fitView}
    snapEnabled={snap}
    onToggleSnap={toggleSnap}
  />

  <div className={styles.canvasRow}>
    {/* Left sidebar: search + add Digimon */}
    <DigimonSearchPanel onAdd={addNodeToGraph} />

    {/* React Flow canvas — contained inside a fixed-height div */}
    <div className={styles.graphCanvas}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={{ digimon: DigimonNode }}
        edgeTypes={{ evolution: EvolutionEdge }}
        onConnect={handleNewConnection}       // drag from handle → creates edge
        onNodesChange={onNodesChange}         // drag node → update position
        onEdgeClick={openEdgeModal}           // click edge → edit conditions
        onNodeDragStop={handleNodeDragStop}   // snap-to-grid
        fitView
        snapToGrid={snap}
        snapGrid={[50, 50]}
        minZoom={0.2}
        maxZoom={3}
      >
        <Background variant="dots" gap={50} />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  </div>

  <EdgeModal
    open={!!editingEdge}
    edge={editingEdge}
    onSave={updateEdge}
    onDelete={deleteEdge}
    onClose={() => setEditingEdge(null)}
  />
</div>
```

### 3.4 Saving

**Two save operations happen independently:**

1. **Save graph topology** → CRUD on `evolution-edges` collection
   - New connection = `POST /api/evolution-edges`
   - Edit connection = `PATCH /api/evolution-edges/:id`
   - Delete connection = `DELETE /api/evolution-edges/:id`

2. **Save layout positions** → `PATCH /api/evolution-graph-layouts/:id`
   - Only stores `{ [digimonId]: { x, y } }` + viewport
   - Does NOT touch edge data

### 3.5 Preventing layout from breaking page

See §8 for the full CSS explanation. Summary:

```css
/* evolution-graph.module.css */
.editorContainer {
  position: relative;
  width: 100%;
  /* NEVER width: 100vw — that ignores scrollbar + sidebar */
  contain: layout style;
  /* contain prevents internal layout from affecting parent */
}

.graphCanvas {
  position: relative;
  width: 100%;
  height: 600px;           /* Fixed height, not content-driven */
  overflow: hidden;         /* React Flow manages its own scroll */
  border-radius: 0.75rem;
  border: 2px solid rgba(251, 146, 60, 0.3);
}

/* React Flow's internal container is already position:absolute inset:0
   so it will never push parent boundaries */
```

---

## 4. Public Display Design

### 4.1 Same component, read-only mode

```tsx
// On /digimon/[slug]/page.tsx — replaces EvolutionTreeV2 + VisualEvolutionEditor

<EvolutionGraph
  mode="view"
  digimonSlug={d.slug}
  defaultDirection="both"    // show ancestors + descendants
  maxDepth={5}
  height={400}               // constrained height
/>
```

### 4.2 Viewer features

| Feature | Implementation |
|---------|---------------|
| Auto-layout | Dagre LR (left-to-right) on mount. If saved layout exists, use it. |
| Filter by type | Toggle buttons: Normal / Jogress / X-Antibody / Digi-Egg. Filters edges, hides orphaned nodes. |
| Show ancestors only | `direction=up` re-fetches graph |
| Show descendants only | `direction=down` re-fetches graph |
| Show full tree | `direction=both` (default) |
| Click node → navigate | `router.push(/digimon/${slug})` |
| Responsive | Height auto-adjusts: `min(400px, 60vh)`. Zoom controls visible on mobile. |
| No horizontal overflow | `overflow: hidden` on container. React Flow handles internal pan/zoom. |

### 4.3 Custom node (public)

```tsx
function DigimonNode({ data }: NodeProps) {
  return (
    <div className={styles.publicNode}>
      <Image src={data.icon} alt={data.name} width={48} height={48} />
      <span className={styles.nodeName}>{data.name}</span>
      <span className={styles.formBadge}>{data.form}</span>
      {data.isCurrent && <div className={styles.currentHighlight} />}
      {/* React Flow handles — hidden in view mode */}
      <Handle type="source" position={Position.Right} className={styles.hiddenHandle} />
      <Handle type="target" position={Position.Left} className={styles.hiddenHandle} />
    </div>
  );
}
```

### 4.4 Edge styling by type

```ts
const EDGE_COLORS: Record<string, string> = {
  normal:      '#fb923c', // orange
  jogress:     '#a855f7', // purple
  'digi-egg':  '#22d3ee', // cyan
  'x-antibody':'#ef4444', // red
  variant:     '#84cc16', // lime
  alternate:   '#6366f1', // indigo
  slide:       '#f59e0b', // amber
  'mode-change':'#ec4899', // pink
};
```

Legend renders below the graph, color-coded.

---

## 5. URL Strategy

### Recommendation: unified profile page + hash anchor

```
/digimon/agumon-classic              ← full profile (evolution graph embedded)
/digimon/agumon-classic#evolution    ← deep-link to evolution section
```

**Delete** `/digimon/[slug]/digivolutions` as a separate page.

**Reasons:**
1. One canonical URL per Digimon = better SEO (no split link equity).
2. Google can index the graph as structured data on the main page.
3. Users don't have to navigate away to see evolutions.
4. The graph is contained (not full-page), so it fits naturally in the profile.

**If you later want a standalone "full-screen" graph view:**
```
/digimon/agumon-classic?view=graph   ← query param triggers full-viewport graph
```
This keeps the canonical URL the same while allowing a fullscreen experience.

### Structured data (SEO)

Add JSON-LD to the profile page:

```json
{
  "@context": "https://schema.org",
  "@type": "Thing",
  "name": "Agumon (Classic)",
  "description": "Rookie-level Vaccine Digimon...",
  "isPartOf": {
    "@type": "ItemList",
    "name": "Evolution Line",
    "itemListElement": [
      { "@type": "Thing", "name": "Koromon", "position": 1 },
      { "@type": "Thing", "name": "Agumon (Classic)", "position": 2 },
      { "@type": "Thing", "name": "Greymon (Classic)", "position": 3 }
    ]
  }
}
```

---

## 6. Performance Strategy

### 6.1 Lazy loading

```tsx
// The graph component is dynamically imported — not in initial bundle
const EvolutionGraph = dynamic(() => import('@/components/evolution-graph/EvolutionGraph'), {
  loading: () => <GraphSkeleton />,
  ssr: false,  // React Flow requires DOM — no SSR
});
```

React Flow itself is ~45KB gzipped. With dynamic import, it only loads when the graph section is visible (or when the user scrolls to it with Intersection Observer).

### 6.2 Graph traversal

- **Default depth: 5** (covers In-Training → Mega for most lines).
- **Max depth: 10** (hard cap, server-side enforced).
- **BFS with visited set** — O(V+E), cannot loop.
- **Two indexed queries per node** (`source = id` and `target = id`) — MongoDB uses the compound index.

### 6.3 Caching

| Layer | Strategy |
|-------|----------|
| **Server** | `next: { revalidate: 60 }` on fetch — graph data rarely changes |
| **API** | `Cache-Control: public, s-maxage=300, stale-while-revalidate=600` |
| **Client** | React Query / SWR with `staleTime: 5min` |
| **MongoDB** | Compound index on `evolution-edges.source` and `evolution-edges.target` |

### 6.4 Preventing re-render loops

React Flow internally uses `useStore` (Zustand). Key rules:
- **Never** create new node/edge arrays on every render. Use `useCallback` for `onNodesChange`/`onEdgesChange`.
- Memoize custom node components with `React.memo`.
- Use `nodeTypes` and `edgeTypes` objects defined **outside** the component (or `useMemo`).

```tsx
// CORRECT — defined outside component
const nodeTypes = { digimon: DigimonNode };
const edgeTypes = { evolution: EvolutionEdge };

function EvolutionGraph() {
  // nodes/edges managed by React Flow's useNodesState / useEdgesState
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  // ...
}
```

### 6.5 Preventing DOM explosion

- React Flow **virtualizes nodes** by default — nodes outside the viewport are not rendered.
- For trees > 100 nodes (rare but possible): set `nodeExtent` and enable `onlyRenderVisibleElements`.
- The minimap uses canvas rendering, not DOM nodes.

### 6.6 When to virtualize

| Node count | Strategy |
|-----------|----------|
| < 50 | Render all. No optimization needed. |
| 50–200 | React Flow's default viewport culling handles it. |
| 200+ | Paginate: show depth-3 initially, "Load more" button expands. |

---

## 7. Migration Plan

### 7.1 Script: convert old data → evolution-edges

```ts
// scripts/migrate-evolution-edges.ts

async function migrate(payload: Payload) {
  const allDigimon = await payload.find({ collection: 'digimon', limit: 10000, depth: 0 });
  const byName = new Map<string, string>(); // name → id
  for (const d of allDigimon.docs) byName.set(d.name, d.id);

  const edgesCreated = new Set<string>();
  let created = 0;
  let skipped = 0;

  for (const d of allDigimon.docs) {
    const digivolutions = d.digivolutions;
    if (!digivolutions) continue;

    // Forward edges: this Digimon evolves TO targets
    for (const evo of (digivolutions.digivolvesTo || [])) {
      const targetId = byName.get(evo.name);
      if (!targetId) { skipped++; continue; }

      const key = `${d.id}->${targetId}:normal`;
      if (edgesCreated.has(key)) continue;

      await payload.create({
        collection: 'evolution-edges',
        data: {
          source: d.id,
          target: targetId,
          evolutionType: 'normal',
          requiredLevel: evo.requiredLevel || null,
          requiredItem: evo.requiredItem || null,
        },
      });

      edgesCreated.add(key);
      created++;
    }

    // Backward edges: check if the "from" already created a forward edge
    for (const evo of (digivolutions.digivolvesFrom || [])) {
      const sourceId = byName.get(evo.name);
      if (!sourceId) { skipped++; continue; }

      const key = `${sourceId}->${d.id}:normal`;
      if (edgesCreated.has(key)) continue;

      await payload.create({
        collection: 'evolution-edges',
        data: {
          source: sourceId,
          target: d.id,
          evolutionType: 'normal',
          // Level/item are on the "to" side, not "from" side
        },
      });

      edgesCreated.add(key);
      created++;
    }
  }

  console.log(`Migration complete: ${created} edges created, ${skipped} skipped (name not found)`);
}
```

### 7.2 Avoiding data loss

1. **Run migration in a transaction** (or at minimum, log every edge created).
2. **Keep old `digivolutions` field read-only** — don't delete it until the new system is verified.
3. **Export before migration**: `mongoexport --collection=digimon --out=digimon-backup.json`

### 7.3 Normalizing duplicates

The compound unique index `(source, target, evolutionType)` prevents duplicates at the DB level. The migration script also uses `edgesCreated` Set to skip duplicates.

**Name normalization**: The old data uses text names ("Agumon (Classic)"). The migration looks up the Digimon by name to get the ID. Names that don't match are logged as skipped.

### 7.4 Validate graph integrity

Post-migration validation script:

```ts
async function validateGraph(payload: Payload) {
  const edges = await payload.find({ collection: 'evolution-edges', limit: 10000, depth: 0 });
  const digimonIds = new Set(
    (await payload.find({ collection: 'digimon', limit: 10000, depth: 0 })).docs.map(d => d.id)
  );

  const issues: string[] = [];

  for (const edge of edges.docs) {
    const sourceId = typeof edge.source === 'string' ? edge.source : edge.source?.id;
    const targetId = typeof edge.target === 'string' ? edge.target : edge.target?.id;

    if (!digimonIds.has(sourceId)) issues.push(`Edge ${edge.id}: source ${sourceId} not found`);
    if (!digimonIds.has(targetId)) issues.push(`Edge ${edge.id}: target ${targetId} not found`);
    if (sourceId === targetId)     issues.push(`Edge ${edge.id}: self-loop`);
  }

  // Check for isolated nodes (Digimon with no edges)
  const connectedIds = new Set<string>();
  for (const edge of edges.docs) {
    connectedIds.add(typeof edge.source === 'string' ? edge.source : edge.source?.id);
    connectedIds.add(typeof edge.target === 'string' ? edge.target : edge.target?.id);
  }

  const isolated = [...digimonIds].filter(id => !connectedIds.has(id));
  if (isolated.length > 0) {
    issues.push(`${isolated.length} Digimon have no evolution edges (may be expected for Baby/Mega forms)`);
  }

  return issues;
}
```

---

## 8. Layout Bug Root Cause + Fix

### 8.1 Root cause analysis

The current layout bug is in `visual-evolution-editor.tsx` at lines 842–973.

**Three compounding CSS errors:**

#### Error 1: Hardcoded inner dimensions push scrollable area

```tsx
// Line 854-859
<div style={{
  transform: `scale(${zoom})`,
  transformOrigin: 'top left',
  width: '1600px',       // ← HARDCODED: always 1600px regardless of container
  height: '1000px',      // ← HARDCODED: always 1000px
}}>
```

`transform: scale()` does **not** change the element's layout box. The element still occupies 1600×1000px in flow. When `zoom > 1`, the visual size exceeds the container, but the scrollable area is based on the un-transformed 1600×1000px. When nodes are positioned at `x > 1600`, they overflow.

**The real problem**: nodes are positioned with `position: absolute; left: ${node.x}px; top: ${node.y}px` — there's nothing constraining them to the 1600px width. If a user drags a node to x=2000, it extends the scrollable area of the **entire page**, not just the editor container.

#### Error 2: Percentage-based grid/SVG inside a scaled container

```tsx
// Line 866-870 — Grid background
style={{
  width: `${100 * zoom}%`,    // ← At zoom=1.5, this is 150% of 1600px = 2400px
  height: `${100 * zoom}%`,
}}

// Line 873 — SVG
<svg style={{ width: `${100 * zoom}%`, height: `${100 * zoom}%` }}>
```

These percentage-based sizes scale **relative to the 1600px parent**, creating a compound scaling effect. At zoom 1.5×, the SVG is `150% × 1600px = 2400px`, but it's also being `scale(1.5)` transformed, so the visual size is `2400 × 1.5 = 3600px`.

#### Error 3: `overflow: auto` on the canvas, but nodes escape the overflow boundary

```tsx
// Line 845
className="relative w-full h-[600px] ... overflow-auto"
```

The canvas has `overflow: auto` — this should scroll internally. But `overflow: auto` creates a scroll container for the element's **content**, and the content here is the 1600×1000px zoom div. Nodes positioned beyond 1600px push the scrollable area. However, the `overflow: auto` scroll **propagates to the page** when the inner div's transformed visual bounds exceed the outer container.

The critical failure: **there is no `overflow: hidden` on any ancestor between the canvas and the `<body>`**. The `<Card>` component has no overflow clipping, and the page layout column is `flex` or `block` — neither clips overflow by default.

### 8.2 Structural fix

The fix has three parts:

#### Part A: Use CSS containment on the editor wrapper

```css
.editorContainer {
  position: relative;
  width: 100%;
  contain: layout style paint;
  /* 'contain: paint' creates a new stacking context AND clips overflow
     without needing explicit overflow:hidden on every ancestor.
     This is the structural fix — it guarantees that NOTHING inside
     this element can affect the layout of anything outside it. */
}
```

#### Part B: Replace the manual canvas with React Flow

React Flow's `<ReactFlow />` component renders into a `position: absolute; inset: 0` container inside its parent. It manages its own transform (pan/zoom) internally via CSS transforms on an inner `<div>`. The parent div just needs:

```css
.graphCanvas {
  position: relative;
  width: 100%;
  height: 600px;
  overflow: hidden;
}
```

React Flow **never** makes its content push the parent's scroll area because it uses `transform` for positioning (which doesn't affect layout flow) and clips to the container via its internal absolute positioning.

#### Part C: If keeping the current editor temporarily

If React Flow migration isn't immediate, the quick structural fix for the current editor:

```tsx
// Replace the current canvas div:
<div
  ref={canvasRef}
  className="relative w-full bg-gray-900/50 border-2 border-orange-500/30 rounded-lg"
  style={{
    height: '600px',
    overflow: 'hidden',       // NOT auto — hidden prevents scroll propagation
    contain: 'paint layout',  // Structural containment
  }}
>
  <div
    style={{
      position: 'absolute',   // Taken out of flow
      inset: 0,               // Fill parent exactly
      overflow: 'auto',       // Internal scroll only
    }}
  >
    <div
      style={{
        transform: `scale(${zoom})`,
        transformOrigin: 'top left',
        width: '1600px',
        height: '1000px',
        position: 'relative',  // Containment for absolute children
      }}
    >
      {/* Grid, SVG, Nodes go here */}
      {/* Remove the percentage-based width/height on grid and SVG */}
    </div>
  </div>
</div>
```

**Key changes:**
1. Outer div: `overflow: hidden` + `contain: paint layout` — nothing escapes
2. Middle div: `position: absolute; inset: 0; overflow: auto` — creates an internal scroll context that cannot propagate
3. Inner zoom div: `position: relative` — nodes' absolute positioning is relative to this, not the page
4. Grid/SVG: remove the `${100 * zoom}%` sizing, use `100%` or fixed 1600×1000

---

## Summary: Implementation Order

| Phase | Work | Effort |
|-------|------|--------|
| **0** | Fix layout bug (§8.2 Part C) — immediate relief | 1 hour |
| **1** | Create `evolution-edges` collection + API endpoint | 1 day |
| **2** | Write migration script + run on staging | 0.5 day |
| **3** | Build `<EvolutionGraph />` with React Flow (edit + view) | 2–3 days |
| **4** | Replace profile page evolution section | 0.5 day |
| **5** | Delete old components + `/digivolutions` page | 0.5 day |
| **6** | Delete `EvolutionLines` collection + old fields | 0.5 day |

**Total: ~5–6 days of focused work.**

### Dependencies to install

```bash
pnpm add @xyflow/react --filter web
# That's it. React Flow v12 includes Background, Controls, MiniMap.
# For auto-layout:
pnpm add @dagrejs/dagre --filter web
```
