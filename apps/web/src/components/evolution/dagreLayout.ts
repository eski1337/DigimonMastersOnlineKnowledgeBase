import dagre from '@dagrejs/dagre';
import type { EvolutionNode, EvolutionEdge, EvolutionLayout } from './useEvolutionGraph';
import type { Node, Edge } from '@xyflow/react';
import type { DigimonNodeData } from './nodeTypes';
import { COMPACT_NODE_WIDTH, COMPACT_NODE_HEIGHT } from './nodeTypes';

/* ── Constants ────────────────────────────────────────────────────────── */

const NODE_WIDTH = 200;
const NODE_HEIGHT = 190;
const RANK_SEP = 180;
const NODE_SEP = 70;

/* ── Build React Flow nodes + edges from API data ─────────────────────── */

export function buildFlowElements(
  apiNodes: EvolutionNode[],
  apiEdges: EvolutionEdge[],
  layout: EvolutionLayout | null | undefined,
  currentSlug: string,
): { nodes: Node<DigimonNodeData>[]; edges: Edge[] } {
  const hasLayout = layout?.nodes && Object.keys(layout.nodes).length > 0;

  // Build edge array first (same for both layout modes)
  const edges: Edge[] = apiEdges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    type: 'evolution',
    data: {
      evolutionType: e.evolutionType,
      requiredLevel: e.requiredLevel,
      requiredItem: e.requiredItem,
    },
    animated: e.evolutionType === 'jogress',
  }));

  if (hasLayout) {
    // Use saved positions
    const nodes: Node<DigimonNodeData>[] = apiNodes.map((n) => {
      const pos = layout!.nodes[n.id] ?? { x: 0, y: 0 };
      return {
        id: n.id,
        type: 'digimon',
        position: { x: pos.x, y: pos.y },
        data: {
          label: n.label,
          slug: n.slug,
          icon: n.icon,
          level: n.level,
          isCurrent: n.slug === currentSlug,
        },
      };
    });

    // Apply saved edge handle info, or auto-assign based on node positions
    const posMap = new Map<string, { x: number; y: number }>();
    for (const n of nodes) posMap.set(n.id, n.position);

    for (const edge of edges) {
      // Try saved handles first
      const key = `${edge.source}->${edge.target}`;
      const saved = layout!.edgeHandles?.[key];
      if (saved?.sourceHandle && saved?.targetHandle) {
        edge.sourceHandle = saved.sourceHandle;
        edge.targetHandle = saved.targetHandle;
      } else {
        // Auto-assign based on relative position
        const sPos = posMap.get(edge.source);
        const tPos = posMap.get(edge.target);
        if (sPos && tPos) {
          const dx = tPos.x - sPos.x;
          const dy = tPos.y - sPos.y;
          if (Math.abs(dx) > Math.abs(dy)) {
            // Primarily horizontal
            edge.sourceHandle = dx > 0 ? 'right' : 'left';
            edge.targetHandle = dx > 0 ? 'left' : 'right';
          } else {
            // Primarily vertical
            edge.sourceHandle = dy > 0 ? 'bottom' : 'top';
            edge.targetHandle = dy > 0 ? 'top' : 'bottom';
          }
        }
      }
    }

    return { nodes, edges };
  }

  // Auto-layout with Dagre (left → right)
  return autoLayout(apiNodes, apiEdges, currentSlug, edges);
}

/* ── Dagre auto-layout ────────────────────────────────────────────────── */

function autoLayout(
  apiNodes: EvolutionNode[],
  apiEdges: EvolutionEdge[],
  currentSlug: string,
  edges: Edge[],
): { nodes: Node<DigimonNodeData>[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: 'LR',
    ranksep: RANK_SEP,
    nodesep: NODE_SEP,
    marginx: 20,
    marginy: 20,
  });

  for (const n of apiNodes) {
    g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  for (const e of apiEdges) {
    g.setEdge(e.source, e.target);
  }

  dagre.layout(g);

  const nodes: Node<DigimonNodeData>[] = apiNodes.map((n) => {
    const pos = g.node(n.id);
    return {
      id: n.id,
      type: 'digimon',
      position: {
        x: (pos?.x ?? 0) - NODE_WIDTH / 2,
        y: (pos?.y ?? 0) - NODE_HEIGHT / 2,
      },
      data: {
        label: n.label,
        slug: n.slug,
        icon: n.icon,
        level: n.level,
        isCurrent: n.slug === currentSlug,
      },
    };
  });

  // Auto-assign handles based on dagre positions
  const posMap = new Map<string, { x: number; y: number }>();
  for (const n of nodes) posMap.set(n.id, n.position);
  for (const edge of edges) {
    const sPos = posMap.get(edge.source);
    const tPos = posMap.get(edge.target);
    if (sPos && tPos) {
      const dx = tPos.x - sPos.x;
      const dy = tPos.y - sPos.y;
      if (Math.abs(dx) > Math.abs(dy)) {
        edge.sourceHandle = dx > 0 ? 'right' : 'left';
        edge.targetHandle = dx > 0 ? 'left' : 'right';
      } else {
        edge.sourceHandle = dy > 0 ? 'bottom' : 'top';
        edge.targetHandle = dy > 0 ? 'top' : 'bottom';
      }
    }
  }

  return { nodes, edges };
}

