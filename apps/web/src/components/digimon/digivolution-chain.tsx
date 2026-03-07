'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';

interface DigimonInChain {
  name: string;
  slug?: string;
  icon?: string;
  requiredLevel?: number;
  requiredItem?: string;
  isBranch?: boolean;
}

interface DigivolutionChainProps {
  currentDigimon: {
    name: string;
    slug: string;
    icon?: string;
  };
  digivolvesFrom?: Array<{ name: string; requiredLevel?: number; requiredItem?: string }>;
  digivolvesTo?: Array<{ name: string; requiredLevel?: number; requiredItem?: string }>;
  unlockedWithItem?: string;
}

const CMS_URL = process.env.NEXT_PUBLIC_CMS_URL || 'https://cms.dmokb.info';

// Fetch a Digimon by name, using a local cache to avoid duplicate requests
async function fetchDigimonByName(
  name: string,
  cache: Map<string, any>,
): Promise<any | null> {
  if (cache.has(name)) return cache.get(name);
  try {
    const res = await fetch(
      `${CMS_URL}/api/digimon?where[name][equals]=${encodeURIComponent(name)}&limit=1`,
    );
    if (res.ok) {
      const data = await res.json();
      const doc = data.docs?.[0] ?? null;
      cache.set(name, doc);
      return doc;
    }
  } catch {
    // Network error — return null, caller handles fallback
  }
  cache.set(name, null);
  return null;
}

function getIconUrl(digimon: any): string | undefined {
  return typeof digimon.icon === 'string' ? digimon.icon : digimon.icon?.url;
}

