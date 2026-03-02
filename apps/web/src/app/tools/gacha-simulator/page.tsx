'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { BANNERS, type GachaItem, type GachaBanner } from './gacha-data';

/* ── Rarity colors ───────────────────────────────────────────────────── */

const RC: Record<number, { border: string; bg: string; text: string }> = {
  7: { border: '#deac00', bg: 'rgba(222,172,0,0.15)', text: '#ffd700' },
  6: { border: '#ff4466', bg: 'rgba(255,68,102,0.12)', text: '#ff6688' },
  5: { border: '#ff8c00', bg: 'rgba(255,140,0,0.12)', text: '#ffaa33' },
  4: { border: '#a855f7', bg: 'rgba(168,85,247,0.1)', text: '#c084fc' },
  3: { border: '#3b82f6', bg: 'rgba(59,130,246,0.1)', text: '#60a5fa' },
  2: { border: '#22c55e', bg: 'rgba(34,197,94,0.08)', text: '#4ade80' },
  1: { border: '#6b7280', bg: 'rgba(107,114,128,0.08)', text: '#9ca3af' },
};

const RARITY_VIDEO: Record<number, string> = {
  7: '/gacha/loading-rarity-7.mp4',
  6: '/gacha/loading-rarity-6.mp4',
  5: '/gacha/loading-rarity-5.mp4',
  3: '/gacha/loading-rarity-3.mp4',
  1: '/gacha/loading-rarity-1.mp4',
};

type TabType = 'DATA_SUMMON' | 'DIGITAL_DRAW';
type Phase = 'select' | 'video' | 'results';

/* ── Helpers ──────────────────────────────────────────────────────────── */

function pullFromBanner(banner: GachaBanner, count: number): GachaItem[] {
  const results: GachaItem[] = [];
  const totalProb = banner.items.reduce((s, i) => s + i.probability, 0);
  for (let i = 0; i < count; i++) {
    let roll = Math.random() * totalProb;
    for (const item of banner.items) {
      roll -= item.probability;
      if (roll <= 0) { results.push(item); break; }
    }
    if (results.length <= i) results.push(banner.items[banner.items.length - 1]);
  }
  return results;
}

function highestRarity(items: GachaItem[]): number {
  return items.reduce((m, i) => Math.max(m, i.rarity), 0);
}

function videoForRarity(r: number): string {
  if (r >= 7) return RARITY_VIDEO[7];
  if (r >= 6) return RARITY_VIDEO[6];
  if (r >= 5) return RARITY_VIDEO[5];
  if (r >= 3) return RARITY_VIDEO[3];
  return RARITY_VIDEO[1];
}

const rc = (r: number) => RC[r] || RC[1];
const itemIcon = (id: number | null) => id ? `/gacha/items/item-${id}.jpg` : null;

/* ── Styles matching original site exactly ────────────────────────────── */

const S = {
  bg: 'linear-gradient(to bottom, #082036, #071C30)',
  card: { background: 'linear-gradient(to bottom right, #1c1b36aa, #0c0b17aa 50%, #070711aa 51%)', boxShadow: 'inset 2px 2px 3px #312d59' },
  cardSel: { background: 'linear-gradient(to bottom right, #302a2eaa, #201b13aa 50%, #1c170daa 51%)', boxShadow: 'inset 2px 2px 3px #40374d' },
  btn1: { background: 'linear-gradient(to bottom right, #307B6B, #01F388)', borderTop: '1px solid #266960', boxShadow: 'inset 1px 1px 2px #3db196' },
  btn10: { background: 'linear-gradient(to bottom right, #833767, #CF0557)', borderTop: '1px solid #6C2953', boxShadow: 'inset 1px 1px 2px #b14f92' },
  btnConfirm: { background: 'linear-gradient(to bottom right, #32678B, #0587B5)', borderTop: '1px solid #2A5678', boxShadow: 'inset 1px 1px 2px #5485a8' },
  btnRetry: { background: 'linear-gradient(to bottom right, #6D424A, #97200C)', borderTop: '1px solid #4B1E29', boxShadow: 'inset 1px 1px 2px #825767' },
  btnSkip: { background: 'linear-gradient(to bottom right, #4d5666, #494a5b 30%, #323940 55%)', boxShadow: 'inset 1px 1px 2px #666a78' },
  goldNeon: 'drop-shadow(0 0 10px rgba(222,173,0,0.3)) sepia(0.2)',
};

