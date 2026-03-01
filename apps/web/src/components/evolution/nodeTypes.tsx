'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import Link from 'next/link';
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

/* ── Form color palette ───────────────────────────────────────────────── */

const FORM_COLORS: Record<string, { border: string; glow: string; bg: string }> = {
  'In-Training': { border: '#94a3b8', glow: 'rgba(148,163,184,0.15)', bg: 'rgba(148,163,184,0.06)' },
  'Rookie':      { border: '#4ade80', glow: 'rgba(74,222,128,0.18)',  bg: 'rgba(74,222,128,0.06)'  },
  'Champion':    { border: '#60a5fa', glow: 'rgba(96,165,250,0.18)',  bg: 'rgba(96,165,250,0.06)'  },
  'Ultimate':    { border: '#a78bfa', glow: 'rgba(167,139,250,0.20)', bg: 'rgba(167,139,250,0.06)' },
  'Mega':        { border: '#f97316', glow: 'rgba(249,115,22,0.25)',  bg: 'rgba(249,115,22,0.06)'  },
  'Burst Mode':  { border: '#ef4444', glow: 'rgba(239,68,68,0.25)',   bg: 'rgba(239,68,68,0.06)'   },
  'Jogress':     { border: '#ec4899', glow: 'rgba(236,72,153,0.22)',  bg: 'rgba(236,72,153,0.06)'  },
  'Armor':       { border: '#eab308', glow: 'rgba(234,179,8,0.20)',   bg: 'rgba(234,179,8,0.06)'   },
  'Side Mega':   { border: '#f97316', glow: 'rgba(249,115,22,0.22)',  bg: 'rgba(249,115,22,0.06)'  },
  'Ultra':       { border: '#dc2626', glow: 'rgba(220,38,38,0.28)',   bg: 'rgba(220,38,38,0.06)'   },
};

const DEFAULT_FORM = { border: '#f97316', glow: 'rgba(249,115,22,0.15)', bg: 'rgba(249,115,22,0.04)' };

function getFormStyle(level?: string) {
  if (!level) return DEFAULT_FORM;
  return FORM_COLORS[level] || DEFAULT_FORM;
}

function isValidIconUrl(icon?: string): boolean {
  if (!icon) return false;
  if (icon.includes('placeholder')) return false;
  return icon.startsWith('http') || icon.startsWith('/media/');
}

/* ── DigimonNode component ────────────────────────────────────────────── */

function DigimonNodeInner({ data }: NodeProps) {
  const d = data as DigimonNodeData;
  const form = getFormStyle(d.level);
  const hasIcon = isValidIconUrl(d.icon);
  const isCurrent = d.isCurrent === true;

  const currentBorder = '#f97316';
  const borderColor = isCurrent ? currentBorder : form.border;

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
          ? 'linear-gradient(145deg, rgba(249,115,22,0.08), rgba(17,24,39,0.96))'
          : `linear-gradient(145deg, ${form.bg}, rgba(17,24,39,0.96))`,
        backdropFilter: 'blur(6px)',
        boxShadow: isCurrent
          ? `0 0 20px rgba(249,115,22,0.35), 0 0 6px rgba(249,115,22,0.15), 0 2px 8px rgba(0,0,0,0.4)`
          : `0 0 12px ${form.glow}, 0 2px 8px rgba(0,0,0,0.3)`,
        transition: 'box-shadow 0.2s ease, transform 0.15s ease',
        cursor: d.slug && !isCurrent ? 'pointer' : 'default',
        userSelect: 'none' as const,
        width: 110,
      }}
      className="evolution-node-card"
    >
      {/* Image container */}
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: '8px',
          overflow: 'hidden',
          background: 'rgba(17,24,39,0.6)',
          border: `1px solid ${borderColor}30`,
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
            width={56}
            height={56}
            className="object-contain"
            style={{ width: 56, height: 56 }}
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
          fontSize: '10px',
          fontWeight: 700,
          lineHeight: 1.2,
          textAlign: 'center',
          color: isCurrent ? '#fb923c' : '#e5e7eb',
          maxWidth: 100,
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
            fontSize: '7.5px',
            fontWeight: 600,
            padding: '1px 6px',
            borderRadius: '8px',
            backgroundColor: `${form.border}18`,
            color: form.border,
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
        style={{
          width: 6,
          height: 6,
          background: borderColor,
          border: '1.5px solid rgba(17,24,39,0.8)',
          right: -4,
        }}
      />
    </div>
  );

  if (d.slug && !isCurrent) {
    return (
      <Link href={`/digimon/${d.slug}`} style={{ textDecoration: 'none', display: 'block', position: 'relative' }}>
        {inner}
      </Link>
    );
  }

  return <div style={{ position: 'relative' }}>{inner}</div>;
}

export const DigimonNode = memo(DigimonNodeInner);

/* ── Export node types map (must be defined outside component) ─────── */

export const nodeTypes = {
  digimon: DigimonNode,
} as const;
