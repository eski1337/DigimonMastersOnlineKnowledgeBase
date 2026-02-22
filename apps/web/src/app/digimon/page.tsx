'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { DigimonCard } from '@/components/digimon/digimon-card';
import { DigimonFilters } from '@/components/digimon/digimon-filters';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { DigimonFilters as Filters } from '@dmo-kb/shared';

export default function DigimonPage() {
  const searchParams = useSearchParams();
  
  // Parse initial filters from URL search params
  const initialFilters = useMemo<Filters>(() => {
    const f: Filters = {};
    const attribute = searchParams.get('attribute');
    const element = searchParams.get('element');
    const rank = searchParams.get('rank');
    const family = searchParams.get('family');
    const form = searchParams.get('form');
    const attackerType = searchParams.get('attackerType');
    const search = searchParams.get('search');
    if (attribute) f.attribute = [attribute] as any;
    if (element) f.element = [element] as any;
    if (rank) f.rank = [rank] as any;
    if (family) f.family = [family] as any;
    if (form) f.form = [form] as any;
    if (attackerType) f.attackerType = [attackerType] as any;
    if (search) f.search = search;
    return f;
  }, [searchParams]);

  const [filters, setFilters] = useState<Filters>(initialFilters);
  
  // Sync filters when URL params change (e.g. navigating from detail page icon)
  useEffect(() => {
    setFilters(initialFilters);
  }, [initialFilters]);
  const [allDigimon, setAllDigimon] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 36;

  // Fetch Digimon from CMS (fetch all at once for client-side filtering)
  useEffect(() => {
    async function fetchDigimon() {
      try {
        setIsLoading(true);
        // Fetch all Digimon (max 1000)
        const response = await fetch('/api/digimon?limit=1000');
        if (response.ok) {
          const data = await response.json();
          setAllDigimon(data.docs || []);
        }
      } catch (error) {
        console.error('Failed to fetch Digimon:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchDigimon();
  }, []);

  // Client-side filtering for instant results
  const filteredDigimon = useMemo(() => {
    let result = [...allDigimon];

    // Search filter - match name, type, or form
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(d => 
        d.name?.toLowerCase().includes(searchLower) ||
        d.type?.toLowerCase().includes(searchLower) ||
        d.form?.toLowerCase().includes(searchLower)
      );
    }

    // Element filter
    if (filters.element && filters.element.length > 0) {
      result = result.filter(d => 
        filters.element?.includes(d.element)
      );
    }

    // Attribute filter
    if (filters.attribute && filters.attribute.length > 0) {
      result = result.filter(d => 
        filters.attribute?.includes(d.attribute)
      );
    }

    // Rank filter
    if (filters.rank && filters.rank.length > 0) {
      result = result.filter(d => 
        filters.rank?.includes(d.rank)
      );
    }

    // Family filter
    if (filters.family && filters.family.length > 0) {
      result = result.filter(d => {
        if (!d.families || !Array.isArray(d.families)) return false;
        return filters.family?.some(f => d.families.includes(f));
      });
    }

    // Form filter
    if (filters.form && filters.form.length > 0) {
      result = result.filter(d => 
        filters.form?.includes(d.form)
      );
    }

    // Attacker Type filter
    if (filters.attackerType && filters.attackerType.length > 0) {
      result = result.filter(d => 
        filters.attackerType?.includes(d.attackerType)
      );
    }

    // Sort alphabetically by name (A-Z)
    result.sort((a, b) => {
      const nameA = a.name?.toLowerCase() || '';
      const nameB = b.name?.toLowerCase() || '';
      return nameA.localeCompare(nameB);
    });

    return result;
  }, [allDigimon, filters]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  // Paginate filtered results
  const paginatedDigimon = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredDigimon.slice(startIndex, endIndex);
  }, [filteredDigimon, currentPage]);

  const totalPages = Math.ceil(filteredDigimon.length / ITEMS_PER_PAGE);
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  return (
    <div className="container py-8">
      <div className="flex flex-col gap-6 mb-8">
        <div>
          <div className="flex items-baseline gap-3">
            <h1 className="text-4xl font-bold">Digimon Database</h1>
            {!isLoading && (
              <span className="text-lg text-muted-foreground font-medium">
                ({allDigimon.length} total)
              </span>
            )}
          </div>
          <p className="text-muted-foreground mt-2">
            Browse and search through all available Digimon with detailed stats and information.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <aside className="lg:col-span-1">
          <div className="sticky top-20 space-y-4">
            <DigimonFilters filters={filters} onFiltersChange={setFilters} />
          </div>
        </aside>

        <div className="lg:col-span-3">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="aspect-square w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          ) : paginatedDigimon.length > 0 ? (
            <>
              <div className="mb-4 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredDigimon.length)} of {filteredDigimon.length} Digimon
                </div>
                {totalPages > 1 && (
                  <div className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedDigimon.map((d, index) => (
                  <DigimonCard 
                    key={d.id} 
                    digimon={d}
                    priority={index < 6} // Priority load first 6 images
                  />
                ))}
              </div>
              {totalPages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={!hasPrevPage}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(page => {
                        // Show first, last, current, and 2 pages around current
                        return (
                          page === 1 ||
                          page === totalPages ||
                          (page >= currentPage - 2 && page <= currentPage + 2)
                        );
                      })
                      .map((page, idx, arr) => (
                        <div key={page} className="flex items-center">
                          {idx > 0 && arr[idx - 1] !== page - 1 && (
                            <span className="px-2 text-muted-foreground">...</span>
                          )}
                          <Button
                            variant={currentPage === page ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setCurrentPage(page)}
                            className="min-w-[2.5rem]"
                          >
                            {page}
                          </Button>
                        </div>
                      ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={!hasNextPage}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-xl font-semibold mb-2">No Digimon found</p>
              <p className="text-muted-foreground">
                Try adjusting your filters or search criteria
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