/* ── Component ────────────────────────────────────────────────────────── */

export default function GachaSimulatorPage() {
  const [tab, setTab] = useState<TabType>('DATA_SUMMON');
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('select');
  const [results, setResults] = useState<{ item: GachaItem; isNew: boolean }[]>([]);
  const [inv, setInv] = useState<Record<string, number>>({});
  const [pulls, setPulls] = useState(0);
  const [showInv, setShowInv] = useState(false);
  const [showRates, setShowRates] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    Object.values(RARITY_VIDEO).forEach(src => {
      const link = document.createElement('link');
      link.rel = 'preload'; link.as = 'video'; link.href = src;
      document.head.appendChild(link);
    });
  }, []);

  /* Constellation canvas animation */
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    const PARTICLE_COUNT = 120;
    const CONNECT_DIST = 150;
    const SPEED = 0.15;
    let w = 0, h = 0;
    interface P { x: number; y: number; vx: number; vy: number; r: number; }
    let particles: P[] = [];

    function resize() {
      w = cv!.width = window.innerWidth;
      h = cv!.height = window.innerHeight;
    }
    function init() {
      resize();
      particles = [];
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * SPEED * 2,
          vy: (Math.random() - 0.5) * SPEED * 2,
          r: Math.random() * 1.5 + 0.5,
        });
      }
    }
    function draw() {
      ctx!.clearRect(0, 0, w, h);
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        a.x += a.vx; a.y += a.vy;
        if (a.x < 0) a.x = w; if (a.x > w) a.x = 0;
        if (a.y < 0) a.y = h; if (a.y > h) a.y = 0;
        ctx!.beginPath();
        ctx!.arc(a.x, a.y, a.r, 0, Math.PI * 2);
        ctx!.fillStyle = 'rgba(255,255,255,0.6)';
        ctx!.fill();
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECT_DIST) {
            ctx!.beginPath();
            ctx!.moveTo(a.x, a.y);
            ctx!.lineTo(b.x, b.y);
            ctx!.strokeStyle = `rgba(255,255,255,${0.15 * (1 - dist / CONNECT_DIST)})`;
            ctx!.lineWidth = 0.6;
            ctx!.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    }
    init();
    draw();
    window.addEventListener('resize', resize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);

  const banners = useMemo(() => BANNERS.filter(b => b.type === tab && b.items.length > 0), [tab]);
  const banner = banners[idx] || banners[0];

  const switchTab = useCallback((t: TabType) => { setTab(t); setIdx(0); setPhase('select'); setResults([]); }, []);

  const nav = useCallback((d: -1 | 1) => {
    setIdx(p => { const n = p + d; return n < 0 ? banners.length - 1 : n >= banners.length ? 0 : n; });
    setResults([]); setPhase('select');
  }, [banners.length]);

  const doPull = useCallback((count: number) => {
    if (!banner || phase === 'video') return;
    const items = pullFromBanner(banner, count);
    const hr = highestRarity(items);
    const res = items.map(item => ({ item, isNew: !inv[`${banner.id}-${item.name}`] }));
    const ni = { ...inv };
    items.forEach(item => { const k = `${banner.id}-${item.name}`; ni[k] = (ni[k] || 0) + 1; });
    setInv(ni); setPulls(p => p + count); setResults(res);
    setPhase('video');
    const v = videoRef.current;
    if (v) { v.src = videoForRarity(hr); v.currentTime = 0; v.play().catch(() => setPhase('results')); }
  }, [banner, phase, inv]);

  const skip = useCallback(() => setPhase('results'), []);
  const onEnd = useCallback(() => setPhase('results'), []);

  useEffect(() => {
    const v = videoRef.current;
    if (v) { v.addEventListener('ended', onEnd); return () => v.removeEventListener('ended', onEnd); }
  }, [onEnd]);

  const reset = useCallback(() => { setInv({}); setPulls(0); setResults([]); setPhase('select'); }, []);

  const invItems = useMemo(() => {
    return Object.entries(inv).filter(([, c]) => c > 0).map(([key, count]) => {
      const di = key.indexOf('-'); const bId = parseInt(key.substring(0, di)); const name = key.substring(di + 1);
      const b = BANNERS.find(x => x.id === bId); const it = b?.items.find(x => x.name === name);
      return { bannerId: bId, bannerName: b?.name || '', name, count, rarity: it?.rarity || 1, itemId: it?.itemId || null };
    }).sort((a, b) => b.rarity - a.rarity);
  }, [inv]);

  /* ── Render ─────────────────────────────────────────────────────────── */

  return (
    <div className="gacha-root" style={{ background: S.bg, minHeight: '100vh', color: '#e6e1ce', fontFamily: "'Noto Sans', sans-serif" }}>
      {/* Constellation canvas background */}
      <canvas ref={canvasRef} className="gacha-constellation" />

      {/* Video overlay */}
      <video ref={videoRef} playsInline muted className={`gacha-video ${phase === 'video' ? 'gacha-video--active' : ''}`} />
      {phase === 'video' && (
        <button onClick={skip} className="gacha-skip" style={S.btnSkip}>SKIP</button>
      )}

      <div className={phase === 'video' ? 'hidden' : ''}>
        {/* Back link */}
        <div style={{ padding: '16px 24px' }}>
          <Link href="/tools" className="gacha-back">
            <ArrowLeft size={16} /> Back to Tools
          </Link>
        </div>

        {phase === 'select' && (
          <section className="gacha-select">
            {/* Tab buttons */}
            <div className="gacha-tabs">
              {(['DATA_SUMMON', 'DIGITAL_DRAW'] as TabType[]).map(t => (
                <button key={t} onClick={() => switchTab(t)} className={`gacha-tab ${tab === t ? 'gacha-tab--active' : ''}`}>
                  <img src="/gacha/gacha-symbol.jpg" alt="" width={22} height={23} style={{ width: '1.2em' }} />
                  <span>{t === 'DATA_SUMMON' ? 'Data Summon' : 'Digital Draw'}</span>
                </button>
              ))}
            </div>

            {/* Title */}
            <h2 className="gacha-title">
              {tab === 'DATA_SUMMON' ? 'Select the data to summon.' : 'Choose Digital Draw.'}
            </h2>

            {/* Card carousel */}
            <div className="gacha-carousel">
              <button onClick={() => nav(-1)} className="gacha-arrow"><ChevronLeft size={28} /></button>
              <div className="gacha-cards">
                {banners.map((b, i) => {
                  const diff = i - idx;
                  const abs = Math.abs(diff);
                  if (abs > 2) return null;
                  const sel = i === idx;
                  return (
                    <div key={b.id} className="gacha-card-wrap" style={{ transform: sel ? 'scale(1.1)' : 'scale(1)', filter: sel ? '' : 'brightness(0.5)', zIndex: sel ? 2 : 1 }}>
                      <button onClick={() => { setIdx(i); }} className="gacha-card" style={sel ? S.cardSel : S.card}>
                        {/* Card title */}
                        <h3 className="gacha-card-title">
                          {b.category && <span className="gacha-card-cat">{b.category}</span>}
                          <span className="gacha-card-name">{b.name}</span>
                        </h3>
                        {/* Card image */}
                        <div className="gacha-card-img">
                          {b.image ? (
                            <img src={b.image} alt={b.name} draggable={false} style={{ width: '100%', display: 'block' }} />
                          ) : (
                            <div className="gacha-card-placeholder">
                              <img src="/gacha/gacha-symbol.jpg" alt="" style={{ width: 40, opacity: 0.6 }} />
                            </div>
                          )}
                        </div>
                      </button>
                      {/* View items button */}
                      <div className="gacha-view-items">
                        <button onClick={(e) => { e.stopPropagation(); setShowRates(true); }} title="Check Reward Items" className="gacha-view-btn">
                          <img src="/gacha/view-items.jpg" alt="" width={25} height={25} className="gacha-view-default" />
                          <img src="/gacha/view-items-hover.jpg" alt="" width={25} height={25} className="gacha-view-hover" />
                        </button>
                      </div>
                      {/* Gold neon on selected */}
                      {sel && <div className="gacha-neon" />}
                    </div>
                  );
                })}
              </div>
              <button onClick={() => nav(1)} className="gacha-arrow"><ChevronRight size={28} /></button>
            </div>

            {/* Pull buttons */}
            {banner && (
              <div className="gacha-pull-btns">
                {tab === 'DATA_SUMMON' ? (
                  <>
                    <button onClick={() => doPull(1)} className="gacha-pull-btn" style={S.btn1}>1 time</button>
                    <button onClick={() => doPull(10)} className="gacha-pull-btn" style={S.btn10}>10 times</button>
                  </>
                ) : (
                  <button onClick={() => doPull(11)} className="gacha-pull-btn" style={S.btnConfirm}>11 times Draw</button>
                )}
              </div>
            )}
          </section>
        )}

        {/* Results phase */}
        {phase === 'results' && results.length > 0 && (
          <section className="gacha-results">
            <h2 className="gacha-results-title">Obtained Items</h2>

            <div className="gacha-results-grid">
              {results.map((r, i) => {
                const c = rc(r.item.rarity);
                const best = r.item.rarity >= 6;
                return (
                  <div key={i} className={`gacha-result-item ${best ? 'gacha-result-best' : ''}`} style={{
                    border: `1px solid ${c.border}`,
                    background: c.bg,
                    animationDelay: `${i * 60}ms`,
                  }}>
                    {itemIcon(r.item.itemId) ? (
                      <img src={itemIcon(r.item.itemId)!} alt={r.item.name} className="gacha-result-icon" />
                    ) : (
                      <div className="gacha-result-stars" style={{ color: c.text }}>{'★'.repeat(r.item.rarity)}</div>
                    )}
                    {r.isNew && <div className="gacha-result-new">NEW</div>}
                    <div className="gacha-result-tooltip">{r.item.name}</div>
                  </div>
                );
              })}
            </div>

            <div className="gacha-action-btns">
              <button onClick={() => setPhase('select')} className="gacha-action-btn" style={S.btnConfirm}>Confirm</button>
              <button onClick={() => {
                const c = tab === 'DATA_SUMMON' ? (results.length > 1 ? 10 : 1) : 11;
                setPhase('select'); setTimeout(() => doPull(c), 50);
              }} className="gacha-action-btn" style={S.btnRetry}>Resummon</button>
            </div>
          </section>
        )}

        {/* Inventory button */}
        <button onClick={() => setShowInv(true)} className="gacha-inv-btn" title="Open Inventory">
          <img src="/gacha/inven.jpg" alt="Inventory" style={{ width: '100%', height: '100%' }} />
        </button>

        {/* Stats */}
        <div className="gacha-stats">
          <span>Pulls: <b>{pulls}</b></span>
          <span>Items: <b>{Object.keys(inv).length}</b></span>
          <button onClick={reset} className="gacha-reset">Reset</button>
        </div>
      </div>

      {/* Probability modal */}
      {showRates && banner && (
        <div className="gacha-modal-bg" onClick={() => setShowRates(false)}>
          <div className="gacha-modal" onClick={e => e.stopPropagation()}>
            <div className="gacha-modal-head">
              <h3>Probability Information</h3>
              <button onClick={() => setShowRates(false)}><X size={16} /></button>
            </div>
            <div className="gacha-modal-bars"><div /><div /></div>
            <div className="gacha-modal-sub">{banner.category}<br />{banner.name}</div>
            <div className="gacha-modal-label">Random Summon List</div>
            <div className="gacha-modal-list">
              {[...banner.items].sort((a, b) => b.rarity - a.rarity).map((item, i) => {
                const c = rc(item.rarity);
                return (
                  <div key={i} className="gacha-modal-row">
                    {itemIcon(item.itemId) ? (
                      <img src={itemIcon(item.itemId)!} alt="" className="gacha-modal-icon" />
                    ) : (
                      <span className="gacha-modal-stars" style={{ color: c.text }}>{'★'.repeat(item.rarity)}</span>
                    )}
                    <span className="gacha-modal-name">{item.name}</span>
                    <span className="gacha-modal-prob">{item.probability}%</span>
                  </div>
                );
              })}
            </div>
            <div className="gacha-modal-bars"><div /><div /></div>
          </div>
        </div>
      )}

      {/* Inventory modal */}
      {showInv && (
        <div className="gacha-modal-bg" onClick={() => setShowInv(false)}>
          <div className="gacha-modal gacha-modal--inv" onClick={e => e.stopPropagation()}>
            <div className="gacha-modal-head">
              <h3>Inventory</h3>
              <button onClick={() => setShowInv(false)}><X size={16} /></button>
            </div>
            <div className="gacha-modal-list">
              {invItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 32, color: '#555' }}>No items collected yet.</div>
              ) : invItems.map((item, i) => {
                const c = rc(item.rarity);
                return (
                  <div key={i} className="gacha-modal-row">
                    {itemIcon(item.itemId) ? (
                      <img src={itemIcon(item.itemId)!} alt="" className="gacha-modal-icon" />
                    ) : (
                      <span className="gacha-modal-stars" style={{ color: c.text }}>{'★'.repeat(item.rarity)}</span>
                    )}
                    <span className="gacha-modal-name">{item.name}</span>
                    <span className="gacha-modal-prob" style={{ color: c.text }}>×{item.count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        /* ── Page background ─────────────────────────────────────── */
        .gacha-root { position: relative; overflow: hidden; }
        .gacha-root > * { position: relative; z-index: 1; }
        .gacha-constellation {
          position: fixed; inset: 0; z-index: 0; width: 100%; height: 100%; pointer-events: none;
        }

        /* ── Video ───────────────────────────────────────────────── */
        .gacha-video { position: fixed; inset: 0; z-index: 100; width: 100%; height: 100%; object-fit: cover; background: #000; display: none; }
        .gacha-video--active { display: block; }
        .gacha-skip { position: fixed; top: 24px; right: 24px; z-index: 101; padding: 10px 28px; color: #fff; font-size: 14px; font-weight: 700; letter-spacing: 0.1em; border: 1px solid rgba(255,255,255,0.3); border-radius: 4px; cursor: pointer; background: rgba(0,0,0,0.5); transition: background 0.2s, border-color 0.2s; }
        .gacha-skip:hover { background: rgba(255,255,255,0.15); border-color: rgba(255,255,255,0.6); }

        /* ── Back ────────────────────────────────────────────────── */
        .gacha-back { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: #6b7280; transition: color 0.2s; text-decoration: none; }
        .gacha-back:hover { color: #ccc; }

        /* ── Select section ──────────────────────────────────────── */
        .gacha-select { display: flex; flex-direction: column; align-items: center; gap: 24px; padding: 0 16px 40px; }

        /* ── Tabs ────────────────────────────────────────────────── */
        .gacha-tabs { display: flex; max-width: 500px; width: 100%; background: rgba(59,130,246,0.08); }
        .gacha-tab { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 10px 0; border: 1px solid transparent; font-size: 14px; font-weight: 400; color: #9ca3af; background: none; cursor: pointer; transition: all 0.2s; }
        .gacha-tab:hover { border-color: rgba(59,130,246,0.5); background: rgba(59,130,246,0.1); }
        .gacha-tab--active { border-color: #3b82f6; background: rgba(59,130,246,0.2); color: #fff; font-weight: 700; }

        /* ── Title ───────────────────────────────────────────────── */
        .gacha-title {
          max-width: 400px; width: 100%; text-align: center; padding: 10px 0; font-size: 14px; font-weight: 700;
          border-top: 1px solid; border-bottom: 1px solid;
          border-image: linear-gradient(to left, transparent, #f9ca8b 20%, #f9ca8b 80%, transparent) 1;
          color: #e6e1ce;
        }

        /* ── Carousel ────────────────────────────────────────────── */
        .gacha-carousel { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; }
        .gacha-arrow { background: none; border: none; color: #6b7280; cursor: pointer; padding: 4px; transition: color 0.2s; }
        .gacha-arrow:hover { color: #fff; }
        .gacha-cards { display: flex; align-items: center; justify-content: center; gap: 40px; overflow: visible; min-height: 320px; }
        @media (max-width: 768px) { .gacha-cards { gap: 10px; } }

        /* ── Card ────────────────────────────────────────────────── */
        .gacha-card-wrap { position: relative; width: 198px; flex-shrink: 0; transition: all 0.35s ease; border-radius: 8px; }
        @media (max-width: 768px) { .gacha-card-wrap { width: 135px; } }
        .gacha-card { display: block; width: 100%; border: 1px solid transparent; border-radius: 8px; cursor: pointer; overflow: hidden; }
        .gacha-card-title { display: flex; flex-direction: column; align-items: center; gap: 0.4em; padding: 12px 8px; text-align: center; font-size: 13px; }
        .gacha-card-cat { font-size: 12px; opacity: 0.7; }
        .gacha-card-name { font-weight: 600; white-space: nowrap; }
        .gacha-card-img { aspect-ratio: 1/0.9078; background: rgba(0,0,0,0.3); overflow: hidden; }
        .gacha-card-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
        .gacha-neon { position: absolute; inset: -1px; border-radius: 8px; border: 2px solid #deac00; pointer-events: none; filter: ${S.goldNeon}; }

        /* ── View items btn ──────────────────────────────────────── */
        .gacha-view-items { display: flex; padding: 8px; }
        .gacha-view-btn { margin-left: auto; width: 25px; height: 25px; cursor: pointer; background: none; border: none; }
        @media (min-width: 1024px) { .gacha-view-btn { width: 30px; height: 30px; } }
        .gacha-view-default { display: block; width: 100%; height: 100%; }
        .gacha-view-hover { display: none; width: 100%; height: 100%; }
        .gacha-view-btn:hover .gacha-view-default { display: none; }
        .gacha-view-btn:hover .gacha-view-hover { display: block; }

        /* ── Pull buttons ────────────────────────────────────────── */
        .gacha-pull-btns { display: flex; justify-content: center; gap: 8px; width: 110%; max-width: 440px; margin: 16px auto 0; }
        .gacha-pull-btn { flex: 1; max-width: 200px; padding: 8px 0; font-size: 14px; font-weight: 700; color: #fff; text-shadow: 1px 1px 2px black; border: none; cursor: pointer; transition: filter 0.2s; }
        .gacha-pull-btn:hover { filter: brightness(1.15); }

        /* ── Results ─────────────────────────────────────────────── */
        .gacha-results { display: flex; flex-direction: column; align-items: center; padding: 24px 16px 40px; }
        .gacha-results-title {
          max-width: 400px; width: 100%; text-align: center; padding: 10px 0; margin-bottom: 24px; font-size: 16px; font-weight: 700;
          border-top: 1px solid; border-bottom: 1px solid;
          border-image: linear-gradient(to left, transparent, #f9ca8b 20%, #f9ca8b 80%, transparent) 1;
        }
        .gacha-results-grid {
          display: grid; grid-template-columns: repeat(4, 68px); justify-content: center;
          gap: 24px 48px; max-width: 600px; margin-bottom: 28px; padding: 20px 0;
        }
        .gacha-result-item {
          position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center;
          width: 68px; height: 68px; padding: 2px; border-radius: 0;
          animation: gacha-pop 0.3s ease-out both;
          background: rgba(0,0,0,0.3);
        }
        .gacha-result-icon { width: 100%; height: 100%; object-fit: contain; }
        .gacha-result-stars { font-size: 9px; line-height: 1; }
        .gacha-result-best { filter: drop-shadow(0px 0px 5px rgba(255,255,255,0.8)); }
        .gacha-result-new { position: absolute; top: -4px; right: -4px; background: #deac00; color: #000; font-size: 7px; font-weight: 800; padding: 1px 3px; border-radius: 2px; z-index: 1; }
        .gacha-result-tooltip {
          position: absolute; bottom: calc(100% + 6px); left: 50%; transform: translateX(-50%);
          background: rgba(0,0,0,0.9); color: #e6e1ce; font-size: 11px; padding: 4px 8px;
          border-radius: 4px; white-space: nowrap; pointer-events: none;
          opacity: 0; transition: opacity 0.15s; z-index: 10;
        }
        .gacha-result-tooltip::after {
          content: ''; position: absolute; top: 100%; left: 50%; transform: translateX(-50%);
          border: 4px solid transparent; border-top-color: rgba(0,0,0,0.9);
        }
        .gacha-result-item:hover .gacha-result-tooltip { opacity: 1; }

        /* ── Action buttons ──────────────────────────────────────── */
        .gacha-action-btns { display: flex; gap: 10px; }
        .gacha-action-btn { padding: 8px 32px; font-size: 14px; font-weight: 700; color: #fff; text-shadow: 1px 1px 2px black; border: none; cursor: pointer; transition: filter 0.2s; }
        .gacha-action-btn:hover { filter: brightness(1.15); }

        /* ── Inventory button ────────────────────────────────────── */
        .gacha-inv-btn { position: fixed; bottom: 16px; right: 16px; z-index: 30; width: 34px; height: 34px; background: none; border: 1px solid #3b6d99; cursor: pointer; padding: 0; transition: opacity 0.2s; }
        @media (min-width: 1024px) { .gacha-inv-btn { bottom: 8px; right: 32px; border: 1px solid #3b6d99; background: #0f2640; padding: 4px; width: 42px; height: 42px; } }
        .gacha-inv-btn:hover { opacity: 0.8; }

        /* ── Stats ───────────────────────────────────────────────── */
        .gacha-stats { position: fixed; bottom: 16px; left: 16px; z-index: 30; display: flex; gap: 12px; font-size: 11px; color: #6b7280; }
        .gacha-stats b { color: #ccc; }
        .gacha-reset { background: none; border: none; color: #555; cursor: pointer; text-decoration: underline; font-size: 11px; }
        .gacha-reset:hover { color: #f44; }

        /* ── Modals ──────────────────────────────────────────────── */
        .gacha-modal-bg { position: fixed; inset: 0; z-index: 50; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.7); padding: 16px; }
        .gacha-modal { width: 100%; max-width: 480px; max-height: 80vh; display: flex; flex-direction: column; background: linear-gradient(to bottom, #0d1b2a, #0a1628); border: 1px solid #2a4a6a; border-radius: 4px; overflow: hidden; }
        .gacha-modal-bars { display: flex; height: 4px; }
        .gacha-modal-bars > div:first-child { flex: 1; background: linear-gradient(to right, #10b981, #34d399); }
        .gacha-modal-bars > div:last-child { flex: 1; background: linear-gradient(to right, #ec4899, #f472b6); }
        .gacha-modal--inv { max-width: 520px; }
        .gacha-modal-head { display: flex; align-items: center; justify-content: space-between; padding: 10px 16px; border-bottom: 1px solid #1a3a5a; }
        .gacha-modal-head h3 { font-size: 14px; font-weight: 700; color: #f9ca8b; }
        .gacha-modal-head button { background: none; border: none; color: #888; cursor: pointer; }
        .gacha-modal-head button:hover { color: #fff; }
        .gacha-modal-sub { text-align: center; font-size: 12px; color: #888; padding: 8px 16px 4px; }
        .gacha-modal-label { font-size: 11px; color: #666; padding: 4px 16px 6px; border-bottom: 1px solid #1a3a5a; }
        .gacha-modal-list { flex: 1; overflow-y: auto; padding: 8px 16px; }
        .gacha-modal-row { display: flex; align-items: center; gap: 8px; padding: 5px 0; font-size: 12px; border-bottom: 1px solid rgba(255,255,255,0.04); }
        .gacha-modal-icon { width: 36px; height: 36px; flex-shrink: 0; object-fit: contain; border-radius: 2px; }
        .gacha-modal-stars { flex-shrink: 0; font-size: 10px; min-width: 50px; }
        .gacha-modal-name { flex: 1; color: #ccc; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .gacha-modal-prob { flex-shrink: 0; color: #888; font-variant-numeric: tabular-nums; min-width: 45px; text-align: right; }

        /* ── Animations ──────────────────────────────────────────── */
        @keyframes gacha-pop {
          from { opacity: 0; transform: scale(0.8) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}
