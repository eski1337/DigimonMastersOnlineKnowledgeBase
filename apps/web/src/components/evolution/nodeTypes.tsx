'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

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

const PUBLIC_CMS_URL = process.env.NEXT_PUBLIC_CMS_URL || 'https://cms.dmokb.info';

function resolveIconUrl(icon?: string): string | null {
  if (!icon) return null;
  // Raw MongoDB ObjectId — unresolved relationship
  if (/^[a-f0-9]{24}$/.test(icon)) return null;
  // Relative CMS path — prepend CMS domain
  if (icon.startsWith('/media/') || icon.startsWith('/Images/')) {
    return `${PUBLIC_CMS_URL}${icon}`;
  }
  // Already absolute
  if (icon.startsWith('http')) return icon;
  return null;
}

/* ── DigimonNode component ────────────────────────────────────────────── */

function DigimonNodeInner({ data }: NodeProps) {
  const d = data as DigimonNodeData;
  const resolvedIcon = resolveIconUrl(d.icon);
  const hasIcon = resolvedIcon !== null;
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
        width: 180,
        height: 190,
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
          <img
            src={resolvedIcon!}
            alt={d.label}
            width={72}
            height={72}
            style={{ width: 72, height: 72, objectFit: 'contain' }}
            loading="lazy"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).parentElement!.querySelector('span')!.style.display = 'block'; }}
          />
        ) : null}
        <span style={{ color: '#4b5563', fontSize: '20px', display: hasIcon ? 'none' : 'block' }}>?</span>
      </div>

      {/* Name */}
      <span
        style={{
          fontSize: '14px',
          fontWeight: 700,
          lineHeight: 1.2,
          textAlign: 'center',
          color: isCurrent ? '#fb923c' : '#e5e7eb',
          maxWidth: 170,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          wordBreak: 'break-word' as const,
        }}
      >
        {d.label}
      </span>

      {/* Form badge */}
      {d.level && (
        <span
          style={{
            fontSize: '11px',
            fontWeight: 600,
            padding: '2px 8px',
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

      {/* Handles at each position — source type with loose connection mode */}
      <Handle type="source" position={Position.Left} id="left" style={{ width: 6, height: 6, background: borderColor, border: '1.5px solid rgba(17,24,39,0.8)', left: -4 }} />
      <Handle type="source" position={Position.Right} id="right" style={{ width: 6, height: 6, background: borderColor, border: '1.5px solid rgba(17,24,39,0.8)', right: -4 }} />
      <Handle type="source" position={Position.Top} id="top" style={{ width: 6, height: 6, background: borderColor, border: '1.5px solid rgba(17,24,39,0.8)', top: -4 }} />
      <Handle type="source" position={Position.Bottom} id="bottom" style={{ width: 6, height: 6, background: borderColor, border: '1.5px solid rgba(17,24,39,0.8)', bottom: -4 }} />
    </div>
  );

  return <div style={{ position: 'relative' }}>{inner}</div>;
}

export const DigimonNode = memo(DigimonNodeInner);

/* ── Compact DigimonNode — icon-only, name on hover ──────────────── */

const COMPACT_SIZE = 90;
const COMPACT_IMG = 78;

function DigimonNodeCompactInner({ data }: NodeProps) {
  const d = data as DigimonNodeData;
  const resolvedIcon = resolveIconUrl(d.icon);
  const hasIcon = resolvedIcon !== null;
  const isCurrent = d.isCurrent === true;
  const isClickable = Boolean(d.slug && !isCurrent);
  const borderColor = isCurrent ? CURRENT_BORDER : NEUTRAL_BORDER;

  return (
    <div style={{ position: 'relative' }}>
      <div
        style={{
          width: COMPACT_SIZE,
          height: COMPACT_SIZE,
          borderRadius: '12px',
          border: `2px solid ${borderColor}`,
          background: isCurrent
            ? `linear-gradient(145deg, ${CURRENT_BG}, rgba(17,24,39,0.96))`
            : `linear-gradient(145deg, ${NEUTRAL_BG}, rgba(17,24,39,0.96))`,
          boxShadow: isCurrent
            ? `0 0 16px ${CURRENT_GLOW}, 0 2px 6px rgba(0,0,0,0.4)`
            : `0 0 8px ${NEUTRAL_GLOW}, 0 2px 6px rgba(0,0,0,0.3)`,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: isClickable ? 'pointer' : 'default',
          userSelect: 'none' as const,
          transition: 'box-shadow 0.2s ease, transform 0.15s ease',
        }}
        className="evolution-node-card compact-node"
      >
        {hasIcon ? (
          <img
            src={resolvedIcon!}
            alt={d.label}
            width={COMPACT_IMG}
            height={COMPACT_IMG}
            style={{ width: COMPACT_IMG, height: COMPACT_IMG, objectFit: 'contain' }}
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
              (e.target as HTMLImageElement).parentElement!.querySelector('span')!.style.display = 'flex';
            }}
          />
        ) : null}
        <span style={{
          color: '#4b5563', fontSize: '24px', fontWeight: 700,
          display: hasIcon ? 'none' : 'flex',
          alignItems: 'center', justifyContent: 'center',
          width: '100%', height: '100%',
        }}>?</span>

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
      </div>

      {/* Hover tooltip — name + form */}
      <div className="compact-node-tooltip">
        <span style={{ fontWeight: 700, fontSize: '12px', color: isCurrent ? '#fb923c' : '#e5e7eb' }}>
          {d.label}
        </span>
        {d.level && (
          <span style={{ fontSize: '10px', color: BADGE_COLOR, textTransform: 'uppercase' as const }}>
            {d.level}
          </span>
        )}
      </div>

      {/* Handles */}
      <Handle type="source" position={Position.Left} id="left" style={{ width: 5, height: 5, background: borderColor, border: '1.5px solid rgba(17,24,39,0.8)', left: -3 }} />
      <Handle type="source" position={Position.Right} id="right" style={{ width: 5, height: 5, background: borderColor, border: '1.5px solid rgba(17,24,39,0.8)', right: -3 }} />
      <Handle type="source" position={Position.Top} id="top" style={{ width: 5, height: 5, background: borderColor, border: '1.5px solid rgba(17,24,39,0.8)', top: -3 }} />
      <Handle type="source" position={Position.Bottom} id="bottom" style={{ width: 5, height: 5, background: borderColor, border: '1.5px solid rgba(17,24,39,0.8)', bottom: -3 }} />
    </div>
  );
}

export const DigimonNodeCompact = memo(DigimonNodeCompactInner);

/* ── Compact dimensions for layout ─────────────────────────────────── */
export const COMPACT_NODE_WIDTH = COMPACT_SIZE + 20;
export const COMPACT_NODE_HEIGHT = COMPACT_SIZE + 10;

/* ── Export node types maps (must be defined outside component) ───── */

export const nodeTypes = {
  digimon: DigimonNode,
} as const;

export const compactNodeTypes = {
  digimon: DigimonNodeCompact,
} as const;
