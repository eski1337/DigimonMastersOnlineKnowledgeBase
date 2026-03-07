'use client';

import { memo } from 'react';
import { BaseEdge, getSmoothStepPath, EdgeLabelRenderer, type EdgeProps } from '@xyflow/react';

const BORDER_RADIUS = 0;

/* ── Edge color map by evolution type ─────────────────────────────────── */

const EDGE_COLORS: Record<string, string> = {
  normal: '#f97316',       // orange
  jogress: '#ec4899',      // pink
  'digi-egg': '#eab308',   // yellow
  'x-antibody': '#ef4444', // red
  variant: '#8b5cf6',      // purple
  alternate: '#06b6d4',    // cyan
  slide: '#22c55e',        // green
  'mode-change': '#3b82f6', // blue
};

const EDGE_LABELS: Record<string, string> = {
  normal: 'Normal',
  jogress: 'Jogress',
  'digi-egg': 'Digi-Egg',
  'x-antibody': 'X-Antibody',
  variant: 'Variant',
  alternate: 'Alternate',
  slide: 'Slide',
  'mode-change': 'Mode Change',
};

function getEdgeColor(type?: string): string {
  return EDGE_COLORS[type || 'normal'] || EDGE_COLORS.normal;
}

/* ── Edge label formatter ─────────────────────────────────────────────── */

function formatEdgeLabel(
  evolutionType: string,
  requiredLevel?: number | null,
  requiredItem?: string | null,
): string | null {
  const parts: string[] = [];

  if (requiredLevel && requiredLevel > 0) {
    parts.push(`Lv. ${requiredLevel}`);
  }

  if (requiredItem) {
    parts.push(requiredItem);
  }

  // For non-normal types with no requirements, show the type name
  if (parts.length === 0 && evolutionType !== 'normal') {
    return EDGE_LABELS[evolutionType] || evolutionType;
  }

  // For normal type with no requirements, show nothing
  if (parts.length === 0) return null;

  return parts.join(' \u2022 ');
}

/* ── EvolutionEdge component ──────────────────────────────────────────── */

function EvolutionEdgeInner(props: EdgeProps) {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data,
    markerEnd,
  } = props;

  const evolutionType = (data?.evolutionType as string) || 'normal';
  const requiredLevel = data?.requiredLevel as number | null | undefined;
  const requiredItem = data?.requiredItem as string | null | undefined;
  const color = getEdgeColor(evolutionType);
  const isJogress = evolutionType === 'jogress';

  const label = formatEdgeLabel(evolutionType, requiredLevel, requiredItem);

  // Straight line only for same-height horizontal connections.
  // Smoothstep (90° step routing) for everything else — no diagonals.
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
      sourceX,
      sourceY,
      targetX,
      targetY,
      sourcePosition,
      targetPosition,
      borderRadius: BORDER_RADIUS,
    });
  }

  return (
    <>
      {/* Background outline — creates visual bridge at crossings */}
      <BaseEdge
        id={`${id}-outline`}
        path={edgePath}
        style={{
          stroke: 'var(--evo-edge-outline, #0c0e14)',
          strokeWidth: 10,
          strokeLinecap: 'round',
        }}
      />

      {/* Glow layer for jogress */}
      {isJogress && (
        <BaseEdge
          id={`${id}-glow`}
          path={edgePath}
          style={{
            stroke: color,
            strokeWidth: 6,
            opacity: 0.15,
            filter: 'blur(3px)',
          }}
        />
      )}

      {/* Main edge */}
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: color,
          strokeWidth: isJogress ? 2.5 : 2,
          opacity: 0.8,
        }}
      />

      {/* On-edge label pill */}
      {label && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan pointer-events-none"
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              zIndex: 10,
            }}
          >
            <div
              style={{
                background: 'var(--evo-tooltip-bg, rgba(10,10,15,0.92))',
                border: `1px solid ${color}50`,
                borderRadius: '10px',
                padding: '2px 8px',
                boxShadow: `0 1px 4px rgba(0,0,0,0.5), 0 0 8px ${color}15`,
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                maxWidth: '180px',
              }}
            >
              {/* Color dot for non-normal types */}
              {evolutionType !== 'normal' && (
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    backgroundColor: color,
                    flexShrink: 0,
                  }}
                />
              )}
              <span
                style={{
                  fontSize: '9px',
                  fontWeight: 600,
                  color: 'var(--evo-text, #e5e7eb)',
                  letterSpacing: '0.02em',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {label}
              </span>
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export const EvolutionEdge = memo(EvolutionEdgeInner);

/* ── Export edge types map (must be defined outside component) ─────── */

export const edgeTypes = {
  evolution: EvolutionEdge,
} as const;

/* ── Re-export for legend + label formatter ───────────────────────────── */
export { EDGE_COLORS, EDGE_LABELS, formatEdgeLabel };
