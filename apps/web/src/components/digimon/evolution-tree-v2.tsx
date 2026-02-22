'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';

interface EvolutionNode {
  name: string;
  slug?: string;
  icon?: string;
  rank?: string;
  requiredLevel?: number;
  requiredItem?: string;
  branches?: EvolutionNode[][];  // Array of evolution lines
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

export function EvolutionTreeV2({
  currentDigimon,
  digivolvesFrom,
  digivolvesTo,
}: EvolutionTreeProps) {
  const [evolutionTree, setEvolutionTree] = useState<EvolutionNode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function buildCompleteTree() {
      try {
        const rootName = await findRootDigimon(currentDigimon.name);
        const tree = await buildTreeFromRoot(rootName, currentDigimon.name);
        setEvolutionTree(tree);
      } catch (error) {
        console.error('Failed to build evolution tree:', error);
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

        if (digimon?.digivolutions?.digivolvesFrom?.length > 0) {
          return await findRootDigimon(digimon.digivolutions.digivolvesFrom[0].name, visited);
        }
      }
    } catch (error) {
      console.error(`Error finding root for ${digimonName}:`, error);
    }

    return digimonName;
  }

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

      const currentNode: EvolutionNode = {
        name: digimon.name,
        slug: digimon.slug,
        icon: typeof digimon.icon === 'string' ? digimon.icon : digimon.icon?.url,
        rank: digimon.rank,
        isCurrentDigimon: digimon.name === targetName,
      };

      const evolutions = digimon.digivolutions?.digivolvesTo || [];

      if (evolutions.length === 0) {
        return [currentNode];
      }

      if (evolutions.length === 1) {
        const nextEvo = evolutions[0];
        currentNode.requiredLevel = nextEvo.requiredLevel;
        currentNode.requiredItem = nextEvo.requiredItem;
        
        const nextTree = await buildTreeFromRoot(nextEvo.name, targetName, visited);
        return [currentNode, ...nextTree];
      }

      // Multiple evolutions - find main path and branches
      // Main path: the one containing the target OR the first one
      let mainPathIndex = 0;
      let mainPath: EvolutionNode[] = [];
      const branches: EvolutionNode[][] = [];
      
      // Build all paths first
      const allPaths: EvolutionNode[][] = [];
      for (const evo of evolutions) {
        const branchTree = await buildTreeFromRoot(evo.name, targetName, new Set(visited));
        if (branchTree.length > 0) {
          branchTree[0].requiredLevel = evo.requiredLevel;
          branchTree[0].requiredItem = evo.requiredItem;
          allPaths.push(branchTree);
        }
      }
      
      // Find which path contains the target Digimon
      for (let i = 0; i < allPaths.length; i++) {
        if (allPaths[i].some(node => node.isCurrentDigimon)) {
          mainPathIndex = i;
          break;
        }
      }
      
      // Separate main path from branches
      mainPath = allPaths[mainPathIndex] || [];
      for (let i = 0; i < allPaths.length; i++) {
        if (i !== mainPathIndex) {
          branches.push(allPaths[i]);
        }
      }
      
      // If we have branches, attach them to current node
      if (branches.length > 0) {
        currentNode.branches = branches as any;
      }
      
      // Return current node + main path
      return [currentNode, ...mainPath];

    } catch (error) {
      console.error(`Error building tree for ${digimonName}:`, error);
      return [];
    }
  }

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/80 border-2 border-orange-500/40 rounded-xl p-6 shadow-2xl">
        <h2 className="text-2xl font-bold text-orange-400 mb-4">
          Evolution Tree
        </h2>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-400"></div>
        </div>
      </div>
    );
  }

  if (!digivolvesFrom?.length && !digivolvesTo?.length && evolutionTree.length <= 1) {
    return (
      <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/80 border-2 border-orange-500/40 rounded-xl p-6 shadow-2xl">
        <h2 className="text-2xl font-bold text-orange-400 mb-8">
          Evolution Tree
        </h2>
        
        <div className="flex items-center justify-center gap-4">
          <DigimonIcon
            name={currentDigimon.name}
            icon={currentDigimon.icon}
            slug={currentDigimon.slug}
            isCurrent={true}
          />
        </div>
        
        <div className="mt-6 p-4 bg-orange-900/20 border border-orange-600/30 rounded-lg text-center">
          <p className="text-base text-orange-300">
            No digivolution data available yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/80 border-2 border-orange-500/40 rounded-xl p-6 shadow-2xl">
      <h2 className="text-2xl font-bold text-orange-400 mb-8">
        Evolution Tree
      </h2>
      
      <div className="overflow-x-auto pb-4">
        <HorizontalEvolutionTree nodes={evolutionTree} />
      </div>
    </div>
  );
}

/**
 * Horizontal evolution tree - clean main line with branches below
 */
