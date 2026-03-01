'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';

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
  hexCol?: number | null;
  hexRow?: number | null;
  image?: { url: string } | null;
}

interface Props {
  maps: CMSMap[];
}

const PUBLIC_CMS_URL = 'https://cms.dmokb.info';

function imgUrl(media: { url: string } | string | null | undefined): string | null {
  if (!media) return null;
  const url = typeof media === 'string' ? media : media.url;
  if (!url) return null;
  return url.startsWith('http') ? url : `${PUBLIC_CMS_URL}${url}`;
}

/* ── Map type labels ──────────────────────────────────────────────── */
const TYPE_LABELS: Record<string, string> = {
  town: 'Town', field: 'Field', dungeon: 'Dungeon',
  raid: 'Raid', event: 'Event', instance: 'Instance',
};

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
const HEX_W = 205;
const HEX_H = 178;
const COL_STEP = HEX_W * 0.75;
const ROW_STEP = HEX_H;
const ODD_OFFSET = HEX_H / 2;
const HEX_PAD = 24;

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
  const positioned: HexPos[] = [];
  const unpositioned: CMSMap[] = [];

  /* Priority 1: CMS-defined hexCol/hexRow */
  for (const m of maps) {
    if (m.hexCol != null && m.hexRow != null) {
      const { x, y } = hexPixel(m.hexCol, m.hexRow);
      positioned.push({ map: m, x, y });
    } else {
      unpositioned.push(m);
    }
  }

  /* Priority 2: hardcoded layout fallback */
  const layout = HEX_LAYOUTS[areaKey];
  if (layout && unpositioned.length > 0) {
    const stillUnpositioned: CMSMap[] = [];
    for (const m of unpositioned) {
      const pos = layout[m.slug];
      if (pos) {
        const { x, y } = hexPixel(pos[0], pos[1]);
        positioned.push({ map: m, x, y });
      } else {
        stillUnpositioned.push(m);
      }
    }
    unpositioned.length = 0;
    unpositioned.push(...stillUnpositioned);
  }

  /* Priority 3: auto-layout remaining maps below existing ones */
  if (unpositioned.length > 0) {
    const maxRow = positioned.length > 0
      ? Math.max(...positioned.map(p => Math.round(p.y / ROW_STEP))) + 2
      : 0;
    const cols = Math.min(5, Math.max(2, Math.ceil(Math.sqrt(unpositioned.length * 1.5))));
    for (let i = 0; i < unpositioned.length; i++) {
      const col = i % cols;
      const row = maxRow + Math.floor(i / cols);
      const { x, y } = hexPixel(col, row);
      positioned.push({ map: unpositioned[i], x, y });
    }
  }

  return positioned;
}

/* ── Mini hex constants for sidebar ───────────────────────────────── */
const MINI_HEX = 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)';

