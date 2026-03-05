import { NextRequest } from 'next/server';
import { withErrorHandler, apiResponse } from '@/lib/api-handler';

const CMS_URL = process.env.CMS_INTERNAL_URL || process.env.NEXT_PUBLIC_CMS_URL || 'http://localhost:3001';

async function itemsListHandler(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    
    const cmsParams = new URLSearchParams();
    
    cmsParams.append('where[published][equals]', 'true');
    
    // Search
    const search = searchParams.get('search');
    if (search) {
      cmsParams.append('where[name][contains]', search);
    }

    // Multi-value filters
    const multiFilter = (paramName: string, cmsField: string) => {
      const values = searchParams.getAll(paramName);
      const all = values.flatMap(v => v.split(',').map(s => s.trim())).filter(Boolean);
      if (all.length > 0) {
        cmsParams.append(`where[${cmsField}][in]`, all.join(','));
      }
    };

    multiFilter('category', 'category');
    multiFilter('rarity', 'rarity');

    // Boolean filters
    const boolFilter = (paramName: string, cmsField: string) => {
      const val = searchParams.get(paramName);
      if (val === 'true') {
        cmsParams.append(`where[${cmsField}][equals]`, 'true');
      }
    };

    boolFilter('tradeable', 'tradeable');
    boolFilter('accountBound', 'accountBound');
    boolFilter('cashShopItem', 'cashShopItem');
    boolFilter('eventOnly', 'eventOnly');
    
    // Pagination
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '36', 10)));
    cmsParams.append('page', page.toString());
    cmsParams.append('limit', limit.toString());
    cmsParams.append('depth', '1');
    cmsParams.append('sort', 'name');
    
    const response = await fetch(`${CMS_URL}/api/items?${cmsParams.toString()}`, {
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

export const GET = withErrorHandler(itemsListHandler, {
  maxRequests: 200,
  windowMs: 60 * 1000,
});
