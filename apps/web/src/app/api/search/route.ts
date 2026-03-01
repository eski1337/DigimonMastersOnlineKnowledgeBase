import { NextRequest } from 'next/server';
import { withErrorHandler, apiResponse } from '@/lib/api-handler';
import { searchQuerySchema } from '@/lib/validation-schemas';
import { logger } from '@/lib/logger';
import { getCmsToken } from '@/lib/cms-token';
import type { PayloadResponse, DigimonDoc, GuideDoc, QuestDoc, MapDoc, ToolDoc } from '@/types/payload-responses';

const CMS_URL = process.env.CMS_INTERNAL_URL || process.env.NEXT_PUBLIC_CMS_URL || 'http://localhost:3001';

interface SearchResult {
  type: 'digimon' | 'guide' | 'quest' | 'map' | 'tool' | 'user';
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

  const q = encodeURIComponent(query);

  // Get auth token for user search (needed before parallel calls)
  const userToken = await getCmsToken();
  const userHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
  if (userToken) userHeaders['Authorization'] = `JWT ${userToken}`;

  // Fire ALL searches in parallel — latency = max(individual) instead of sum(all)
  const [digimonRes, guidesRes, questsRes, mapsRes, toolsRes, usersRes1, usersRes2] =
    await Promise.allSettled([
      fetch(`${CMS_URL}/api/digimon?where[name][like]=${q}&where[published][equals]=true&limit=5`, { cache: 'no-store' }),
      fetch(`${CMS_URL}/api/guides?where[title][like]=${q}&where[published][equals]=true&limit=5`, { cache: 'no-store' }),
      fetch(`${CMS_URL}/api/quests?where[title][like]=${q}&where[published][equals]=true&limit=5`, { cache: 'no-store' }),
      fetch(`${CMS_URL}/api/maps?where[name][like]=${q}&where[published][equals]=true&limit=5`, { cache: 'no-store' }),
      fetch(`${CMS_URL}/api/tools?where[title][like]=${q}&where[published][equals]=true&limit=5`, { cache: 'no-store' }),
      fetch(`${CMS_URL}/api/users?where[username][like]=${q}&limit=5&depth=1`, { headers: userHeaders, cache: 'no-store' }),
      fetch(`${CMS_URL}/api/users?where[name][like]=${q}&limit=5&depth=1`, { headers: userHeaders, cache: 'no-store' }),
    ]);

  const results: SearchResult[] = [];

  // Helper to safely extract JSON from settled results
  const settled = async <T>(r: PromiseSettledResult<Response>): Promise<T | null> => {
    if (r.status === 'fulfilled' && r.value.ok) return r.value.json() as Promise<T>;
    return null;
  };

  // Digimon
  const digimonData = await settled<PayloadResponse<DigimonDoc>>(digimonRes);
  if (digimonData) {
    results.push(
      ...digimonData.docs.map((d) => ({
        type: 'digimon' as const,
        id: d.id,
        title: d.name,
        slug: d.slug,
        description: `${d.rank} ${d.element} ${d.attribute}`,
        image: typeof d.icon === 'string' ? d.icon : (d.icon as { url: string } | undefined)?.url,
        metadata: { rank: d.rank, element: d.element, attribute: d.attribute },
      }))
    );
  }

  // Guides
  const guidesData = await settled<PayloadResponse<GuideDoc>>(guidesRes);
  if (guidesData) {
    results.push(
      ...guidesData.docs.map((g) => ({
        type: 'guide' as const, id: g.id, title: g.title, slug: g.slug,
        description: g.summary || 'Guide', image: g.coverImage,
      }))
    );
  }

  // Quests
  const questsData = await settled<PayloadResponse<QuestDoc>>(questsRes);
  if (questsData) {
    results.push(
      ...questsData.docs.map((q) => ({
        type: 'quest' as const, id: q.id, title: q.title, slug: q.slug,
        description: q.type || 'Quest',
        metadata: { type: q.type, level: q.level },
      }))
    );
  }

  // Maps
  const mapsData = await settled<PayloadResponse<MapDoc>>(mapsRes);
  if (mapsData) {
    results.push(
      ...mapsData.docs.map((m) => ({
        type: 'map' as const, id: m.id, title: m.name, slug: m.slug,
        description: m.region || 'Map',
        image: typeof m.image === 'object' && m.image ? m.image.url : m.image,
        metadata: { region: m.region, levelRange: m.levelRange },
      }))
    );
  }

  // Tools
  const toolsData = await settled<PayloadResponse<ToolDoc>>(toolsRes);
  if (toolsData) {
    results.push(
      ...toolsData.docs.map((t) => ({
        type: 'tool' as const, id: t.id, title: t.title, slug: t.slug,
        description: t.description || 'Tool',
      }))
    );
  }

  // Users (deduplicate across username + name searches)
  const seenUserIds = new Set<string>();
  for (const res of [usersRes1, usersRes2]) {
    const data = await settled<{ docs: any[] }>(res);
    if (!data) continue;
    for (const u of data.docs || []) {
      if (seenUserIds.has(u.id)) continue;
      if (u.profileVisibility === 'private') continue;
      seenUserIds.add(u.id);
      results.push({
        type: 'user' as const,
        id: u.id,
        title: u.name || u.username || 'Unknown',
        slug: u.username || u.id,
        description: u.role ? u.role.charAt(0).toUpperCase() + u.role.slice(1) : 'Member',
        image: u.avatar?.sizes?.thumbnail?.url || u.avatar?.url,
        metadata: { role: u.role },
      });
    }
  }

  const duration = Date.now() - startTime;
  
  logger.info(`Search completed: "${query}"`, 'Search', {
    resultsCount: results.length,
    duration: `${duration}ms`,
    page,
    limit,
  });
  
  const start = (page - 1) * limit;
  const paginatedResults = results.slice(start, start + limit);

  return apiResponse({
    success: true,
    query,
    results: paginatedResults,
    total: results.length,
    page,
    limit,
    totalPages: Math.ceil(results.length / limit),
  });
}

// Apply rate limiting: 100 requests per 60 seconds per IP
export const GET = withErrorHandler(searchHandler, {
  maxRequests: 100,
  windowMs: 60 * 1000, // 1 minute
});
