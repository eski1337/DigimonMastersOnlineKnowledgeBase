import dagre from '@dagrejs/dagre';
import type { EvolutionNode, EvolutionEdge, EvolutionLayout } from './useEvolutionGraph';
import type { Node, Edge } from '@xyflow/react';
import type { DigimonNodeData } from './nodeTypes';
import { COMPACT_NODE_WIDTH, COMPACT_NODE_HEIGHT } from './nodeTypes';

/* ── Build compact layout — uses saved layout as-is, or Dagre fallback ── */

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
