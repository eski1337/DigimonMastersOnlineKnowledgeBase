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

/* ── Shared helpers ──────────────────────────────────────────────────── */

const PUBLIC_CMS_URL = process.env.NEXT_PUBLIC_CMS_URL || 'https://cms.dmokb.info';

function resolveIconUrl(icon?: string): string | null {
  if (!icon) return null;
  if (/^[a-f0-9]{24}$/.test(icon)) return null;
  if (icon.startsWith('/media/') || icon.startsWith('/Images/')) return `${PUBLIC_CMS_URL}${icon}`;
  if (icon.startsWith('http')) return icon;
  return null;
}

const HANDLE_STYLE_DARK = { background: '#6b7280', border: '1.5px solid rgba(0,0,0,0.5)' };
const HANDLE_STYLE_CURRENT = { background: '#f97316', border: '1.5px solid rgba(0,0,0,0.5)' };

function Handles({ isCurrent, size = 6 }: { isCurrent: boolean; size?: number }) {
  const s = isCurrent ? HANDLE_STYLE_CURRENT : HANDLE_STYLE_DARK;
  const half = Math.floor(size / 2) + 1;
  return (
    <>
      <Handle type="source" position={Position.Left}   id="left"   style={{ width: size, height: size, ...s, left: -half }} />
      <Handle type="source" position={Position.Right}  id="right"  style={{ width: size, height: size, ...s, right: -half }} />
      <Handle type="source" position={Position.Top}    id="top"    style={{ width: size, height: size, ...s, top: -half }} />
      <Handle type="source" position={Position.Bottom} id="bottom" style={{ width: size, height: size, ...s, bottom: -half }} />
    </>
  );
}

/* ── Detailed DigimonNode ──────────────────────────────────────────── */

function DigimonNodeInner({ data }: NodeProps) {
  const d = data as DigimonNodeData;
  const resolvedIcon = resolveIconUrl(d.icon);
  const hasIcon = resolvedIcon !== null;
  const isCurrent = d.isCurrent === true;
  const isClickable = Boolean(d.slug && !isCurrent);

  const cls = [
    'evo-node',
    'evo-node--detailed',
    isCurrent && 'evo-node--current',
    isClickable && 'evo-node--clickable',
  ].filter(Boolean).join(' ');

  return (
    <div style={{ position: 'relative' }}>
      <div className={cls}>
        <div className="evo-node__icon-wrap">
          {hasIcon ? (
            <img
              src={resolvedIcon!}
              alt={d.label}
              className="evo-node__icon-img"
              loading="lazy"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                const sib = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
                if (sib) sib.style.display = 'flex';
              }}
            />
          ) : null}
          <span className="evo-node__icon-fallback" style={{ display: hasIcon ? 'none' : 'flex' }}>?</span>
        </div>
        <span className="evo-node__name">{d.label}</span>
        {d.level && <span className="evo-node__badge">{d.level}</span>}
        <Handles isCurrent={isCurrent} size={6} />
      </div>
      {isCurrent && <div className="evo-node__pulse" />}
    </div>
  );
}

export const DigimonNode = memo(DigimonNodeInner);

/* ── Compact DigimonNode — icon-only, name on hover ──────────────── */

function DigimonNodeCompactInner({ data }: NodeProps) {
  const d = data as DigimonNodeData;
  const resolvedIcon = resolveIconUrl(d.icon);
  const hasIcon = resolvedIcon !== null;
  const isCurrent = d.isCurrent === true;
  const isClickable = Boolean(d.slug && !isCurrent);

  const cls = [
    'evo-node',
    'evo-node--compact',
    isCurrent && 'evo-node--current',
    isClickable && 'evo-node--clickable',
  ].filter(Boolean).join(' ');

  return (
    <div style={{ position: 'relative' }}>
      <div className={cls}>
        {hasIcon ? (
          <img
            src={resolvedIcon!}
            alt={d.label}
            className="evo-node__compact-img"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
              const sib = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
              if (sib) sib.style.display = 'flex';
            }}
          />
        ) : null}
        <span className="evo-node__icon-fallback evo-node__icon-fallback--lg" style={{ display: hasIcon ? 'none' : 'flex' }}>?</span>
        <Handles isCurrent={isCurrent} size={5} />
      </div>

      {/* Tooltip */}
      <div className="evo-tooltip">
        <span className="evo-tooltip__name">{d.label}</span>
        {d.level && <span className="evo-tooltip__badge">{d.level}</span>}
        <div className="evo-tooltip__arrow" />
      </div>

      {isCurrent && <div className="evo-node__pulse evo-node__pulse--compact" />}
    </div>
  );
}

export const DigimonNodeCompact = memo(DigimonNodeCompactInner);

/* ── Compact dimensions for layout ─────────────────────────────────── */
export const COMPACT_NODE_WIDTH = 96;
export const COMPACT_NODE_HEIGHT = 96;

/* ── Export node types maps ────────────────────────────────────────── */

export const nodeTypes = {
  digimon: DigimonNode,
} as const;

export const compactNodeTypes = {
  digimon: DigimonNodeCompact,
} as const;
