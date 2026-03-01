# Part 4 — React Flow Component Architecture

## 4.1 Dependencies

```bash
pnpm add @xyflow/react @dagrejs/dagre --filter web
```

## 4.2 File Structure

```
apps/web/src/components/evolution-graph/
├── index.ts                          # barrel export
├── EvolutionGraph.tsx                # Main wrapper: mode='edit' | 'view'
├── EvolutionGraphEditor.tsx          # Editor mode with full controls
├── EvolutionGraphViewer.tsx          # Public read-only mode
├── nodes/
│   └── DigimonNode.tsx               # Custom node
├── edges/
│   └── EvolutionEdge.tsx             # Custom edge
├── panels/
│   ├── SearchPanel.tsx               # Search + add Digimon
│   ├── GraphToolbar.tsx              # Zoom, layout, snap, save
│   └── EdgeEditModal.tsx             # Modal for edge conditions
├── hooks/
│   ├── useEvolutionGraphData.ts      # Fetch + transform API data
│   ├── useAutoLayout.ts             # Dagre layout
│   └── useGraphPersistence.ts        # Save layout + edges
├── lib/
│   ├── layout.ts                     # Dagre wrapper
│   ├── constants.ts                  # Colors, sizes, type maps
│   └── types.ts                      # TypeScript interfaces
└── styles/
    └── evolution-graph.module.css    # Scoped CSS with containment
```

## 4.3 Types

```ts
// lib/types.ts
export type EvolutionType =
  | 'normal' | 'jogress' | 'digi-egg' | 'x-antibody'
  | 'variant' | 'alternate' | 'slide' | 'mode-change';

export interface DigimonNodeData {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  form: string | null;
  isCurrent: boolean;
}

export interface EvolutionEdgeData {
  id: string;
  evolutionType: EvolutionType;
  requiredLevel: number | null;
  requiredItem: string | null;
  requiredItemQuantity: number | null;
  jogressPartner: string | null;
  conditions: any | null;
}

export interface GraphApiResponse {
  success: boolean;
  targetDigimon: { id: string; slug: string; name: string };
  nodes: Array<{
    id: string; slug: string; name: string;
    icon: string | null; form: string | null;
  }>;
  edges: Array<{
    id: string; source: string; target: string;
    evolutionType: EvolutionType;
    requiredLevel: number | null;
    requiredItem: string | null;
    requiredItemQuantity: number | null;
    jogressPartner: string | null;
    conditions: any | null;
  }>;
  layout: {
    positions: Record<string, { x: number; y: number }>;
    viewport: { x: number; y: number; zoom: number } | null;
  } | null;
}
```

## 4.4 Constants

```ts
// lib/constants.ts
import type { EvolutionType } from './types';

export const EDGE_COLORS: Record<EvolutionType, string> = {
  normal:        '#fb923c',
  jogress:       '#a855f7',
  'digi-egg':    '#22d3ee',
  'x-antibody':  '#ef4444',
  variant:       '#84cc16',
  alternate:     '#6366f1',
  slide:         '#f59e0b',
  'mode-change': '#ec4899',
};

export const EDGE_LABELS: Record<EvolutionType, string> = {
  normal: 'Normal', jogress: 'Jogress', 'digi-egg': 'Digi-Egg',
  'x-antibody': 'X-Antibody', variant: 'Variant', alternate: 'Alternate',
  slide: 'Slide', 'mode-change': 'Mode Change',
};

export const NODE_WIDTH = 120;
export const NODE_HEIGHT = 100;
export const SNAP_GRID: [number, number] = [25, 25];
```

## 4.5 Auto-Layout (Dagre)

