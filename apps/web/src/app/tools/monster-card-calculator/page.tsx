'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Info, Users, User, Layers, ChevronDown } from 'lucide-react';
import { DIGIMON_EXP_TABLE, TAMER_EXP_TABLE } from './exp-tables';

/* ── Constants ────────────────────────────────────────────────────────── */

type EntityType = 'Digimon' | 'Tamer';

const HMC_ENEMY_LEVELS: Record<number, number> = { 1: 100, 2: 115, 3: 130 };
const HMC_BASE_EXP: Record<number, number> = { 1: 3308400, 2: 4426200, 3: 5765400 };

const HMC_COLORS: Record<number, string> = {
  1: 'text-emerald-400',
  2: 'text-blue-400',
  3: 'text-purple-400',
};

const MIN_LEVEL = 71;
const MAX_DIGIMON_LEVEL = 170;
const MAX_TAMER_LEVEL = 110;

/** Level-difference EXP multiplier (enemy level − player level) */
function getLvDiffMultiplier(diff: number): number {
  if (diff <= -30) return 0;
  if (diff <= -25) return 0.1;
  if (diff <= -20) return 0.2;
  if (diff <= -15) return 0.3;
  if (diff <= -10) return 0.4;
  if (diff <= -5) return 0.7;
  if (diff <= -1) return 0.9;
  if (diff === 0) return 1;
  if (diff <= 4) return 1.1;
  if (diff <= 9) return 1.2;
  if (diff <= 14) return 1.3;
  if (diff <= 19) return 1.4;
  if (diff <= 24) return 1.5;
  if (diff <= 29) return 2;
  return 0;
}

/** Calculate effective EXP per card at a given player level */
function getExpPerCard(
  hmcType: number,
  playerLevel: number,
  isInParty: boolean,
  boostPct: number,
  entityType: EntityType,
): number {
  const base = HMC_BASE_EXP[hmcType] ?? HMC_BASE_EXP[1];
  const partyBase = isInParty ? Math.round(0.75 * base) : base;
  const boostMult = 1 + (boostPct || 0) / 100;
  const tamerMult = entityType === 'Tamer' ? 0.1 : 1;
  const diff = HMC_ENEMY_LEVELS[hmcType] - (playerLevel || 0);
  const diffMult = getLvDiffMultiplier(diff);
  return partyBase * boostMult * tamerMult * diffMult;
}

function getExpTable(entityType: EntityType) {
  return entityType === 'Tamer' ? TAMER_EXP_TABLE : DIGIMON_EXP_TABLE;
}

function getCumulativeExp(level: number, entityType: EntityType): number {
  const table = getExpTable(entityType);
  const entry = table.find((e) => e.level === level);
  return entry ? entry.exp : 0;
}

function getMaxLevel(entityType: EntityType): number {
  return entityType === 'Tamer' ? MAX_TAMER_LEVEL : MAX_DIGIMON_LEVEL;
}

function fmt(n: number): string {
  return Math.ceil(n).toLocaleString('en-US');
}

/* ── Component ────────────────────────────────────────────────────────── */

