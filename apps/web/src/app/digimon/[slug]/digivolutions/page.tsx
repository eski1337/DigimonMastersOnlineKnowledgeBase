'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import DigivolutionChart from '@/components/DigivolutionChart';
import Link from 'next/link';

interface DigivolutionTreeData {
  success: boolean;
  targetDigimon: {
    slug: string;
    name: string;
  };
  nodes: Array<{
    id: string;
    name: string;
    icon: string;
    form?: string;
    slug: string;
  }>;
  edges: Array<{
    source: string;
    target: string;
    level?: number;
    item?: string;
  }>;
}

export default function DigivolutionsPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [data, setData] = useState<DigivolutionTreeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDigivolutionTree = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_CMS_URL || 'http://localhost:3001'}/api/digimon/${slug}/digivolution-tree`
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch digivolution tree: ${response.statusText}`);
        }

        const treeData = await response.json();
        setData(treeData);
      } catch (err: unknown) {
        console.error('Error loading digivolution tree:', err);
        setError(err instanceof Error ? err.message : 'Failed to load digivolution tree');
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchDigivolutionTree();
    }
  }, [slug]);

  const handleNodeClick = (nodeSlug: string) => {
    router.push(`/digimon/${nodeSlug}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-xl text-gray-300">Loading Digivolution Tree...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-950 text-white p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-900 border border-red-700 rounded-lg p-6 text-center">
            <h2 className="text-2xl font-bold mb-2">❌ Error</h2>
            <p className="text-red-200">{error || 'Failed to load digivolution tree'}</p>
            <Link
              href={`/digimon/${slug}`}
              className="mt-4 inline-block bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg transition-colors"
            >
              Back to Digimon Profile
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">
                🔄 Digivolution Tree
              </h1>
              <p className="text-xl text-blue-400">
                {data.targetDigimon.name}
              </p>
            </div>
            <Link
              href={`/digimon/${slug}`}
              className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg transition-colors border border-gray-600"
            >
              ← Back to Profile
            </Link>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <p className="text-sm text-gray-300">
              <span className="font-semibold text-blue-400">💡 Tip:</span> Click on any Digimon to view their profile. Scroll to zoom, drag to pan.
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 text-center">
            <div className="text-3xl font-bold text-blue-400">{data.nodes.length}</div>
            <div className="text-sm text-gray-400 mt-1">Digimon</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 text-center">
            <div className="text-3xl font-bold text-green-400">{data.edges.length}</div>
            <div className="text-sm text-gray-400 mt-1">Evolutions</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 text-center">
            <div className="text-3xl font-bold text-purple-400">
              {data.edges.filter(e => e.level).length}
            </div>
            <div className="text-sm text-gray-400 mt-1">With Level Req</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 text-center">
            <div className="text-3xl font-bold text-yellow-400">
              {data.edges.filter(e => e.item).length}
            </div>
            <div className="text-sm text-gray-400 mt-1">With Item Req</div>
          </div>
        </div>

        {/* Chart */}
        <div className="h-[600px] md:h-[700px]">
          {data.nodes.length > 0 ? (
            <DigivolutionChart
              nodes={data.nodes}
              edges={data.edges}
              onNodeClick={handleNodeClick}
              highlightNodeId={slug}
            />
          ) : (
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center h-full flex items-center justify-center">
              <div>
                <p className="text-xl text-gray-400 mb-4">
                  No digivolution data available for this Digimon yet.
                </p>
                <Link
                  href={`/digimon/${slug}`}
                  className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg transition-colors inline-block"
                >
                  Back to Profile
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="mt-6 grid md:grid-cols-2 gap-4">
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <h3 className="text-lg font-semibold mb-3 text-blue-400">🎨 Visual Guide</h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li className="flex items-center">
                <span className="w-4 h-4 rounded border-2 border-blue-500 mr-3"></span>
                Blue border = Normal Digimon
              </li>
              <li className="flex items-center">
                <span className="w-4 h-4 rounded border-4 border-pink-500 mr-3"></span>
                Pink border = Current Digimon
              </li>
              <li className="flex items-center">
                <span className="w-4 h-4 rounded border-4 border-green-400 mr-3"></span>
                Green border = Hovered
              </li>
            </ul>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <h3 className="text-lg font-semibold mb-3 text-purple-400">📋 Evolution Info</h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li>→ Arrow shows evolution direction</li>
              <li>Level requirements shown on arrows</li>
              <li>Item requirements (if any) also displayed</li>
              <li>Tree shows both ancestors and descendants</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
