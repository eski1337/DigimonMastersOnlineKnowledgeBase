import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  addEdge,
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  useReactFlow,
  useViewport,
  ConnectionMode,
  type Node,
  type Edge,
  type Connection,
  type NodeProps,
  type EdgeProps,
  type OnConnect,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';

/* ══════════════════════════════════════════════════════════════════════
   Types
   ══════════════════════════════════════════════════════════════════════ */

interface DigimonDoc {
  id: string;
  name: string;
  slug: string;
  form?: string;
  mainImage?: { url?: string; sizes?: { thumbnail?: { url?: string } } };
}

interface EvolutionLineDoc {
  id: string;
  name: string;
  rootDigimon: string | DigimonDoc;
  digimonInLine?: (string | DigimonDoc)[];
}

interface EvolutionEdgeDoc {
  id: string;
  source: string | DigimonDoc;
  target: string | DigimonDoc;
  evolutionType?: string;
  requiredLevel?: number;
  requiredItem?: string;
  jogressPartner?: string | DigimonDoc;
}

/* ══════════════════════════════════════════════════════════════════════
   Helpers
   ══════════════════════════════════════════════════════════════════════ */

function resolveId(val: unknown): string {
  if (typeof val === 'string') return val;
  if (val && typeof val === 'object' && 'id' in val) return String((val as any).id);
  return '';
}

function getImageUrl(d: DigimonDoc): string {
  return d.mainImage?.sizes?.thumbnail?.url || d.mainImage?.url || '';
}

const EVOLUTION_TYPES = [
  { label: 'Normal', value: 'normal' },
  { label: 'Jogress / DNA', value: 'jogress' },
  { label: 'Digi-Egg', value: 'digi-egg' },
  { label: 'X-Antibody', value: 'x-antibody' },
  { label: 'Variant', value: 'variant' },
  { label: 'Alternate', value: 'alternate' },
  { label: 'Slide', value: 'slide' },
  { label: 'Mode Change', value: 'mode-change' },
];

/* ── Dagre auto-layout ─────────────────────────────────────────────── */

const NODE_W = 160;
const NODE_H = 120;

function autoLayout(nodes: Node[], edges: Edge[]): Node[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'LR', ranksep: 120, nodesep: 60 });

  for (const n of nodes) g.setNode(n.id, { width: NODE_W, height: NODE_H });
  for (const e of edges) g.setEdge(e.source, e.target);

  dagre.layout(g);

  return nodes.map((n) => {
    const pos = g.node(n.id);
    return { ...n, position: { x: pos.x - NODE_W / 2, y: pos.y - NODE_H / 2 } };
  });
}

/* ══════════════════════════════════════════════════════════════════════
   Custom Node
   ══════════════════════════════════════════════════════════════════════ */

function DigimonEditorNode({ data }: NodeProps) {
  const d = data as { label: string; image: string; form: string };
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        padding: '8px 6px 6px',
        borderRadius: 10,
        border: '2px solid var(--theme-elevation-150)',
        background: 'var(--theme-input-bg)',
        width: NODE_W - 10,
        height: NODE_H - 6,
        overflow: 'hidden',
        cursor: 'grab',
        userSelect: 'none',
      }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 8,
          overflow: 'hidden',
          background: 'var(--theme-elevation-50)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {d.image ? (
          <img src={d.image} alt={d.label} style={{ width: 48, height: 48, objectFit: 'contain' }} />
        ) : (
          <span style={{ color: 'var(--theme-elevation-300)', fontSize: 18 }}>?</span>
        )}
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, textAlign: 'center', lineHeight: 1.2, maxWidth: 120, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>
        {d.label}
      </span>
      {d.form && (
        <span style={{ fontSize: 9, color: 'var(--theme-elevation-400)', textTransform: 'uppercase' }}>
          {d.form}
        </span>
      )}
      {/* All handles are type="source" — connectionMode="loose" on ReactFlow allows any-to-any */}
      <Handle type="source" position={Position.Left} id="left" style={{ width: 10, height: 10, background: '#f97316', border: '2px solid var(--theme-bg)', left: -6 }} />
      <Handle type="source" position={Position.Right} id="right" style={{ width: 10, height: 10, background: '#60a5fa', border: '2px solid var(--theme-bg)', right: -6 }} />
      <Handle type="source" position={Position.Top} id="top" style={{ width: 10, height: 10, background: '#f97316', border: '2px solid var(--theme-bg)', top: -6 }} />
      <Handle type="source" position={Position.Bottom} id="bottom" style={{ width: 10, height: 10, background: '#60a5fa', border: '2px solid var(--theme-bg)', bottom: -6 }} />
    </div>
  );
}

const nodeTypes = { digimon: React.memo(DigimonEditorNode) };

/* ══════════════════════════════════════════════════════════════════════
   Custom Editor Edge — smoothstep with requirement labels
   ══════════════════════════════════════════════════════════════════════ */

/* ── Module-level gap toggle (read by edge component) ────────────── */
let _showGapLabels = false;

