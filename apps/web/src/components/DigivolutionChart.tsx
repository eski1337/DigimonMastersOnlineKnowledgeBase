'use client';

import { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';

// Register the dagre layout
if (typeof cytoscape !== 'undefined') {
  cytoscape.use(dagre);
}

interface DigivolutionNode {
  id: string;
  name: string;
  icon: string;
  form?: string;
  slug: string;
}

interface DigivolutionEdge {
  source: string;
  target: string;
  requirement?: string;
  level?: number;
  item?: string;
}

interface DigivolutionChartProps {
  nodes: DigivolutionNode[];
  edges: DigivolutionEdge[];
  onNodeClick?: (slug: string) => void;
  highlightNodeId?: string;
}

export default function DigivolutionChart({
  nodes,
  edges,
  onNodeClick,
  highlightNodeId,
}: DigivolutionChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!containerRef.current || nodes.length === 0) return;

    // Initialize Cytoscape
    const cy = cytoscape({
      container: containerRef.current,
      
      elements: {
        nodes: nodes.map(node => ({
          data: {
            id: node.id,
            name: node.name,
            icon: node.icon,
            form: node.form,
            slug: node.slug,
          },
        })),
        edges: edges.map((edge, idx) => ({
          data: {
            id: `edge-${idx}`,
            source: edge.source,
            target: edge.target,
            requirement: edge.level 
              ? `Lv ${edge.level}${edge.item ? ` + ${edge.item}` : ''}`
              : edge.item || '',
          },
        })),
      },

      style: [
        {
          selector: 'node',
          style: {
            'background-image': 'data(icon)',
            'background-fit': 'cover',
            'background-clip': 'node',
            'width': 64,
            'height': 64,
            'border-width': 3,
            'border-color': '#0066ff',
            'label': 'data(name)',
            'text-valign': 'bottom',
            'text-halign': 'center',
            'text-margin-y': 5,
            'font-size': '11px',
            'font-weight': 'bold',
            'color': '#ffffff',
            'text-background-color': '#000000',
            'text-background-opacity': 0.7,
            'text-background-padding': '3px',
            'text-background-shape': 'roundrectangle',
          },
        },
        {
          selector: 'node:hover',
          style: {
            'border-width': 4,
            'border-color': '#00ff88',
          } as cytoscape.Css.Node,
        },
        {
          selector: 'node[id="' + highlightNodeId + '"]',
          style: {
            'border-width': 5,
            'border-color': '#ff0066',
          },
        },
        {
          selector: 'edge',
          style: {
            'width': 3,
            'line-color': '#666',
            'target-arrow-color': '#666',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'label': 'data(requirement)',
            'font-size': '10px',
            'color': '#aaaaaa',
            'text-background-color': '#1a1a1a',
            'text-background-opacity': 0.9,
            'text-background-padding': '2px',
          },
        },
      ],

      layout: {
        name: 'dagre',
        ...({
          rankDir: 'LR',
          nodeSep: 80,
          rankSep: 120,
          padding: 40,
        } as Record<string, unknown>),
      },

      minZoom: 0.5,
      maxZoom: 2,
      wheelSensitivity: 0.1,
    });

    // Store reference
    cyRef.current = cy;

    // Add click handler
    cy.on('tap', 'node', (evt) => {
      const node = evt.target;
      const slug = node.data('slug');
      if (onNodeClick && slug) {
        onNodeClick(slug);
      }
    });

    // Fit to viewport
    setTimeout(() => {
      cy.fit(undefined, 30);
      setIsLoading(false);
    }, 100);

    // Cleanup
    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
      }
    };
  }, [nodes, edges, onNodeClick, highlightNodeId]);

  return (
    <div className="relative w-full h-full min-h-[500px] bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg overflow-hidden border-2 border-gray-700">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75 z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-300">Loading Digivolution Tree...</p>
          </div>
        </div>
      )}
      
      <div ref={containerRef} className="w-full h-full" />
      
      {/* Controls overlay */}
      <div className="absolute bottom-4 right-4 bg-gray-800 bg-opacity-90 rounded-lg p-2 border border-gray-600">
        <div className="text-xs text-gray-300 space-y-1">
          <div>🖱️ Click: View Digimon</div>
          <div>🔍 Scroll: Zoom</div>
          <div>✋ Drag: Pan</div>
        </div>
      </div>
    </div>
  );
}
