'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';

/* ── Types ────────────────────────────────────────────────────────── */
interface CMSMap {
  id: string;
  name: string;
  slug: string;
  world?: string;
  area?: string;
  mapType?: string;
  levelRange?: string;
  description?: string;
  sortOrder?: number;
}

interface Props {
  maps: CMSMap[];
}

/* ── Map type config ──────────────────────────────────────────────── */
const TYPE_STYLES: Record<string, { label: string; border: string; hover: string }> = {
  town:     { label: 'Town',     border: 'bg-emerald-400/50', hover: 'group-hover:bg-emerald-300/70' },
  field:    { label: 'Field',    border: 'bg-cyan-400/40',    hover: 'group-hover:bg-cyan-300/60' },
  dungeon:  { label: 'Dungeon',  border: 'bg-rose-400/50',    hover: 'group-hover:bg-rose-300/70' },
  raid:     { label: 'Raid',     border: 'bg-orange-400/50',  hover: 'group-hover:bg-orange-300/70' },
  event:    { label: 'Event',    border: 'bg-amber-400/40',   hover: 'group-hover:bg-amber-300/60' },
  instance: { label: 'Instance', border: 'bg-violet-400/40',  hover: 'group-hover:bg-violet-300/60' },
};
const DEFAULT_TYPE = TYPE_STYLES.field;

/* ── Area config ──────────────────────────────────────────────────── */
interface AreaConfig { label: string; order: number }

const AREA_CONFIG: Record<string, AreaConfig> = {
  'yokohama-village':  { label: 'Yokohama Village',    order: 0 },
  'dats-center':       { label: 'DATS Center',         order: 1 },
  'shinjuku':          { label: 'Shinjuku',            order: 2 },
  'shinjuku-d-reaper': { label: 'Shinjuku (D-Reaper)', order: 3 },
  'tokyo-odaiba':      { label: 'Tokyo Odaiba',        order: 4 },
  'western-area':      { label: 'Western Area',        order: 0 },
  'glacier-area':      { label: 'Glacier Area',        order: 1 },
  'digimon-frontier':  { label: 'Digimon Frontier',    order: 2 },
  'new-digital-world': { label: 'New Digital World',   order: 3 },
  'd-terminal':        { label: 'D-Terminal',          order: 4 },
  'digital-area':      { label: 'Digital Area',        order: 5 },
  'spiral-mountain':   { label: 'Spiral Mountain',     order: 6 },
  'file-island':       { label: 'File Island',         order: 7 },
  'server-continent':  { label: 'Server Continent',    order: 8 },
  'xros-wars':         { label: 'Xros Wars',           order: 9 },
  'four-holy-beasts':  { label: 'Four Holy Beasts',    order: 10 },
  'shadow-labyrinth':  { label: 'Shadow Labyrinth',    order: 11 },
  'kaisers-domain':    { label: 'Kaisers Domain',      order: 12 },
};

/* ── Helpers ──────────────────────────────────────────────────────── */
type WorldKey = 'real-world' | 'digital-world';

function groupByArea(maps: CMSMap[]): { areaKey: string; maps: CMSMap[] }[] {
  const grouped: Record<string, CMSMap[]> = {};
  for (const m of maps) {
    const key = m.area || 'unknown';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(m);
  }
  return Object.entries(grouped)
    .map(([areaKey, areaMaps]) => ({ areaKey, maps: areaMaps }))
    .sort((a, b) => (AREA_CONFIG[a.areaKey]?.order ?? 99) - (AREA_CONFIG[b.areaKey]?.order ?? 99));
}

/* ── Hexagon grid constants (flat-top) ────────────────────────────── */
const HEX_CLIP = 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)';
const HEX_W = 130;
const HEX_H = 114;
const COL_STEP = HEX_W * 0.75;
const ROW_STEP = HEX_H;
const ODD_OFFSET = HEX_H / 2;

/* ── Known area hex layouts: slug → [col, row] ───────────────────── */
/* Positions match the in-game honeycomb grids from screenshots       */
const HEX_LAYOUTS: Record<string, Record<string, [number, number]>> = {
  'western-area': {
    'ruined-historic':        [4, 0],
    'digimon-farm':           [3, 0],
    'wind-valley':            [4, 1],
    'wilderness-area':        [3, 1],
    'western-area-east':      [3, 2],
    'kaisers-laboratory':     [2, 2],
    'digimon-maze-entrance':  [1, 2],
    'dark-tower-wasteland':   [1, 3],
    'western-area-west':      [2, 3],
    'western-area-outskirts': [3, 3],
    'western-village':        [2, 4],
    'digimon-maze-b2':        [0, 3],
    'digimon-maze-b1':        [0, 4],
    'digimon-maze-f1':        [1, 4],
    'digimon-maze-f2':        [0, 5],
    'digimon-maze-f3':        [1, 5],
    'digimon-maze-f4':        [0, 6],
  },
  'yokohama-village': {
    'yokohama-village':      [1, 2],
    'yokohama-east-village': [2, 1],
    'oil-refinery-1':        [3, 1],
    'oil-refinery-2':        [4, 1],
    'oil-refinery-3':        [4, 2],
  },
};

