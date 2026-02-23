import { NextRequest } from 'next/server';
import { withErrorHandler, apiResponse } from '@/lib/api-handler';
import { parseFilterParams } from '@/lib/filters';

// Use internal URL for server-side fetches (faster, avoids SSL roundtrip)
const CMS_URL = process.env.CMS_INTERNAL_URL || process.env.NEXT_PUBLIC_CMS_URL || 'http://localhost:3001';

async function digimonListHandler(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const filters = parseFilterParams(searchParams);
    
    // Build CMS query parameters
    const cmsParams = new URLSearchParams();
    
    // Only fetch published Digimon
    cmsParams.append('where[published][equals]', 'true');
    
    // Apply filters
    if (filters.search) {
      cmsParams.append('where[name][contains]', filters.search);
    }
    
    if (filters.element && filters.element.length > 0) {
      filters.element.forEach(e => {
        cmsParams.append('where[element][in]', e);
      });
    }
    
    if (filters.attribute && filters.attribute.length > 0) {
      filters.attribute.forEach(a => {
        cmsParams.append('where[attribute][in]', a);
      });
    }
    
    if (filters.rank && filters.rank.length > 0) {
      filters.rank.forEach(r => {
        cmsParams.append('where[rank][in]', r);
      });
    }
    
    // Pagination
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    cmsParams.append('page', page.toString());
    cmsParams.append('limit', limit.toString());
    cmsParams.append('depth', '1');
    
    // Fetch from CMS
    const response = await fetch(`${CMS_URL}/api/digimon?${cmsParams.toString()}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store', // Always fetch fresh data from CMS
    });
    
    if (!response.ok) {
      throw new Error(`CMS API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Return in expected format
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
