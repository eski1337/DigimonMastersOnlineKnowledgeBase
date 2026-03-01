'use client';

import { useMemo, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useEvolutionGraph } from './useEvolutionGraph';
import { nodeTypes } from './nodeTypes';
import { edgeTypes, EDGE_COLORS, EDGE_LABELS } from './edgeTypes';
import { buildFlowElements } from './dagreLayout';
import styles from './evolution-graph.module.css';

/* ── Props ────────────────────────────────────────────────────────────── */

interface EvolutionGraphProps {
  slug: string;
}

/* ── Component ────────────────────────────────────────────────────────── */

export function EvolutionGraph({ slug }: EvolutionGraphProps) {
  const { data, isLoading, error } = useEvolutionGraph(slug);

  // Build React Flow elements from API data
  const { nodes, edges } = useMemo(() => {
    if (!data || data.nodes.length === 0) return { nodes: [], edges: [] };
    return buildFlowElements(data.nodes, data.edges, data.layout, slug);
  }, [data, slug]);

  // Detect which edge types are present for legend
  const activeEdgeTypes = useMemo(() => {
    if (!data) return [];
    const types = new Set(data.edges.map((e) => e.evolutionType));
    return Array.from(types).filter((t) => t in EDGE_COLORS);
  }, [data]);

  // Fit view after init
  const onInit = useCallback((instance: { fitView: (opts?: { padding?: number; maxZoom?: number }) => void }) => {
    setTimeout(() => {
      instance.fitView({ padding: 0.2, maxZoom: 1.2 });
    }, 50);
  }, []);

  // Default viewport from saved layout
  const defaultViewport = useMemo(() => {
    if (data?.layout?.viewport) {
      return data.layout.viewport;
    }
    return { x: 0, y: 0, zoom: 1 };
  }, [data]);

  /* ── Loading state ──────────────────────────────────────────────── */
  if (isLoading) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.header}>
          <h2 className={styles.title}>Evolution Graph</h2>
        </div>
        <div className={styles.skeleton}>
          <div className={styles.spinner} />
        </div>
      </div>
    );
  }

  /* ── Error state ────────────────────────────────────────────────── */
  if (error) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.header}>
          <h2 className={styles.title}>Evolution Graph</h2>
        </div>
        <div className={styles.fallback}>
          <p className={styles.fallbackText}>Evolution graph temporarily unavailable.</p>
          <p className={styles.fallbackSub}>{error}</p>
        </div>
      </div>
    );
  }

  /* ── Empty state ────────────────────────────────────────────────── */
  if (!data || nodes.length === 0) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.header}>
          <h2 className={styles.title}>Evolution Graph</h2>
        </div>
        <div className={styles.fallback}>
          <p className={styles.fallbackText}>No evolution data available yet.</p>
        </div>
      </div>
    );
  }

  /* ── Graph ──────────────────────────────────────────────────────── */
  return (
    <div>
      <div className={styles.header}>
        <h2 className={styles.title}>Evolution Graph</h2>
      </div>

      {/* Legend — only show if multiple edge types */}
      {activeEdgeTypes.length > 1 && (
        <div className={styles.legend}>
          {activeEdgeTypes.map((type) => (
            <span key={type} className={styles.legendItem}>
              <span
                className={styles.legendDot}
                style={{ backgroundColor: EDGE_COLORS[type] }}
              />
              {EDGE_LABELS[type] || type}
            </span>
          ))}
        </div>
      )}

      <div className={styles.wrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          defaultViewport={defaultViewport}
          onInit={onInit}
          /* ── Read-only config ──────────────────────── */
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnDrag
          zoomOnScroll
          zoomOnPinch
          zoomOnDoubleClick={false}
          preventScrolling={false}
          minZoom={0.2}
          maxZoom={2}
          fitView={!data.layout?.viewport}
          fitViewOptions={{ padding: 0.2, maxZoom: 1.2 }}
          proOptions={{ hideAttribution: true }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={24}
            size={0.8}
            color="rgba(249, 115, 22, 0.1)"
          />
          <Controls
            showInteractive={false}
            position="bottom-right"
          />
        </ReactFlow>
      </div>
    </div>
  );
}
