'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';

interface TreeNode {
  id: string;
  name: string;
  icon: string;
  form?: string;
  slug: string;
}

interface TreeEdge {
  source: string;
  target: string;
  level?: number | null;
  item?: string | null;
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

const CMS_URL = process.env.NEXT_PUBLIC_CMS_URL || 'https://cms.dmokb.info';

function isValidIcon(icon?: string): string | null {
  if (!icon) return null;
  if (icon.includes('placeholder')) return null;
  if (!icon.startsWith('http') && !icon.startsWith('/media/')) return null;
  return icon;
}

interface DisplayNode {
  node: TreeNode;
  level?: number | null;
  item?: string | null;
  isCurrent: boolean;
  isBranch: boolean;
}

interface DisplayLine {
  nodes: DisplayNode[];
  branchFromSlug?: string; // slug of the parent node this line branches from
  branchFromIndex?: number; // column index of the parent in its line
  parentLineIdx?: number; // which line the parent belongs to
}

export function EvolutionTreeV2({
  currentDigimon,
  digivolvesFrom,
  digivolvesTo,
}: EvolutionTreeProps) {
  const [nodes, setNodes] = useState<TreeNode[]>([]);
  const [edges, setEdges] = useState<TreeEdge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTree() {
      try {
        const response = await fetch(
          `${CMS_URL}/api/digimon/${currentDigimon.slug}/digivolution-tree`
        );
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.nodes?.length > 0) {
            setNodes(data.nodes);
            setEdges(data.edges || []);
          }
        }
      } catch (error) {
        console.error('Failed to fetch evolution tree:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchTree();
  }, [currentDigimon.slug]);

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/80 border-2 border-orange-500/40 rounded-xl p-6 shadow-2xl">
        <h2 className="text-2xl font-bold text-orange-400 mb-4">Evolution Tree</h2>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-400"></div>
        </div>
      </div>
    );
  }

  if (nodes.length === 0 && !digivolvesFrom?.length && !digivolvesTo?.length) {
    return (
      <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/80 border-2 border-orange-500/40 rounded-xl p-6 shadow-2xl">
        <h2 className="text-2xl font-bold text-orange-400 mb-6">Evolution Tree</h2>
        <div className="flex items-center justify-center">
          <DigimonIcon name={currentDigimon.name} icon={currentDigimon.icon} slug={currentDigimon.slug} isCurrent />
        </div>
        <div className="mt-4 p-3 bg-orange-900/20 border border-orange-600/30 rounded-lg text-center">
          <p className="text-sm text-orange-300">No digivolution data available yet.</p>
        </div>
      </div>
    );
  }

  // Build adjacency
  const childrenOf = new Map<string, { slug: string; level?: number | null; item?: string | null }[]>();
  const parentsOf = new Map<string, Set<string>>();
  const nodeMap = new Map<string, TreeNode>();
  for (const n of nodes) nodeMap.set(n.slug, n);

  for (const e of edges) {
    if (!childrenOf.has(e.source)) childrenOf.set(e.source, []);
    childrenOf.get(e.source)!.push({ slug: e.target, level: e.level, item: e.item });
    if (!parentsOf.has(e.target)) parentsOf.set(e.target, new Set());
    parentsOf.get(e.target)!.add(e.source);
  }

  // Compute longest-path-to-leaf (memoized)
  const depthCache = new Map<string, number>();
  function maxDepth(slug: string, seen = new Set<string>()): number {
    if (seen.has(slug)) return 0;
    if (depthCache.has(slug)) return depthCache.get(slug)!;
    seen.add(slug);
    const children = childrenOf.get(slug) || [];
    let best = 0;
    for (const c of children) best = Math.max(best, 1 + maxDepth(c.slug, new Set(seen)));
    depthCache.set(slug, best);
    return best;
  }

  function hasDescendant(from: string, target: string, seen = new Set<string>()): boolean {
    if (from === target) return true;
    if (seen.has(from)) return false;
    seen.add(from);
    for (const c of (childrenOf.get(from) || [])) {
      if (hasDescendant(c.slug, target, seen)) return true;
    }
    return false;
  }

  // Find roots
  const roots = nodes.filter(n => !parentsOf.get(n.slug)?.size);
  const rootsSorted = [...roots].sort((a, b) => {
    const aHas = hasDescendant(a.slug, currentDigimon.slug) ? 1 : 0;
    const bHas = hasDescendant(b.slug, currentDigimon.slug) ? 1 : 0;
    if (aHas !== bHas) return bHas - aHas;
    return maxDepth(b.slug) - maxDepth(a.slug);
  });

  // Build lines with branch-parent tracking
  const allLines: DisplayLine[] = [];
  const visited = new Set<string>();
  // Track which line index each slug ends up on, and its column position
  const slugLineInfo = new Map<string, { lineIdx: number; colIdx: number }>();

  interface DeferredBranch {
    slug: string;
    level?: number | null;
    item?: string | null;
    parentSlug: string;
  }
  let deferredBranches: DeferredBranch[] = [];

  function buildLine(
    startSlug: string,
    isBranch: boolean,
    level?: number | null,
    item?: string | null,
    _branchParentSlug?: string,
  ): DisplayNode[] {
    const line: DisplayNode[] = [];
    let cur = startSlug;
    let curLevel = level;
    let curItem = item;

    while (cur && !visited.has(cur)) {
      visited.add(cur);
      const n = nodeMap.get(cur);
      if (!n) break;

      line.push({
        node: n,
        level: curLevel,
        item: curItem,
        isCurrent: n.slug === currentDigimon.slug,
        isBranch,
      });

      const children = (childrenOf.get(cur) || []).filter(c => !visited.has(c.slug));
      if (children.length === 0) break;

      children.sort((a, b) => maxDepth(b.slug) - maxDepth(a.slug));
      const main = children[0];

      for (let i = 1; i < children.length; i++) {
        deferredBranches.push({ slug: children[i].slug, level: children[i].level, item: children[i].item, parentSlug: cur });
      }

      cur = main.slug;
      curLevel = main.level;
      curItem = main.item;
    }
    return line;
  }

  for (const root of rootsSorted) {
    if (visited.has(root.slug)) continue;
    deferredBranches = [];
    const lineNodes = buildLine(root.slug, false);
    if (lineNodes.length > 0) {
      const lineIdx = allLines.length;
      allLines.push({ nodes: lineNodes });
      lineNodes.forEach((d, col) => slugLineInfo.set(d.node.slug, { lineIdx, colIdx: col }));
    }

    while (deferredBranches.length > 0) {
      const batch = [...deferredBranches];
      deferredBranches = [];
      for (const br of batch) {
        if (visited.has(br.slug)) continue;
        const brLineNodes = buildLine(br.slug, true, br.level, br.item, br.parentSlug);
        if (brLineNodes.length > 0) {
          const lineIdx = allLines.length;
          const parentInfo = slugLineInfo.get(br.parentSlug);
          allLines.push({
            nodes: brLineNodes,
            branchFromSlug: br.parentSlug,
            branchFromIndex: parentInfo?.colIdx,
            parentLineIdx: parentInfo?.lineIdx,
          });
          brLineNodes.forEach((d, col) => {
            const actualCol = (parentInfo?.colIdx ?? 0) + 1 + col;
            slugLineInfo.set(d.node.slug, { lineIdx, colIdx: actualCol });
          });
        }
      }
    }
  }

  // Remaining unvisited
  for (const n of nodes) {
    if (visited.has(n.slug)) continue;
    deferredBranches = [];
    const lineNodes = buildLine(n.slug, true);
    if (lineNodes.length > 0) {
      const lineIdx = allLines.length;
      allLines.push({ nodes: lineNodes });
      lineNodes.forEach((d, col) => slugLineInfo.set(d.node.slug, { lineIdx, colIdx: col }));
    }
    while (deferredBranches.length > 0) {
      const batch = [...deferredBranches];
      deferredBranches = [];
      for (const br of batch) {
        if (visited.has(br.slug)) continue;
        const brLineNodes = buildLine(br.slug, true, br.level, br.item, br.parentSlug);
        if (brLineNodes.length > 0) {
          const lineIdx = allLines.length;
          const parentInfo = slugLineInfo.get(br.parentSlug);
          allLines.push({
            nodes: brLineNodes,
            branchFromSlug: br.parentSlug,
            branchFromIndex: parentInfo?.colIdx,
            parentLineIdx: parentInfo?.lineIdx,
          });
          brLineNodes.forEach((d, col) => {
            const actualCol = (parentInfo?.colIdx ?? 0) + 1 + col;
            slugLineInfo.set(d.node.slug, { lineIdx, colIdx: actualCol });
          });
        }
      }
    }
  }

  // Sort: main line first
  const mainIdx = allLines.findIndex(l => l.nodes.some(d => d.isCurrent));
  const orderedLines = mainIdx >= 0
    ? [allLines[mainIdx], ...allLines.filter((_, i) => i !== mainIdx)]
    : allLines;

  // NODE_W = width of one cell (icon + connector), CELL_W in px
  const CELL_W = 96; // w-24 = 96px
  const CONNECTOR_W = 24; // w-6 = 24px

  return (
    <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/80 border-2 border-orange-500/40 rounded-xl p-6 shadow-2xl">
      <h2 className="text-2xl font-bold text-orange-400 mb-6">Evolution Tree</h2>
      <div className="overflow-x-auto pb-2">
        <div className="min-w-fit">
          {orderedLines.map((line, lineIdx) => {
            // Calculate left offset for branch lines
            const branchOffset = line.branchFromIndex != null ? line.branchFromIndex + 1 : 0;
            const offsetPx = branchOffset * (CELL_W + CONNECTOR_W);

            return (
              <div key={lineIdx} className="relative">
                {/* Vertical connector from parent line */}
                {line.branchFromIndex != null && (
                  <div
                    className="absolute bg-orange-500/30"
                    style={{
                      left: `${offsetPx + CELL_W / 2}px`,
                      top: '-8px',
                      width: '2px',
                      height: '8px',
                    }}
                  />
                )}
                <div className="flex items-start" style={{ paddingLeft: `${offsetPx}px` }}>
                  {line.nodes.map((d, i) => (
                    <div key={`${d.node.slug}-${lineIdx}`} className="flex items-start">
                      {i > 0 && (
                        <div className="flex items-start" style={{ height: '60px' }}>
                          <div className="w-6 h-0.5 bg-orange-500/40 shrink-0" style={{ marginTop: '29px' }} />
                        </div>
                      )}
                      <DigimonIcon
                        name={d.node.name}
                        icon={d.node.icon}
                        slug={d.node.slug}
                        isCurrent={d.isCurrent}
                        isBranch={d.isBranch}
                        requiredLevel={d.level ?? undefined}
                        requiredItem={d.item ?? undefined}
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

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
  const validIcon = isValidIcon(icon);

  const borderColor = isCurrent
    ? 'border-orange-500 shadow-orange-500/50 ring-2 ring-orange-400/30'
    : isBranch
    ? 'border-purple-400/60'
    : 'border-orange-400/50';

  const content = (
    <div className="flex flex-col items-center w-24 shrink-0">
      {/* Fixed-height icon area: always 60px tall so connectors align */}
      <div className="h-[60px] flex items-center justify-center">
        <div className={`relative w-14 h-14 ${borderColor} border-2 rounded-lg bg-gradient-to-br from-gray-800/90 to-gray-900/90 shadow-lg transition-all overflow-hidden ${isClickable ? 'hover:border-orange-400 hover:scale-105 cursor-pointer' : ''}`}>
          {validIcon ? (
            <Image src={validIcon} alt={name} width={48} height={48} className="w-full h-full object-contain p-1" loading="lazy" unoptimized />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-lg text-gray-500">?</div>
          )}
          {requiredItem && (
            <div className="absolute -top-1 -right-1 bg-orange-500 text-white text-[7px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center shadow border border-orange-600 z-10">+</div>
          )}
          {isCurrent && (
            <div className="absolute inset-0 border-2 border-orange-400 rounded-lg animate-pulse pointer-events-none" />
          )}
        </div>
      </div>
      {/* Name */}
      <span className={`text-[10px] text-center leading-tight font-semibold line-clamp-2 mt-0.5 ${
        isCurrent ? 'text-orange-400' : isBranch ? 'text-purple-300' : 'text-orange-300/90'
      }`}>
        {name}
      </span>
      {/* Level - always takes space even if empty, to keep consistent sizing */}
      <span className={`text-[9px] font-semibold h-3 ${requiredLevel != null && requiredLevel > 0 ? 'text-yellow-400/90' : 'text-transparent'}`}>
        {requiredLevel != null && requiredLevel > 0 ? `Lv ${requiredLevel}` : '\u00A0'}
      </span>
    </div>
  );

  if (isClickable) {
    return <Link href={`/digimon/${slug}`} className="block shrink-0">{content}</Link>;
  }
  return <div className="shrink-0">{content}</div>;
}
