'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronLeft, ChevronRight, X, Search } from 'lucide-react';
import { BANNERS, type GachaItem, type GachaBanner } from './gacha-data';

/* ── Constants ────────────────────────────────────────────────────────── */

const RARITY_BORDER: Record<number, string> = {
  7: '#ffd700',
  6: '#ff4466',
  5: '#ff8c00',
  4: '#a855f7',
  3: '#3b82f6',
  2: '#22c55e',
  1: '#6b7280',
};

const RARITY_BG: Record<number, string> = {
  7: 'rgba(255,215,0,0.15)',
  6: 'rgba(255,68,102,0.12)',
  5: 'rgba(255,140,0,0.12)',
  4: 'rgba(168,85,247,0.1)',
  3: 'rgba(59,130,246,0.1)',
  2: 'rgba(34,197,94,0.08)',
  1: 'rgba(107,114,128,0.08)',
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

interface PullResult {
  item: GachaItem;
  isNew: boolean;
}

/* ── Helpers ──────────────────────────────────────────────────────────── */

function pullFromBanner(banner: GachaBanner, count: number): GachaItem[] {
  const results: GachaItem[] = [];
  const totalProb = banner.items.reduce((sum, item) => sum + item.probability, 0);
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

function getHighestRarity(items: GachaItem[]): number {
  return items.reduce((max, item) => Math.max(max, item.rarity), 0);
}

function getVideoForRarity(r: number): string {
  if (r >= 7) return RARITY_VIDEO[7];
  if (r >= 6) return RARITY_VIDEO[6];
  if (r >= 5) return RARITY_VIDEO[5];
  if (r >= 3) return RARITY_VIDEO[3];
  return RARITY_VIDEO[1];
}

/* ── Component ────────────────────────────────────────────────────────── */

export default function GachaSimulatorPage() {
  const [activeTab, setActiveTab] = useState<TabType>('DATA_SUMMON');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('select');
  const [pullResults, setPullResults] = useState<PullResult[]>([]);
  const [inventory, setInventory] = useState<Record<string, number>>({});
  const [totalPulls, setTotalPulls] = useState(0);
  const [showInventory, setShowInventory] = useState(false);
  const [showRates, setShowRates] = useState(false);
  const [invTab, setInvTab] = useState<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const banners = useMemo(
    () => BANNERS.filter((b) => b.type === activeTab && b.items.length > 0),
    [activeTab],
  );
  const banner = banners[selectedIdx] || banners[0];

  const handleTabChange = useCallback((tab: TabType) => {
    setActiveTab(tab);
    setSelectedIdx(0);
    setPhase('select');
    setPullResults([]);
  }, []);

  const nav = useCallback((dir: -1 | 1) => {
    setSelectedIdx((p) => {
      const n = p + dir;
      return n < 0 ? banners.length - 1 : n >= banners.length ? 0 : n;
    });
    setPullResults([]);
    setPhase('select');
  }, [banners.length]);

  const doPull = useCallback((count: number) => {
    if (!banner || phase === 'video') return;
    const items = pullFromBanner(banner, count);
    const highest = getHighestRarity(items);
    const results: PullResult[] = items.map((item) => {
      const key = `${banner.id}-${item.name}`;
      return { item, isNew: !inventory[key] };
    });

    const newInv = { ...inventory };
    items.forEach((item) => {
      const key = `${banner.id}-${item.name}`;
      newInv[key] = (newInv[key] || 0) + 1;
    });
    setInventory(newInv);
    setTotalPulls((p) => p + count);
    setPullResults(results);

    setPhase('video');
    const vid = getVideoForRarity(highest);
    if (videoRef.current) {
      videoRef.current.src = vid;
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => setPhase('results'));
    }
  }, [banner, phase, inventory]);

  const skipVideo = useCallback(() => setPhase('results'), []);

  const handleVideoEnd = useCallback(() => setPhase('results'), []);

  useEffect(() => {
    const v = videoRef.current;
    if (v) { v.addEventListener('ended', handleVideoEnd); return () => v.removeEventListener('ended', handleVideoEnd); }
  }, [handleVideoEnd]);

  const resetAll = useCallback(() => {
    setInventory({});
    setTotalPulls(0);
    setPullResults([]);
    setPhase('select');
  }, []);

  const invItems = useMemo(() => {
    const items: { bannerId: number; bannerName: string; itemName: string; count: number; rarity: number }[] = [];
    Object.entries(inventory).forEach(([key, count]) => {
      if (count <= 0) return;
      const di = key.indexOf('-');
      const bId = parseInt(key.substring(0, di));
      const iName = key.substring(di + 1);
      const b = BANNERS.find((x) => x.id === bId);
      const it = b?.items.find((x) => x.name === iName);
      items.push({ bannerId: bId, bannerName: b?.name || '', itemName: iName, count, rarity: it?.rarity || 1 });
    });
    items.sort((a, b) => b.rarity - a.rarity);
    return items;
  }, [inventory]);

  const invBanners = useMemo(() => {
    const ids = new Set(invItems.map((i) => i.bannerId));
    return banners.filter((b) => ids.has(b.id));
  }, [invItems, banners]);

  const filteredInv = invTab ? invItems.filter((i) => i.bannerId === invTab) : invItems;

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ background: '#0a0a12' }}>
      {/* Constellation background */}
      <div className="pointer-events-none absolute inset-0 opacity-30" style={{
        backgroundImage: `radial-gradient(1px 1px at 20% 30%, rgba(255,255,255,0.4), transparent),
          radial-gradient(1px 1px at 40% 70%, rgba(255,255,255,0.3), transparent),
          radial-gradient(1px 1px at 60% 20%, rgba(255,255,255,0.4), transparent),
          radial-gradient(1px 1px at 80% 60%, rgba(255,255,255,0.3), transparent),
          radial-gradient(1px 1px at 10% 80%, rgba(255,255,255,0.2), transparent),
          radial-gradient(1px 1px at 90% 40%, rgba(255,255,255,0.3), transparent),
          radial-gradient(1.5px 1.5px at 50% 50%, rgba(255,255,255,0.5), transparent)`,
        backgroundSize: '200px 200px, 300px 300px, 250px 250px, 350px 350px, 400px 400px, 150px 150px, 500px 500px',
      }} />
      <svg className="pointer-events-none absolute inset-0 w-full h-full opacity-[0.06]">
        <line x1="10%" y1="20%" x2="30%" y2="45%" stroke="white" strokeWidth="0.5" />
        <line x1="30%" y1="45%" x2="50%" y2="30%" stroke="white" strokeWidth="0.5" />
        <line x1="50%" y1="30%" x2="70%" y2="55%" stroke="white" strokeWidth="0.5" />
        <line x1="70%" y1="55%" x2="90%" y2="35%" stroke="white" strokeWidth="0.5" />
        <line x1="20%" y1="70%" x2="40%" y2="85%" stroke="white" strokeWidth="0.5" />
        <line x1="40%" y1="85%" x2="60%" y2="70%" stroke="white" strokeWidth="0.5" />
        <line x1="60%" y1="70%" x2="80%" y2="90%" stroke="white" strokeWidth="0.5" />
      </svg>

      {/* Video overlay */}
      <video
        ref={videoRef}
        className={`fixed inset-0 z-50 w-full h-full object-cover bg-black ${phase === 'video' ? '' : 'hidden'}`}
        playsInline
        muted
      />
      {phase === 'video' && (
        <button
          onClick={skipVideo}
          className="fixed top-4 right-4 z-[60] px-4 py-1.5 bg-black/60 border border-gray-600 text-gray-300 text-xs font-bold uppercase tracking-wider hover:bg-black/80 transition-all"
        >
          SKIP
        </button>
      )}

      {/* Main content */}
      <div className={`relative z-10 ${phase === 'video' ? 'hidden' : ''}`}>
        <div className="container py-6 max-w-5xl">
          <Link href="/tools" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 mb-4 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Tools
          </Link>

          <h1 className="text-center text-xl font-bold text-gray-200 mb-1">Gacha Simulator</h1>

          {phase === 'select' && (
            <>
              {/* Mode tabs */}
              <div className="flex justify-center gap-1 mt-4 mb-6">
                {([['DATA_SUMMON', 'Data Summon', '/gacha/gacha-symbol.jpg'], ['DIGITAL_DRAW', 'Digital Draw', '/gacha/gacha-symbol.jpg']] as [TabType, string, string][]).map(([type, label, icon]) => (
                  <button
                    key={type}
                    onClick={() => handleTabChange(type)}
                    className={`flex items-center gap-2 px-5 py-2 border-2 transition-all text-sm font-bold ${
                      activeTab === type
                        ? 'border-blue-500 bg-blue-500/20 text-white'
                        : 'border-gray-700 text-gray-500 hover:border-blue-500/50 hover:bg-blue-500/10'
                    }`}
                  >
                    <img src={icon} alt="" className="w-5 h-5" />
                    {label}
                  </button>
                ))}
              </div>

              <p className="text-center text-gray-400 text-sm mb-6">
                {activeTab === 'DATA_SUMMON' ? 'Select the data to summon.' : 'Choose Digital Draw.'}
              </p>

              {/* Banner carousel */}
              <div className="flex items-center justify-center gap-2 mb-6">
                <button onClick={() => nav(-1)} className="text-blue-400 hover:text-blue-300 transition-colors p-1">
                  <ChevronLeft className="h-6 w-6" strokeWidth={3} />
                </button>

                <div className="flex items-end gap-3 overflow-hidden">
                  {banners.map((b, idx) => {
                    const dist = idx - selectedIdx;
                    const absDist = Math.abs(dist);
                    if (absDist > 2) return null;
                    const isActive = idx === selectedIdx;

                    return (
                      <button
                        key={b.id}
                        onClick={() => { setSelectedIdx(idx); }}
                        className="flex-shrink-0 flex flex-col items-center transition-all duration-300"
                        style={{
                          opacity: isActive ? 1 : absDist === 1 ? 0.5 : 0.25,
                          transform: `scale(${isActive ? 1 : 0.85})`,
                        }}
                      >
                        <div className={`text-center mb-1 text-[10px] leading-tight ${isActive ? 'text-gray-300' : 'text-gray-600'}`} style={{ maxWidth: isActive ? 160 : 120 }}>
                          {b.category && <div className="truncate">{b.category}</div>}
                          <div className="font-bold truncate">{b.name}</div>
                        </div>
                        <div
                          className={`overflow-hidden transition-all duration-300 ${isActive ? 'border-2 border-red-500 shadow-lg shadow-red-500/30' : 'border border-gray-700'}`}
                          style={{ width: isActive ? 160 : 120, aspectRatio: '1/0.91' }}
                        >
                          {b.image ? (
                            <img src={b.image} alt={b.name} className="w-full h-full object-cover" draggable={false} />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center" style={{ background: 'linear-gradient(180deg, #0f1b2d 0%, #0a1222 100%)' }}>
                              <img src="/gacha/gacha-symbol.jpg" alt="" className="w-10 h-10 opacity-70" />
                            </div>
                          )}
                        </div>
                        {isActive && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setShowRates(true); }}
                            className="mt-1"
                          >
                            <Search className="h-4 w-4 text-blue-400 hover:text-blue-300" />
                          </button>
                        )}
                      </button>
                    );
                  })}
                </div>

                <button onClick={() => nav(1)} className="text-blue-400 hover:text-blue-300 transition-colors p-1">
                  <ChevronRight className="h-6 w-6" strokeWidth={3} />
                </button>
              </div>

              {/* Pull buttons */}
              {banner && (
                <div className="flex justify-center gap-3 mb-4">
                  {activeTab === 'DATA_SUMMON' ? (
                    <>
                      <button onClick={() => doPull(1)} className="px-6 py-2 font-bold text-sm text-white text-shadow" style={{ background: 'linear-gradient(180deg, #2d8a4e 0%, #1a6636 100%)', border: '1px solid #3cb371' }}>
                        1 time
                      </button>
                      <button onClick={() => doPull(10)} className="px-6 py-2 font-bold text-sm text-white text-shadow" style={{ background: 'linear-gradient(180deg, #c62828 0%, #8b1a1a 100%)', border: '1px solid #ef5350' }}>
                        10 times
                      </button>
                    </>
                  ) : (
                    <button onClick={() => doPull(11)} className="px-6 py-2 font-bold text-sm text-white text-shadow" style={{ background: 'linear-gradient(180deg, #1565c0 0%, #0d47a1 100%)', border: '1px solid #42a5f5' }}>
                      11 times Draw
                    </button>
                  )}
                </div>
              )}
            </>
          )}

          {/* Results phase */}
          {phase === 'results' && pullResults.length > 0 && (
            <div className="mt-6">
              {/* Obtained Items header */}
              <div className="text-center mb-8">
                <div className="inline-block relative">
                  <div className="absolute left-0 right-0 top-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, #c0a040, #e0c060, #c0a040, transparent)' }} />
                  <h2 className="text-lg font-bold text-gray-200 py-2 px-12">Obtained Items</h2>
                  <div className="absolute left-0 right-0 bottom-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, #606060, transparent)' }} />
                </div>
              </div>

              {/* Items grid */}
              <div className={`grid gap-3 max-w-3xl mx-auto mb-8 ${pullResults.length === 1 ? 'grid-cols-1 max-w-[200px]' : pullResults.length <= 5 ? 'grid-cols-5' : 'grid-cols-5 sm:grid-cols-5'}`}>
                {pullResults.map((result, i) => {
                  const borderColor = RARITY_BORDER[result.item.rarity] || RARITY_BORDER[1];
                  const bgColor = RARITY_BG[result.item.rarity] || RARITY_BG[1];
                  return (
                    <div
                      key={i}
                      className="relative"
                      style={{
                        animationDelay: `${i * 80}ms`,
                        animationFillMode: 'both',
                        animationDuration: '400ms',
                        animationName: 'fadeInUp',
                      }}
                    >
                      <div
                        className="flex flex-col items-center justify-center p-2 relative"
                        style={{
                          border: `2px solid ${borderColor}`,
                          background: bgColor,
                          boxShadow: result.item.rarity >= 5 ? `0 0 15px ${borderColor}50` : 'none',
                          minHeight: 80,
                        }}
                      >
                        <div className="text-[10px] font-bold text-center leading-tight px-1" style={{ color: borderColor }}>{'★'.repeat(result.item.rarity)}</div>
                        <div className="text-[11px] font-semibold text-center text-gray-200 leading-tight mt-1 px-1">
                          {result.item.name}
                        </div>
                        {result.isNew && (
                          <div className="absolute top-0.5 right-0.5 bg-amber-500 text-[7px] font-bold px-1 py-px text-black rounded-sm">NEW</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Confirm / Resummon */}
              <div className="flex justify-center gap-3 mb-8">
                <button
                  onClick={() => setPhase('select')}
                  className="px-6 py-2 font-bold text-sm text-white"
                  style={{ background: 'linear-gradient(180deg, #1976d2 0%, #0d47a1 100%)', border: '1px solid #42a5f5' }}
                >
                  Confirm
                </button>
                <button
                  onClick={() => {
                    const count = activeTab === 'DATA_SUMMON' ? (pullResults.length > 1 ? 10 : 1) : 11;
                    setPhase('select');
                    setTimeout(() => doPull(count), 50);
                  }}
                  className="px-6 py-2 font-bold text-sm text-white"
                  style={{ background: 'linear-gradient(180deg, #b71c1c 0%, #7f0000 100%)', border: '1px solid #ef5350' }}
                >
                  Resummon
                </button>
              </div>
            </div>
          )}

          {/* Inventory button - fixed bottom right */}
          <button
            onClick={() => { setShowInventory(true); setInvTab(null); }}
            className="fixed bottom-6 right-6 z-30 w-12 h-12 flex items-center justify-center"
            style={{ border: '2px solid #4488cc', background: 'linear-gradient(180deg, #1a3a5c 0%, #0d2137 100%)' }}
            title="Inventory"
          >
            <img src="/gacha/inven.jpg" alt="Inventory" className="w-8 h-8" />
          </button>

          {/* Stats bar */}
          <div className="fixed bottom-6 left-6 z-30 flex items-center gap-3 text-[10px] text-gray-500">
            <span>Pulls: <b className="text-gray-300">{totalPulls}</b></span>
            <span>Items: <b className="text-gray-300">{Object.keys(inventory).length}</b></span>
            <button onClick={resetAll} className="text-gray-600 hover:text-red-400 transition-colors underline">Reset</button>
          </div>
        </div>
      </div>

      {/* Probability Information modal */}
      {showRates && banner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setShowRates(false)}>
          <div className="w-full max-w-lg mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()} style={{ border: '2px solid #4488cc', background: 'linear-gradient(180deg, #0d1b2a 0%, #0a1628 100%)' }}>
            {/* Progress bar decoration */}
            <div className="h-1 flex">
              <div className="flex-1 bg-emerald-500" />
              <div className="flex-1 bg-pink-500" />
            </div>
            <div className="flex items-center justify-between px-4 py-2">
              <h3 className="text-sm font-bold text-amber-400">Probability Information</h3>
              <button onClick={() => setShowRates(false)} className="text-gray-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="text-center text-xs text-gray-400 pb-2">
              {banner.category}<br />{banner.name}
            </div>
            <div className="px-4 pb-1 text-[10px] text-gray-500 border-b border-gray-700">Random Summon List</div>
            <div className="max-h-80 overflow-y-auto px-4 py-2 space-y-1.5">
              {[...banner.items].sort((a, b) => b.rarity - a.rarity).map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <div className="w-7 h-7 flex-shrink-0 flex items-center justify-center" style={{ border: `1.5px solid ${RARITY_BORDER[item.rarity]}`, background: RARITY_BG[item.rarity] }}>
                    <span className="text-[8px] font-bold" style={{ color: RARITY_BORDER[item.rarity] }}>★{item.rarity}</span>
                  </div>
                  <span className="flex-1 text-gray-300 truncate">{item.name}</span>
                  <span className="text-gray-500 tabular-nums ml-2">{item.probability}%</span>
                </div>
              ))}
            </div>
            <div className="h-1 flex mt-2">
              <div className="flex-1 bg-emerald-500" />
              <div className="flex-1 bg-pink-500" />
            </div>
          </div>
        </div>
      )}

      {/* Inventory modal */}
      {showInventory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setShowInventory(false)}>
          <div
            className="w-full max-w-xl max-h-[80vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
            style={{ border: '2px solid #4488cc', background: 'linear-gradient(180deg, #0d2844 0%, #0a1e36 100%)' }}
          >
            <div className="flex items-center justify-between px-4 py-2 border-b border-blue-400/30">
              <h2 className="font-bold text-sm text-gray-200">Inventory</h2>
              <button onClick={() => setShowInventory(false)} className="text-amber-400 hover:text-amber-300 font-bold text-sm">✕</button>
            </div>

            {/* Banner tabs */}
            <div className="flex flex-wrap gap-1 px-3 py-2 border-b border-blue-400/20">
              {invBanners.map((b) => {
                const count = invItems.filter((i) => i.bannerId === b.id).reduce((s, i) => s + i.count, 0);
                return (
                  <button
                    key={b.id}
                    onClick={() => setInvTab(invTab === b.id ? null : b.id)}
                    className={`text-[10px] px-2 py-0.5 border transition-colors ${
                      invTab === b.id ? 'border-amber-400 text-amber-400 bg-amber-400/10' : 'border-gray-600 text-gray-400 hover:border-gray-500'
                    }`}
                  >
                    {b.name} <span className={invTab === b.id ? 'text-amber-300' : 'text-gray-600'}>{count}</span>
                  </button>
                );
              })}
              {invBanners.length === 0 && <span className="text-xs text-gray-600">No items yet</span>}
            </div>

            {/* Item list */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {filteredInv.length === 0 ? (
                <p className="text-center text-gray-600 py-8 text-xs">No items collected yet.</p>
              ) : (
                filteredInv.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 px-3 py-1.5"
                    style={{ border: `1px solid ${RARITY_BORDER[item.rarity]}30`, background: RARITY_BG[item.rarity] }}
                  >
                    <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center" style={{ border: `1.5px solid ${RARITY_BORDER[item.rarity]}`, background: RARITY_BG[item.rarity] }}>
                      <span className="text-[7px] font-bold" style={{ color: RARITY_BORDER[item.rarity] }}>★{item.rarity}</span>
                    </div>
                    <span className="flex-1 text-xs text-gray-300 truncate">{item.itemName}</span>
                    <span className="text-xs font-bold tabular-nums" style={{ color: RARITY_BORDER[item.rarity] }}>×{item.count}</span>
                  </div>
                ))
              )}
            </div>

            {/* Bottom decoration */}
            <div className="h-1 flex">
              <div className="flex-1 bg-emerald-500" />
              <div className="flex-1 bg-pink-500" />
            </div>
          </div>
        </div>
      )}

      {/* Fade-in keyframes */}
      <style jsx global>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .text-shadow { text-shadow: 0 1px 3px rgba(0,0,0,0.5); }
      `}</style>
    </div>
  );
}
