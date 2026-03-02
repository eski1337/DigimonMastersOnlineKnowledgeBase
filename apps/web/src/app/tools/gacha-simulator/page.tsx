'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Package, Sparkles, RotateCcw, ChevronLeft, ChevronRight, X, Info } from 'lucide-react';
import { BANNERS, type GachaItem, type GachaBanner } from './gacha-data';

/* ── Constants ────────────────────────────────────────────────────────── */

const RARITY_CONFIG: Record<number, { label: string; color: string; bg: string; glow: string; border: string }> = {
  7: { label: '★★★★★★★', color: 'text-amber-300', bg: 'bg-amber-500/20', glow: 'shadow-amber-500/50', border: 'border-amber-400/60' },
  6: { label: '★★★★★★', color: 'text-rose-400', bg: 'bg-rose-500/20', glow: 'shadow-rose-500/50', border: 'border-rose-400/60' },
  5: { label: '★★★★★', color: 'text-orange-400', bg: 'bg-orange-500/20', glow: 'shadow-orange-500/50', border: 'border-orange-400/60' },
  4: { label: '★★★★', color: 'text-purple-400', bg: 'bg-purple-500/20', glow: 'shadow-purple-500/50', border: 'border-purple-400/60' },
  3: { label: '★★★', color: 'text-blue-400', bg: 'bg-blue-500/20', glow: 'shadow-blue-500/50', border: 'border-blue-400/60' },
  2: { label: '★★', color: 'text-emerald-400', bg: 'bg-emerald-500/20', glow: 'shadow-emerald-500/40', border: 'border-emerald-400/60' },
  1: { label: '★', color: 'text-gray-400', bg: 'bg-gray-500/20', glow: 'shadow-gray-500/30', border: 'border-gray-400/40' },
};

type TabType = 'DATA_SUMMON' | 'DIGITAL_DRAW';

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
      if (roll <= 0) {
        results.push(item);
        break;
      }
    }
    if (results.length <= i) {
      results.push(banner.items[banner.items.length - 1]);
    }
  }
  return results;
}

function getHighestRarity(items: GachaItem[]): number {
  return items.reduce((max, item) => Math.max(max, item.rarity), 0);
}

/* ── Component ────────────────────────────────────────────────────────── */