/* ── Hex position calculator ─────────────────────────────────────── */
interface HexPos { map: CMSMap; x: number; y: number }

function hexPixel(col: number, row: number): { x: number; y: number } {
  return {
    x: col * COL_STEP,
    y: row * ROW_STEP + (col % 2 === 1 ? ODD_OFFSET : 0),
  };
}

function computeHexPositions(areaKey: string, maps: CMSMap[]): HexPos[] {
  const layout = HEX_LAYOUTS[areaKey];
  if (layout) {
    const positioned: HexPos[] = [];
    const unpositioned: CMSMap[] = [];
    for (const m of maps) {
      const pos = layout[m.slug];
      if (pos) {
        const { x, y } = hexPixel(pos[0], pos[1]);
        positioned.push({ map: m, x, y });
      } else {
        unpositioned.push(m);
      }
    }
    /* Append un-mapped maps in a new row below the layout */
    if (unpositioned.length > 0) {
      const maxRow = Math.max(...Object.values(layout).map(p => p[1])) + 2;
      const cols = Math.min(5, unpositioned.length);
      for (let i = 0; i < unpositioned.length; i++) {
        const col = i % cols;
        const row = maxRow + Math.floor(i / cols);
        const { x, y } = hexPixel(col, row);
        positioned.push({ map: unpositioned[i], x, y });
      }
    }
    return positioned;
  }
  /* Auto-layout: compact honeycomb */
  const cols = Math.min(5, Math.max(2, Math.ceil(Math.sqrt(maps.length * 1.5))));
  return maps.map((m, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const { x, y } = hexPixel(col, row);
    return { map: m, x, y };
  });
}