export function DigivolutionChain({
  currentDigimon,
  digivolvesFrom,
  digivolvesTo,
}: DigivolutionChainProps) {
  const [evolutionChain, setEvolutionChain] = useState<DigimonInChain[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const cache = new Map<string, any>();

    async function findChainStart(name: string, visited: Set<string>): Promise<string> {
      if (visited.has(name)) return name;
      visited.add(name);
      const doc = await fetchDigimonByName(name, cache);
      if (doc?.digivolutions?.digivolvesFrom?.length > 0) {
        return findChainStart(doc.digivolutions.digivolvesFrom[0].name, visited);
      }
      return name;
    }

    async function buildForwardChain(
      name: string,
      chain: DigimonInChain[],
      visited: Set<string>,
    ): Promise<void> {
      if (visited.has(name)) return;
      visited.add(name);

      const doc = await fetchDigimonByName(name, cache);
      if (!doc) return;

      chain.push({
        name: doc.name,
        slug: doc.slug,
        icon: getIconUrl(doc),
      });

      const evos = doc.digivolutions?.digivolvesTo;
      if (!evos?.length) return;

      if (evos.length > 1) {
        // Multiple branches — fetch all in parallel
        const branchDocs = await Promise.all(
          evos.map((evo: any) => fetchDigimonByName(evo.name, cache)),
        );
        for (let i = 0; i < evos.length; i++) {
          const branchDoc = branchDocs[i];
          chain.push({
            name: branchDoc?.name ?? evos[i].name,
            slug: branchDoc?.slug ?? evos[i].name?.toLowerCase().replace(/\s+/g, '-'),
            icon: branchDoc ? getIconUrl(branchDoc) : undefined,
            requiredLevel: evos[i].requiredLevel,
            requiredItem: evos[i].requiredItem,
            isBranch: true,
          });
        }
      } else {
        // Single evolution — continue chain, carry level/item from evo data
        const nextEvo = evos[0];
        // Pre-set level/item so we don't need a third pass
        await buildForwardChain(nextEvo.name, chain, visited);
        // Apply the requirement to the next entry we just added
        const nextEntry = chain.find(c => c.name === nextEvo.name);
        if (nextEntry) {
          nextEntry.requiredLevel = nextEvo.requiredLevel;
          nextEntry.requiredItem = nextEvo.requiredItem;
        }
      }
    }

    async function buildChain() {
      try {
        const chain: DigimonInChain[] = [];

        // Walk backwards to find chain start
        let startName = currentDigimon.name;
        if (digivolvesFrom?.length) {
          startName = await findChainStart(currentDigimon.name, new Set<string>());
        }

        // Walk forward from start
        await buildForwardChain(startName, chain, new Set<string>());

        if (chain.length === 0) {
          chain.push({
            name: currentDigimon.name,
            slug: currentDigimon.slug,
            icon: currentDigimon.icon,
          });
        }

        if (!cancelled) setEvolutionChain(chain);
      } catch {
        if (!cancelled) {
          setEvolutionChain([{
            name: currentDigimon.name,
            slug: currentDigimon.slug,
            icon: currentDigimon.icon,
          }]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    buildChain();
    return () => { cancelled = true; };
  }, [currentDigimon, digivolvesFrom, digivolvesTo]);


  if (loading) {
    return (
      <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/80 border-2 border-orange-500/40 rounded-xl p-6 shadow-2xl">
        <h2 className="text-2xl font-bold text-orange-400 mb-8">
          Digivolution Paths
        </h2>
        <div className="flex items-center gap-4 pb-8 px-2 pt-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3 flex-shrink-0">
              <div className="flex flex-col items-center gap-3">
                <div className="w-20 h-20 rounded-xl bg-gray-700/50 animate-pulse" />
                <div className="w-16 h-3 rounded bg-gray-700/50 animate-pulse" />
              </div>
              {i < 5 && <ChevronRight className="h-8 w-8 text-gray-600" />}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Show component even if chain is empty - at least show current Digimon
  if (evolutionChain.length === 0 && !digivolvesFrom?.length && !digivolvesTo?.length) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/80 border-2 border-orange-500/40 rounded-xl p-6 shadow-2xl">
      <h2 className="text-2xl font-bold text-orange-400 mb-8">
        Digivolution Paths
      </h2>
      
      {/* Evolution Chain */}
      <div className="flex items-center gap-4 overflow-x-auto pb-8 px-6 pt-6 scrollbar-thin scrollbar-thumb-orange-500 scrollbar-track-gray-700">
        {evolutionChain.map((digimon, index) => {
          const isCurrent = digimon.name === currentDigimon.name;
          const isClickable = digimon.slug && !isCurrent;
          
          return (
            <div key={`${digimon.name}-${index}`} className={`flex items-center gap-3 flex-shrink-0 ${digimon.isBranch ? 'relative' : ''}`}>
              {/* Branch indicator */}
              {digimon.isBranch && index > 0 && (
                <div className="absolute -left-3 top-0 bottom-0 w-px bg-orange-400/30" />
              )}
              
              {/* Digimon Icon */}
              <div className="flex flex-col items-center min-w-[100px]">
                {isClickable ? (
                  <Link href={`/digimon/${digimon.slug}`} className="group flex flex-col items-center">
                    <div 
                      className={`relative w-20 h-20 rounded-xl border-2 transition-all shadow-lg ${
                        isCurrent 
                          ? 'border-orange-500 bg-gradient-to-br from-orange-500/30 to-orange-600/30 shadow-orange-500/50 ring-2 ring-orange-400/50' 
                          : 'border-gray-600 bg-gradient-to-br from-gray-700/50 to-gray-800/50 hover:border-orange-400 hover:scale-110 hover:shadow-orange-400/30'
                      }`}
                    >
                      {digimon.icon ? (
                        <Image
                          src={digimon.icon}
                          alt={digimon.name}
                          fill
                          sizes="(max-width: 768px) 48px, 64px"
                          className="object-contain p-2"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl">
                          ❓
                        </div>
                      )}
                    </div>
                    <span className={`text-sm text-center block w-[100px] font-semibold leading-tight min-h-[40px] flex items-end justify-center ${
                      isCurrent ? 'text-orange-400 mt-3' : 'text-white mt-3 group-hover:text-orange-300'
                    }`}>
                      {digimon.name}
                    </span>
                    {digimon.requiredItem && (
                      <span className="text-xs text-orange-300 mt-1 text-center">
                        (with {digimon.requiredItem})
                      </span>
                    )}
                  </Link>
                ) : (
                  <div className="cursor-default flex flex-col items-center">
                    <div 
                      className={`relative w-20 h-20 rounded-xl border-2 transition-all shadow-lg ${
                        isCurrent 
                          ? 'border-orange-500 bg-gradient-to-br from-orange-500/30 to-orange-600/30 shadow-orange-500/50 ring-2 ring-orange-400/50' 
                          : 'border-gray-600 bg-gradient-to-br from-gray-700/50 to-gray-800/50'
                      }`}
                    >
                      {digimon.icon ? (
                        <Image
                          src={digimon.icon}
                          alt={digimon.name}
                          fill
                          sizes="(max-width: 768px) 48px, 64px"
                          className="object-contain p-2"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl">
                          ❓
                        </div>
                      )}
                    </div>
                    <span className={`text-sm text-center block w-[100px] font-semibold leading-tight min-h-[40px] flex items-end justify-center ${
                      isCurrent ? 'text-orange-400 font-bold mt-3' : 'text-white mt-3'
                    }`}>
                      {digimon.name}
                    </span>
                    {digimon.requiredItem && (
                      <span className="text-xs text-orange-300 mt-1 text-center">
                        (with {digimon.requiredItem})
                      </span>
                    )}
                  </div>
                )}
              </div>
              
              {/* Arrow with level/item info between digimon */}
              {index < evolutionChain.length - 1 && !digimon.isBranch && (
                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                  {evolutionChain[index + 1]?.requiredLevel && (
                    <span className="text-xs font-semibold text-orange-300 bg-gray-800/80 px-2 py-0.5 rounded">
                      Lv {evolutionChain[index + 1].requiredLevel}
                    </span>
                  )}
                  <ChevronRight className="h-8 w-8 text-orange-400 flex-shrink-0 animate-pulse" />
                  {evolutionChain[index + 1]?.requiredItem && (
                    <span className="text-xs text-orange-300 text-center max-w-[80px] truncate" title={evolutionChain[index + 1].requiredItem}>
                      ({evolutionChain[index + 1].requiredItem})
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