function EditorEdgeInner(props: EdgeProps) {
  const {
    id, sourceX, sourceY, targetX, targetY,
    sourcePosition, targetPosition, data, style, markerEnd,
  } = props;

  // Straight line only when handles are on the same height (horizontal connection)
  // Smoothstep for everything else — no diagonals
  const isHorizontal =
    (sourcePosition === 'right' && targetPosition === 'left') ||
    (sourcePosition === 'left' && targetPosition === 'right');
  const sameHeight = Math.abs(sourceY - targetY) < 15;

  let edgePath: string;
  let labelX: number;
  let labelY: number;

  if (isHorizontal && sameHeight) {
    edgePath = `M ${sourceX},${sourceY} L ${targetX},${targetY}`;
    labelX = (sourceX + targetX) / 2;
    labelY = (sourceY + targetY) / 2;
  } else {
    [edgePath, labelX, labelY] = getSmoothStepPath({
      sourceX, sourceY, targetX, targetY,
      sourcePosition, targetPosition,
    });
  }

  // Gap = distance between the two handles (= node borders)
  const gap = Math.round(Math.abs(targetX - sourceX));

  const evoType = (data?.evolutionType as string) || 'normal';
  const reqLevel = data?.requiredLevel as number | undefined;
  const reqItem = data?.requiredItem as string | undefined;
  const hasReqs = Boolean(reqLevel || reqItem);

  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={style} />
      <EdgeLabelRenderer>
        {/* Gap distance label (above the edge midpoint) */}
        {_showGapLabels && gap > 0 && (
          <div
            className="nodrag nopan"
            style={{
              position: 'absolute',
              transform: `translate(-50%, -140%) translate(${labelX}px,${labelY}px)`,
              zIndex: 10,
              pointerEvents: 'none',
            }}
          >
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: '#22c55e',
                background: 'rgba(0,0,0,0.8)',
                border: '1px solid rgba(34,197,94,0.3)',
                borderRadius: 4,
                padding: '1px 5px',
                fontFamily: 'monospace',
              }}
            >
              {gap}px
            </span>
          </div>
        )}
        {/* Requirement labels */}
        {hasReqs && (
          <div
            className="nodrag nopan"
            style={{
              position: 'absolute',
              transform: `translate(-50%, ${_showGapLabels ? '20%' : '-50%'}) translate(${labelX}px,${labelY}px)`,
              zIndex: 10,
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                background: 'rgba(15,15,20,0.92)',
                border: `1px solid ${evoType === 'jogress' ? '#ec4899' : '#60a5fa'}40`,
                borderRadius: 6,
                padding: '2px 7px',
                whiteSpace: 'nowrap',
              }}
            >
              {reqLevel && (
                <span style={{ fontSize: 10, fontWeight: 600, color: '#fbbf24' }}>Lv.{reqLevel}</span>
              )}
              {reqLevel && reqItem && (
                <span style={{ fontSize: 8, color: 'var(--theme-elevation-300)' }}>&bull;</span>
              )}
              {reqItem && (
                <span style={{ fontSize: 10, fontWeight: 500, color: '#a5b4fc' }}>{reqItem}</span>
              )}
            </div>
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  );
}

const editorEdgeTypes = { smoothstep: React.memo(EditorEdgeInner) };

/* ══════════════════════════════════════════════════════════════════════
   Alignment Guides + Gap Markers between node borders
   ══════════════════════════════════════════════════════════════════════ */

const SNAP_PX = 5;

interface GapLabel { x: number; y: number; gap: number; dir: 'h' | 'v'; x1: number; y1: number; x2: number; y2: number }