export default function GachaSimulatorPage() {
  const [activeTab, setActiveTab] = useState<TabType>('DATA_SUMMON');
  const [selectedBannerIdx, setSelectedBannerIdx] = useState(0);
  const [pullResults, setPullResults] = useState<PullResult[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showInventory, setShowInventory] = useState(false);
  const [inventory, setInventory] = useState<Record<string, number>>({});
  const [totalPulls, setTotalPulls] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  const filteredBanners = useMemo(
    () => BANNERS.filter((b) => b.type === activeTab && b.items.length > 0),
    [activeTab],
  );

  const currentBanner = filteredBanners[selectedBannerIdx] || filteredBanners[0];

  const handleTabChange = useCallback((tab: TabType) => {
    setActiveTab(tab);
    setSelectedBannerIdx(0);
    setPullResults([]);
  }, []);

  const navigateBanner = useCallback(
    (dir: -1 | 1) => {
      setSelectedBannerIdx((prev) => {
        const next = prev + dir;
        if (next < 0) return filteredBanners.length - 1;
        if (next >= filteredBanners.length) return 0;
        return next;
      });
      setPullResults([]);
    },
    [filteredBanners.length],
  );

  const doPull = useCallback(
    (count: number) => {
      if (!currentBanner || isAnimating) return;
      setIsAnimating(true);
      setPullResults([]);

      setTimeout(() => {
        const items = pullFromBanner(currentBanner, count);
        const results: PullResult[] = items.map((item) => {
          const key = `${currentBanner.id}-${item.name}`;
          const isNew = !inventory[key];
          return { item, isNew };
        });

        const newInv = { ...inventory };
        items.forEach((item) => {
          const key = `${currentBanner.id}-${item.name}`;
          newInv[key] = (newInv[key] || 0) + 1;
        });

        setInventory(newInv);
        setTotalPulls((prev) => prev + count);
        setPullResults(results);
        setIsAnimating(false);

        setTimeout(() => {
          resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
      }, 600);
    },
    [currentBanner, isAnimating, inventory],
  );

  const resetAll = useCallback(() => {
    setInventory({});
    setTotalPulls(0);
    setPullResults([]);
  }, []);

  const inventoryItems = useMemo(() => {
    const items: { bannerName: string; itemName: string; count: number; rarity: number }[] = [];
    Object.entries(inventory).forEach(([key, count]) => {
      if (count <= 0) return;
      const dashIdx = key.indexOf('-');
      const bannerId = parseInt(key.substring(0, dashIdx));
      const itemName = key.substring(dashIdx + 1);
      const banner = BANNERS.find((b) => b.id === bannerId);
      const item = banner?.items.find((i) => i.name === itemName);
      items.push({
        bannerName: banner?.name || 'Unknown',
        itemName,
        count,
        rarity: item?.rarity || 1,
      });
    });
    items.sort((a, b) => b.rarity - a.rarity || a.itemName.localeCompare(b.itemName));
    return items;
  }, [inventory]);

  const highestRarity = pullResults.length > 0 ? getHighestRarity(pullResults.map((r) => r.item)) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
      <div className="container py-8 max-w-5xl">
        <Link
          href="/tools"
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Tools
        </Link>

        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-amber-400 via-rose-400 to-purple-400 bg-clip-text text-transparent">
            Gacha Simulator
          </h1>
          <p className="text-gray-400 text-sm">
            Test your luck! Simulate DMO gacha pulls without spending real money.
          </p>
        </div>

        {/* Mode Tabs */}
        <div className="flex justify-center gap-2 mb-8">
          {([
            ['DATA_SUMMON', 'Data Summon', Sparkles],
            ['DIGITAL_DRAW', 'Digital Draw', Package],
          ] as [TabType, string, typeof Sparkles][]).map(([type, label, Icon]) => (
            <button
              key={type}
              onClick={() => handleTabChange(type)}
              className={`
                flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all border
                ${activeTab === type
                  ? 'bg-red-600 border-red-500 text-white shadow-lg shadow-red-500/25'
                  : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:text-white hover:border-gray-600'
                }
              `}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Banner Selector */}
        {filteredBanners.length > 0 && (
          <div className="relative mb-8">
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => navigateBanner(-1)}
                className="p-2 rounded-full bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-700/50 transition-all"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              {/* Banner Cards Carousel */}
              <div className="flex items-center gap-3 overflow-hidden max-w-3xl">
                {filteredBanners.map((banner, idx) => {
                  const isActive = idx === selectedBannerIdx;
                  const distance = Math.abs(idx - selectedBannerIdx);
                  if (distance > 2) return null;

                  return (
                    <button
                      key={banner.id}
                      onClick={() => { setSelectedBannerIdx(idx); setPullResults([]); }}
                      className={`
                        flex-shrink-0 rounded-xl border-2 transition-all duration-300 overflow-hidden
                        ${isActive
                          ? 'w-48 h-64 border-red-500 shadow-lg shadow-red-500/20 scale-100 opacity-100'
                          : distance === 1
                            ? 'w-32 h-48 border-gray-700 opacity-60 hover:opacity-80 scale-95'
                            : 'w-24 h-40 border-gray-800 opacity-30 scale-90'
                        }
                      `}
                    >
                      <div className={`w-full h-full flex flex-col items-center justify-center p-3 ${
                        isActive
                          ? 'bg-gradient-to-b from-gray-800 via-gray-900 to-gray-950'
                          : 'bg-gray-900'
                      }`}>
                        <div className={`text-4xl mb-2 ${isActive ? 'animate-pulse' : ''}`}>
                          {activeTab === 'DATA_SUMMON' ? '🎴' : '💎'}
                        </div>
                        <div className={`text-center font-semibold leading-tight ${
                          isActive ? 'text-sm text-white' : 'text-[10px] text-gray-400'
                        }`}>
                          {banner.category && isActive && (
                            <div className="text-[10px] text-red-400 mb-1">{banner.category}</div>
                          )}
                          {banner.name}
                        </div>
                        {isActive && (
                          <div className="mt-2 text-[10px] text-gray-500">
                            {banner.items.length} items
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => navigateBanner(1)}
                className="p-2 rounded-full bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-700/50 transition-all"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            {/* Banner Info */}
            {currentBanner && (
              <div className="text-center mt-3">
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="text-xs text-gray-500 hover:text-gray-300 transition-colors underline"
                >
                  {showDetails ? 'Hide drop rates' : 'View drop rates'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Drop Rate Details */}
        {showDetails && currentBanner && (
          <div className="mb-6 rounded-xl border border-gray-800 bg-gray-900/80 p-4 max-w-2xl mx-auto">
            <h3 className="font-semibold text-sm text-gray-300 mb-3">
              {currentBanner.name} — Drop Rates
            </h3>
            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-2">
              {[...currentBanner.items]
                .sort((a, b) => b.rarity - a.rarity)
                .map((item, i) => {
                  const rc = RARITY_CONFIG[item.rarity] || RARITY_CONFIG[1];
                  return (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`${rc.color} font-mono text-[10px] w-16`}>{rc.label}</span>
                        <span className="text-gray-300">{item.name}</span>
                      </div>
                      <span className="text-gray-500 tabular-nums">{item.probability}%</span>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Pull Buttons */}
        {currentBanner && (
          <div className="flex justify-center gap-3 mb-8">
            {activeTab === 'DATA_SUMMON' ? (
              <>
                <button
                  onClick={() => doPull(1)}
                  disabled={isAnimating}
                  className="px-8 py-3 rounded-lg font-bold text-sm bg-gradient-to-r from-emerald-600 to-emerald-500 text-white hover:from-emerald-500 hover:to-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40"
                >
                  1 time
                </button>
                <button
                  onClick={() => doPull(10)}
                  disabled={isAnimating}
                  className="px-8 py-3 rounded-lg font-bold text-sm bg-gradient-to-r from-red-600 to-red-500 text-white hover:from-red-500 hover:to-red-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-red-500/25 hover:shadow-red-500/40"
                >
                  10 times
                </button>
              </>
            ) : (
              <button
                onClick={() => doPull(11)}
                disabled={isAnimating}
                className="px-8 py-3 rounded-lg font-bold text-sm bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:from-blue-500 hover:to-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
              >
                11 times Draw
              </button>
            )}
          </div>
        )}

        {/* Animation */}
        {isAnimating && (
          <div className="flex justify-center mb-8">
            <div className="relative w-32 h-32">
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-amber-500 via-rose-500 to-purple-500 animate-spin opacity-60 blur-xl" />
              <div className="absolute inset-2 rounded-full bg-gray-950 flex items-center justify-center">
                <Sparkles className="h-10 w-10 text-amber-400 animate-pulse" />
              </div>
            </div>
          </div>
        )}

        {/* Pull Results */}
        {pullResults.length > 0 && !isAnimating && (
          <div ref={resultRef} className="mb-8">
            {/* Highest rarity flash */}
            {highestRarity >= 5 && (
              <div className="text-center mb-4">
                <span className={`text-lg font-bold ${RARITY_CONFIG[highestRarity]?.color || 'text-white'} animate-pulse`}>
                  {highestRarity === 7 ? '🌟 JACKPOT! 🌟' : highestRarity === 6 ? '✨ AMAZING! ✨' : '⭐ GREAT! ⭐'}
                </span>
              </div>
            )}

            <div className={`grid gap-3 ${
              pullResults.length === 1 ? 'grid-cols-1 max-w-xs mx-auto' :
              pullResults.length <= 4 ? 'grid-cols-2 max-w-lg mx-auto' :
              'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 max-w-3xl mx-auto'
            }`}>
              {pullResults.map((result, i) => {
                const rc = RARITY_CONFIG[result.item.rarity] || RARITY_CONFIG[1];
                return (
                  <div
                    key={i}
                    className={`
                      rounded-xl border-2 p-3 text-center transition-all
                      ${rc.border} ${rc.bg}
                      ${result.item.rarity >= 5 ? `shadow-lg ${rc.glow}` : ''}
                      animate-in fade-in slide-in-from-bottom-2
                    `}
                    style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'both', animationDuration: '400ms' }}
                  >
                    <div className={`text-[10px] font-mono mb-1 ${rc.color}`}>{rc.label}</div>
                    <div className="text-xs font-semibold text-white leading-tight mb-1">
                      {result.item.name}
                    </div>
                    {result.isNew && (
                      <span className="inline-block text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/30 text-amber-300 mt-1">
                        NEW
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* No results placeholder */}
        {pullResults.length === 0 && !isAnimating && (
          <div className="text-center py-12 text-gray-600">
            <Sparkles className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Select a banner and press pull to test your luck!</p>
          </div>
        )}

        {/* Stats & Inventory Bar */}
        <div className="flex items-center justify-between bg-gray-900/80 border border-gray-800 rounded-xl px-4 py-3 max-w-3xl mx-auto">
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span>Total Pulls: <strong className="text-white">{totalPulls}</strong></span>
            <span>Unique Items: <strong className="text-white">{Object.keys(inventory).length}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowInventory(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400 text-xs font-medium hover:bg-blue-600/30 transition-all"
            >
              <Package className="h-3.5 w-3.5" />
              Inventory
            </button>
            <button
              onClick={resetAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-gray-400 text-xs font-medium hover:text-white hover:border-gray-600 transition-all"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </button>
          </div>
        </div>

        {/* Inventory Modal */}
        {showInventory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setShowInventory(false)}>
            <div
              className="w-full max-w-2xl max-h-[80vh] bg-gray-900 border border-gray-700 rounded-2xl overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
                <h2 className="font-bold text-lg text-white">Inventory</h2>
                <button onClick={() => setShowInventory(false)} className="text-gray-400 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-5 overflow-y-auto max-h-[calc(80vh-70px)]">
                {inventoryItems.length === 0 ? (
                  <p className="text-center text-gray-600 py-8">No items collected yet. Start pulling!</p>
                ) : (
                  <div className="space-y-2">
                    {inventoryItems.map((item, i) => {
                      const rc = RARITY_CONFIG[item.rarity] || RARITY_CONFIG[1];
                      return (
                        <div key={i} className={`flex items-center justify-between px-3 py-2 rounded-lg border ${rc.border} ${rc.bg}`}>
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-mono ${rc.color} w-14`}>{rc.label}</span>
                            <div>
                              <div className="text-sm font-medium text-white">{item.itemName}</div>
                              <div className="text-[10px] text-gray-500">{item.bannerName}</div>
                            </div>
                          </div>
                          <span className="text-xs font-bold text-gray-300 tabular-nums">×{item.count}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Inventory rarity summary */}
              {inventoryItems.length > 0 && (
                <div className="px-5 py-3 border-t border-gray-800 flex flex-wrap gap-2">
                  {[7, 6, 5, 4, 3, 2, 1].map((r) => {
                    const count = inventoryItems.filter((i) => i.rarity === r).reduce((sum, i) => sum + i.count, 0);
                    if (count === 0) return null;
                    const rc = RARITY_CONFIG[r];
                    return (
                      <span key={r} className={`text-[10px] px-2 py-0.5 rounded ${rc.bg} ${rc.color} ${rc.border} border`}>
                        {rc.label} ×{count}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Info */}
        <div className="flex items-start gap-2 text-xs text-gray-500 bg-gray-900/50 rounded-lg border border-gray-800 p-3 mt-6 max-w-3xl mx-auto">
          <Info className="h-4 w-4 shrink-0 mt-0.5 text-blue-400/50" />
          <span>
            This simulator uses the same drop rates as the original DMO gacha system. Results are purely random and for entertainment only.
            No real items or currency are used. Data sourced from dmo.greuta.org.
          </span>
        </div>
      </div>
    </div>
  );
}
