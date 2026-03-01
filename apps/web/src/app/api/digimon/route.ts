import { NextRequest } from 'next/server';
import { withErrorHandler, apiResponse } from '@/lib/api-handler';

// Use internal URL for server-side fetches (faster, avoids SSL roundtrip)
const CMS_URL = process.env.CMS_INTERNAL_URL || process.env.NEXT_PUBLIC_CMS_URL || 'http://localhost:3001';

async function digimonListHandler(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    
    // Build CMS query parameters
    const cmsParams = new URLSearchParams();
    
    // Only fetch published Digimon
    cmsParams.append('where[published][equals]', 'true');
    
    // Search
    const search = searchParams.get('search');
    if (search) {
      cmsParams.append('where[name][contains]', search);
    }

    // Multi-value filters — accept both comma-separated and repeated params
    const multiFilter = (paramName: string, cmsField: string) => {
      const values = searchParams.getAll(paramName);
      const all = values.flatMap(v => v.split(',').map(s => s.trim())).filter(Boolean);
      if (all.length > 0) {
        all.forEach(val => cmsParams.append(`where[${cmsField}][in]`, val));
      }
    };

    multiFilter('element', 'element');
    multiFilter('attribute', 'attribute');
    multiFilter('rank', 'rank');
    multiFilter('form', 'form');
    multiFilter('attackerType', 'attackerType');
    multiFilter('family', 'families');
    
    // Pagination (cap limit at 100 to prevent abuse)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '36', 10)));
    cmsParams.append('page', page.toString());
    cmsParams.append('limit', limit.toString());
    cmsParams.append('depth', '1');
    cmsParams.append('sort', 'name');
    
    // Fetch from CMS
    const response = await fetch(`${CMS_URL}/api/digimon?${cmsParams.toString()}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    
    if (!response.ok) {
      throw new Error(`CMS API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    return apiResponse({
      success: true,
      docs: data.docs || [],
      totalDocs: data.totalDocs || 0,
      limit: data.limit || limit,
      page: data.page || page,
      totalPages: data.totalPages || 1,
      hasNextPage: data.hasNextPage || false,
      hasPrevPage: data.hasPrevPage || false,
    });
}

// Apply rate limiting: 200 requests per minute (higher limit for main listing)
export const GET = withErrorHandler(digimonListHandler, {
  maxRequests: 200,
  windowMs: 60 * 1000,
});
