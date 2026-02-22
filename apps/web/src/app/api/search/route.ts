import { NextRequest } from 'next/server';
import { withErrorHandler, apiResponse } from '@/lib/api-handler';
import { searchQuerySchema } from '@/lib/validation-schemas';
import { logger } from '@/lib/logger';
import type { PayloadResponse, DigimonDoc, GuideDoc, QuestDoc, MapDoc, ToolDoc } from '@/types/payload-responses';

const CMS_URL = process.env.NEXT_PUBLIC_CMS_URL || 'http://localhost:3001';

interface SearchResult {
  type: 'digimon' | 'guide' | 'quest' | 'map' | 'tool';
  id: string;
  title: string;
  slug: string;
  description?: string;
  image?: string;
  metadata?: Record<string, unknown>;
}

async function searchHandler(request: NextRequest) {
  const startTime = Date.now();
  
  // Validate query parameters using centralized schema
  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  const { q: query, page, limit } = searchQuerySchema.parse(params);

  const results: SearchResult[] = [];

  // Search Digimon
  const digimonRes = await fetch(
    `${CMS_URL}/api/digimon?where[name][like]=${encodeURIComponent(query)}&where[published][equals]=true&limit=5`,
    { next: { revalidate: 10 } } // Auto-updates quickly
  );

  if (digimonRes.ok) {
    const digimonData = await digimonRes.json() as PayloadResponse<DigimonDoc>;
    results.push(
      ...digimonData.docs.map((d) => ({
        type: 'digimon' as const,
        id: d.id,
        title: d.name,
        slug: d.slug,
        description: `${d.rank} ${d.element} ${d.attribute}`,
        image: typeof d.icon === 'string' ? d.icon : (d.icon as { url: string } | undefined)?.url,
        metadata: {
          rank: d.rank,
          element: d.element,
          attribute: d.attribute,
        },
      }))
    );
  }

  // Search Guides
  const guidesRes = await fetch(
    `${CMS_URL}/api/guides?where[title][like]=${encodeURIComponent(query)}&where[published][equals]=true&limit=5`,
    { next: { revalidate: 30 } }
  );

  if (guidesRes.ok) {
    const guidesData = await guidesRes.json() as PayloadResponse<GuideDoc>;
    results.push(
      ...guidesData.docs.map((g) => ({
        type: 'guide' as const,
        id: g.id,
        title: g.title,
        slug: g.slug,
        description: g.summary || 'Guide',
        image: g.coverImage,
      }))
    );
  }

  // Search Quests
  const questsRes = await fetch(
    `${CMS_URL}/api/quests?where[title][like]=${encodeURIComponent(query)}&where[published][equals]=true&limit=5`,
    { next: { revalidate: 30 } }
  );

  if (questsRes.ok) {
    const questsData = await questsRes.json() as PayloadResponse<QuestDoc>;
    results.push(
      ...questsData.docs.map((q) => ({
        type: 'quest' as const,
        id: q.id,
        title: q.title,
        slug: q.slug,
        description: q.type || 'Quest',
        metadata: {
          type: q.type,
          level: q.level,
        },
      }))
    );
  }

  // Search Maps
  const mapsRes = await fetch(
    `${CMS_URL}/api/maps?where[name][like]=${encodeURIComponent(query)}&where[published][equals]=true&limit=5`,
    { next: { revalidate: 30 } }
  );

  if (mapsRes.ok) {
    const mapsData = await mapsRes.json() as PayloadResponse<MapDoc>;
    results.push(
      ...mapsData.docs.map((m) => ({
        type: 'map' as const,
        id: m.id,
        title: m.name,
        slug: m.slug,
        description: m.region || 'Map',
        image: m.image,
        metadata: {
          region: m.region,
          levelRange: m.levelRange,
        },
      }))
    );
  }

  // Search Tools
  const toolsRes = await fetch(
    `${CMS_URL}/api/tools?where[title][like]=${encodeURIComponent(query)}&where[published][equals]=true&limit=5`,
    { next: { revalidate: 30 } }
  );

  if (toolsRes.ok) {
    const toolsData = await toolsRes.json() as PayloadResponse<ToolDoc>;
    results.push(
      ...toolsData.docs.map((t) => ({
        type: 'tool' as const,
        id: t.id,
        title: t.title,
        slug: t.slug,
        description: t.description || 'Tool',
      }))
    );
  }

  const duration = Date.now() - startTime;
  
  // Log search performance and results
  logger.info(`Search completed: "${query}"`, 'Search', {
    resultsCount: results.length,
    duration: `${duration}ms`,
    page,
    limit,
  });
  
  return apiResponse({
    success: true,
    query,
    results,
    total: results.length,
    page,
    limit,
  });
}

// Apply rate limiting: 100 requests per 60 seconds per IP
export const GET = withErrorHandler(searchHandler, {
  maxRequests: 100,
  windowMs: 60 * 1000, // 1 minute
});
