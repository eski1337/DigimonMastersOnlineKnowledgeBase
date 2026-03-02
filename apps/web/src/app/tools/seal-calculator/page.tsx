'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Info, Search, ChevronDown, ChevronUp, Coins } from 'lucide-react';
import { SEALS, type Seal } from './seal-data';

/* ── Constants ────────────────────────────────────────────────────────── */

const STAT_TYPES = ['AT', 'CT', 'HT', 'HP', 'DS', 'DE', 'BL', 'EV'] as const;
type StatType = (typeof STAT_TYPES)[number];

const STAT_COLORS: Record<StatType, string> = {
  AT: 'text-red-400',
  CT: 'text-orange-400',
  HT: 'text-yellow-400',
  HP: 'text-pink-400',
  DS: 'text-blue-400',
  DE: 'text-cyan-400',
  BL: 'text-emerald-400',
  EV: 'text-purple-400',
};

const STAT_BG: Record<StatType, string> = {
  AT: 'bg-red-500/10 border-red-500/30',
  CT: 'bg-orange-500/10 border-orange-500/30',
  HT: 'bg-yellow-500/10 border-yellow-500/30',
  HP: 'bg-pink-500/10 border-pink-500/30',
  DS: 'bg-blue-500/10 border-blue-500/30',
  DE: 'bg-cyan-500/10 border-cyan-500/30',
  BL: 'bg-emerald-500/10 border-emerald-500/30',
  EV: 'bg-purple-500/10 border-purple-500/30',
};

const STAT_NAMES: Record<StatType, string> = {
  AT: 'Attack',
  CT: 'Critical',
  HT: 'Hit Rate',
  HP: 'Health',
  DS: 'Digi-Soul',
  DE: 'Defense',
  BL: 'Block',
  EV: 'Evasion',
};

type TabType = 'calculator' | 'seals';

interface SealResult extends Seal {
  efficiency: number;
}

/* ── Helpers ──────────────────────────────────────────────────────────── */

function fmt(n: number, decimals = 1): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(decimals) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(decimals) + 'K';
  return n.toFixed(decimals);
}

function fmtPrice(n: number): string {
  if (n === 0) return '—';
  if (n >= 1_000) return fmt(n) + ' M';
  return n.toFixed(1) + ' M';
}

function getSealsForStat(stat: StatType): SealResult[] {
  return SEALS
    .filter((s) => s.stat === stat)
    .map((s) => ({
      ...s,
      efficiency: s.price > 0 ? s.max / s.price : 0,
    }))
    .sort((a, b) => b.efficiency - a.efficiency);
}

/**
 * Greedy algorithm: pick seals by best efficiency (stat/M) first.
 * Each seal can only be used once. Returns selected seals + total cost.
 */
function findOptimalSeals(
  stat: StatType,
  target: number,
  ownedIds: Set<number>,
): { seals: SealResult[]; totalStat: number; totalCost: number } {
  const available = getSealsForStat(stat).filter(
    (s) => s.price > 0 && !ownedIds.has(s.id),
  );

  const selected: SealResult[] = [];
  let totalStat = 0;
  let totalCost = 0;

  for (const seal of available) {
    if (totalStat >= target) break;
    selected.push(seal);
    totalStat += seal.max;
    totalCost += seal.price;
  }

  return { seals: selected, totalStat, totalCost };
}

/* ── Component ────────────────────────────────────────────────────────── */