function AlignmentOverlay({ nodes, draggingId, showGaps }: { nodes: Node[]; draggingId: string | null; showGaps: boolean }) {
  const { x: vx, y: vy, zoom } = useViewport();
  const guides: JSX.Element[] = [];
  const gaps: GapLabel[] = [];

  /* ── Alignment guides (only while dragging) ─────────────────────── */
  if (draggingId) {
    const drag = nodes.find((n) => n.id === draggingId);
    if (drag) {
      const dTop = drag.position.y;
      let bestH: { pos: number; minX: number; maxX: number } | null = null;
      let bestHDist = Infinity;

      for (const n of nodes) {
        if (n.id === draggingId) continue;
        const diff = Math.abs(dTop - n.position.y);
        if (diff < SNAP_PX && diff < bestHDist) {
          bestHDist = diff;
          bestH = {
            pos: n.position.y,
            minX: Math.min(drag.position.x, n.position.x) - 20,
            maxX: Math.max(drag.position.x + NODE_W, n.position.x + NODE_W) + 20,
          };
        }
      }
      if (bestH) {
        for (const n of nodes) {
          if (n.id === draggingId) continue;
          if (Math.abs(n.position.y - bestH.pos) < SNAP_PX) {
            bestH.minX = Math.min(bestH.minX, n.position.x - 20);
            bestH.maxX = Math.max(bestH.maxX, n.position.x + NODE_W + 20);
          }
        }
        guides.push(
          <line key="al-t" x1={bestH.minX} y1={bestH.pos} x2={bestH.maxX} y2={bestH.pos} stroke="#22c55e" strokeWidth={1} strokeDasharray="6 4" opacity={0.7} />,
          <line key="al-b" x1={bestH.minX} y1={bestH.pos + NODE_H} x2={bestH.maxX} y2={bestH.pos + NODE_H} stroke="#22c55e" strokeWidth={1} strokeDasharray="6 4" opacity={0.4} />,
        );
      }
    }
  }

  /* ── Gap markers between all nearby node pairs ──────────────────── */
  if (showGaps && nodes.length > 1) {
    const seen = new Set<string>();
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      const aR = a.position.x + NODE_W;
      const aB = a.position.y + NODE_H;

      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        const bR = b.position.x + NODE_W;
        const bB = b.position.y + NODE_H;
        const key = [a.id, b.id].sort().join('-');
        if (seen.has(key)) continue;

        // Check horizontal adjacency (overlapping Y range)
        const yOverlap = Math.min(aB, bB) - Math.max(a.position.y, b.position.y);
        if (yOverlap > 10) {
          // Horizontal gap: right edge of left node → left edge of right node
          const left = a.position.x < b.position.x ? a : b;
          const right = a.position.x < b.position.x ? b : a;
          const hGap = Math.round(right.position.x - (left.position.x + NODE_W));
          if (hGap > 5 && hGap < 1000) {
            seen.add(key);
            const midY = (Math.max(a.position.y, b.position.y) + Math.min(aB, bB)) / 2;
            gaps.push({
              x: left.position.x + NODE_W + hGap / 2,
              y: midY,
              gap: hGap,
              dir: 'h',
              x1: left.position.x + NODE_W,
              y1: midY,
              x2: right.position.x,
              y2: midY,
            });
          }
        }

        // Check vertical adjacency (overlapping X range)
        const xOverlap = Math.min(aR, bR) - Math.max(a.position.x, b.position.x);
        if (xOverlap > 10) {
          const top = a.position.y < b.position.y ? a : b;
          const bot = a.position.y < b.position.y ? b : a;
          const vGap = Math.round(bot.position.y - (top.position.y + NODE_H));
          if (vGap > 5 && vGap < 1000) {
            const vKey = key + '-v';
            if (!seen.has(vKey)) {
              seen.add(vKey);
              const midX = (Math.max(a.position.x, b.position.x) + Math.min(aR, bR)) / 2;
              gaps.push({
                x: midX,
                y: top.position.y + NODE_H + vGap / 2,
                gap: vGap,
                dir: 'v',
                x1: midX,
                y1: top.position.y + NODE_H,
                x2: midX,
                y2: bot.position.y,
              });
            }
          }
        }
      }
    }
  }

  if (guides.length === 0 && gaps.length === 0) return null;

  return (
    <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 5, overflow: 'visible' }}>
      <g transform={`translate(${vx}, ${vy}) scale(${zoom})`}>
        {guides}
        {gaps.map((m, i) => {
          const isH = m.dir === 'h';
          const sw = 1 / zoom; // keep stroke width constant regardless of zoom
          return (
            <g key={`gap${i}`}>
              {/* Measurement line */}
              <line x1={m.x1} y1={m.y1} x2={m.x2} y2={m.y2} stroke="#22c55e" strokeWidth={sw} strokeDasharray="3 2" opacity={0.5} />
              {/* End caps */}
              {isH ? (
                <>
                  <line x1={m.x1} y1={m.y1 - 6} x2={m.x1} y2={m.y1 + 6} stroke="#22c55e" strokeWidth={sw} opacity={0.5} />
                  <line x1={m.x2} y1={m.y2 - 6} x2={m.x2} y2={m.y2 + 6} stroke="#22c55e" strokeWidth={sw} opacity={0.5} />
                </>
              ) : (
                <>
                  <line x1={m.x1 - 6} y1={m.y1} x2={m.x1 + 6} y2={m.y1} stroke="#22c55e" strokeWidth={sw} opacity={0.5} />
                  <line x1={m.x2 - 6} y1={m.y2} x2={m.x2 + 6} y2={m.y2} stroke="#22c55e" strokeWidth={sw} opacity={0.5} />
                </>
              )}
              {/* Label */}
              <rect x={m.x - 16} y={m.y - 8} width={32} height={15} rx={3} fill="rgba(0,0,0,0.85)" />
              <text x={m.x} y={m.y + 4} textAnchor="middle" fontSize={9} fontFamily="monospace" fontWeight={700} fill="#22c55e">{m.gap}px</text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   Edge Type Picker Popup
   ══════════════════════════════════════════════════════════════════════ */

interface EdgePopupProps {
  edgeId: string;
  x: number;
  y: number;
  currentType: string;
  currentLevel: number | undefined;
  currentItem: string | undefined;
  onUpdate: (id: string, type: string, level?: number, item?: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

function EdgePopup({ edgeId, x, y, currentType, currentLevel, currentItem, onUpdate, onDelete, onClose }: EdgePopupProps) {
  const [evoType, setEvoType] = useState(currentType || 'normal');
  const [level, setLevel] = useState(currentLevel?.toString() || '');
  const [item, setItem] = useState(currentItem || '');

  return (
    <div
      style={{
        position: 'fixed',
        left: x,
        top: y,
        zIndex: 9999,
        background: 'var(--theme-bg)',
        border: '1px solid var(--theme-elevation-150)',
        borderRadius: 8,
        padding: 12,
        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
        minWidth: 200,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--theme-elevation-400)' }}>Edge Settings</div>

      <label style={{ fontSize: 11, fontWeight: 500, display: 'block', marginBottom: 4 }}>Type</label>
      <select
        value={evoType}
        onChange={(e) => setEvoType(e.target.value)}
        style={{ width: '100%', padding: '4px 6px', borderRadius: 4, border: '1px solid var(--theme-elevation-150)', background: 'var(--theme-input-bg)', color: 'var(--theme-text)', fontSize: 12, marginBottom: 8 }}
      >
        {EVOLUTION_TYPES.map((t) => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>

      <label style={{ fontSize: 11, fontWeight: 500, display: 'block', marginBottom: 4 }}>Required Level</label>
      <input
        type="number"
        value={level}
        onChange={(e) => setLevel(e.target.value)}
        placeholder="e.g. 41"
        style={{ width: '100%', padding: '4px 6px', borderRadius: 4, border: '1px solid var(--theme-elevation-150)', background: 'var(--theme-input-bg)', color: 'var(--theme-text)', fontSize: 12, marginBottom: 8, boxSizing: 'border-box' }}
      />

      <label style={{ fontSize: 11, fontWeight: 500, display: 'block', marginBottom: 4 }}>Required Item</label>
      <input
        type="text"
        value={item}
        onChange={(e) => setItem(e.target.value)}
        placeholder="e.g. Evoluter"
        style={{ width: '100%', padding: '4px 6px', borderRadius: 4, border: '1px solid var(--theme-elevation-150)', background: 'var(--theme-input-bg)', color: 'var(--theme-text)', fontSize: 12, marginBottom: 10, boxSizing: 'border-box' }}
      />

      <div style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={() => { onUpdate(edgeId, evoType, level ? parseInt(level) : undefined, item || undefined); onClose(); }}
          style={{ flex: 1, padding: '5px 0', borderRadius: 4, border: 'none', background: 'var(--theme-success-500)', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
        >
          Apply
        </button>
        <button
          onClick={() => { onDelete(edgeId); onClose(); }}
          style={{ padding: '5px 10px', borderRadius: 4, border: 'none', background: '#ef4444', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
        >
          Delete
        </button>
        <button
          onClick={onClose}
          style={{ padding: '5px 10px', borderRadius: 4, border: '1px solid var(--theme-elevation-150)', background: 'transparent', color: 'var(--theme-text)', fontSize: 12, cursor: 'pointer' }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   Main Editor Component
   ══════════════════════════════════════════════════════════════════════ */

const EvolutionEditor: React.FC = () => {
  /* ── Master data ────────────────────────────────────────────────── */
  const [allDigimon, setAllDigimon] = useState<DigimonDoc[]>([]);
  const [allLines, setAllLines] = useState<EvolutionLineDoc[]>([]);
  const [loadingInit, setLoadingInit] = useState(true);

  /* ── Search ─────────────────────────────────────────────────────── */
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  /* ── Selected line ──────────────────────────────────────────────── */
  const [selectedLineId, setSelectedLineId] = useState<string>('');
  const [lineName, setLineName] = useState('');

  /* ── React Flow state ───────────────────────────────────────────── */
  const [nodes, setNodes, onNodesChange] = useNodesState([] as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([] as Edge[]);
  const [dirty, setDirty] = useState(false);

  /* ── Guides + gap markers ─────────────────────────────────────────── */
  const [showGaps, setShowGaps] = useState(false);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);

  /* ── Edge popup ─────────────────────────────────────────────────── */
  const [edgePopup, setEdgePopup] = useState<{ id: string; x: number; y: number } | null>(null);

  /* ── Saving ─────────────────────────────────────────────────────── */
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  /* ── Track existing edge doc IDs so we can update/delete properly ── */
  const existingEdgeDocsRef = useRef<Map<string, string>>(new Map()); // "sourceId->targetId" => edgeDocId

  /* ── Digimon lookup ─────────────────────────────────────────────── */
  const digimonById = useMemo(() => {
    const map = new Map<string, DigimonDoc>();
    for (const d of allDigimon) map.set(d.id, d);
    return map;
  }, [allDigimon]);

  /* ── Load master data ───────────────────────────────────────────── */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Load all Digimon
        const digs: DigimonDoc[] = [];
        let page = 1;
        while (true) {
          const res = await fetch(`/api/digimon?limit=100&page=${page}&depth=0&sort=name`);
          const data = await res.json();
          digs.push(...(data.docs || []));
          if (!data.hasNextPage) break;
          page++;
        }

        // Load all evolution lines
        const lines: EvolutionLineDoc[] = [];
        page = 1;
        while (true) {
          const res = await fetch(`/api/evolution-lines?limit=100&page=${page}&depth=0&sort=name`);
          const data = await res.json();
          lines.push(...(data.docs || []));
          if (!data.hasNextPage) break;
          page++;
        }

        if (!cancelled) {
          setAllDigimon(digs);
          setAllLines(lines);
          setLoadingInit(false);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || 'Failed to load data');
          setLoadingInit(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  /* ── Search results ─────────────────────────────────────────────── */
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    const onCanvas = new Set(nodes.map((n) => n.id));
    return allDigimon
      .filter((d) => d.name.toLowerCase().includes(q) && !onCanvas.has(d.id))
      .slice(0, 20);
  }, [searchQuery, allDigimon, nodes]);

  /* ── Add a Digimon node to canvas ───────────────────────────────── */
  const addDigimonNode = useCallback(
    (d: DigimonDoc) => {
      const existingIds = new Set(nodes.map((n) => n.id));
      if (existingIds.has(d.id)) return;

      // Place new node offset from existing ones
      const maxX = nodes.reduce((max, n) => Math.max(max, n.position.x), 0);
      const newNode: Node = {
        id: d.id,
        type: 'digimon',
        position: { x: nodes.length === 0 ? 50 : maxX + NODE_W + 40, y: 100 + Math.random() * 80 },
        data: { label: d.name, image: getImageUrl(d), form: d.form || '' },
      };
      setNodes((prev) => [...prev, newNode]);
      setDirty(true);
      setSearchQuery('');
    },
    [nodes, setNodes],
  );

  /* ── Remove a node ──────────────────────────────────────────────── */
  const removeNode = useCallback(
    (nodeId: string) => {
      setNodes((prev) => prev.filter((n) => n.id !== nodeId));
      setEdges((prev) => prev.filter((e) => e.source !== nodeId && e.target !== nodeId));
      setDirty(true);
    },
    [setNodes, setEdges],
  );

  /* ── Connect two nodes ──────────────────────────────────────────── */
  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      if (connection.source === connection.target) return;

      // Check for duplicate
      const exists = edges.some((e) => e.source === connection.source && e.target === connection.target);
      if (exists) return;

      const newEdge: Edge = {
        id: `e-${connection.source}-${connection.target}-${connection.sourceHandle || 'r'}-${connection.targetHandle || 'l'}`,
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle,
        type: 'smoothstep',
        data: { evolutionType: 'normal' },
        style: { stroke: '#60a5fa', strokeWidth: 2 },
        animated: false,
      };
      setEdges((prev) => addEdge(newEdge, prev));
      setDirty(true);
    },
    [edges, setEdges],
  );

  /* ── Track drag changes as dirty + detect dragging node ─────────── */
  const handleNodesChange = useCallback(
    (changes: any) => {
      onNodesChange(changes);
      const dragChange = changes.find((c: any) => c.type === 'position' && c.dragging);
      if (dragChange) {
        setDirty(true);
        setDraggingNodeId(dragChange.id);
      } else if (changes.some((c: any) => c.type === 'position' && !c.dragging)) {
        setDraggingNodeId(null);
      }
    },
    [onNodesChange],
  );

  /* ── Click edge → show popup ────────────────────────────────────── */
  const handleEdgeClick = useCallback((_event: React.MouseEvent, edge: Edge) => {
    setEdgePopup({ id: edge.id, x: _event.clientX, y: _event.clientY });
  }, []);

  const updateEdgeData = useCallback(
    (edgeId: string, evoType: string, level?: number, item?: string) => {
      setEdges((prev) =>
        prev.map((e) => {
          if (e.id !== edgeId) return e;
          return {
            ...e,
            data: { ...e.data, evolutionType: evoType, requiredLevel: level, requiredItem: item },
            style: { stroke: evoType === 'jogress' ? '#ec4899' : evoType === 'x-antibody' ? '#a855f7' : '#60a5fa', strokeWidth: 2 },
            animated: evoType === 'jogress',
          };
        }),
      );
      setDirty(true);
    },
    [setEdges],
  );

  const deleteEdge = useCallback(
    (edgeId: string) => {
      setEdges((prev) => prev.filter((e) => e.id !== edgeId));
      setDirty(true);
    },
    [setEdges],
  );

  /* ── Close popup on background click ────────────────────────────── */
  useEffect(() => {
    if (!edgePopup) return;
    const handler = () => setEdgePopup(null);
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, [edgePopup]);

  /* ── Auto-layout ────────────────────────────────────────────────── */
  const handleAutoLayout = useCallback(() => {
    setNodes((prev) => autoLayout(prev, edges));
    setDirty(true);
  }, [edges, setNodes]);

  /* ── Load an evolution line ─────────────────────────────────────── */
  const loadLine = useCallback(
    async (lineId: string) => {
      if (!lineId) {
        setNodes([]);
        setEdges([]);
        setLineName('');
        setSelectedLineId('');
        setDirty(false);
        existingEdgeDocsRef.current.clear();
        return;
      }

      setError('');
      setSuccess('');

      try {
        // Fetch line with depth to get digimon data
        const lineRes = await fetch(`/api/evolution-lines/${lineId}?depth=1`);
        const lineDoc = await lineRes.json();
        setLineName(lineDoc.name || '');

        // Get all digimon IDs in this line
        const digimonIds: string[] = (lineDoc.digimonInLine || []).map((d: any) => resolveId(d));

        // Fetch all evolution edges where source or target is in this line
        const edgeDocs: EvolutionEdgeDoc[] = [];
        for (const digId of digimonIds) {
          const res = await fetch(`/api/evolution-edges?where[source][equals]=${digId}&depth=0&limit=100`);
          const data = await res.json();
          edgeDocs.push(...(data.docs || []));
        }

        // Deduplicate edges
        const edgeMap = new Map<string, EvolutionEdgeDoc>();
        for (const e of edgeDocs) {
          const key = `${resolveId(e.source)}->${resolveId(e.target)}`;
          if (!edgeMap.has(key)) edgeMap.set(key, e);
        }

        // Build nodes
        const nodeSet = new Set<string>();
        for (const digId of digimonIds) nodeSet.add(digId);
        for (const [, e] of edgeMap) {
          nodeSet.add(resolveId(e.source));
          nodeSet.add(resolveId(e.target));
        }

        const newNodes: Node[] = [];
        for (const digId of nodeSet) {
          const doc = digimonById.get(digId);
          if (!doc) continue;
          newNodes.push({
            id: doc.id,
            type: 'digimon',
            position: { x: 0, y: 0 },
            data: { label: doc.name, image: getImageUrl(doc), form: doc.form || '' },
          });
        }

        // Build edges
        existingEdgeDocsRef.current.clear();
        const newEdges: Edge[] = [];
        for (const [key, e] of edgeMap) {
          const src = resolveId(e.source);
          const tgt = resolveId(e.target);
          existingEdgeDocsRef.current.set(`${src}->${tgt}`, e.id);
          const evoType = e.evolutionType || 'normal';
          newEdges.push({
            id: `e-${src}-${tgt}`,
            source: src,
            target: tgt,
            type: 'smoothstep',
            data: { evolutionType: evoType, requiredLevel: e.requiredLevel, requiredItem: e.requiredItem },
            style: { stroke: evoType === 'jogress' ? '#ec4899' : evoType === 'x-antibody' ? '#a855f7' : '#60a5fa', strokeWidth: 2 },
            animated: evoType === 'jogress',
          });
        }

        // Try to load saved layout (field is 'nodes' in collection schema)
        const layoutRes = await fetch(`/api/evolution-graph-layouts?where[rootDigimon][equals]=${resolveId(lineDoc.rootDigimon)}&depth=0&limit=1`);
        const layoutData = await layoutRes.json();
        const savedLayout = layoutData.docs?.[0]?.nodes;

        if (savedLayout && typeof savedLayout === 'object') {
          for (const n of newNodes) {
            const pos = savedLayout[n.id];
            if (pos && typeof pos.x === 'number') {
              n.position = { x: pos.x, y: pos.y };
            }
          }

          // Restore edge handle info (top/bottom connections) — keyed by source->target
          const savedEdgeHandles = savedLayout.__edgeHandles;
          if (savedEdgeHandles && typeof savedEdgeHandles === 'object') {
            for (const edge of newEdges) {
              const key = `${edge.source}->${edge.target}`;
              const handles = savedEdgeHandles[key];
              if (handles) {
                if (handles.sourceHandle) edge.sourceHandle = handles.sourceHandle;
                if (handles.targetHandle) edge.targetHandle = handles.targetHandle;
              }
            }
          }
        }

        // If no layout, auto-layout
        const hasPositions = newNodes.some((n) => n.position.x !== 0 || n.position.y !== 0);
        const finalNodes = hasPositions ? newNodes : autoLayout(newNodes, newEdges);

        setNodes(finalNodes);
        setEdges(newEdges);
        setSelectedLineId(lineId);
        setDirty(false);
      } catch (err: any) {
        setError(`Failed to load line: ${err.message}`);
      }
    },
    [digimonById, setNodes, setEdges],
  );

  /* ── Save ────────────────────────────────────────────────────────── */
  const handleSave = useCallback(async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      // 1. Determine all digimon IDs on canvas
      const digimonIds = nodes.map((n) => n.id);
      if (digimonIds.length === 0) throw new Error('Add at least one Digimon to the canvas');

      // 2. Find or detect root (leftmost node)
      const rootNode = nodes.reduce((min, n) => (n.position.x < min.position.x ? n : min), nodes[0]);
      const rootDigimonId = rootNode.id;

      // 3. Save/update evolution line
      let lineId = selectedLineId;
      const linePayload = {
        name: lineName || `${(rootNode.data as any).label} Line`,
        rootDigimon: rootDigimonId,
        digimonInLine: digimonIds,
        isPublic: true,
      };

      if (lineId) {
        await fetch(`/api/evolution-lines/${lineId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(linePayload),
        });
      } else {
        const res = await fetch('/api/evolution-lines', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(linePayload),
        });
        const created = await res.json();
        if (created.doc?.id) {
          lineId = created.doc.id;
          setSelectedLineId(lineId);
        } else if (created.id) {
          lineId = created.id;
          setSelectedLineId(lineId);
        }
      }

      // 4. Sync evolution-edges
      const currentEdgeKeys = new Set<string>();
      for (const edge of edges) {
        const key = `${edge.source}->${edge.target}`;
        currentEdgeKeys.add(key);
        const existingDocId = existingEdgeDocsRef.current.get(key);
        const edgeData: any = {
          source: edge.source,
          target: edge.target,
          evolutionType: (edge.data as any)?.evolutionType || 'normal',
        };
        if ((edge.data as any)?.requiredLevel) edgeData.requiredLevel = (edge.data as any).requiredLevel;
        if ((edge.data as any)?.requiredItem) edgeData.requiredItem = (edge.data as any).requiredItem;

        if (existingDocId) {
          await fetch(`/api/evolution-edges/${existingDocId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(edgeData),
          });
        } else {
          const res = await fetch('/api/evolution-edges', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(edgeData),
          });
          const created = await res.json();
          const docId = created.doc?.id || created.id;
          if (docId) existingEdgeDocsRef.current.set(key, docId);
        }
      }

      // Delete edges that were removed from canvas
      for (const [key, docId] of existingEdgeDocsRef.current) {
        if (!currentEdgeKeys.has(key)) {
          await fetch(`/api/evolution-edges/${docId}`, { method: 'DELETE' });
          existingEdgeDocsRef.current.delete(key);
        }
      }

      // 5. Save layout
      const nodePositions: Record<string, { x: number; y: number }> = {};
      for (const n of nodes) {
        nodePositions[n.id] = { x: n.position.x, y: n.position.y };
      }

      const layoutSearchRes = await fetch(`/api/evolution-graph-layouts?where[rootDigimon][equals]=${rootDigimonId}&depth=0&limit=1`);
      const layoutSearchData = await layoutSearchRes.json();
      const existingLayoutId = layoutSearchData.docs?.[0]?.id;

      // Save edge handle mappings keyed by source->target (edge IDs change on reload)
      const edgeHandles: Record<string, { sourceHandle?: string | null; targetHandle?: string | null }> = {};
      for (const edge of edges) {
        if (edge.sourceHandle || edge.targetHandle) {
          edgeHandles[`${edge.source}->${edge.target}`] = { sourceHandle: edge.sourceHandle, targetHandle: edge.targetHandle };
        }
      }

      const layoutPayload = {
        rootDigimon: rootDigimonId,
        nodes: { ...nodePositions, __edgeHandles: edgeHandles },
      };

      if (existingLayoutId) {
        await fetch(`/api/evolution-graph-layouts/${existingLayoutId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(layoutPayload),
        });
      } else {
        await fetch('/api/evolution-graph-layouts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(layoutPayload),
        });
      }

      // 6. Refresh lines list
      const linesRes = await fetch('/api/evolution-lines?limit=200&depth=0&sort=name');
      const linesData = await linesRes.json();
      setAllLines(linesData.docs || []);

      setDirty(false);
      setSuccess('Saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(`Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }, [nodes, edges, selectedLineId, lineName]);

  /* ── Clear canvas ───────────────────────────────────────────────── */
  const handleClear = useCallback(() => {
    if (nodes.length > 0 && !window.confirm('Clear all nodes and edges from canvas?')) return;
    setNodes([]);
    setEdges([]);
    setSelectedLineId('');
    setLineName('');
    setDirty(false);
    existingEdgeDocsRef.current.clear();
  }, [nodes, setNodes, setEdges]);

  /* ══════════════════════════════════════════════════════════════════
     Render
     ══════════════════════════════════════════════════════════════════ */

  if (loadingInit) {
    return <div style={{ padding: 40, color: 'var(--theme-text)' }}>Loading evolution data...</div>;
  }

  return (
    <div style={{ padding: '24px 32px', color: 'var(--theme-text)', minHeight: '100vh' }}>
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <a
          href="/admin"
          style={{
            padding: '6px 14px',
            borderRadius: 6,
            border: '1px solid var(--theme-elevation-150)',
            background: 'var(--theme-elevation-50)',
            color: 'var(--theme-elevation-400)',
            fontSize: 13,
            fontWeight: 500,
            textDecoration: 'none',
            cursor: 'pointer',
          }}
        >
          ← Dashboard
        </a>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>Digivolution Editor</h1>
      </div>
      <p style={{ color: 'var(--theme-elevation-400)', marginBottom: 16, fontSize: 14 }}>
        Search Digimon in the sidebar, click to add. Drag from any handle to any handle to connect.
        Click an edge to set evolution type. Drag nodes to arrange.
      </p>

      {/* ── Messages ────────────────────────────────────────────────── */}
      {error && (
        <div style={{ background: '#7f1d1d', color: '#fca5a5', padding: '10px 16px', borderRadius: 6, marginBottom: 12, fontSize: 14 }}>
          {error}
          <button onClick={() => setError('')} style={{ float: 'right', background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', fontWeight: 700 }}>×</button>
        </div>
      )}
      {success && (
        <div style={{ background: '#14532d', color: '#86efac', padding: '10px 16px', borderRadius: 6, marginBottom: 12, fontSize: 14 }}>
          {success}
        </div>
      )}

      {/* ── Toolbar ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        {/* Line selector */}
        <select
          value={selectedLineId}
          onChange={(e) => loadLine(e.target.value)}
          style={{
            padding: '6px 10px',
            borderRadius: 6,
            border: '1px solid var(--theme-elevation-150)',
            background: 'var(--theme-input-bg)',
            color: 'var(--theme-text)',
            fontSize: 13,
            minWidth: 220,
          }}
        >
          <option value="">— Select Evolution Line —</option>
          {allLines.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>

        {/* Line name (editable) */}
        {(selectedLineId || nodes.length > 0) && (
          <input
            type="text"
            value={lineName}
            onChange={(e) => { setLineName(e.target.value); setDirty(true); }}
            placeholder="Line name (e.g. Agumon Line)"
            style={{
              padding: '6px 10px',
              borderRadius: 6,
              border: '1px solid var(--theme-elevation-150)',
              background: 'var(--theme-input-bg)',
              color: 'var(--theme-text)',
              fontSize: 13,
              width: 200,
            }}
          />
        )}

        <div style={{ flex: 1 }} />

        <button
          onClick={handleAutoLayout}
          disabled={nodes.length === 0}
          style={{
            padding: '6px 16px',
            borderRadius: 6,
            border: '1px solid var(--theme-elevation-150)',
            background: 'var(--theme-elevation-50)',
            color: 'var(--theme-text)',
            fontSize: 13,
            fontWeight: 500,
            cursor: nodes.length > 0 ? 'pointer' : 'default',
            opacity: nodes.length > 0 ? 1 : 0.4,
          }}
        >
          Auto Layout
        </button>

        <button
          onClick={() => { setShowGaps((g) => { _showGapLabels = !g; return !g; }); setEdges((prev) => [...prev]); }}
          style={{
            padding: '6px 16px',
            borderRadius: 6,
            border: `1px solid ${showGaps ? '#22c55e' : 'var(--theme-elevation-150)'}`,
            background: showGaps ? 'rgba(34,197,94,0.1)' : 'var(--theme-elevation-50)',
            color: showGaps ? '#22c55e' : 'var(--theme-text)',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          {showGaps ? 'Gaps ON' : 'Gaps OFF'}
        </button>

        <button
          onClick={handleClear}
          style={{
            padding: '6px 16px',
            borderRadius: 6,
            border: '1px solid #ef4444',
            background: 'transparent',
            color: '#ef4444',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Clear
        </button>

        <button
          onClick={handleSave}
          disabled={!dirty || saving || nodes.length === 0}
          style={{
            padding: '6px 24px',
            borderRadius: 6,
            border: 'none',
            background: dirty && nodes.length > 0 ? 'var(--theme-success-500)' : 'var(--theme-elevation-150)',
            color: dirty && nodes.length > 0 ? '#fff' : 'var(--theme-elevation-400)',
            fontSize: 14,
            fontWeight: 600,
            cursor: dirty && !saving && nodes.length > 0 ? 'pointer' : 'default',
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? 'Saving...' : dirty ? 'Save' : 'Saved'}
        </button>
      </div>

      {/* ── Main area: sidebar + canvas ─────────────────────────────── */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'stretch' }}>
        {/* ── Sidebar ─────────────────────────────────────────────── */}
        <div
          style={{
            width: 220,
            flexShrink: 0,
            background: 'var(--theme-elevation-50)',
            border: '1px solid var(--theme-elevation-150)',
            borderRadius: 8,
            padding: 12,
            maxHeight: 'calc(100vh - 280px)',
            overflowY: 'auto',
          }}
        >
          {/* Search */}
          <div style={{ marginBottom: 12 }}>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Digimon..."
              style={{
                width: '100%',
                padding: '7px 10px',
                borderRadius: 6,
                border: '1px solid var(--theme-elevation-150)',
                background: 'var(--theme-input-bg)',
                color: 'var(--theme-text)',
                fontSize: 13,
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Search results */}
          {searchResults.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--theme-elevation-400)', marginBottom: 6 }}>
                Results ({searchResults.length})
              </div>
              {searchResults.map((d) => (
                <div
                  key={d.id}
                  onClick={() => addDigimonNode(d)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '5px 8px',
                    marginBottom: 3,
                    borderRadius: 6,
                    cursor: 'pointer',
                    border: '1px solid transparent',
                    transition: 'all 0.1s',
                    fontSize: 12,
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.border = '1px solid var(--theme-elevation-150)';
                    (e.currentTarget as HTMLElement).style.background = 'var(--theme-elevation-100)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.border = '1px solid transparent';
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                  }}
                >
                  <div style={{ width: 28, height: 28, borderRadius: 4, overflow: 'hidden', background: 'var(--theme-elevation-100)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {getImageUrl(d) ? (
                      <img src={getImageUrl(d)} alt="" style={{ width: 24, height: 24, objectFit: 'contain' }} />
                    ) : (
                      <span style={{ color: 'var(--theme-elevation-300)', fontSize: 10 }}>?</span>
                    )}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600 }}>{d.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--theme-elevation-400)' }}>{d.form || ''}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Nodes on canvas */}
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--theme-elevation-400)', marginBottom: 6 }}>
            On Canvas ({nodes.length})
          </div>
          {nodes.length === 0 && (
            <div style={{ fontSize: 12, color: 'var(--theme-elevation-300)', fontStyle: 'italic' }}>
              Search above to add Digimon
            </div>
          )}
          {nodes.map((n) => {
            const d = n.data as { label: string; image: string; form: string };
            return (
              <div
                key={n.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 6px',
                  marginBottom: 2,
                  borderRadius: 4,
                  fontSize: 12,
                }}
              >
                <div style={{ width: 22, height: 22, borderRadius: 3, overflow: 'hidden', background: 'var(--theme-elevation-100)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {d.image ? (
                    <img src={d.image} alt="" style={{ width: 18, height: 18, objectFit: 'contain' }} />
                  ) : (
                    <span style={{ fontSize: 8, color: 'var(--theme-elevation-300)' }}>?</span>
                  )}
                </div>
                <span style={{ fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {d.label}
                </span>
                <button
                  onClick={() => removeNode(n.id)}
                  style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 14, fontWeight: 700, padding: '0 2px', lineHeight: 1 }}
                  title="Remove from canvas"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>

        {/* ── React Flow Canvas ───────────────────────────────────── */}
        <div
          style={{
            flex: 1,
            height: 'calc(100vh - 280px)',
            minHeight: 500,
            border: '1px solid var(--theme-elevation-150)',
            borderRadius: 8,
            overflow: 'hidden',
            background: 'var(--theme-bg)',
          }}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={handleNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onEdgeClick={handleEdgeClick}
            nodeTypes={nodeTypes}
            edgeTypes={editorEdgeTypes}
            fitView
            fitViewOptions={{ padding: 0.3, maxZoom: 1.5 }}
            deleteKeyCode="Delete"
            proOptions={{ hideAttribution: true }}
            minZoom={0.2}
            maxZoom={3}
            snapToGrid
            snapGrid={[10, 10]}
            connectionMode={ConnectionMode.Loose}
          >
            <AlignmentOverlay nodes={nodes} draggingId={draggingNodeId} showGaps={showGaps} />
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="var(--theme-elevation-100)" />
            <Controls showInteractive={false} />
            <MiniMap
              nodeStrokeWidth={3}
              style={{ background: 'var(--theme-elevation-50)', border: '1px solid var(--theme-elevation-150)', borderRadius: 6 }}
              maskColor="rgba(0,0,0,0.15)"
            />
          </ReactFlow>
        </div>
      </div>

      {/* ── Edge Popup ──────────────────────────────────────────────── */}
      {edgePopup && (() => {
        const edge = edges.find((e) => e.id === edgePopup.id);
        if (!edge) return null;
        return (
          <EdgePopup
            edgeId={edgePopup.id}
            x={edgePopup.x}
            y={edgePopup.y}
            currentType={(edge.data as any)?.evolutionType || 'normal'}
            currentLevel={(edge.data as any)?.requiredLevel}
            currentItem={(edge.data as any)?.requiredItem}
            onUpdate={updateEdgeData}
            onDelete={deleteEdge}
            onClose={() => setEdgePopup(null)}
          />
        );
      })()}
    </div>
  );
};

export default EvolutionEditor;