```ts
// lib/layout.ts
import dagre from '@dagrejs/dagre';
import type { Node, Edge } from '@xyflow/react';

export function computeDagreLayout<N, E>(
  nodes: Node<N>[],
  edges: Edge<E>[],
  nodeWidth: number,
  nodeHeight: number,
  direction: 'LR' | 'TB' = 'LR',
): { nodes: Node<N>[]; edges: Edge<E>[] } {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction, nodesep: 60, ranksep: 120, marginx: 40, marginy: 40 });

  for (const node of nodes) g.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  for (const edge of edges) g.setEdge(edge.source, edge.target);

  dagre.layout(g);

  return {
    nodes: nodes.map((node) => {
      const pos = g.node(node.id);
      return { ...node, position: { x: pos.x - nodeWidth / 2, y: pos.y - nodeHeight / 2 } };
    }),
    edges,
  };
}
```

## 4.6 Custom Node

```tsx
// nodes/DigimonNode.tsx
'use client';
import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import Image from 'next/image';
import type { DigimonNodeData } from '../lib/types';
import styles from '../styles/evolution-graph.module.css';

function DigimonNodeComponent({ data, selected }: NodeProps) {
  const d = data as DigimonNodeData;
  return (
    <div className={`${styles.digimonNode} ${d.isCurrent ? styles.currentNode : ''} ${selected ? styles.selectedNode : ''}`}>
      <Handle type="target" position={Position.Left} className={styles.handle} />
      <div className={styles.nodeIcon}>
        {d.icon ? (
          <Image src={d.icon} alt={d.name} width={48} height={48} className={styles.nodeImage} unoptimized />
        ) : (
          <div className={styles.nodePlaceholder}>?</div>
        )}
      </div>
      <div className={styles.nodeName} title={d.name}>{d.name}</div>
      {d.form && <div className={styles.formBadge}>{d.form}</div>}
      <Handle type="source" position={Position.Right} className={styles.handle} />
    </div>
  );
}

export const DigimonNode = memo(DigimonNodeComponent);
```

## 4.7 Custom Edge

```tsx
// edges/EvolutionEdge.tsx
'use client';
import { memo } from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from '@xyflow/react';
import type { EvolutionEdgeData } from '../lib/types';
import { EDGE_COLORS, EDGE_LABELS } from '../lib/constants';
import styles from '../styles/evolution-graph.module.css';

function EvolutionEdgeComponent({
  id, sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition, data, selected,
}: EdgeProps) {
  const d = data as EvolutionEdgeData;
  const color = EDGE_COLORS[d.evolutionType] || EDGE_COLORS.normal;

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition,
  });

  const parts: string[] = [];
  if (d.requiredLevel) parts.push(`Lv ${d.requiredLevel}`);
  if (d.requiredItem) parts.push(d.requiredItem);
  if (d.evolutionType !== 'normal') parts.push(EDGE_LABELS[d.evolutionType]);
  const label = parts.join(' · ');

  return (
    <>
      <BaseEdge
        id={id} path={edgePath}
        style={{ stroke: color, strokeWidth: selected ? 3 : 2,
          filter: selected ? `drop-shadow(0 0 4px ${color})` : undefined }}
        markerEnd="url(#evo-arrow)"
      />
      {label && (
        <EdgeLabelRenderer>
          <div className={styles.edgeLabel}
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`, borderColor: color }}>
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export const EvolutionEdge = memo(EvolutionEdgeComponent);
```

## 4.8 Data Fetching Hook

```ts
// hooks/useEvolutionGraphData.ts
'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import type { Node, Edge } from '@xyflow/react';
import type { GraphApiResponse, DigimonNodeData, EvolutionEdgeData } from '../lib/types';
import { NODE_WIDTH, NODE_HEIGHT } from '../lib/constants';
import { computeDagreLayout } from '../lib/layout';

const CMS_URL = process.env.NEXT_PUBLIC_CMS_URL || 'https://cms.dmokb.info';

