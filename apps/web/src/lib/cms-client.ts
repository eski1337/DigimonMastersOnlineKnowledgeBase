/**
 * CMS API Client
 * Utilities for fetching data from Payload CMS
 */

import type { PayloadResponse } from '@/types/payload-responses';

const CMS_URL = process.env.NEXT_PUBLIC_CMS_URL || 'http://localhost:3001';

export interface CMSQueryParams {
  where?: Record<string, unknown>;
  limit?: number;
  page?: number;
  sort?: string;
  depth?: number;
}

/**
 * Build Payload CMS query string from params
 */
function buildQueryString(params: CMSQueryParams): string {
  const searchParams = new URLSearchParams();

  if (params.limit) {
    searchParams.set('limit', params.limit.toString());
  }

  if (params.page) {
    searchParams.set('page', params.page.toString());
  }

  if (params.sort) {
    searchParams.set('sort', params.sort);
  }

  if (params.depth !== undefined) {
    searchParams.set('depth', params.depth.toString());
  }

  if (params.where) {
    Object.entries(params.where).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        // Handle nested where clauses like { name: { like: 'Agumon' } }
        Object.entries(value as Record<string, unknown>).forEach(([operator, val]) => {
          searchParams.set(`where[${key}][${operator}]`, String(val));
        });
      } else {
        searchParams.set(`where[${key}]`, String(value));
      }
    });
  }

  return searchParams.toString();
}

/**
 * Fetch from CMS collection
 */
export async function fetchCMSCollection<T>(
  collection: string,
  params: CMSQueryParams = {}
): Promise<PayloadResponse<T>> {
  const queryString = buildQueryString(params);
  const url = `${CMS_URL}/api/${collection}${queryString ? `?${queryString}` : ''}`;

  const response = await fetch(url, {
    next: { revalidate: 60 }, // Cache for 60 seconds
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${collection}: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetch a single document by slug
 */
export async function fetchCMSBySlug<T>(
  collection: string,
  slug: string
): Promise<T | null> {
  const response = await fetchCMSCollection<T>(collection, {
    where: {
      slug: { equals: slug },
    },
    limit: 1,
  });

  return response.docs[0] || null;
}

/**
 * Fetch a single document by ID
 */
export async function fetchCMSById<T>(
  collection: string,
  id: string
): Promise<T | null> {
  const url = `${CMS_URL}/api/${collection}/${id}`;

  const response = await fetch(url, {
    next: { revalidate: 60 },
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
}
