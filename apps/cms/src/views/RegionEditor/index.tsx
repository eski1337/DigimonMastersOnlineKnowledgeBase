import React, { useState, useEffect, useCallback, useRef } from 'react';

/* ── Types ─────────────────────────────────────────────────────── */
interface MapDoc {
  id: string;
  name: string;
  slug: string;
  world?: string;
  area?: string;
  mapType?: string;
  levelRange?: string;
  hexCol?: number | null;
  hexRow?: number | null;
}

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

const TYPE_LABELS: Record<string, string> = {
  town: 'TOWN', field: 'FIELD', dungeon: 'DUNGEON',
  raid: 'RAID', event: 'EVENT', instance: 'INSTANCE',
};

/* ── Hex grid constants (flat-top) ─────────────────────────────── */
const HEX_W = 140;
const HEX_H = 121;
const COL_STEP = HEX_W * 0.75;
const ROW_STEP = HEX_H;
const ODD_OFFSET = HEX_H / 2;
const HEX_CLIP = 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)';
const GRID_COLS = 12;
const GRID_ROWS = 10;
const GRID_PAD = 20;

function hexPixel(col: number, row: number): { x: number; y: number } {
  return {
    x: col * COL_STEP + GRID_PAD,
    y: row * ROW_STEP + (col % 2 === 1 ? ODD_OFFSET : 0) + GRID_PAD,
  };
}