/* ── Compact layout — uses saved layout as-is, or Dagre fallback ─────── */

export function buildCompactFlowElements(
  apiNodes: EvolutionNode[],
  apiEdges: EvolutionEdge[],
  layout: EvolutionLayout | null | undefined,
  currentSlug: string,
): { nodes: Node<DigimonNodeData>[]; edges: Edge[] } {
  const hasLayout = layout?.nodes && Object.keys(layout.nodes).length > 0;

  const edges: Edge[] = apiEdges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    type: 'evolution',
    data: {
      evolutionType: e.evolutionType,
      requiredLevel: e.requiredLevel,
      requiredItem: e.requiredItem,
    },
    animated: e.evolutionType === 'jogress',
  }));

  let nodes: Node<DigimonNodeData>[];

  if (hasLayout) {
    // Use saved positions as-is — nodes are smaller visually but fitView handles zoom
    nodes = apiNodes.map((n) => {
      const pos = layout!.nodes[n.id] ?? { x: 0, y: 0 };
      return {
        id: n.id,
        type: 'digimon',
        position: { x: pos.x, y: pos.y },
        data: {
          label: n.label,
          slug: n.slug,
          icon: n.icon,
          mainImage: n.mainImage,
          level: n.level,
          isCurrent: n.slug === currentSlug,
        },
      };
    });

    // Apply saved edge handles or auto-assign
    const posMap = new Map<string, { x: number; y: number }>();
    for (const n of nodes) posMap.set(n.id, n.position);

    for (const edge of edges) {
      const key = `${edge.source}->${edge.target}`;
      const saved = layout!.edgeHandles?.[key];
      if (saved?.sourceHandle && saved?.targetHandle) {
        edge.sourceHandle = saved.sourceHandle;
        edge.targetHandle = saved.targetHandle;
      } else {
        const sPos = posMap.get(edge.source);
        const tPos = posMap.get(edge.target);
        if (sPos && tPos) {
          const dx = tPos.x - sPos.x;
          const dy = tPos.y - sPos.y;
          if (Math.abs(dx) > Math.abs(dy)) {
            edge.sourceHandle = dx > 0 ? 'right' : 'left';
            edge.targetHandle = dx > 0 ? 'left' : 'right';
          } else {
            edge.sourceHandle = dy > 0 ? 'bottom' : 'top';
            edge.targetHandle = dy > 0 ? 'top' : 'bottom';
          }
        }
      }
    }
  } else {
    // Dagre auto-layout fallback
    const g = new dagre.graphlib.Graph();
    g.setDefaultEdgeLabel(() => ({}));
    g.setGraph({
      rankdir: 'LR',
      ranksep: 120,
      nodesep: 50,
      marginx: 20,
      marginy: 20,
    });

    for (const n of apiNodes) {
      g.setNode(n.id, { width: COMPACT_NODE_WIDTH, height: COMPACT_NODE_HEIGHT });
    }
    for (const e of apiEdges) {
      g.setEdge(e.source, e.target);
    }

    dagre.layout(g);

    nodes = apiNodes.map((n) => {
      const pos = g.node(n.id);
      return {
        id: n.id,
        type: 'digimon',
        position: {
          x: (pos?.x ?? 0) - COMPACT_NODE_WIDTH / 2,
          y: (pos?.y ?? 0) - COMPACT_NODE_HEIGHT / 2,
        },
        data: {
          label: n.label,
          slug: n.slug,
          icon: n.icon,
          mainImage: n.mainImage,
          level: n.level,
          isCurrent: n.slug === currentSlug,
        },
      };
    });

    const posMap = new Map<string, { x: number; y: number }>();
    for (const n of nodes) posMap.set(n.id, n.position);
    for (const edge of edges) {
      const sPos = posMap.get(edge.source);
      const tPos = posMap.get(edge.target);
      if (sPos && tPos) {
        const dx = tPos.x - sPos.x;
        const dy = tPos.y - sPos.y;
        if (Math.abs(dx) > Math.abs(dy)) {
          edge.sourceHandle = dx > 0 ? 'right' : 'left';
          edge.targetHandle = dx > 0 ? 'left' : 'right';
        } else {
          edge.sourceHandle = dy > 0 ? 'bottom' : 'top';
          edge.targetHandle = dy > 0 ? 'top' : 'bottom';
        }
      }
    }
  }

  return { nodes, edges };
}