interface Options { slug: string; depth?: number; direction?: 'both' | 'up' | 'down'; }
interface Result {
  nodes: Node<DigimonNodeData>[];
  edges: Edge<EvolutionEdgeData>[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  setNodes: React.Dispatch<React.SetStateAction<Node<DigimonNodeData>[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge<EvolutionEdgeData>[]>>;
  targetDigimon: { id: string; slug: string; name: string } | null;
}

export function useEvolutionGraphData({ slug, depth = 5, direction = 'both' }: Options): Result {
  const [nodes, setNodes] = useState<Node<DigimonNodeData>[]>([]);
  const [edges, setEdges] = useState<Edge<EvolutionEdgeData>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [targetDigimon, setTargetDigimon] = useState<Result['targetDigimon']>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchGraph = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);

    try {
      const url = `${CMS_URL}/api/evolution-graph?digimon=${encodeURIComponent(slug)}&depth=${depth}&direction=${direction}`;
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.error || `HTTP ${res.status}`); }

      const data: GraphApiResponse = await res.json();
      if (!data.success) throw new Error('API returned success=false');
      setTargetDigimon(data.targetDigimon);

      // API → React Flow nodes
      const rfNodes: Node<DigimonNodeData>[] = data.nodes.map((n) => {
        const saved = data.layout?.positions?.[n.id];
        return {
          id: n.id, type: 'digimon',
          position: saved ? { x: saved.x, y: saved.y } : { x: 0, y: 0 },
          data: { id: n.id, slug: n.slug, name: n.name, icon: n.icon, form: n.form, isCurrent: n.id === data.targetDigimon.id },
        };
      });

      // API → React Flow edges
      const rfEdges: Edge<EvolutionEdgeData>[] = data.edges.map((e) => ({
        id: e.id, source: e.source, target: e.target, type: 'evolution',
        data: { id: e.id, evolutionType: e.evolutionType, requiredLevel: e.requiredLevel,
          requiredItem: e.requiredItem, requiredItemQuantity: e.requiredItemQuantity,
          jogressPartner: e.jogressPartner, conditions: e.conditions },
      }));

      // Auto-layout if no saved positions
      if (!data.layout?.positions || Object.keys(data.layout.positions).length === 0) {
        const laid = computeDagreLayout(rfNodes, rfEdges, NODE_WIDTH, NODE_HEIGHT);
        setNodes(laid.nodes);
      } else {
        setNodes(rfNodes);
      }
      setEdges(rfEdges);
    } catch (e: any) {
      if (e.name === 'AbortError') return;
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [slug, depth, direction]);

  useEffect(() => { fetchGraph(); return () => abortRef.current?.abort(); }, [fetchGraph]);

  return { nodes, edges, loading, error, refetch: fetchGraph, setNodes, setEdges, targetDigimon };
}
```

## 4.9 Main Wrapper

```tsx
// EvolutionGraph.tsx
'use client';
import { useMemo } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { EvolutionGraphViewer } from './EvolutionGraphViewer';
import { EvolutionGraphEditor } from './EvolutionGraphEditor';
import { DigimonNode } from './nodes/DigimonNode';
import { EvolutionEdge } from './edges/EvolutionEdge';

// CRITICAL: outside component to prevent React Flow re-render bug
const nodeTypes = { digimon: DigimonNode };
const edgeTypes = { evolution: EvolutionEdge };

interface Props {
  mode: 'edit' | 'view';
  digimonSlug: string;
  depth?: number;
  direction?: 'both' | 'up' | 'down';
  height?: number | string;
  userRole?: string;
}

export default function EvolutionGraph({ mode, digimonSlug, depth = 5, direction = 'both', height = 400, userRole }: Props) {
  const h = useMemo(() => typeof height === 'number' ? `${height}px` : height, [height]);

  return (
    <ReactFlowProvider>
      {mode === 'edit' ? (
        <EvolutionGraphEditor slug={digimonSlug} depth={depth} direction={direction}
          height={h} nodeTypes={nodeTypes} edgeTypes={edgeTypes} userRole={userRole} />
      ) : (
        <EvolutionGraphViewer slug={digimonSlug} depth={depth} direction={direction}
          height={h} nodeTypes={nodeTypes} edgeTypes={edgeTypes} />
      )}
    </ReactFlowProvider>
  );
}
```

## 4.10 Viewer (Public, Read-Only)

```tsx
// EvolutionGraphViewer.tsx
'use client';
import { useCallback } from 'react';
import { ReactFlow, Background, Controls, MiniMap, type NodeMouseHandler } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useRouter } from 'next/navigation';
import { useEvolutionGraphData } from './hooks/useEvolutionGraphData';
import { EDGE_COLORS } from './lib/constants';
import styles from './styles/evolution-graph.module.css';

