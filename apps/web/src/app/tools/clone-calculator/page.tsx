'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Swords, Crosshair, Shield, Wind, Heart, Info, ChevronDown } from 'lucide-react';

/* ── Clone data tables ────────────────────────────────────────────────── */

const CLONE_TYPES = ['Attack', 'Critical', 'Block', 'Evasion', 'Health'] as const;
type CloneType = (typeof CLONE_TYPES)[number];

const CLONE_ICONS: Record<CloneType, typeof Swords> = {
  Attack: Swords,
  Critical: Crosshair,
  Block: Shield,
  Evasion: Wind,
  Health: Heart,
};

const CLONE_COLORS: Record<CloneType, string> = {
  Attack: 'text-red-400',
  Critical: 'text-yellow-400',
  Block: 'text-blue-400',
  Evasion: 'text-green-400',
  Health: 'text-pink-400',
};

const CLONE_BG: Record<CloneType, string> = {
  Attack: 'bg-red-500/10 border-red-500/30 hover:border-red-500/60',
  Critical: 'bg-yellow-500/10 border-yellow-500/30 hover:border-yellow-500/60',
  Block: 'bg-blue-500/10 border-blue-500/30 hover:border-blue-500/60',
  Evasion: 'bg-green-500/10 border-green-500/30 hover:border-green-500/60',
  Health: 'bg-pink-500/10 border-pink-500/30 hover:border-pink-500/60',
};

const CLONE_ACCENT: Record<CloneType, string> = {
  Attack: 'bg-red-500',
  Critical: 'bg-yellow-500',
  Block: 'bg-blue-500',
  Evasion: 'bg-green-500',
  Health: 'bg-pink-500',
};

/** Perfect clone percentages per level (1-15) */
const PERFECT_TABLE: Record<CloneType, number[]> = {
  Attack:   [3, 6, 9, 14, 19, 24, 34, 44, 54, 69, 84, 99, 114, 129, 144],
  Critical: [15, 30, 45, 70, 95, 120, 170, 220, 270, 345, 420, 495, 570, 645, 720],
  Block:    [2, 4, 6, 9, 12, 15, 21, 27, 33, 42, 51, 60, 69, 78, 87],
  Evasion:  [12, 24, 36, 56, 76, 96, 136, 176, 216, 276, 336, 396, 456, 516, 576],
  Health:   [2, 4, 6, 9, 12, 15, 19, 23, 27, 31, 35, 39, 44, 49, 54],
};

/** Clone rank required per level range */
const CLONE_RANKS = [
  { rank: 'D', levels: '1–3', success: 90, drop: 0, color: 'text-gray-400' },
  { rank: 'C', levels: '4–6', success: 50, drop: 20, color: 'text-green-400' },
  { rank: 'B', levels: '7–9', success: 25, drop: 40, color: 'text-blue-400' },
  { rank: 'A', levels: '10–12', success: 18, drop: 60, color: 'text-purple-400' },
  { rank: 'S', levels: '13–15', success: 15, drop: 70, color: 'text-orange-400' },
];

/* ── Component ────────────────────────────────────────────────────────── */