/* ── Component ────────────────────────────────────────────────────── */
export function MapsExplorer({ maps }: Props) {
  const [activeWorld, setActiveWorld] = useState<WorldKey>('real-world');
  const [expandedArea, setExpandedArea] = useState<string | null>(null);

  const realMaps = maps.filter(m => m.world === 'real-world');
  const digitalMaps = maps.filter(m => m.world === 'digital-world');

  const currentMaps = activeWorld === 'real-world' ? realMaps : digitalMaps;
  const areas = groupByArea(currentMaps);

  const toggleArea = (key: string) => {
    setExpandedArea(prev => (prev === key ? null : key));
  };

  return (
    <div className="container py-8 max-w-6xl">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">World Map</h1>
        <p className="text-muted-foreground">
          {maps.length} locations across the Real World &amp; Digital World
        </p>
      </div>

      {/* ── World Toggle ───────────────────────────────────────── */}
      <div className="flex gap-3 mb-8">
        <WorldTab
          active={activeWorld === 'real-world'}
          onClick={() => { setActiveWorld('real-world'); setExpandedArea(null); }}
          title="Real World"
          count={realMaps.length}
        />
        <WorldTab
          active={activeWorld === 'digital-world'}
          onClick={() => { setActiveWorld('digital-world'); setExpandedArea(null); }}
          title="Digital World"
          count={digitalMaps.length}
        />
      </div>

      {/* ── Area Hexagon Grid ─────────────────────────────────── */}
      <div className="flex flex-wrap gap-4 justify-center mb-6">
        {areas.map(({ areaKey, maps: areaMaps }) => {
          const cfg = AREA_CONFIG[areaKey] || { label: areaKey, order: 99 };
          const isExpanded = expandedArea === areaKey;

          return (
            <button
              key={areaKey}
              onClick={() => toggleArea(areaKey)}
              className="group focus:outline-none"
            >
              {/* Outer hex border */}
              <div
                className={`relative w-[140px] h-[120px] transition-all duration-200 ${
                  isExpanded ? 'scale-105' : 'hover:scale-105'
                }`}
                style={{ clipPath: HEX_CLIP }}
              >
                {/* Background */}
                <div className={`absolute inset-0 ${
                  isExpanded ? 'bg-primary/20' : 'bg-card group-hover:bg-secondary/60'
                } transition-colors`} />
                {/* Border effect via inset hex */}
                <div
                  className="absolute inset-[2px]"
                  style={{ clipPath: HEX_CLIP }}
                >
                  <div className={`absolute inset-0 ${
                    isExpanded ? 'bg-card' : 'bg-background group-hover:bg-card'
                  } transition-colors`} />
                  {/* Content */}
                  <div className="relative h-full flex flex-col items-center justify-center px-3 text-center z-10">
                    <span className={`text-xs font-bold leading-tight ${
                      isExpanded ? 'text-primary' : 'text-foreground'
                    }`}>
                      {cfg.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground mt-1">
                      {areaMaps.length} map{areaMaps.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Expanded Area: Hex Map Grid ────────────────────────── */}
      {expandedArea && (() => {
        const areaData = areas.find(a => a.areaKey === expandedArea);
        if (!areaData) return null;
        const cfg = AREA_CONFIG[expandedArea] || { label: expandedArea, order: 99 };

        return (
          <div className="border-t border-border pt-6">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-lg font-bold">{cfg.label}</h2>
              <span className="text-sm text-muted-foreground">— {areaData.maps.length} maps</span>
            </div>
            <HexMapGrid areaKey={expandedArea} maps={areaData.maps} />
          </div>
        );
      })()}
    </div>
  );
}

/* ── World Tab ────────────────────────────────────────────────────── */
function WorldTab({
  active, onClick, title, count,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        flex-1 flex items-center justify-center gap-2 rounded-lg border px-5 py-4
        transition-all duration-200
        ${active
          ? 'bg-card border-primary/40 shadow-sm'
          : 'bg-card/40 border-border hover:border-primary/20 opacity-60 hover:opacity-80'}
      `}
    >
      <div className="text-center">
        <div className={`font-semibold ${active ? 'text-foreground' : 'text-muted-foreground'}`}>{title}</div>
        <div className="text-xs text-muted-foreground">{count} maps</div>
      </div>
    </button>
  );
}

/* ── Hex Map Grid ─────────────────────────────────────────────────── */
function HexMapGrid({ areaKey, maps }: { areaKey: string; maps: CMSMap[] }) {
  const positions = useMemo(() => computeHexPositions(areaKey, maps), [areaKey, maps]);

  const maxX = Math.max(...positions.map(p => p.x)) + HEX_W;
  const maxY = Math.max(...positions.map(p => p.y)) + HEX_H;

  return (
    <div className="overflow-x-auto pb-4">
      <div
        className="relative mx-auto"
        style={{ width: maxX, height: maxY, minWidth: maxX }}
      >
        {positions.map(({ map, x, y }) => (
          <HexMapCell key={map.id} map={map} x={x} y={y} />
        ))}
      </div>
    </div>
  );
}

/* ── Single Hex Cell ──────────────────────────────────────────────── */
function HexMapCell({ map, x, y }: { map: CMSMap; x: number; y: number }) {
  const ts = TYPE_STYLES[map.mapType || ''] || DEFAULT_TYPE;

  return (
    <Link
      href={`/maps/${map.slug}`}
      className="group absolute block"
      style={{ left: x, top: y, width: HEX_W, height: HEX_H }}
    >
      {/* Outer glow border */}
      <div
        className="relative w-full h-full transition-transform duration-200 group-hover:scale-110"
        style={{ clipPath: HEX_CLIP }}
      >
        <div className={`absolute inset-0 ${ts.border} ${ts.hover} transition-colors`} />
        {/* Inner fill */}
        <div
          className="absolute inset-[2px]"
          style={{ clipPath: HEX_CLIP }}
        >
          <div className="absolute inset-0 bg-background/95 group-hover:bg-card transition-colors" />
          {/* Content */}
          <div className="relative h-full flex flex-col items-center justify-center px-2 text-center z-10">
            <span className="text-[11px] font-bold leading-tight text-foreground group-hover:text-primary transition-colors drop-shadow-sm">
              {map.name}
            </span>
            {map.levelRange && (
              <span className="text-[9px] text-muted-foreground mt-0.5">
                Lv. {map.levelRange}
              </span>
            )}
            <span className={`text-[8px] uppercase tracking-wider mt-0.5 opacity-60 ${
              map.mapType === 'dungeon' || map.mapType === 'raid'
                ? 'text-rose-400'
                : map.mapType === 'town'
                  ? 'text-emerald-400'
                  : 'text-muted-foreground'
            }`}>
              {ts.label}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
