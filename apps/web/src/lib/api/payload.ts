/**
 * Payload CMS API Client
 * Connect Next.js to Payload CMS backend
 */

const CMS_URL = process.env.NEXT_PUBLIC_CMS_URL || 'http://localhost:3001';

interface PayloadResponse<T> {
  docs: T[];
  totalDocs: number;
  limit: number;
  totalPages: number;
  page: number;
  pagingCounter: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
  prevPage: number | null;
  nextPage: number | null;
}

export async function fetchFromPayload<T>(
  collection: string,
  params?: Record<string, string>
): Promise<PayloadResponse<T>> {
  const searchParams = new URLSearchParams(params);
  
  const res = await fetch(`${CMS_URL}/api/${collection}?${searchParams}`, {
    next: { revalidate: 60 }, // ISR: revalidate every 60 seconds
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch ${collection}: ${res.statusText}`);
  }

  return res.json();
}

export async function fetchDigimonList(filters?: {
  search?: string;
  element?: string[];
  attribute?: string[];
  rank?: string[];
  family?: string[];
  page?: number;
  limit?: number;
}) {
  const params: Record<string, string> = {
    'where[published][equals]': 'true',
    limit: String(filters?.limit || 12),
    page: String(filters?.page || 1),
  };

  // Search
  if (filters?.search) {
    params['where[name][like]'] = filters.search;
  }

  // Element filter
  if (filters?.element && filters.element.length > 0) {
    params['where[element][in]'] = filters.element.join(',');
  }

  // Attribute filter
  if (filters?.attribute && filters.attribute.length > 0) {
    params['where[attribute][in]'] = filters.attribute.join(',');
  }

  // Rank filter
  if (filters?.rank && filters.rank.length > 0) {
    params['where[rank][in]'] = filters.rank.join(',');
  }

  // Family filter (needs OR logic, may need adjustment)
  if (filters?.family && filters.family.length > 0) {
    params['where[families][in]'] = filters.family.join(',');
  }

  return fetchFromPayload('digimon', params);
}

export async function fetchDigimonBySlug(slug: string) {
  const params = {
    'where[slug][equals]': slug,
    'where[published][equals]': 'true',
    limit: '1',
  };

  const response = await fetchFromPayload('digimon', params);
  return response.docs[0] || null;
}

export async function fetchQuests(filters?: {
  type?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const params: Record<string, string> = {
    'where[published][equals]': 'true',
    limit: String(filters?.limit || 20),
    page: String(filters?.page || 1),
  };

  if (filters?.search) {
    params['where[title][like]'] = filters.search;
  }

  if (filters?.type) {
    params['where[type][equals]'] = filters.type;
  }

  return fetchFromPayload('quests', params);
}

export async function fetchGuides(filters?: {
  tag?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const params: Record<string, string> = {
    'where[published][equals]': 'true',
    limit: String(filters?.limit || 12),
    page: String(filters?.page || 1),
  };

  if (filters?.search) {
    params['where[title][like]'] = filters.search;
  }

  if (filters?.tag) {
    params['where[tags][in]'] = filters.tag;
  }

  return fetchFromPayload('guides', params);
}

export async function fetchMaps() {
  const params = {
    'where[published][equals]': 'true',
  };

  return fetchFromPayload('maps', params);
}

export async function fetchLatestPatchNotes(limit = 5) {
  const params = {
    limit: String(limit),
    sort: '-date',
  };

  return fetchFromPayload('patchNotes', params);
}

export async function fetchUpcomingEvents(limit = 5) {
  const params = {
    limit: String(limit),
    sort: 'dateRange.start',
  };

  return fetchFromPayload('events', params);
}