export default function CloneCalculatorPage() {
  const [cloneType, setCloneType] = useState<CloneType>('Attack');
  const [cloneLevel, setCloneLevel] = useState(15);
  const [baseValue, setBaseValue] = useState<string>('');
  const [showTable, setShowTable] = useState(false);

  const percentage = PERFECT_TABLE[cloneType][cloneLevel - 1];
  const isBlock = cloneType === 'Block';
  const base = parseFloat(baseValue) || 0;

  const result = useMemo(() => {
    if (isBlock) return percentage;
    return Math.floor(base * (percentage / 100));
  }, [base, percentage, isBlock]);

  const Icon = CLONE_ICONS[cloneType];

  return (
    <div className="container py-8 max-w-4xl">
      {/* Back link */}
      <Link
        href="/tools"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Tools
      </Link>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Perfect Clone Calculator</h1>
        <p className="text-muted-foreground">
          Calculate the perfect clone value for your Digimon. Select a clone type, level, and enter your base stat value.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left: Calculator ────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Clone Type Selector */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-3 block">Clone Type</label>
            <div className="grid grid-cols-5 gap-2">
              {CLONE_TYPES.map((type) => {
                const TypeIcon = CLONE_ICONS[type];
                const isActive = cloneType === type;
                return (
                  <button
                    key={type}
                    onClick={() => setCloneType(type)}
                    className={`
                      relative flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all duration-200
                      ${isActive
                        ? `${CLONE_BG[type]} ring-1 ring-current ${CLONE_COLORS[type]}`
                        : 'bg-card border-border hover:bg-accent/50 text-muted-foreground'
                      }
                    `}
                  >
                    {isActive && (
                      <div className={`absolute top-0 left-1/2 -translate-x-1/2 -translate-y-px h-0.5 w-8 rounded-full ${CLONE_ACCENT[type]}`} />
                    )}
                    <TypeIcon className="h-5 w-5" />
                    <span className="text-xs font-medium">{{ Attack: 'AT', Critical: 'CT', Block: 'BL', Evasion: 'EV', Health: 'HP' }[type]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Clone Level */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-3 block">
              Clone Level: <span className={`font-bold ${CLONE_COLORS[cloneType]}`}>{cloneLevel}</span>
            </label>
            <input
              type="range"
              min={1}
              max={15}
              value={cloneLevel}
              onChange={(e) => setCloneLevel(parseInt(e.target.value))}
              className="w-full accent-current"
              style={{ accentColor: cloneType === 'Attack' ? '#f87171' : cloneType === 'Critical' ? '#facc15' : cloneType === 'Block' ? '#60a5fa' : cloneType === 'Evasion' ? '#4ade80' : '#f472b6' }}
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>1</span>
              <span>5</span>
              <span>10</span>
              <span>15</span>
            </div>
          </div>

          {/* Base Value */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              {isBlock ? 'Base Value (not used for Block)' : 'Base Value'}
            </label>
            <input
              type="number"
              value={baseValue}
              onChange={(e) => setBaseValue(e.target.value)}
              disabled={isBlock}
              placeholder="Enter your Digimon's base stat..."
              className={`
                w-full px-4 py-3 rounded-lg border bg-card text-foreground
                focus:outline-none focus:ring-2 transition-all
                ${isBlock ? 'opacity-50 cursor-not-allowed' : 'focus:ring-primary/50'}
              `}
            />
            {!isBlock && (
              <p className="text-xs text-muted-foreground mt-1.5">
                The base value is the white number shown in your Digimon&apos;s stat window.
              </p>
            )}
          </div>

          {/* ── Result ────────────────────────────────────────── */}
          <div className={`rounded-xl border p-6 ${CLONE_BG[cloneType]}`}>
            <div className="flex items-center gap-3 mb-1">
              <Icon className={`h-6 w-6 ${CLONE_COLORS[cloneType]}`} />
              <span className="text-sm font-medium text-muted-foreground">Perfect Clone Value</span>
            </div>
            <div className="flex items-baseline gap-3">
              <span className={`text-4xl font-bold tabular-nums ${CLONE_COLORS[cloneType]}`}>
                {isBlock ? `${result}%` : result.toLocaleString()}
              </span>
              <span className="text-sm text-muted-foreground">
                ({percentage}% {isBlock ? 'flat' : 'of base'})
              </span>
            </div>
            {!isBlock && base > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                {base.toLocaleString()} × {percentage}% = {result.toLocaleString()}
              </p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <div className="flex items-start gap-2 text-xs text-muted-foreground bg-card rounded-lg border p-3">
              <Info className="h-4 w-4 shrink-0 mt-0.5 text-blue-400" />
              <span>The increase in every stat, except Block, is a percentage of your base value. Block is always a flat value regardless of Digimon.</span>
            </div>
            <div className="flex items-start gap-2 text-xs text-muted-foreground bg-card rounded-lg border p-3">
              <Info className="h-4 w-4 shrink-0 mt-0.5 text-yellow-400" />
              <span>There may be a margin of error of 1-2 points. The calculator provides a reliable estimate to help you optimize your Digimon&apos;s stats.</span>
            </div>
          </div>
        </div>

        {/* ── Right: Reference ────────────────────────────────── */}
        <div className="space-y-6">
          {/* Clone Rank Reference */}
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="px-4 pt-4 pb-2">
              <h3 className="font-semibold text-sm">Clone Ranks</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="px-4 py-2 text-left font-medium">Rank</th>
                  <th className="px-4 py-2 text-left font-medium">Levels</th>
                  <th className="px-4 py-2 text-right font-medium">Success</th>
                  <th className="px-4 py-2 text-right font-medium">Drop</th>
                </tr>
              </thead>
              <tbody>
                {CLONE_RANKS.map((r) => (
                  <tr key={r.rank} className="border-b last:border-0">
                    <td className={`px-4 py-2.5 font-bold ${r.color}`}>{r.rank}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{r.levels}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-green-400">{r.success}%</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-red-400">{r.drop > 0 ? `${r.drop}%` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Stat Tips */}
          <div className="rounded-xl border bg-card p-5">
            <h3 className="font-semibold mb-3 text-sm">Stat Tips</h3>
            <div className="space-y-3 text-xs text-muted-foreground">
              <div>
                <span className="font-medium text-red-400">Attack</span> — Every 3–4% clone gives ~1% skill damage. Lv15 ≈ +43% skill damage.
              </div>
              <div>
                <span className="font-medium text-yellow-400">Critical</span> — Increases crit chance. Late-game enemies need ~200% due to crit resistance.
              </div>
              <div>
                <span className="font-medium text-blue-400">Block</span> — Flat reduction on normal attacks. Useful in dungeons &amp; Arena where evasion is bypassed.
              </div>
              <div>
                <span className="font-medium text-green-400">Evasion</span> — Chance to avoid normal attacks. High-level enemies can bypass high evasion.
              </div>
              <div>
                <span className="font-medium text-pink-400">Health</span> — Percentage increase to max HP. Only available after Transcendence.
              </div>
            </div>
          </div>

          {/* Full Table Toggle */}
          <button
            onClick={() => setShowTable(!showTable)}
            className="w-full flex items-center justify-between rounded-xl border bg-card p-4 text-sm font-medium hover:bg-accent/50 transition-colors"
          >
            <span>Full Clone Table</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${showTable ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Full Reference Table ──────────────────────────────── */}
      {showTable && (
        <div className="mt-6 rounded-xl border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Lv</th>
                {CLONE_TYPES.map((type) => (
                  <th key={type} className={`px-4 py-3 text-right font-medium ${CLONE_COLORS[type]}`}>
                    {type}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 15 }, (_, i) => i + 1).map((level) => (
                <tr
                  key={level}
                  className={`border-b last:border-0 transition-colors ${level === cloneLevel ? 'bg-primary/5' : 'hover:bg-accent/30'}`}
                >
                  <td className="px-4 py-2.5 font-medium">{level}</td>
                  {CLONE_TYPES.map((type) => (
                    <td
                      key={type}
                      className={`px-4 py-2.5 text-right tabular-nums ${
                        type === cloneType && level === cloneLevel
                          ? `font-bold ${CLONE_COLORS[type]}`
                          : 'text-muted-foreground'
                      }`}
                    >
                      {PERFECT_TABLE[type][level - 1]}%
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