/* ── Component ────────────────────────────────────────────────────── */
export function MapsExplorer({ maps }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [expandedArea, setExpandedArea] = useState<string | null>(
    searchParams?.get('area') || null
  );

  // Sync URL → state when browser back/forward fires
  useEffect(() => {
    const areaFromUrl = searchParams?.get('area') || null;
    setExpandedArea(areaFromUrl);
  }, [searchParams]);

  const realMaps = maps.filter(m => m.world === 'real-world');
  const digitalMaps = maps.filter(m => m.world === 'digital-world');

  const realAreas = groupByArea(realMaps);
  const digitalAreas = groupByArea(digitalMaps);

  const toggleArea = useCallback((key: string) => {
    setExpandedArea(prev => {
      const next = prev === key ? null : key;
      const params = new URLSearchParams(searchParams?.toString() || '');
      if (next) {
        params.set('area', next);
      } else {
        params.delete('area');
      }
      router.push(`/maps?${params.toString()}`, { scroll: false });
      return next;
    });
  }, [searchParams, router]);

  const selectedAreaData = expandedArea
    ? [...realAreas, ...digitalAreas].find(a => a.areaKey === expandedArea)
    : null;

  return (
    <div className="container py-8 max-w-[1400px]">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="mb-6">
        <h1 className="text-4xl font-bold mb-2">World Map</h1>
        <p className="text-muted-foreground">
          {maps.length} locations across the Real World &amp; Digital World
        </p>
      </div>

      <div className="flex gap-6 items-start">
        {/* ── Left sidebar ───────────────────────────────────── */}
        <div className="w-[270px] flex-shrink-0">
          <NavSection
            title="Real World"
            count={realMaps.length}
            icon=""
            areas={realAreas}
            expandedArea={expandedArea}
            onToggleArea={toggleArea}
          />
          <div className="my-4 border-t border-border/40" />
          <NavSection
            title="Digital World"
            count={digitalMaps.length}
            icon=""
            areas={digitalAreas}
            expandedArea={expandedArea}
            onToggleArea={toggleArea}
          />
        </div>

        {/* ── Right: hex map grid (centered) ─────────────────── */}
        <div className="flex-1 min-w-0">
          {selectedAreaData ? (
            <div>
              <div className="flex items-center gap-3 mb-5">
                <div
                  className="w-8 h-7 flex items-center justify-center flex-shrink-0"
                  style={{ clipPath: MINI_HEX, background: 'hsl(var(--primary) / 0.3)' }}
                >
                  <span className="text-primary text-xs font-bold">{selectedAreaData.maps.length}</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold leading-tight">
                    {(AREA_CONFIG[expandedArea!] || { label: expandedArea }).label}
                  </h2>
                  <span className="text-xs text-muted-foreground">
                    {selectedAreaData.maps.length} map{selectedAreaData.maps.length !== 1 ? 's' : ''} in this area
                  </span>
                </div>
              </div>
              <HexMapGrid areaKey={expandedArea!} maps={selectedAreaData.maps} />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-80 text-muted-foreground gap-3">
              <div className="w-20 h-[70px] relative opacity-20" style={{ clipPath: MINI_HEX, background: 'currentColor' }} />
              <p className="text-sm">Select an area to explore its maps</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Nav Section (world group) ────────────────────────────────────── */
function NavSection({
  title, count, icon, areas, expandedArea, onToggleArea,
}: {
  title: string;
  count: number;
  icon: string;
  areas: { areaKey: string; maps: CMSMap[] }[];
  expandedArea: string | null;
  onToggleArea: (key: string) => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3 px-1">
        {icon && <span className="text-base">{icon}</span>}
        <span className="text-sm font-bold uppercase tracking-wide text-foreground/90">{title}</span>
        <span className="ml-auto text-xs text-muted-foreground bg-card rounded-full px-2 py-0.5">{count}</span>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {areas.map(({ areaKey, maps: areaMaps }) => {
          const cfg = AREA_CONFIG[areaKey] || { label: areaKey, order: 99 };
          const isActive = expandedArea === areaKey;
          return (
            <button
              key={areaKey}
              onClick={() => onToggleArea(areaKey)}
              className="group focus:outline-none"
            >
              <div
                className="relative w-full transition-all duration-200"
                style={{
                  clipPath: MINI_HEX,
                  aspectRatio: '1.155',
                }}
              >
                {/* Border bg */}
                <div className={`absolute inset-0 transition-colors duration-200 ${
                  isActive
                    ? 'bg-primary/60'
                    : 'bg-border/60 group-hover:bg-foreground/20'
                }`} />
                {/* Inner fill */}
                <div
                  className="absolute inset-[2px]"
                  style={{ clipPath: MINI_HEX }}
                >
                  <div className={`absolute inset-0 transition-all duration-200 ${
                    isActive
                      ? 'bg-primary/10'
                      : 'bg-background group-hover:bg-card/80'
                  }`} />
                  {/* Glow ring for active */}
                  {isActive && (
                    <div className="absolute inset-0 bg-primary/5 animate-pulse" style={{ animationDuration: '2s' }} />
                  )}
                  {/* Text content */}
                  <div className="relative h-full flex flex-col items-center justify-center px-2 text-center z-10">
                    <span className={`text-xs font-bold leading-tight transition-colors ${
                      isActive ? 'text-primary' : 'text-foreground group-hover:text-foreground'
                    }`}>
                      {cfg.label}
                    </span>
                    <span className={`text-[10px] mt-0.5 transition-colors ${
                      isActive ? 'text-primary/70' : 'text-foreground/60'
                    }`}>
                      {areaMaps.length} map{areaMaps.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Hex Map Grid ─────────────────────────────────────────────────── */
function HexMapGrid({ areaKey, maps }: { areaKey: string; maps: CMSMap[] }) {
  const positions = useMemo(() => {
    const raw = computeHexPositions(areaKey, maps);
    if (raw.length === 0) return raw;
    // Normalise so the grid starts at (0,0) — enables proper centering
    const minX = Math.min(...raw.map(p => p.x));
    const minY = Math.min(...raw.map(p => p.y));
    return raw.map(p => ({ ...p, x: p.x - minX, y: p.y - minY }));
  }, [areaKey, maps]);

  if (positions.length === 0) return null;

  const gridW = Math.max(...positions.map(p => p.x)) + HEX_W + HEX_PAD * 2;
  const gridH = Math.max(...positions.map(p => p.y)) + HEX_H + HEX_PAD * 2;

  return (
    <div className="overflow-x-auto pb-4">
      <div
        className="relative mx-auto"
        style={{ width: gridW, height: gridH, minWidth: gridW }}
      >
        {positions.map(({ map, x, y }) => (
          <HexMapCell key={map.id} map={map} x={x + HEX_PAD} y={y + HEX_PAD} />
        ))}
      </div>
    </div>
  );
}

/* ── Single Hex Cell ──────────────────────────────────────────────── */
function HexMapCell({ map, x, y }: { map: CMSMap; x: number; y: number }) {
  const typeLabel = TYPE_LABELS[map.mapType || ''] || 'Field';
  const bgImage = imgUrl(map.image);

  return (
    <Link
      href={`/maps/${map.slug}`}
      className="group absolute block"
      style={{ left: x, top: y, width: HEX_W, height: HEX_H }}
    >
      {/* Outer border */}
      <div
        className="relative w-full h-full"
        style={{ clipPath: HEX_CLIP }}
      >
        <div className="absolute inset-0 bg-border group-hover:bg-foreground/25 transition-colors duration-200" />
        {/* Inner fill */}
        <div
          className="absolute inset-[2px]"
          style={{ clipPath: HEX_CLIP }}
        >
          <div className="absolute inset-0 bg-background group-hover:bg-card transition-colors" />
          {/* Loading screen background image */}
          {bgImage && (
            <div
              className="absolute inset-0 opacity-60 group-hover:opacity-100 transition-all duration-300 group-hover:scale-[1.2] group-hover:[filter:none]"
              style={{
                backgroundImage: `url(${bgImage})`,
                backgroundSize: '170%',
                backgroundPosition: 'center',
                filter: 'blur(0.5px)',
              }}
            />
          )}
          {/* Dark overlay for text readability */}
          {bgImage && (
            <div className="absolute inset-0 bg-background/40 group-hover:bg-background/10 transition-colors duration-300" />
          )}
          {/* Content */}
          <div className="relative h-full flex flex-col items-center justify-center px-3 text-center z-10">
            <span className="text-sm font-bold leading-tight text-foreground group-hover:text-primary transition-colors drop-shadow-sm">
              {map.name}
            </span>
            {map.levelRange && (
              <span className="text-xs text-muted-foreground mt-0.5 drop-shadow-sm">
                Lv. {map.levelRange}
              </span>
            )}
            <span className="text-[11px] uppercase tracking-wider mt-0.5 text-muted-foreground drop-shadow-sm">
              {typeLabel}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