function HorizontalEvolutionTree({ nodes }: { nodes: EvolutionNode[] }) {
  if (nodes.length === 0) return null;

  return (
    <div className="relative min-w-fit pb-32">
      {/* Main evolution line - always on top, continuous */}
      <div className="flex items-center gap-0 mb-12">
        {nodes.map((node, index) => (
          <div key={`main-${index}`} className="flex flex-col items-center gap-0">
            <div className="flex items-center gap-0">
              <DigimonIcon
                name={node.name}
                icon={node.icon}
                slug={node.slug}
                isCurrent={node.isCurrentDigimon}
                requiredLevel={node.requiredLevel}
                requiredItem={node.requiredItem}
              />
              {index < nodes.length - 1 && (
                <div className="h-0.5 w-12 bg-orange-500/60"></div>
              )}
            </div>
            {/* Vertical line down if this node has branches */}
            {node.branches && node.branches.length > 0 && (
              <div className="w-0.5 h-6 bg-orange-500/60 mt-2"></div>
            )}
          </div>
        ))}
      </div>

      {/* Branches - positioned below their corresponding nodes */}
      {nodes.map((node, nodeIndex) => (
        node.branches && node.branches.length > 0 && (
          <div 
            key={`branches-${nodeIndex}`} 
            className="absolute flex flex-col gap-6"
            style={{ 
              left: `${nodeIndex * 112}px`, // 64px icon + 48px line (w-12 = 3rem = 48px)
              top: '128px' // Below main line + vertical connector (64px icon + 8px name + 24px vertical line + margin)
            }}
          >
            {node.branches.map((branchLine, branchIndex) => (
              <div key={`branch-${branchIndex}`} className="flex items-center gap-0">
                {/* Horizontal connector from vertical line */}
                <div className="h-0.5 w-8 bg-orange-500/60"></div>
                
                {/* Branch evolution line */}
                <div className="flex items-center gap-0">
                  {branchLine.map((branchNode, bnIndex) => (
                    <div key={`bn-${bnIndex}`} className="flex items-center gap-0">
                      <DigimonIcon
                        name={branchNode.name}
                        icon={branchNode.icon}
                        slug={branchNode.slug}
                        isBranch={true}
                        requiredLevel={branchNode.requiredLevel}
                        requiredItem={branchNode.requiredItem}
                      />
                      {bnIndex < branchLine.length - 1 && (
                        <div className="h-0.5 w-12 bg-orange-500/60"></div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )
      ))}
    </div>
  );
}

/**
 * Individual Digimon icon with game-style badges
 */
function DigimonIcon({
  name,
  icon,
  slug,
  isCurrent = false,
  isBranch = false,
  requiredLevel,
  requiredItem,
}: {
  name: string;
  icon?: string;
  slug?: string;
  isCurrent?: boolean;
  isBranch?: boolean;
  requiredLevel?: number;
  requiredItem?: string;
}) {
  const isClickable = slug && !isCurrent;

  // Icon styling based on state - Gruvbox theme
  const borderColor = isCurrent
    ? 'border-orange-500 shadow-orange-500/50 ring-2 ring-orange-400/30'
    : isBranch
    ? 'border-purple-400/60'
    : 'border-orange-400/50';

  const content = (
    <div className="flex flex-col items-center gap-1 relative">
      {/* Main icon with game-style border */}
      <div className={`relative w-16 h-16 ${borderColor} border-2 rounded-lg bg-gradient-to-br from-gray-800/90 to-gray-900/90 shadow-lg transition-all ${isClickable ? 'hover:border-orange-400 cursor-pointer' : ''}`}>
        {icon ? (
          <Image
            src={icon}
            alt={name}
            fill
            className="object-contain p-1.5"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl">
            ❓
          </div>
        )}

        {/* Badge indicators - game style with Gruvbox colors */}
        {requiredLevel && (
          <div className="absolute -top-2 -left-2 bg-yellow-400 text-gray-900 text-xs font-bold px-1.5 py-0.5 rounded shadow-md border border-yellow-500">
            Y
          </div>
        )}
        
        {requiredItem && (
          <div className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs font-bold px-1.5 py-0.5 rounded shadow-md border border-orange-600">
            +
          </div>
        )}

        {isCurrent && (
          <div className="absolute -inset-0.5 border-2 border-orange-400 rounded-lg animate-pulse pointer-events-none"></div>
        )}
      </div>

      {/* Name below icon */}
      <span className={`text-xs text-center block w-20 font-semibold leading-tight ${
        isCurrent ? 'text-orange-400 font-bold' : isBranch ? 'text-purple-300' : 'text-orange-300/90'
      }`}>
        {name}
      </span>

      {/* Level requirement tooltip */}
      {requiredLevel && (
        <span className="text-[10px] text-yellow-400/90">
          Lv {requiredLevel}
        </span>
      )}
    </div>
  );

  if (isClickable) {
    return (
      <Link href={`/digimon/${slug}`} className="block">
        {content}
      </Link>
    );
  }

  return content;
}
