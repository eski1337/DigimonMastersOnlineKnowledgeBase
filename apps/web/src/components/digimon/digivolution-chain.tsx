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

export function DigivolutionChain({
  currentDigimon,
  digivolvesFrom,
  digivolvesTo,
  unlockedWithItem: _unlockedWithItem,
}: DigivolutionChainProps) {
  const [evolutionChain, setEvolutionChain] = useState<DigimonInChain[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function buildChain() {
      try {
        const visited = new Set<string>();
        const chain: DigimonInChain[] = [];
        
        // Start by going backwards to find the beginning of the chain
        let startDigimon = currentDigimon.name;
        if (digivolvesFrom && digivolvesFrom.length > 0) {
          startDigimon = await findChainStart(currentDigimon.name, visited);
        }
        
        // Now build forward from the start
        await buildForwardChain(startDigimon, chain, new Set<string>());
        
        console.log('Evolution chain built:', chain);
        
        // Fix levels: Apply level/item from previous digimon's digivolvesTo data
        for (let i = 0; i < chain.length - 1; i++) {
          try {
            const currentName = chain[i].name;
            const nextName = chain[i + 1].name;
            
            const response = await fetch(
              `${CMS_URL}/api/digimon?where[name][equals]=${encodeURIComponent(currentName)}&limit=1`
            );
            
            if (response.ok) {
              const data = await response.json();
              const digimon = data.docs[0];
              
              const evoData = digimon?.digivolutions?.digivolvesTo?.find(
                (evo: any) => evo.name === nextName
              );
              
              if (evoData) {
                chain[i + 1].requiredLevel = evoData.requiredLevel;
                chain[i + 1].requiredItem = evoData.requiredItem;
                console.log(`Applied level ${evoData.requiredLevel} to ${nextName}`);
              }
            }
          } catch (error) {
            console.error(`Failed to fix levels for ${chain[i].name}:`, error);
          }
        }
        
        // Fallback: If chain is empty, at least add current Digimon
        if (chain.length === 0) {
          console.log('Chain empty, adding current Digimon as fallback');
          chain.push({
            name: currentDigimon.name,
            slug: currentDigimon.slug,
            icon: currentDigimon.icon,
          });
        }
        
        setEvolutionChain(chain);
      } catch (error) {
        console.error('Failed to build evolution chain:', error);
        // On error, still show current Digimon
        setEvolutionChain([{
          name: currentDigimon.name,
          slug: currentDigimon.slug,
          icon: currentDigimon.icon,
        }]);
      } finally {
        setLoading(false);
      }
    }
    
    buildChain();
  }, [currentDigimon, digivolvesFrom, digivolvesTo]);

  async function findChainStart(digimonName: string, visited: Set<string>): Promise<string> {
    if (visited.has(digimonName)) return digimonName;
    visited.add(digimonName);
    
    try {
      const response = await fetch(
        `${CMS_URL}/api/digimon?where[name][equals]=${encodeURIComponent(digimonName)}&limit=1`
      );
      
      if (response.ok) {
        const data = await response.json();
        const digimon = data.docs?.[0];
        
        if (digimon?.digivolutions?.digivolvesFrom?.length > 0) {
          // Go back one more step
          return await findChainStart(digimon.digivolutions.digivolvesFrom[0].name, visited);
        }
      }
    } catch (error) {
      console.error(`Failed to find chain start for ${digimonName}:`, error);
    }
    
    return digimonName;
  }

  async function buildForwardChain(
    digimonName: string,
    chain: DigimonInChain[],
    visited: Set<string>,
    branchIndex: number = 0
  ): Promise<void> {
    if (visited.has(digimonName)) {
      console.log(`Already visited ${digimonName}, stopping to prevent loop`);
      return;
    }
    visited.add(digimonName);
    
    console.log(`Building chain for: ${digimonName}`);
    
    try {
      const response = await fetch(
        `${CMS_URL}/api/digimon?where[name][equals]=${encodeURIComponent(digimonName)}&limit=1`
      );
      
      if (response.ok) {
        const data = await response.json();
        const digimon = data.docs?.[0];
        
        console.log(`Fetched data for ${digimonName}:`, {
          found: !!digimon,
          hasEvolutions: !!digimon?.digivolutions,
          digivolvesTo: digimon?.digivolutions?.digivolvesTo?.length || 0
        });
        
        if (digimon) {
          const iconUrl = typeof digimon.icon === 'string'
            ? digimon.icon
            : digimon.icon?.url;
            
          chain.push({
            name: digimon.name,
            slug: digimon.slug,
            icon: iconUrl,
            requiredLevel: undefined,
            requiredItem: undefined,
          });
          
          console.log(`Added ${digimon.name} to chain. Chain length: ${chain.length}`);
          
          // Check for branching evolutions
          if (digimon.digivolutions?.digivolvesTo?.length > 0) {
            const evolutions = digimon.digivolutions.digivolvesTo;
            console.log(`${digimon.name} has ${evolutions.length} evolution(s):`, evolutions.map((e: any) => e.name));
            
            if (evolutions.length > 1) {
              console.log('Multiple branches detected');
              // Multiple branches - fetch full data for each
              for (const evo of evolutions) {
                try {
                  const branchResponse = await fetch(
                    `${CMS_URL}/api/digimon?where[name][equals]=${encodeURIComponent(evo.name)}&limit=1`
                  );
                  
                  if (branchResponse.ok) {
                    const branchData = await branchResponse.json();
                    const branchDigimon = branchData.docs?.[0];
                    
                    if (branchDigimon) {
                      const branchIconUrl = typeof branchDigimon.icon === 'string'
                        ? branchDigimon.icon
                        : branchDigimon.icon?.url;
                      
                      chain.push({
                        name: branchDigimon.name,
                        slug: branchDigimon.slug,
                        icon: branchIconUrl,
                        requiredItem: evo.requiredItem,
                        isBranch: true,
                      });
                      console.log(`Added branch ${branchDigimon.name}`);
                    }
                  }
                } catch (error) {
                  console.error(`Failed to fetch branch ${evo.name}:`, error);
                  // Add without icon if fetch fails
                  chain.push({
                    name: evo.name,
                    slug: evo.name?.toLowerCase().replace(/\s+/g, '-'),
                    requiredItem: evo.requiredItem,
                    isBranch: true,
                  });
                }
              }
            } else {
              // Single evolution - continue chain recursively
              console.log(`Continuing chain with ${evolutions[0].name}`);
              await buildForwardChain(evolutions[0].name, chain, visited, branchIndex);
            }
          } else {
            console.log(`${digimon.name} has no further evolutions. Chain complete.`);
          }
        }
      } else {
        console.error(`Failed to fetch ${digimonName}: HTTP ${response.status}`);
      }
    } catch (error) {
      console.error(`Failed to build chain for ${digimonName}:`, error);
    }
  }


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
