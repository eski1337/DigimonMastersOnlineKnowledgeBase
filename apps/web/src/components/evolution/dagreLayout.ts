import dagre from '@dagrejs/dagre';
import type { EvolutionNode, EvolutionEdge, EvolutionLayout } from './useEvolutionGraph';
import type { Node, Edge } from '@xyflow/react';
import type { DigimonNodeData } from './nodeTypes';

/* ── Constants ────────────────────────────────────────────────────────── */

const NODE_WIDTH = 130;
const NODE_HEIGHT = 120;
const RANK_SEP = 140;
const NODE_SEP = 50;

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

  return { nodes, edges };
}
