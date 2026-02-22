'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { useState, useEffect } from 'react';

interface EvolutionNode {
  name: string;
  slug?: string;
  icon?: string;
  rank?: string;
  requiredLevel?: number;
  requiredItem?: string;
  branches?: EvolutionNode[]; // Multiple evolution options
  isCurrentDigimon?: boolean;
}

interface EvolutionTreeProps {
  currentDigimon: {
    name: string;
    slug: string;
    icon?: string;
    rank?: string;
  };
  digivolvesFrom?: Array<{ name: string; requiredLevel?: number; requiredItem?: string }>;
  digivolvesTo?: Array<{ name: string; requiredLevel?: number; requiredItem?: string }>;
}

const CMS_URL = process.env.NEXT_PUBLIC_CMS_URL || 'http://localhost:3001';

export function EvolutionTree({
  currentDigimon,
  digivolvesFrom,
  digivolvesTo,
}: EvolutionTreeProps) {
  const [evolutionTree, setEvolutionTree] = useState<EvolutionNode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function buildCompleteTree() {
      try {
        // 1. Find the root (earliest evolution stage)
        const rootName = await findRootDigimon(currentDigimon.name);
        
        // 2. Build the complete tree from root
        const tree = await buildTreeFromRoot(rootName, currentDigimon.name);
        
        setEvolutionTree(tree);
      } catch (error) {
        console.error('Failed to build evolution tree:', error);
        // Fallback: show at least current digimon
        setEvolutionTree([{
          name: currentDigimon.name,
          slug: currentDigimon.slug,
          icon: currentDigimon.icon,
          rank: currentDigimon.rank,
          isCurrentDigimon: true,
        }]);
      } finally {
        setLoading(false);
      }
    }

    buildCompleteTree();
  }, [currentDigimon, digivolvesFrom, digivolvesTo]);

  /**
   * Find the root (earliest) Digimon in the evolution line
   */
  async function findRootDigimon(digimonName: string, visited = new Set<string>()): Promise<string> {
    if (visited.has(digimonName)) return digimonName;
    visited.add(digimonName);

    try {
      const response = await fetch(
        `${CMS_URL}/api/digimon?where[name][equals]=${encodeURIComponent(digimonName)}&limit=1`
      );

      if (response.ok) {
        const data = await response.json();
        const digimon = data.docs?.[0];

        // If has previous evolution, go back further
        if (digimon?.digivolutions?.digivolvesFrom?.length > 0) {
          return await findRootDigimon(digimon.digivolutions.digivolvesFrom[0].name, visited);
        }
      }
    } catch (error) {
      console.error(`Error finding root for ${digimonName}:`, error);
    }

    return digimonName;
  }

  /**
   * Build complete tree structure from root with all branches
   */
  async function buildTreeFromRoot(
    digimonName: string,
    targetName: string,
    visited = new Set<string>()
  ): Promise<EvolutionNode[]> {
    if (visited.has(digimonName)) return [];
    visited.add(digimonName);

    try {
      const response = await fetch(
        `${CMS_URL}/api/digimon?where[name][equals]=${encodeURIComponent(digimonName)}&limit=1`
      );

      if (!response.ok) return [];

      const data = await response.json();
      const digimon = data.docs?.[0];
      if (!digimon) return [];

      const iconUrl = typeof digimon.icon === 'string' 
        ? digimon.icon 
        : digimon.icon?.url;

      const currentNode: EvolutionNode = {
        name: digimon.name,
        slug: digimon.slug,
        icon: iconUrl,
        rank: digimon.rank,
        isCurrentDigimon: digimon.name === targetName,
      };

      // Check for evolution branches
      const evolutions = digimon.digivolutions?.digivolvesTo || [];
      
      if (evolutions.length === 0) {
        // Leaf node - no further evolutions
        return [currentNode];
      }

      if (evolutions.length === 1) {
        // Single path - continue linear chain
        const nextEvo = evolutions[0];
        currentNode.requiredLevel = nextEvo.requiredLevel;
        currentNode.requiredItem = nextEvo.requiredItem;
        
        const nextTree = await buildTreeFromRoot(nextEvo.name, targetName, visited);
        return [currentNode, ...nextTree];
      }

      // Multiple branches - fetch all and create branch nodes
      const branches: EvolutionNode[] = [];
      
      for (const evo of evolutions) {
        const branchTree = await buildTreeFromRoot(evo.name, targetName, new Set(visited));
        
        if (branchTree.length > 0) {
          // Add level/item requirements to first node in branch
          branchTree[0].requiredLevel = evo.requiredLevel;
          branchTree[0].requiredItem = evo.requiredItem;
          branches.push(...branchTree);
        }
      }

      currentNode.branches = branches;
      return [currentNode];

    } catch (error) {
      console.error(`Error building tree for ${digimonName}:`, error);
      return [];
    }
  }

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/80 border-2 border-orange-500/40 rounded-xl p-6 shadow-2xl">
        <h2 className="text-2xl font-bold text-orange-400 mb-4">
          Complete Evolution Tree
        </h2>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-400"></div>
        </div>
      </div>
    );
  }

  // Handle case with NO evolutions at all
  if (!digivolvesFrom?.length && !digivolvesTo?.length && evolutionTree.length <= 1) {
    return (
      <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/80 border-2 border-orange-500/40 rounded-xl p-6 shadow-2xl">
        <h2 className="text-2xl font-bold text-orange-400 mb-8">
          Digivolution Paths
        </h2>
        
        <div className="flex items-center justify-center gap-4">
          {/* Current Digimon Only */}
          <div className="flex flex-col items-center min-w-[110px]">
            <div className="relative w-16 h-16 rounded-xl border-2 border-orange-500 bg-gradient-to-br from-orange-500/30 to-orange-600/30 shadow-orange-500/50 ring-4 ring-orange-400/30">
              {currentDigimon.icon ? (
                <Image
                  src={currentDigimon.icon}
                  alt={currentDigimon.name}
                  fill
                  sizes="(max-width: 768px) 60px, 80px"
                  className="object-contain p-2"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl">
                  ❓
                </div>
              )}
            </div>
            <span className="text-sm text-orange-400 font-bold mt-2 text-center">
              {currentDigimon.name}
            </span>
          </div>
        </div>
        
        <div className="mt-6 p-4 bg-blue-900/20 border border-blue-600/30 rounded-lg text-center">
          <p className="text-base text-blue-300">
            No digivolution data available yet.
          </p>
          <p className="text-sm text-gray-400 mt-2">
            This Digimon's evolution paths have not been imported.
          </p>
        </div>
      </div>
    );
  }

  // If tree is empty but we have evolution data, show simple fallback
  if (evolutionTree.length === 0) {
    // Show simple fallback with available data
    
    // Show simple fallback with available data
    return (
      <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/80 border-2 border-orange-500/40 rounded-xl p-6 shadow-2xl">
        <h2 className="text-2xl font-bold text-orange-400 mb-8">
          Digivolution Paths
        </h2>
        
        <div className="flex items-center gap-4 overflow-x-auto pb-4">
          {/* Show previous evolution */}
          {digivolvesFrom && digivolvesFrom.length > 0 && (
            <>
              <div className="flex flex-col items-center min-w-[80px]">
                <div className="relative w-16 h-16 rounded-xl border-2 border-gray-600 bg-gradient-to-br from-gray-700/50 to-gray-800/50 flex items-center justify-center">
                  <span className="text-2xl">❓</span>
                </div>
                <span className="text-xs text-white mt-1 text-center">
                  {digivolvesFrom[0].name}
                </span>
              </div>
              <ChevronRight className="h-8 w-8 text-orange-400" />
            </>
          )}
          
          {/* Current Digimon */}
          <div className="flex flex-col items-center min-w-[80px]">
            <div className="relative w-16 h-16 rounded-xl border-2 border-orange-500 bg-gradient-to-br from-orange-500/30 to-orange-600/30 shadow-orange-500/50 ring-4 ring-orange-400/30">
              {currentDigimon.icon ? (
                <Image
                  src={currentDigimon.icon}
                  alt={currentDigimon.name}
                  fill
                  sizes="(max-width: 768px) 60px, 80px"
                  className="object-contain p-2"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl">
                  ❓
                </div>
              )}
            </div>
            <span className="text-sm text-orange-400 font-bold mt-2 text-center">
              {currentDigimon.name}
            </span>
          </div>
          
          {/* Show next evolution */}
          {digivolvesTo && digivolvesTo.length > 0 && (
            <>
              <div className="flex flex-col items-center gap-1 mx-2">
                {digivolvesTo[0].requiredLevel && (
                  <div className="text-xs font-bold text-orange-300 bg-orange-900/40 px-3 py-1 rounded-full border border-orange-500/30">
                    Lv {digivolvesTo[0].requiredLevel}
                  </div>
                )}
                <ChevronRight className="h-8 w-8 text-orange-400 animate-pulse" />
                {digivolvesTo[0].requiredItem && (
                  <div className="text-xs text-center text-purple-300 bg-purple-900/30 px-2 py-1 rounded border border-purple-500/30 max-w-[100px]">
                    <div className="truncate" title={digivolvesTo[0].requiredItem}>
                      {digivolvesTo[0].requiredItem}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex flex-col items-center min-w-[80px]">
                <div className="relative w-16 h-16 rounded-xl border-2 border-gray-600 bg-gradient-to-br from-gray-700/50 to-gray-800/50 flex items-center justify-center">
                  <span className="text-2xl">❓</span>
                </div>
                <span className="text-xs text-white mt-1 text-center">
                  {digivolvesTo[0].name}
                </span>
                {digivolvesTo.length > 1 && (
                  <span className="text-xs text-purple-400 mt-1">
                    +{digivolvesTo.length - 1} more
                  </span>
                )}
              </div>
            </>
          )}
        </div>
        
        <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-600/30 rounded-lg">
          <p className="text-sm text-yellow-300">
            ⚠️ Complete evolution tree unavailable. Showing basic evolution info.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/80 border-2 border-orange-500/40 rounded-xl p-6 shadow-2xl">
      <h2 className="text-2xl font-bold text-orange-400 mb-8">
        Complete Evolution Tree
      </h2>
      
      <div className="overflow-x-auto pb-4">
        <EvolutionLine nodes={evolutionTree} />
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-gray-700/50 flex flex-wrap gap-4 text-sm text-gray-400">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded border-2 border-orange-500 bg-orange-500/30" />
          <span>Current Digimon</span>
        </div>
        <div className="flex items-center gap-2">
          <ChevronRight className="h-4 w-4 text-orange-400" />
          <span>Evolution Path</span>
        </div>
        <div className="flex items-center gap-2">
          <ChevronDown className="h-4 w-4 text-purple-400" />
          <span>Branching Evolutions</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Horizontal evolution line with branches
 */
function EvolutionLine({ nodes }: { nodes: EvolutionNode[] }) {
  return (
    <div className="flex items-start gap-2 min-w-fit">
      {nodes.map((node, index) => (
        <div key={`${node.name}-${index}`} className="flex items-start gap-2">
          {/* Node with optional branches */}
          <div className="flex flex-col items-center gap-2">
            {/* Main node */}
            <EvolutionNodeDisplay node={node} />
            
            {/* Branches below if any */}
            {node.branches && node.branches.length > 0 && (
              <div className="flex flex-col gap-2 pt-2 border-t-2 border-purple-500/30">
                <div className="text-xs text-purple-400 font-semibold text-center">
                  {node.branches.length} Options
                </div>
                {node.branches.map((branch, branchIndex) => (
                  <EvolutionNodeDisplay key={`branch-${branchIndex}`} node={branch} isBranch />
                ))}
              </div>
            )}
          </div>

          {/* Show arrow to next node - aligned with icon */}
          {index < nodes.length - 1 && (
            <div className="pt-0 flex items-center" style={{ height: '64px' }}>
              <EvolutionArrow 
                level={nodes[index + 1]?.requiredLevel}
                item={nodes[index + 1]?.requiredItem}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Individual Digimon node display
 */
function EvolutionNodeDisplay({ node, isBranch = false }: { node: EvolutionNode; isBranch?: boolean }) {
  const isCurrent = node.isCurrentDigimon;
  const isClickable = node.slug && !isCurrent;

  const containerClass = `flex flex-col items-center min-w-[80px] ${isBranch ? 'opacity-90' : ''}`;
  
  const iconClass = `relative w-16 h-16 rounded-xl border-2 transition-all shadow-lg ${
    isCurrent 
      ? 'border-orange-500 bg-gradient-to-br from-orange-500/30 to-orange-600/30 shadow-orange-500/50 ring-4 ring-orange-400/30' 
      : isBranch
      ? 'border-purple-400/50 bg-gradient-to-br from-purple-700/20 to-purple-800/20 hover:border-purple-400'
      : 'border-gray-600 bg-gradient-to-br from-gray-700/50 to-gray-800/50 hover:border-orange-400'
  }`;

  const content = (
    <>
      <div className={iconClass}>
        {node.icon ? (
          <Image
            src={node.icon}
            alt={node.name}
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
      <span className={`text-xs text-center block w-[80px] font-semibold leading-tight mt-1 ${
        isCurrent ? 'text-orange-400 font-bold' : isBranch ? 'text-purple-300' : 'text-white'
      }`}>
        {node.name}
      </span>
      {node.rank && (
        <span className="text-xs text-gray-400 mt-1">
          {node.rank}
        </span>
      )}
    </>
  );

  return (
    <div className={containerClass}>
      {isClickable ? (
        <Link href={`/digimon/${node.slug}`} className="group flex flex-col items-center hover:scale-105 transition-transform">
          {content}
        </Link>
      ) : (
        <div className="flex flex-col items-center">
          {content}
        </div>
      )}
    </div>
  );
}

/**
 * Evolution arrow with requirements
 */
function EvolutionArrow({ level, item }: { level?: number; item?: string }) {
  return (
    <div className="flex flex-col items-center gap-1 flex-shrink-0 mx-2">
      {/* Level requirement above arrow */}
      {level && (
        <div className="text-xs font-bold text-orange-300 bg-orange-900/40 px-3 py-1 rounded-full border border-orange-500/30">
          Lv {level}
        </div>
      )}
      
      {/* Arrow */}
      <ChevronRight className="h-8 w-8 text-orange-400 animate-pulse" />
      
      {/* Item requirement below arrow */}
      {item && (
        <div className="text-xs text-center text-purple-300 bg-purple-900/30 px-2 py-1 rounded border border-purple-500/30 max-w-[100px]">
          <div className="truncate" title={item}>
            {item}
          </div>
        </div>
      )}
    </div>
  );
}