export default function MonsterCardCalculatorPage() {
  const [entityType, setEntityType] = useState<EntityType>('Digimon');
  const [isInParty, setIsInParty] = useState(false);
  const [currentLevel, setCurrentLevel] = useState<string>('');
  const [boostPct, setBoostPct] = useState<string>('0');
  const [targetLevel, setTargetLevel] = useState<string>('');
  const [reverseMode, setReverseMode] = useState(false);
  const [hmc1Cards, setHmc1Cards] = useState<string>('');
  const [hmc2Cards, setHmc2Cards] = useState<string>('');
  const [hmc3Cards, setHmc3Cards] = useState<string>('');
  const [showDiffTable, setShowDiffTable] = useState(false);

  const curLv = parseInt(currentLevel) || 0;
  const tgtLv = parseInt(targetLevel) || 0;
  const boost = parseFloat(boostPct) || 0;
  const maxLv = getMaxLevel(entityType);

  // Effective EXP per card at current level
  const expPerCard = useMemo(() => {
    if (curLv < MIN_LEVEL) return { 1: 0, 2: 0, 3: 0 };
    return {
      1: getExpPerCard(1, curLv, isInParty, boost, entityType),
      2: getExpPerCard(2, curLv, isInParty, boost, entityType),
      3: getExpPerCard(3, curLv, isInParty, boost, entityType),
    };
  }, [curLv, isInParty, boost, entityType]);

  // Forward calculation: cards needed to reach target
  const forwardResult = useMemo(() => {
    if (curLv < MIN_LEVEL || tgtLv <= curLv || tgtLv > maxLv) return null;

    const totalExpNeeded = getCumulativeExp(tgtLv, entityType) - getCumulativeExp(curLv, entityType);
    if (totalExpNeeded <= 0) return null;

    // Simulate level-by-level for accurate calculation (EXP per card changes with level)
    const results: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
    for (const hmcType of [1, 2, 3] as const) {
      let remaining = totalExpNeeded;
      let lvl = curLv;
      let cards = 0;
      while (remaining > 0 && lvl < tgtLv) {
        const exp = getExpPerCard(hmcType, lvl, isInParty, boost, entityType);
        if (exp <= 0) { cards = Infinity; break; }
        // How many cards at this level to reach next level?
        const expToNext = getCumulativeExp(lvl + 1, entityType) - getCumulativeExp(lvl, entityType);
        const cardsForThisLv = Math.ceil(Math.min(remaining, expToNext) / exp);
        cards += cardsForThisLv;
        remaining -= cardsForThisLv * exp;
        if (remaining <= 0) break;
        lvl++;
      }
      results[hmcType] = cards;
    }

    return { totalExpNeeded, cards: results };
  }, [curLv, tgtLv, isInParty, boost, entityType, maxLv]);

  // Reverse calculation: given cards, how far can you go?
  const reverseResult = useMemo(() => {
    if (!reverseMode || curLv < MIN_LEVEL) return null;
    const h1 = parseInt(hmc1Cards) || 0;
    const h2 = parseInt(hmc2Cards) || 0;
    const h3 = parseInt(hmc3Cards) || 0;
    if (h1 + h2 + h3 === 0) return null;

    // Use cards from highest value first (HMC3, then HMC2, then HMC1)
    let remaining = { 1: h1, 2: h2, 3: h3 };
    let totalExp = 0;
    let lvl = curLv;

    while (lvl < maxLv) {
      const expToNext = getCumulativeExp(lvl + 1, entityType) - getCumulativeExp(lvl, entityType);
      let expGained = 0;

      // Use HMC3 first, then HMC2, then HMC1
      for (const hmc of [3, 2, 1] as const) {
        if (remaining[hmc] <= 0) continue;
        const exp = getExpPerCard(hmc, lvl, isInParty, boost, entityType);
        if (exp <= 0) continue;
        const needed = Math.ceil((expToNext - expGained) / exp);
        const used = Math.min(needed, remaining[hmc]);
        expGained += used * exp;
        remaining[hmc] -= used;
        if (expGained >= expToNext) break;
      }

      if (expGained < expToNext) {
        // Partial level
        totalExp += expGained;
        break;
      }
      totalExp += expGained;
      lvl++;
    }

    return {
      reachLevel: lvl,
      totalExp,
      cardsUsed: { 1: h1 - remaining[1], 2: h2 - remaining[2], 3: h3 - remaining[3] },
    };
  }, [reverseMode, curLv, hmc1Cards, hmc2Cards, hmc3Cards, isInParty, boost, entityType, maxLv]);

  const validInput = curLv >= MIN_LEVEL;

  return (
    <div className="container py-8 max-w-4xl">
      <Link
        href="/tools"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Tools
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Highest Monster Card Calculator</h1>
        <p className="text-muted-foreground">
          Calculate how many Highest Monster Cards you need to reach a target level, or find out how far your cards can take you.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left: Calculator ────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-5">
          {/* Entity Type + Party */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              {(['Digimon', 'Tamer'] as EntityType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    setEntityType(type);
                    if (type === 'Tamer' && parseInt(targetLevel) > MAX_TAMER_LEVEL) {
                      setTargetLevel('');
                    }
                  }}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all
                    ${entityType === type
                      ? 'bg-primary/10 border-primary/50 text-primary'
                      : 'bg-card border-border text-muted-foreground hover:bg-accent/50'
                    }
                  `}
                >
                  {type === 'Digimon' ? <Layers className="h-4 w-4" /> : <User className="h-4 w-4" />}
                  {type}
                </button>
              ))}
            </div>
            {entityType === 'Tamer' && (
              <span className="text-xs text-muted-foreground">(Tamer gets 10% of Digimon EXP)</span>
            )}

            <label className="flex items-center gap-2 ml-auto cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isInParty}
                onChange={(e) => setIsInParty(e.target.checked)}
                className="rounded border-border"
              />
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">In a Party</span>
            </label>
            {isInParty && (
              <span className="text-xs text-muted-foreground">(0.75× Solo base)</span>
            )}
          </div>

          {/* Current Level */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Current Level</label>
              <input
                type="number"
                min={MIN_LEVEL}
                max={maxLv}
                value={currentLevel}
                onChange={(e) => setCurrentLevel(e.target.value)}
                placeholder={`${MIN_LEVEL}–${maxLv}`}
                className="w-full px-4 py-2.5 rounded-lg border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
              {currentLevel && curLv < MIN_LEVEL && (
                <p className="text-xs text-red-400 mt-1">Minimum level is {MIN_LEVEL}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">EXP Boost (%)</label>
              <input
                type="number"
                min={0}
                value={boostPct}
                onChange={(e) => setBoostPct(e.target.value)}
                placeholder="0"
                className="w-full px-4 py-2.5 rounded-lg border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
            </div>
          </div>

          {/* Reverse Mode Toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={reverseMode}
              onChange={(e) => setReverseMode(e.target.checked)}
              className="rounded border-border"
            />
            <span className="text-sm text-muted-foreground">
              Reverse Mode: I have HMC1/HMC2/HMC3 cards — how far can I go?
            </span>
          </label>

          {/* Forward: Target Level */}
          {!reverseMode && (
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Target Level</label>
              <input
                type="number"
                min={curLv + 1}
                max={maxLv}
                value={targetLevel}
                onChange={(e) => setTargetLevel(e.target.value)}
                placeholder={`${Math.max(curLv + 1, MIN_LEVEL + 1)}–${maxLv}`}
                className="w-full px-4 py-2.5 rounded-lg border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
            </div>
          )}

          {/* Reverse: Card Inputs */}
          {reverseMode && (
            <div className="grid grid-cols-3 gap-3">
              {([1, 2, 3] as const).map((hmc) => (
                <div key={hmc}>
                  <label className={`text-sm font-medium mb-2 block ${HMC_COLORS[hmc]}`}>
                    HMC {hmc} Cards
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={hmc === 1 ? hmc1Cards : hmc === 2 ? hmc2Cards : hmc3Cards}
                    onChange={(e) => {
                      if (hmc === 1) setHmc1Cards(e.target.value);
                      else if (hmc === 2) setHmc2Cards(e.target.value);
                      else setHmc3Cards(e.target.value);
                    }}
                    placeholder="0"
                    className="w-full px-4 py-2.5 rounded-lg border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  />
                </div>
              ))}
            </div>
          )}

          {/* ── Output ────────────────────────────────────────── */}
          <div className="rounded-xl border bg-card p-5 space-y-4">
            <h2 className="font-semibold">Output</h2>

            {/* Notice */}
            <div className="flex items-start gap-2 text-xs text-amber-400 bg-amber-500/10 rounded-lg border border-amber-500/20 p-3">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <span>EXP from Highest Monster Cards starts at Level {MIN_LEVEL} ({entityType}).</span>
            </div>

            {/* Effective EXP per card */}
            {validInput && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  Effective EXP per card at Lv {curLv}
                </p>
                <div className="space-y-1.5">
                  {([1, 2, 3] as const).map((hmc) => {
                    const diff = HMC_ENEMY_LEVELS[hmc] - curLv;
                    return (
                      <div key={hmc} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          HMC{hmc}{' '}
                          <span className="text-xs">(enemy Lv {HMC_ENEMY_LEVELS[hmc]}, diff {diff >= 0 ? '+' : ''}{diff})</span>
                        </span>
                        <span className={`font-bold tabular-nums ${HMC_COLORS[hmc]}`}>
                          {fmt(expPerCard[hmc])}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Forward result */}
            {!reverseMode && forwardResult && (
              <div className="border-t pt-4">
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Total EXP needed: <span className="text-foreground font-bold">{fmt(forwardResult.totalExpNeeded)}</span>
                </p>
                <p className="text-sm font-medium text-muted-foreground mb-3">
                  Lv {curLv} → Lv {tgtLv}
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {([1, 2, 3] as const).map((hmc) => {
                    const cards = forwardResult.cards[hmc];
                    return (
                      <div
                        key={hmc}
                        className="rounded-lg border bg-background/50 p-3 text-center"
                      >
                        <div className={`text-xs font-medium mb-1 ${HMC_COLORS[hmc]}`}>HMC {hmc}</div>
                        <div className={`text-2xl font-bold tabular-nums ${HMC_COLORS[hmc]}`}>
                          {cards === Infinity ? '∞' : fmt(cards)}
                        </div>
                        <div className="text-xs text-muted-foreground">cards</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Reverse result */}
            {reverseMode && reverseResult && (
              <div className="border-t pt-4">
                <p className="text-sm font-medium text-muted-foreground mb-2">Reverse Result (Mixed HMC)</p>
                <div className="rounded-lg border bg-primary/5 p-4">
                  <p className="text-sm">
                    With{' '}
                    {[1, 2, 3].map((hmc) => {
                      const count = hmc === 1 ? hmc1Cards : hmc === 2 ? hmc2Cards : hmc3Cards;
                      return parseInt(count) > 0 ? (
                        <span key={hmc}>
                          <span className={`font-bold ${HMC_COLORS[hmc]}`}>{count}× HMC{hmc}</span>{' '}
                        </span>
                      ) : null;
                    })}
                    you can reach:
                  </p>
                  <p className="text-3xl font-bold text-primary mt-1">
                    Level {reverseResult.reachLevel}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Total EXP gained: {fmt(reverseResult.totalExp)}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Info notes */}
          <div className="flex items-start gap-2 text-xs text-muted-foreground bg-card rounded-lg border p-3">
            <Info className="h-4 w-4 shrink-0 mt-0.5 text-blue-400" />
            <span>
              Auto-mixes HMC1/HMC2/HMC3 using the level-difference EXP table
              (Enemy Lv: HMC1=100, HMC2=115, HMC3=130). Supports Solo/Party, Digimon/Tamer,
              and reverse calculations. Tamer level capped at {MAX_TAMER_LEVEL} due to limited data.
            </span>
          </div>
        </div>

        {/* ── Right: Reference ────────────────────────────────── */}
        <div className="space-y-6">
          {/* HMC Reference */}
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="px-4 pt-4 pb-2">
              <h3 className="font-semibold text-sm">Monster Card Types</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="px-4 py-2 text-left font-medium">Card</th>
                  <th className="px-4 py-2 text-right font-medium">Enemy Lv</th>
                  <th className="px-4 py-2 text-right font-medium">Base EXP</th>
                </tr>
              </thead>
              <tbody>
                {([1, 2, 3] as const).map((hmc) => (
                  <tr key={hmc} className="border-b last:border-0">
                    <td className={`px-4 py-2.5 font-bold ${HMC_COLORS[hmc]}`}>HMC {hmc}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{HMC_ENEMY_LEVELS[hmc]}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{HMC_BASE_EXP[hmc].toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Level Diff Table */}
          <button
            onClick={() => setShowDiffTable(!showDiffTable)}
            className="w-full flex items-center justify-between rounded-xl border bg-card p-4 text-sm font-medium hover:bg-accent/50 transition-colors"
          >
            <span>Level Difference Table</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${showDiffTable ? 'rotate-180' : ''}`} />
          </button>

          {showDiffTable && (
            <div className="rounded-xl border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="px-4 py-2 text-left font-medium">Lv Diff</th>
                    <th className="px-4 py-2 text-right font-medium">Multiplier</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { range: '≤ −30', mult: '0×', color: 'text-red-400' },
                    { range: '−29 to −25', mult: '0.1×', color: 'text-red-400' },
                    { range: '−24 to −20', mult: '0.2×', color: 'text-orange-400' },
                    { range: '−19 to −15', mult: '0.3×', color: 'text-orange-400' },
                    { range: '−14 to −10', mult: '0.4×', color: 'text-yellow-400' },
                    { range: '−9 to −5', mult: '0.7×', color: 'text-yellow-400' },
                    { range: '−4 to −1', mult: '0.9×', color: 'text-muted-foreground' },
                    { range: '0', mult: '1.0×', color: 'text-foreground' },
                    { range: '+1 to +4', mult: '1.1×', color: 'text-green-400' },
                    { range: '+5 to +9', mult: '1.2×', color: 'text-green-400' },
                    { range: '+10 to +14', mult: '1.3×', color: 'text-emerald-400' },
                    { range: '+15 to +19', mult: '1.4×', color: 'text-emerald-400' },
                    { range: '+20 to +24', mult: '1.5×', color: 'text-cyan-400' },
                    { range: '+25 to +29', mult: '2.0×', color: 'text-cyan-400' },
                    { range: '≥ +30', mult: '0×', color: 'text-red-400' },
                  ].map((row) => (
                    <tr key={row.range} className="border-b last:border-0">
                      <td className="px-4 py-1.5 text-muted-foreground">{row.range}</td>
                      <td className={`px-4 py-1.5 text-right tabular-nums font-medium ${row.color}`}>{row.mult}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Tips */}
          <div className="rounded-xl border bg-card p-5">
            <h3 className="font-semibold mb-3 text-sm">Tips</h3>
            <div className="space-y-3 text-xs text-muted-foreground">
              <div>
                <span className="font-medium text-foreground">Base Value</span> — The white number in your stat window is your current level. The green number next to it is your current EXP.
              </div>
              <div>
                <span className="font-medium text-foreground">EXP Boost</span> — Check all your gear, titles, and buffs for the total EXP boost percentage.
              </div>
              <div>
                <span className="font-medium text-foreground">Party</span> — Being in a party reduces base EXP per card to 75% of solo.
              </div>
              <div>
                <span className="font-medium text-foreground">Tamer</span> — Tamer receives only 10% of the Digimon EXP from monster cards.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