export default function SealCalculatorPage() {
  const [activeTab, setActiveTab] = useState<TabType>('calculator');
  const [statType, setStatType] = useState<StatType>('AT');
  const [targetValue, setTargetValue] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'efficiency' | 'price' | 'max' | 'name'>('efficiency');
  const [sortAsc, setSortAsc] = useState(false);
  const [ownedSeals, setOwnedSeals] = useState<Record<number, number>>({});
  const [showOwned, setShowOwned] = useState(false);

  const target = parseInt(targetValue) || 0;

  // Owned seal IDs for the current stat type (count > 0)
  const ownedIds = useMemo(() => {
    const ids = new Set<number>();
    Object.entries(ownedSeals).forEach(([id, count]) => {
      if (count > 0) ids.add(parseInt(id));
    });
    return ids;
  }, [ownedSeals]);

  // Total stat from owned seals for current stat type
  const ownedStatTotal = useMemo(() => {
    let total = 0;
    SEALS.forEach((s) => {
      if (s.stat === statType && (ownedSeals[s.id] || 0) > 0) {
        total += s.max;
      }
    });
    return total;
  }, [ownedSeals, statType]);

  // Effective target = target minus what user already owns
  const effectiveTarget = Math.max(0, target - ownedStatTotal);

  // Calculator result
  const result = useMemo(() => {
    if (effectiveTarget <= 0 && target > 0) {
      return { seals: [], totalStat: 0, totalCost: 0 };
    }
    if (effectiveTarget <= 0) return null;
    return findOptimalSeals(statType, effectiveTarget, ownedIds);
  }, [statType, effectiveTarget, target, ownedIds]);

  // Seal browser data
  const browserSeals = useMemo(() => {
    let seals = getSealsForStat(statType);

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      seals = seals.filter((s) => s.name.toLowerCase().includes(q));
    }

    if (showOwned) {
      seals = seals.filter((s) => (ownedSeals[s.id] || 0) > 0);
    }

    seals.sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case 'efficiency': cmp = a.efficiency - b.efficiency; break;
        case 'price': cmp = a.price - b.price; break;
        case 'max': cmp = a.max - b.max; break;
        case 'name': cmp = a.name.localeCompare(b.name); break;
      }
      return sortAsc ? cmp : -cmp;
    });

    return seals;
  }, [statType, searchQuery, sortBy, sortAsc, showOwned, ownedSeals]);

  const toggleSort = useCallback((col: typeof sortBy) => {
    if (sortBy === col) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(col);
      setSortAsc(false);
    }
  }, [sortBy, sortAsc]);

  const SortIcon = ({ col }: { col: typeof sortBy }) => {
    if (sortBy !== col) return null;
    return sortAsc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />;
  };

  return (
    <div className="container py-8 max-w-5xl">
      <Link
        href="/tools"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Tools
      </Link>

      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Seal Calculator</h1>
        <p className="text-muted-foreground">
          Find the most cost-efficient seal combination to reach your target stat value. Prices are in Mega (M) from the Omega server.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b mb-6">
        {([
          ['calculator', 'Calculator'],
          ['seals', 'Seal Browser'],
        ] as [TabType, string][]).map(([tab, label]) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === tab
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Stat Type Tabs */}
      <div className="flex flex-wrap gap-1.5 mb-6">
        {STAT_TYPES.map((st) => {
          const isActive = statType === st;
          return (
            <button
              key={st}
              onClick={() => setStatType(st)}
              className={`
                px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all border
                ${isActive
                  ? `${STAT_BG[st]} ${STAT_COLORS[st]}`
                  : 'bg-card border-border text-muted-foreground hover:bg-accent/50'
                }
              `}
            >
              {st}
            </button>
          );
        })}
      </div>

      {/* ── Calculator Tab ──────────────────────────────────── */}
      {activeTab === 'calculator' && (
        <div className="space-y-6">
          {/* Target Input */}
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Target {STAT_NAMES[statType]} Value
              </label>
              <input
                type="number"
                min={1}
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                placeholder="e.g. 3000"
                className="w-full px-4 py-2.5 rounded-lg border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
            </div>
            <button
              onClick={() => {
                if (target > 0) {
                  // Trigger calculation by just having the value set
                }
              }}
              className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-all ${
                target > 0
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
              }`}
              disabled={target <= 0}
            >
              View Results
            </button>
          </div>

          {/* Owned seals notice */}
          {ownedStatTotal > 0 && target > 0 && (
            <div className="flex items-start gap-2 text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg p-3">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                You already have <strong>{ownedStatTotal}</strong> {statType} from owned seals.
                Remaining needed: <strong>{effectiveTarget}</strong>.
              </span>
            </div>
          )}

          {/* Target already met */}
          {target > 0 && effectiveTarget <= 0 && (
            <div className="rounded-xl border bg-emerald-500/10 border-emerald-500/30 p-6 text-center">
              <p className="text-lg font-bold text-emerald-400">Target already reached!</p>
              <p className="text-sm text-muted-foreground mt-1">
                Your owned seals provide {ownedStatTotal} {statType}, which meets or exceeds the target of {target}.
              </p>
            </div>
          )}

          {/* No target */}
          {target <= 0 && (
            <div className="rounded-xl border bg-card p-12 text-center">
              <p className="text-muted-foreground">
                Input the target value to find the most efficient seal configuration!
              </p>
            </div>
          )}

          {/* Results */}
          {result && result.seals.length > 0 && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border bg-card p-4 text-center">
                  <div className="text-xs text-muted-foreground mb-1">Total Stat</div>
                  <div className={`text-2xl font-bold tabular-nums ${STAT_COLORS[statType]}`}>
                    +{result.totalStat + ownedStatTotal}
                  </div>
                </div>
                <div className="rounded-lg border bg-card p-4 text-center">
                  <div className="text-xs text-muted-foreground mb-1">Total Cost</div>
                  <div className="text-2xl font-bold tabular-nums text-amber-400">
                    {fmtPrice(result.totalCost)}
                  </div>
                </div>
                <div className="rounded-lg border bg-card p-4 text-center">
                  <div className="text-xs text-muted-foreground mb-1">Seals Needed</div>
                  <div className="text-2xl font-bold tabular-nums">
                    {result.seals.length}
                  </div>
                </div>
              </div>

              {/* Seal list */}
              <div className="rounded-xl border bg-card overflow-hidden">
                <div className="px-4 pt-4 pb-2 flex items-center justify-between">
                  <h3 className="font-semibold text-sm">Recommended Seals (by efficiency)</h3>
                  <span className="text-xs text-muted-foreground">
                    Sorted by stat/M ratio
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-xs text-muted-foreground">
                        <th className="px-4 py-2 text-left font-medium">#</th>
                        <th className="px-4 py-2 text-left font-medium">Seal</th>
                        <th className="px-4 py-2 text-right font-medium">Stat</th>
                        <th className="px-4 py-2 text-right font-medium">Price (M)</th>
                        <th className="px-4 py-2 text-right font-medium">Efficiency</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.seals.map((seal, i) => (
                        <tr key={seal.id} className="border-b last:border-0 hover:bg-accent/30 transition-colors">
                          <td className="px-4 py-2 text-muted-foreground tabular-nums">{i + 1}</td>
                          <td className="px-4 py-2 font-medium">{seal.name}</td>
                          <td className={`px-4 py-2 text-right tabular-nums font-bold ${STAT_COLORS[statType]}`}>
                            +{seal.max}
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums text-amber-400">
                            {seal.price.toFixed(1)}
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums text-emerald-400">
                            {seal.efficiency.toFixed(1)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Running total */}
              <div className="rounded-xl border bg-card overflow-hidden">
                <div className="px-4 pt-4 pb-2">
                  <h3 className="font-semibold text-sm">Cumulative Progress</h3>
                </div>
                <div className="px-4 pb-4">
                  <div className="h-3 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        statType === 'AT' ? 'bg-red-500' :
                        statType === 'CT' ? 'bg-orange-500' :
                        statType === 'HT' ? 'bg-yellow-500' :
                        statType === 'HP' ? 'bg-pink-500' :
                        statType === 'DS' ? 'bg-blue-500' :
                        statType === 'DE' ? 'bg-cyan-500' :
                        statType === 'BL' ? 'bg-emerald-500' :
                        'bg-purple-500'
                      }`}
                      style={{
                        width: `${Math.min(100, ((result.totalStat + ownedStatTotal) / target) * 100)}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-1.5">
                    <span>0</span>
                    <span>Target: {target}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Info */}
          <div className="flex items-start gap-2 text-xs text-muted-foreground bg-card rounded-lg border p-3">
            <Info className="h-4 w-4 shrink-0 mt-0.5 text-blue-400" />
            <span>
              The calculator picks seals with the highest efficiency (stat gained per Mega spent) first.
              Each seal can only be used once. Mark seals you already own in the Seal Browser tab to exclude them.
            </span>
          </div>
        </div>
      )}

      {/* ── Seal Browser Tab ────────────────────────────────── */}
      {activeTab === 'seals' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for seal names..."
                className="w-full pl-9 pr-4 py-2 rounded-lg border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showOwned}
                onChange={(e) => setShowOwned(e.target.checked)}
                className="rounded border-border"
              />
              <span className="text-sm text-muted-foreground">Show owned only</span>
            </label>
            <span className="text-xs text-muted-foreground">
              {browserSeals.length} seals
            </span>
          </div>

          {/* Seal Table */}
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th
                      className="px-4 py-2 text-left font-medium cursor-pointer hover:text-foreground"
                      onClick={() => toggleSort('name')}
                    >
                      <span className="inline-flex items-center gap-1">Seal <SortIcon col="name" /></span>
                    </th>
                    <th className="px-4 py-2 text-center font-medium">Owned</th>
                    <th
                      className="px-4 py-2 text-right font-medium cursor-pointer hover:text-foreground"
                      onClick={() => toggleSort('max')}
                    >
                      <span className="inline-flex items-center gap-1 justify-end">Stat <SortIcon col="max" /></span>
                    </th>
                    <th
                      className="px-4 py-2 text-right font-medium cursor-pointer hover:text-foreground"
                      onClick={() => toggleSort('price')}
                    >
                      <span className="inline-flex items-center gap-1 justify-end">Price (M) <SortIcon col="price" /></span>
                    </th>
                    <th
                      className="px-4 py-2 text-right font-medium cursor-pointer hover:text-foreground"
                      onClick={() => toggleSort('efficiency')}
                    >
                      <span className="inline-flex items-center gap-1 justify-end">Eff. <SortIcon col="efficiency" /></span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {browserSeals.map((seal) => {
                    const owned = ownedSeals[seal.id] || 0;
                    return (
                      <tr key={seal.id} className={`border-b last:border-0 transition-colors ${owned > 0 ? 'bg-primary/5' : 'hover:bg-accent/30'}`}>
                        <td className="px-4 py-2.5">
                          <div className="font-medium">{seal.name}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${STAT_BG[statType]} ${STAT_COLORS[statType]}`}>
                              {seal.stat}
                            </span>
                            {seal.buyable && (
                              <span className="text-[10px] text-emerald-400">Buyable</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <input
                            type="number"
                            min={0}
                            max={seal.buyable ? 3000 : 3000}
                            value={owned || ''}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 0;
                              setOwnedSeals((prev) => ({ ...prev, [seal.id]: val }));
                            }}
                            placeholder="0"
                            className="w-16 px-2 py-1 rounded border bg-background text-center text-xs tabular-nums focus:outline-none focus:ring-1 focus:ring-primary/50"
                          />
                        </td>
                        <td className={`px-4 py-2.5 text-right tabular-nums font-bold ${STAT_COLORS[statType]}`}>
                          +{seal.max}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          {seal.price > 0 ? (
                            <span className="text-amber-400">{seal.price.toFixed(1)}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          {seal.efficiency > 0 ? (
                            <span className="text-emerald-400">{seal.efficiency.toFixed(1)}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Owned summary */}
          {ownedStatTotal > 0 && (
            <div className="rounded-lg border bg-card p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coins className="h-4 w-4 text-amber-400" />
                <span className="text-sm font-medium">Your {statType} seals:</span>
              </div>
              <span className={`text-lg font-bold ${STAT_COLORS[statType]}`}>+{ownedStatTotal}</span>
            </div>
          )}

          {/* Tips */}
          <div className="flex items-start gap-2 text-xs text-muted-foreground bg-card rounded-lg border p-3">
            <Info className="h-4 w-4 shrink-0 mt-0.5 text-blue-400" />
            <span>
              Set the &quot;Owned&quot; count for seals you already have. The Calculator tab will exclude them
              and subtract their stat value from your target. Efficiency = stat gained per Mega spent (higher is better).
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
