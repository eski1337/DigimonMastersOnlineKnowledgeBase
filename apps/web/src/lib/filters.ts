import type { DigimonFilters } from '@dmo-kb/shared';

export function buildFilterParams(filters: DigimonFilters): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.search) {
    params.set('search', filters.search);
  }

  if (filters.element && filters.element.length > 0) {
    params.set('element', filters.element.join(','));
  }

  if (filters.attribute && filters.attribute.length > 0) {
    params.set('attribute', filters.attribute.join(','));
  }

  if (filters.rank && filters.rank.length > 0) {
    params.set('rank', filters.rank.join(','));
  }

  if (filters.family && filters.family.length > 0) {
    params.set('family', filters.family.join(','));
  }

  return params;
}

export function parseFilterParams(searchParams: URLSearchParams): DigimonFilters {
  const filters: DigimonFilters = {};

  const search = searchParams.get('search');
  if (search) {
    filters.search = search;
  }

  const element = searchParams.get('element');
  if (element) {
    filters.element = element.split(',') as DigimonFilters['element'];
  }

  const attribute = searchParams.get('attribute');
  if (attribute) {
    filters.attribute = attribute.split(',') as DigimonFilters['attribute'];
  }

  const rank = searchParams.get('rank');
  if (rank) {
    filters.rank = rank.split(',') as DigimonFilters['rank'];
  }

  const family = searchParams.get('family');
  if (family) {
    filters.family = family.split(',') as DigimonFilters['family'];
  }

  return filters;
}
