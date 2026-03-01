'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import Image from 'next/image';

/* ── Node data shape ──────────────────────────────────────────────────── */

export interface DigimonNodeData {
  label: string;
  slug: string;
  icon?: string;
  level?: string;
  isCurrent?: boolean;
  [key: string]: unknown;
}

/* ── Colors ───────────────────────────────────────────────────────────── */

const NEUTRAL_BORDER = '#4b5563';    // gray-600
const NEUTRAL_GLOW = 'rgba(75,85,99,0.12)';
const NEUTRAL_BG = 'rgba(75,85,99,0.04)';
const CURRENT_BORDER = '#f97316';    // orange-500
const CURRENT_GLOW = 'rgba(249,115,22,0.35)';
const CURRENT_BG = 'rgba(249,115,22,0.08)';
const BADGE_COLOR = '#9ca3af';       // gray-400

function isValidIconUrl(icon?: string): boolean {
  if (!icon) return false;
  if (icon.includes('placeholder')) return false;
  return icon.startsWith('http') || icon.startsWith('/media/');
}

/* ── DigimonNode component ────────────────────────────────────────────── */

function DigimonNodeInner({ data }: NodeProps) {
  const d = data as DigimonNodeData;
  const hasIcon = isValidIconUrl(d.icon);
  const isCurrent = d.isCurrent === true;
  const isClickable = Boolean(d.slug && !isCurrent);

  const borderColor = isCurrent ? CURRENT_BORDER : NEUTRAL_BORDER;

  const inner = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
        padding: '8px 10px 6px',
        borderRadius: '12px',
        border: `2px solid ${borderColor}`,
        background: isCurrent
          ? `linear-gradient(145deg, ${CURRENT_BG}, rgba(17,24,39,0.96))`
          : `linear-gradient(145deg, ${NEUTRAL_BG}, rgba(17,24,39,0.96))`,
        backdropFilter: 'blur(6px)',
        boxShadow: isCurrent
          ? `0 0 20px ${CURRENT_GLOW}, 0 0 6px rgba(249,115,22,0.15), 0 2px 8px rgba(0,0,0,0.4)`
          : `0 0 12px ${NEUTRAL_GLOW}, 0 2px 8px rgba(0,0,0,0.3)`,
        transition: 'box-shadow 0.2s ease, transform 0.15s ease',
        cursor: isClickable ? 'pointer' : 'default',
        userSelect: 'none' as const,
        width: 150,
        height: 160,
      }}
      className="evolution-node-card"
    >
      {/* Image container */}
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: '8px',
          overflow: 'hidden',
          background: 'rgba(17,24,39,0.6)',
          border: '1px solid rgba(75,85,99,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {hasIcon ? (
          <Image
            src={d.icon!}
            alt={d.label}
            width={72}
            height={72}
            className="object-contain"
            style={{ width: 72, height: 72, objectFit: 'contain' }}
            loading="lazy"
            unoptimized
          />
        ) : (
          <span style={{ color: '#4b5563', fontSize: '20px' }}>?</span>
        )}
      </div>

      {/* Name */}
      <span
        style={{
          fontSize: '12px',
          fontWeight: 700,
          lineHeight: 1.2,
          textAlign: 'center',
          color: isCurrent ? '#fb923c' : '#e5e7eb',
          maxWidth: 140,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        }}
      >
        {d.label}
      </span>

      {/* Form badge */}
      {d.level && (
        <span
          style={{
            fontSize: '9px',
            fontWeight: 600,
            padding: '1px 6px',
            borderRadius: '8px',
            backgroundColor: 'rgba(156,163,175,0.12)',
            color: BADGE_COLOR,
            letterSpacing: '0.03em',
            textTransform: 'uppercase' as const,
          }}
        >
          {d.level}
        </span>
      )}

      {/* Current indicator ring */}
      {isCurrent && (
        <div
          style={{
            position: 'absolute',
            inset: -3,
            borderRadius: '14px',
            border: '2px solid rgba(249,115,22,0.3)',
            pointerEvents: 'none',
            animation: 'currentPulse 2s ease-in-out infinite',
          }}
        />
      )}

      {/* Handles — tiny, on border */}
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        style={{
          width: 6,
          height: 6,
          background: borderColor,
          border: '1.5px solid rgba(17,24,39,0.8)',
          left: -4,
        }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        style={{
          width: 6,
          height: 6,
          background: borderColor,
          border: '1.5px solid rgba(17,24,39,0.8)',
          right: -4,
        }}
      />
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        style={{
          width: 6,
          height: 6,
          background: borderColor,
          border: '1.5px solid rgba(17,24,39,0.8)',
          top: -4,
        }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        style={{
          width: 6,
          height: 6,
          background: borderColor,
          border: '1.5px solid rgba(17,24,39,0.8)',
          bottom: -4,
        }}
      />
    </div>
  );

  return <div style={{ position: 'relative' }}>{inner}</div>;
}

export const DigimonNode = memo(DigimonNodeInner);

/* ── Export node types map (must be defined outside component) ─────── */

export const nodeTypes = {
  digimon: DigimonNode,
} as const;