/* ── Main Component ────────────────────────────────────────────── */
const RegionEditor: React.FC = () => {
  const [maps, setMaps] = useState<MapDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedArea, setSelectedArea] = useState<string>('');
  const [positions, setPositions] = useState<Record<string, { col: number; row: number }>>({});
  const [dirty, setDirty] = useState(false);
  const [dragOverCell, setDragOverCell] = useState<string | null>(null);
  const dragMapIdRef = useRef<string | null>(null);

  /* ── Fetch all maps ────────────────────────────────────────── */
  const loadMaps = useCallback(async () => {
    setLoading(true);
    try {
      let allMaps: MapDoc[] = [];
      let page = 1;
      let hasMore = true;
      while (hasMore) {
        const res = await fetch(`/api/maps?limit=100&page=${page}&depth=0&sort=name`);
        const data = await res.json();
        allMaps = allMaps.concat(data.docs || []);
        hasMore = data.hasNextPage;
        page++;
      }
      setMaps(allMaps);
    } catch (err: any) {
      setError(err.message || 'Failed to load maps');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadMaps(); }, [loadMaps]);

  /* ── Derive area groups ────────────────────────────────────── */
  const areas = React.useMemo(() => {
    const grouped: Record<string, MapDoc[]> = {};
    for (const m of maps) {
      const key = m.area || 'unknown';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(m);
    }
    return Object.entries(grouped)
      .map(([key, areaMaps]) => ({ key, maps: areaMaps }))
      .sort((a, b) => (AREA_CONFIG[a.key]?.order ?? 99) - (AREA_CONFIG[b.key]?.order ?? 99));
  }, [maps]);

  /* ── When area changes, load existing positions ────────────── */
  useEffect(() => {
    if (!selectedArea) return;
    const areaMaps = maps.filter(m => m.area === selectedArea);
    const pos: Record<string, { col: number; row: number }> = {};
    for (const m of areaMaps) {
      if (m.hexCol != null && m.hexRow != null) {
        pos[m.id] = { col: m.hexCol, row: m.hexRow };
      }
    }
    setPositions(pos);
    setDirty(false);
    setSuccess('');
  }, [selectedArea, maps]);

  const areaMaps = maps.filter(m => m.area === selectedArea);
  const placedIds = new Set(Object.keys(positions));
  const unplacedMaps = areaMaps.filter(m => !placedIds.has(m.id));

  /* ── Check if a cell is occupied ───────────────────────────── */
  const occupantAt = (col: number, row: number): string | null => {
    for (const [id, pos] of Object.entries(positions)) {
      if (pos.col === col && pos.row === row) return id;
    }
    return null;
  };

  /* ── Drag & Drop handlers ──────────────────────────────────── */
  const handleDragStart = (e: React.DragEvent, mapId: string) => {
    dragMapIdRef.current = mapId;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', mapId);
  };

  const handleDragOver = (e: React.DragEvent, col: number, row: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const cellKey = `${col}-${row}`;
    if (dragOverCell !== cellKey) setDragOverCell(cellKey);
  };

  const handleDragLeave = () => {
    setDragOverCell(null);
  };

  const handleDrop = (e: React.DragEvent, col: number, row: number) => {
    e.preventDefault();
    setDragOverCell(null);
    const mapId = dragMapIdRef.current || e.dataTransfer.getData('text/plain');
    if (!mapId) return;

    const occupant = occupantAt(col, row);
    if (occupant && occupant !== mapId) return; // Cell taken by another map

    const next = { ...positions };
    delete next[mapId]; // Remove from old position if any
    next[mapId] = { col, row };
    setPositions(next);
    setDirty(true);
    dragMapIdRef.current = null;
  };

  const handleDragEnd = () => {
    dragMapIdRef.current = null;
    setDragOverCell(null);
  };

  /* ── Remove a placed map ───────────────────────────────────── */
  const handleRemove = (mapId: string) => {
    const next = { ...positions };
    delete next[mapId];
    setPositions(next);
    setDirty(true);
  };

  /* ── Drop on sidebar = unplace ─────────────────────────────── */
  const handleSidebarDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleSidebarDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const mapId = dragMapIdRef.current || e.dataTransfer.getData('text/plain');
    if (!mapId) return;
    if (positions[mapId]) {
      handleRemove(mapId);
    }
    dragMapIdRef.current = null;
  };

  /* ── Save positions to CMS ─────────────────────────────────── */
  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const updates = areaMaps.map(m => {
        const pos = positions[m.id];
        return {
          id: m.id,
          hexCol: pos ? pos.col : null,
          hexRow: pos ? pos.row : null,
        };
      });

      let savedCount = 0;
      for (const u of updates) {
        const res = await fetch(`/api/maps/${u.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hexCol: u.hexCol, hexRow: u.hexRow }),
        });
        if (res.ok) savedCount++;
      }

      setSuccess(`Saved ${savedCount} map positions.`);
      setDirty(false);
      await loadMaps();
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  /* ── Grid dimensions ───────────────────────────────────────── */
  const gridW = GRID_COLS * COL_STEP + HEX_W * 0.25 + GRID_PAD * 2;
  const gridH = GRID_ROWS * ROW_STEP + ODD_OFFSET + GRID_PAD * 2;

  /* ── Generate all hex slots ────────────────────────────────── */
  const hexSlots: { col: number; row: number; x: number; y: number }[] = [];
  for (let c = 0; c < GRID_COLS; c++) {
    for (let r = 0; r < GRID_ROWS; r++) {
      const { x, y } = hexPixel(c, r);
      hexSlots.push({ col: c, row: r, x, y });
    }
  }

  if (loading) {
    return <div style={{ padding: 40, color: 'var(--theme-text)' }}>Loading maps...</div>;
  }

  return (
    <div style={{ padding: '24px 32px', color: 'var(--theme-text)', minHeight: '100vh' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <a
          href="/admin"
          style={{
            padding: '6px 14px',
            borderRadius: 6,
            border: '1px solid var(--theme-elevation-150)',
            background: 'var(--theme-elevation-50)',
            color: 'var(--theme-elevation-400)',
            fontSize: 13,
            fontWeight: 500,
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        >
          ← Dashboard
        </a>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>Region Editor</h1>
      </div>
      <p style={{ color: 'var(--theme-elevation-400)', marginBottom: 24, fontSize: 14 }}>
        Drag maps from the sidebar onto the hex grid. Drag placed maps to reposition them.
        Drag a placed map back to the sidebar to remove it.
      </p>

      {error && (
        <div style={{ background: '#7f1d1d', color: '#fca5a5', padding: '10px 16px', borderRadius: 6, marginBottom: 16, fontSize: 14 }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ background: '#14532d', color: '#86efac', padding: '10px 16px', borderRadius: 6, marginBottom: 16, fontSize: 14 }}>
          {success}
        </div>
      )}

      {/* ── Area Selector ──────────────────────────────────────── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
        {areas.map(({ key, maps: areaMaps }) => {
          const cfg = AREA_CONFIG[key] || { label: key, order: 99 };
          const isActive = selectedArea === key;
          return (
            <button
              key={key}
              onClick={() => setSelectedArea(key)}
              style={{
                padding: '8px 16px',
                borderRadius: 6,
                border: isActive ? '2px solid var(--theme-success-500)' : '1px solid var(--theme-elevation-150)',
                background: isActive ? 'var(--theme-elevation-100)' : 'var(--theme-elevation-50)',
                color: isActive ? 'var(--theme-text)' : 'var(--theme-elevation-400)',
                fontWeight: isActive ? 600 : 400,
                fontSize: 13,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {cfg.label} ({areaMaps.length})
            </button>
          );
        })}
      </div>

      {!selectedArea && (
        <div style={{ color: 'var(--theme-elevation-400)', fontStyle: 'italic' }}>
          Select an area above to start editing its hex layout.
        </div>
      )}

      {selectedArea && (
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
          {/* ── Sidebar: unplaced + placed maps ───────────────────── */}
          <div
            onDragOver={handleSidebarDragOver}
            onDrop={handleSidebarDrop}
            style={{
              width: 220,
              flexShrink: 0,
              background: 'var(--theme-elevation-50)',
              border: '1px solid var(--theme-elevation-150)',
              borderRadius: 8,
              padding: 12,
              maxHeight: 'calc(100vh - 200px)',
              overflowY: 'auto',
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--theme-elevation-400)' }}>
              Unplaced Maps ({unplacedMaps.length})
            </div>
            {unplacedMaps.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--theme-elevation-300)', fontStyle: 'italic' }}>
                All maps placed!
              </div>
            )}
            {unplacedMaps.map(m => (
              <div
                key={m.id}
                draggable
                onDragStart={(e) => handleDragStart(e, m.id)}
                onDragEnd={handleDragEnd}
                style={{
                  padding: '8px 10px',
                  marginBottom: 4,
                  borderRadius: 6,
                  cursor: 'grab',
                  fontSize: 12,
                  border: '1px solid var(--theme-elevation-100)',
                  background: 'transparent',
                  transition: 'all 0.1s',
                  userSelect: 'none',
                }}
              >
                <div style={{ fontWeight: 600, lineHeight: '1.3' }}>{m.name}</div>
                <div style={{ color: 'var(--theme-elevation-400)', fontSize: 11 }}>
                  {TYPE_LABELS[m.mapType || ''] || 'FIELD'}
                  {m.levelRange ? ` · Lv. ${m.levelRange}` : ''}
                </div>
              </div>
            ))}

            {/* Placed maps list */}
            {Object.keys(positions).length > 0 && (
              <>
                <div style={{ fontSize: 13, fontWeight: 600, marginTop: 16, marginBottom: 8, color: 'var(--theme-elevation-400)' }}>
                  Placed ({Object.keys(positions).length})
                </div>
                {Object.entries(positions).map(([id, pos]) => {
                  const m = maps.find(mp => mp.id === id);
                  if (!m) return null;
                  return (
                    <div
                      key={id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, id)}
                      onDragEnd={handleDragEnd}
                      style={{
                        padding: '6px 10px',
                        marginBottom: 4,
                        borderRadius: 6,
                        fontSize: 12,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        border: '1px solid var(--theme-elevation-100)',
                        background: 'transparent',
                        cursor: 'grab',
                        userSelect: 'none',
                      }}
                    >
                      <span style={{ fontWeight: 500 }}>
                        {m.name}
                        <span style={{ color: 'var(--theme-elevation-300)', marginLeft: 6 }}>
                          [{pos.col},{pos.row}]
                        </span>
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRemove(id); }}
                        style={{
                          background: 'none', border: 'none', color: '#ef4444',
                          cursor: 'pointer', fontSize: 14, fontWeight: 700, padding: '0 4px',
                        }}
                        title="Remove from grid"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </>
            )}
          </div>

          {/* ── Hex Grid ───────────────────────────────────────── */}
          <div style={{ flex: 1, overflow: 'auto' }}>
            {/* Save bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{ flex: 1 }} />
              <button
                onClick={handleSave}
                disabled={!dirty || saving}
                style={{
                  padding: '8px 24px',
                  borderRadius: 6,
                  border: 'none',
                  background: dirty ? 'var(--theme-success-500)' : 'var(--theme-elevation-150)',
                  color: dirty ? '#fff' : 'var(--theme-elevation-400)',
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: dirty && !saving ? 'pointer' : 'default',
                  opacity: saving ? 0.6 : 1,
                  transition: 'all 0.2s',
                }}
              >
                {saving ? 'Saving...' : dirty ? 'Save Positions' : 'Saved'}
              </button>
            </div>

            {/* The grid */}
            <div style={{
              position: 'relative',
              width: gridW,
              height: gridH,
              minWidth: gridW,
            }}>
              {hexSlots.map(({ col, row, x, y }) => {
                const cellKey = `${col}-${row}`;
                const occ = occupantAt(col, row);
                const occMap = occ ? maps.find(m => m.id === occ) : null;
                const isDropTarget = dragOverCell === cellKey;

                return (
                  <div
                    key={cellKey}
                    onDragOver={(e) => handleDragOver(e, col, row)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, col, row)}
                    draggable={!!occ}
                    onDragStart={occ ? (e) => handleDragStart(e, occ) : undefined}
                    onDragEnd={occ ? handleDragEnd : undefined}
                    style={{
                      position: 'absolute',
                      left: x,
                      top: y,
                      width: HEX_W,
                      height: HEX_H,
                      cursor: occ ? 'grab' : 'default',
                    }}
                  >
                    {/* Hex shape */}
                    <div style={{
                      width: '100%',
                      height: '100%',
                      clipPath: HEX_CLIP,
                      position: 'relative',
                    }}>
                      {/* Background (border) */}
                      <div style={{
                        position: 'absolute',
                        inset: 0,
                        background: occ
                          ? 'var(--theme-elevation-150)'
                          : (isDropTarget ? 'var(--theme-success-500)' : 'var(--theme-elevation-50)'),
                        transition: 'background 0.15s',
                      }} />
                      {/* Inner hex */}
                      <div style={{
                        position: 'absolute',
                        inset: 2,
                        clipPath: HEX_CLIP,
                      }}>
                        <div style={{
                          position: 'absolute',
                          inset: 0,
                          background: occ
                            ? 'var(--theme-input-bg)'
                            : (isDropTarget ? '#14532d' : 'var(--theme-bg)'),
                          transition: 'background 0.15s',
                        }} />
                        {/* Content */}
                        <div style={{
                          position: 'relative',
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '0 10px',
                          textAlign: 'center',
                          zIndex: 1,
                        }}>
                          {occMap ? (
                            <>
                              <span style={{
                                fontSize: 11,
                                fontWeight: 700,
                                lineHeight: '1.2',
                                color: 'var(--theme-text)',
                              }}>
                                {occMap.name}
                              </span>
                              {occMap.levelRange && (
                                <span style={{ fontSize: 10, color: 'var(--theme-elevation-400)', marginTop: 2 }}>
                                  Lv. {occMap.levelRange}
                                </span>
                              )}
                              <span style={{
                                fontSize: 9,
                                color: 'var(--theme-elevation-300)',
                                letterSpacing: '0.05em',
                                marginTop: 1,
                              }}>
                                {TYPE_LABELS[occMap.mapType || ''] || 'FIELD'}
                              </span>
                            </>
                          ) : (
                            <span style={{
                              fontSize: 10,
                              color: isDropTarget ? '#86efac' : 'var(--theme-elevation-200)',
                            }}>
                              {isDropTarget ? 'Drop here' : `${col},${row}`}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegionEditor;
