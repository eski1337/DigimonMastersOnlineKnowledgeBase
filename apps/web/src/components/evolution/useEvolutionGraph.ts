'use client';

import { useState, useEffect, useRef } from 'react';

/* ── Types ────────────────────────────────────────────────────────────── */

export interface EvolutionNode {
  id: string;
  label: string;
  slug: string;
  icon?: string;
  level?: string;
}

export interface EvolutionEdge {
  id: string;
  source: string;
  target: string;
  evolutionType: string;
  requiredLevel?: number | null;
  requiredItem?: string | null;
}

export interface EvolutionLayout {
  nodes: Record<string, { x: number; y: number }>;
  viewport?: { x: number; y: number; zoom: number };
}

export interface EvolutionGraphData {
  nodes: EvolutionNode[];
  edges: EvolutionEdge[];
  layout?: EvolutionLayout | null;
}

export interface UseEvolutionGraphResult {
  data: EvolutionGraphData | null;
  isLoading: boolean;
  error: string | null;
}

/* ── Constants ────────────────────────────────────────────────────────── */

const CMS_URL = process.env.NEXT_PUBLIC_CMS_URL || 'https://cms.dmokb.info';
const MAX_DEPTH = 5;

/* ── Hook ─────────────────────────────────────────────────────────────── */

export function useEvolutionGraph(slug: string): UseEvolutionGraphResult {
  const [data, setData] = useState<EvolutionGraphData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Abort previous request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setError(null);

    async function fetchGraph() {
      try {
        const url = `${CMS_URL}/api/evolution-graph?digimon=${encodeURIComponent(slug)}&depth=${MAX_DEPTH}`;
        const res = await fetch(url, {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        });

        if (!res.ok) {
          if (res.status === 404) {
            // No evolution data — not an error, just empty
            setData({ nodes: [], edges: [], layout: null });
            return;
          }
          throw new Error(`API returned ${res.status}`);
        }

        const json = await res.json();
        setData({
          nodes: json.nodes ?? [],
          edges: json.edges ?? [],
          layout: json.layout ?? null,
        });
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        const message = err instanceof Error ? err.message : 'Failed to load evolution graph';
        console.error('Evolution graph fetch error:', message);
        setError(message);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    fetchGraph();

    return () => {
      controller.abort();
    };
  }, [slug]);

  return { data, isLoading, error };
}
