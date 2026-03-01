'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { DigimonCard } from '@/components/digimon/digimon-card';
import { DigimonFilters } from '@/components/digimon/digimon-filters';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { DigimonFilters as Filters } from '@dmo-kb/shared';

const ITEMS_PER_PAGE = 36;

export default function DigimonPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Parse filters from URL search params
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
  
  useEffect(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  const [digimon, setDigimon] = useState<any[]>([]);
  const [totalDocs, setTotalDocs] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  // Build query string from filters + page
  const buildQuery = useCallback((f: Filters, page: number) => {
    const params = new URLSearchParams();
    params.set('limit', ITEMS_PER_PAGE.toString());
    params.set('page', page.toString());
    if (f.search) params.set('search', f.search);
    if (f.element?.length) f.element.forEach(e => params.append('element', e));
    if (f.attribute?.length) f.attribute.forEach(a => params.append('attribute', a));
    if (f.rank?.length) f.rank.forEach(r => params.append('rank', r));
    if (f.form?.length) f.form.forEach(fo => params.append('form', fo));
    if (f.family?.length) f.family.forEach(fa => params.append('family', fa));
    if (f.attackerType?.length) f.attackerType.forEach(at => params.append('attackerType', at));
    return params.toString();
  }, []);

  // Fetch current page from API with server-side filters
  useEffect(() => {
    let cancelled = false;
    async function fetchDigimon() {
      try {
        setIsLoading(true);
        const qs = buildQuery(filters, currentPage);
        const response = await fetch(`/api/digimon?${qs}`);
        if (response.ok && !cancelled) {
          const data = await response.json();
          setDigimon(data.docs || []);
          setTotalDocs(data.totalDocs || 0);
          setTotalPages(data.totalPages || 1);
        }
      } catch (error) {
        console.error('Failed to fetch Digimon:', error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    fetchDigimon();
    return () => { cancelled = true; };
  }, [filters, currentPage, buildQuery]);

  // Navigate to page via URL
  const goToPage = useCallback((page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', page.toString());
    router.push(`/digimon?${params.toString()}`, { scroll: false });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [searchParams, router]);

  // Reset to page 1 when filters change
  const handleFiltersChange = useCallback((newFilters: Filters) => {
    setFilters(newFilters);
    const params = new URLSearchParams();
    if (newFilters.search) params.set('search', newFilters.search);
    if (newFilters.element?.length) params.set('element', newFilters.element.join(','));
    if (newFilters.attribute?.length) params.set('attribute', newFilters.attribute.join(','));
    if (newFilters.rank?.length) params.set('rank', newFilters.rank.join(','));
    if (newFilters.form?.length) params.set('form', newFilters.form.join(','));
    if (newFilters.family?.length) params.set('family', newFilters.family.join(','));
    if (newFilters.attackerType?.length) params.set('attackerType', newFilters.attackerType.join(','));
    params.set('page', '1');
    router.push(`/digimon?${params.toString()}`, { scroll: false });
  }, [router]);

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
                ({totalDocs} total)
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
          <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto px-1 pr-2 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
            <DigimonFilters filters={filters} onFiltersChange={handleFiltersChange} />
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
          ) : digimon.length > 0 ? (
            <>
              <div className="mb-4 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, totalDocs)} of {totalDocs} Digimon
                </div>
                {totalPages > 1 && (
                  <div className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {digimon.map((d: any, index: number) => (
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
                    onClick={() => goToPage(Math.max(1, currentPage - 1))}
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
                            onClick={() => goToPage(page)}
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
                    onClick={() => goToPage(Math.min(totalPages, currentPage + 1))}
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