interface Props {
  slug: string; depth: number; direction: 'both' | 'up' | 'down';
  height: string; nodeTypes: any; edgeTypes: any;
}

export function EvolutionGraphViewer({ slug, depth, direction, height, nodeTypes, edgeTypes }: Props) {
  const router = useRouter();
  const { nodes, edges, loading, error } = useEvolutionGraphData({ slug, depth, direction });

  const onNodeClick: NodeMouseHandler = useCallback(
    (_e, node) => { if (node.data?.slug) router.push(`/digimon/${node.data.slug}`); },
    [router],
  );

  if (loading) return (
    <div className={styles.container} style={{ height }}>
      <div className={styles.loadingState}><div className={styles.spinner} /><span>Loading Evolution Tree...</span></div>
    </div>
  );

  if (error || nodes.length === 0) return (
    <div className={styles.container} style={{ height: 'auto', minHeight: '120px' }}>
      <div className={styles.emptyState}><p>No evolution data available.</p></div>
    </div>
  );

  return (
    <div className={styles.container} style={{ height }}>
      <svg style={{ position: 'absolute', width: 0, height: 0 }}>
        <defs>
          <marker id="evo-arrow" viewBox="0 0 10 10" refX="8" refY="5"
            markerWidth="8" markerHeight="8" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#666" />
          </marker>
        </defs>
      </svg>
      <ReactFlow
        nodes={nodes} edges={edges} nodeTypes={nodeTypes} edgeTypes={edgeTypes}
        onNodeClick={onNodeClick}
        nodesDraggable={false} nodesConnectable={false} elementsSelectable={false}
        fitView fitViewOptions={{ padding: 0.2, maxZoom: 1.5 }}
        minZoom={0.1} maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#333" gap={50} />
        <Controls showInteractive={false} />
        <MiniMap nodeColor={(n) => (n.data?.isCurrent ? '#fb923c' : '#666')}
          maskColor="rgba(0,0,0,0.7)" style={{ background: '#1a1a1a' }} />
      </ReactFlow>
      <div className={styles.legend}>
        {Object.entries(EDGE_COLORS).map(([type, color]) => (
          <div key={type} className={styles.legendItem}>
            <span className={styles.legendDot} style={{ backgroundColor: color }} />
            <span>{type.replace('-', ' ')}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## 4.11 Editor (Admin-Only)

```tsx
// EvolutionGraphEditor.tsx
'use client';
import { useCallback, useState, useEffect } from 'react';
import {
  ReactFlow, Background, Controls, MiniMap, Panel,
  addEdge, useNodesState, useEdgesState,
  type Connection, type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useEvolutionGraphData } from './hooks/useEvolutionGraphData';
import { useAutoLayout } from './hooks/useAutoLayout';
import { useGraphPersistence } from './hooks/useGraphPersistence';
import { SearchPanel } from './panels/SearchPanel';
import { GraphToolbar } from './panels/GraphToolbar';
import { EdgeEditModal } from './panels/EdgeEditModal';
import { SNAP_GRID } from './lib/constants';
import type { EvolutionEdgeData, EvolutionType } from './lib/types';
import styles from './styles/evolution-graph.module.css';

interface Props {
  slug: string; depth: number; direction: 'both' | 'up' | 'down';
  height: string; nodeTypes: any; edgeTypes: any; userRole?: string;
}

export function EvolutionGraphEditor({ slug, depth, direction, height, nodeTypes, edgeTypes, userRole }: Props) {
  const canEdit = userRole && ['owner', 'admin', 'editor'].includes(userRole.toLowerCase());

  const {
    nodes: initialNodes, edges: initialEdges, loading, error, refetch, targetDigimon,
  } = useEvolutionGraphData({ slug, depth, direction });

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [editingEdge, setEditingEdge] = useState<Edge<EvolutionEdgeData> | null>(null);

  // Sync initial data
  useEffect(() => {
    if (initialNodes.length > 0) setNodes(initialNodes);
    if (initialEdges.length > 0) setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const { runAutoLayout } = useAutoLayout(setNodes, setEdges);
  const { saveAll, saving } = useGraphPersistence(targetDigimon?.id || '');

  const onConnect = useCallback((conn: Connection) => {
    if (!conn.source || !conn.target || conn.source === conn.target) return;
    const newEdge: Edge<EvolutionEdgeData> = {
      id: `temp-${Date.now()}`, source: conn.source, target: conn.target, type: 'evolution',
      data: { id: '', evolutionType: 'normal' as EvolutionType,
        requiredLevel: null, requiredItem: null, requiredItemQuantity: null,
        jogressPartner: null, conditions: null },
    };
    setEdges((eds) => addEdge(newEdge, eds));
    setEditingEdge(newEdge);
  }, [setEdges]);

  const onEdgeClick = useCallback((_e: React.MouseEvent, edge: Edge) => {
    setEditingEdge(edge as Edge<EvolutionEdgeData>);
  }, []);

  const handleEdgeUpdate = useCallback((edgeId: string, data: Partial<EvolutionEdgeData>) => {
    setEdges((eds) => eds.map((e) => (e.id === edgeId ? { ...e, data: { ...e.data, ...data } } : e)));
    setEditingEdge(null);
  }, [setEdges]);

  const handleEdgeDelete = useCallback((edgeId: string) => {
    setEdges((eds) => eds.filter((e) => e.id !== edgeId));
    setEditingEdge(null);
  }, [setEdges]);

  const handleSave = useCallback(async () => {
    if (!targetDigimon) return;
    const positions: Record<string, { x: number; y: number }> = {};
    for (const node of nodes) positions[node.id] = { x: node.position.x, y: node.position.y };
    await saveAll(nodes, edges, positions, `${targetDigimon.name} Layout`);
    refetch();
  }, [nodes, edges, targetDigimon, saveAll, refetch]);

  if (!canEdit) return null;

  if (loading) return (
    <div className={styles.container} style={{ height }}>
      <div className={styles.loadingState}><div className={styles.spinner} /><span>Loading graph editor...</span></div>
    </div>
  );

  return (
    <div className={styles.editorContainer}>
      <div className={styles.container} style={{ height: '700px' }}>
        <ReactFlow
          nodes={nodes} edges={edges} nodeTypes={nodeTypes} edgeTypes={edgeTypes}
          onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
          onConnect={onConnect} onEdgeClick={onEdgeClick}
          snapToGrid={snapToGrid} snapGrid={SNAP_GRID}
          fitView minZoom={0.1} maxZoom={3}
          deleteKeyCode={['Backspace', 'Delete']}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant="dots" gap={25} color="#444" />
          <Controls />
          <MiniMap nodeColor={(n) => (n.data?.isCurrent ? '#fb923c' : '#666')} maskColor="rgba(0,0,0,0.7)" />
          <Panel position="top-right">
            <GraphToolbar onAutoLayout={() => runAutoLayout(nodes, edges)} onSave={handleSave}
              saving={saving} snapEnabled={snapToGrid} onToggleSnap={() => setSnapToGrid(!snapToGrid)} />
          </Panel>
          <Panel position="top-left">
            <SearchPanel onAddNode={(digi) => {
              setNodes((nds) => {
                if (nds.some((n) => n.id === digi.id)) return nds;
                return [...nds, {
                  id: digi.id, type: 'digimon',
                  position: { x: Math.random() * 400, y: Math.random() * 300 },
                  data: { id: digi.id, slug: digi.slug, name: digi.name, icon: digi.icon, form: digi.form, isCurrent: false },
                }];
              });
            }} />
          </Panel>
        </ReactFlow>
      </div>
      {editingEdge && (
        <EdgeEditModal edge={editingEdge} onSave={handleEdgeUpdate}
          onDelete={handleEdgeDelete} onClose={() => setEditingEdge(null)} />
      )}
    </div>
  );
}
```

## 4.12 Re-Render Prevention Checklist

1. **`nodeTypes`/`edgeTypes` defined outside components** — in `EvolutionGraph.tsx`. Defining inside a component body recreates the object every render → React Flow destroys and remounts every node.

2. **`DigimonNode` and `EvolutionEdge` wrapped in `React.memo()`** — only re-render when `data` or `selected` actually changes.

3. **`useNodesState`/`useEdgesState`** — React Flow's Zustand-backed state avoids batching issues.

4. **Event handlers use `useCallback`** — `onConnect`, `onEdgeClick`, `handleEdgeUpdate`, `handleEdgeDelete`, `handleSave` are stable refs.

5. **`fitView` triggers once on mount** — subsequent data changes don't re-trigger. Call `reactFlowInstance.fitView()` explicitly when needed.

6. **Abort controller on re-fetch** — prevents stale data from overwriting current state when slug/depth changes rapidly.

## 4.13 CSS Module

```css
/* styles/evolution-graph.module.css */

.container {
  position: relative;
  width: 100%;
  overflow: hidden;
  border-radius: 0.75rem;
  border: 2px solid rgba(251, 146, 60, 0.3);
  background: linear-gradient(135deg, rgba(17, 24, 39, 0.8), rgba(31, 41, 55, 0.8));
  contain: layout style paint;
}

.editorContainer {
  position: relative;
  width: 100%;
  contain: layout style paint;
}

.loadingState {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; height: 100%; gap: 1rem; color: #9ca3af;
}

.spinner {
  width: 2.5rem; height: 2.5rem; border-radius: 50%;
  border: 3px solid transparent; border-top-color: #fb923c;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.emptyState { display: flex; align-items: center; justify-content: center; padding: 2rem; color: #6b7280; }

.digimonNode {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: 8px; border-radius: 8px;
  border: 2px solid rgba(251, 146, 60, 0.4);
  background: rgba(31, 41, 55, 0.95);
  cursor: pointer; transition: border-color 0.15s, box-shadow 0.15s;
  min-width: 90px; max-width: 130px;
}
.digimonNode:hover { border-color: rgba(251, 146, 60, 0.8); box-shadow: 0 0 12px rgba(251, 146, 60, 0.3); }
.currentNode { border-color: #fb923c; box-shadow: 0 0 16px rgba(251, 146, 60, 0.4); background: rgba(251, 146, 60, 0.1); }
.selectedNode { border-color: #60a5fa; box-shadow: 0 0 16px rgba(96, 165, 250, 0.4); }

.nodeIcon { width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; }
.nodeImage { object-fit: contain; }
.nodePlaceholder { width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; color: #6b7280; background: rgba(55, 65, 81, 0.5); border-radius: 8px; }
.nodeName { font-size: 0.7rem; font-weight: 600; color: #e5e7eb; text-align: center; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.formBadge { font-size: 0.6rem; color: #9ca3af; background: rgba(55, 65, 81, 0.6); padding: 1px 6px; border-radius: 4px; }
.handle { width: 8px; height: 8px; background: #fb923c; border: 2px solid #1f2937; }

.edgeLabel {
  position: absolute; font-size: 0.65rem; color: #d1d5db;
  background: rgba(17, 24, 39, 0.9); border: 1px solid; border-radius: 4px;
  padding: 2px 6px; pointer-events: all; cursor: pointer; white-space: nowrap;
}

.legend {
  position: absolute; bottom: 8px; left: 8px; display: flex; flex-wrap: wrap; gap: 8px;
  padding: 6px 10px; background: rgba(17, 24, 39, 0.9); border-radius: 6px;
  border: 1px solid rgba(75, 85, 99, 0.4); z-index: 5;
}
.legendItem { display: flex; align-items: center; gap: 4px; font-size: 0.65rem; color: #9ca3af; text-transform: capitalize; }
.legendDot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
```
