'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Package, ChevronLeft, ChevronRight } from 'lucide-react';
import { ItemFilters, type ItemFiltersState } from '@/components/items/item-filters';
import Link from 'next/link';
import Image from 'next/image';

const ITEMS_PER_PAGE = 36;

const CATEGORY_LABELS: Record<string, string> = {
  evolution: 'Evolution',
  unlock: 'Unlock',
  consumable: 'Consumable',
  equipment: 'Equipment',
  material: 'Material',
  quest: 'Quest',
  egg: 'Egg / Mercenary',
  costume: 'Costume',
  token: 'Token / Currency',
  booster: 'Booster',
  digivice: 'Digivice',
  accessory: 'Accessory',
  seal: 'Seal',
  card: 'Card',
  other: 'Other',
};

const RARITY_COLORS: Record<string, string> = {
  common: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
  uncommon: 'bg-green-500/20 text-green-300 border-green-500/30',
  rare: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  epic: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  legendary: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  event: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
  cash: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
};

export default function ItemsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialFilters = useMemo<ItemFiltersState>(() => {
    const f: ItemFiltersState = {};
    const split = (v: string | null) => v ? v.split(',').map(s => s.trim()).filter(Boolean) : [];
    const category = split(searchParams.get('category'));
    const rarity = split(searchParams.get('rarity'));
    const search = searchParams.get('search');
    if (category.length) f.category = category;
    if (rarity.length) f.rarity = rarity;
    if (search) f.search = search;
    if (searchParams.get('tradeable') === 'true') f.tradeable = true;
    if (searchParams.get('accountBound') === 'true') f.accountBound = true;
    if (searchParams.get('cashShopItem') === 'true') f.cashShopItem = true;
    if (searchParams.get('eventOnly') === 'true') f.eventOnly = true;
    return f;
  }, [searchParams]);

  const [filters, setFilters] = useState<ItemFiltersState>(initialFilters);

  useEffect(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  const [items, setItems] = useState<any[]>([]);
  const [totalDocs, setTotalDocs] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const shouldRestoreScroll = useRef(false);
  const savedScrollY = useRef(0);

  useEffect(() => {
    const saved = sessionStorage.getItem('items-list-scroll');
    if (saved) {
      savedScrollY.current = parseInt(saved, 10);
      shouldRestoreScroll.current = true;
      sessionStorage.removeItem('items-list-scroll');
    }
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const link = (e.target as HTMLElement).closest('a[href^="/items/"]');
      if (link) {
        sessionStorage.setItem('items-list-scroll', window.scrollY.toString());
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const buildQuery = useCallback((f: ItemFiltersState, page: number) => {
    const params = new URLSearchParams();
    params.set('limit', ITEMS_PER_PAGE.toString());
    params.set('page', page.toString());
    if (f.search) params.set('search', f.search);
    if (f.category?.length) params.set('category', f.category.join(','));
    if (f.rarity?.length) params.set('rarity', f.rarity.join(','));
    if (f.tradeable) params.set('tradeable', 'true');
    if (f.accountBound) params.set('accountBound', 'true');
    if (f.cashShopItem) params.set('cashShopItem', 'true');
    if (f.eventOnly) params.set('eventOnly', 'true');
    return params.toString();
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function fetchItems() {
      try {
        setIsLoading(true);
        const qs = buildQuery(filters, currentPage);
        const response = await fetch(`/api/items?${qs}`);
        if (response.ok && !cancelled) {
          const data = await response.json();
          setItems(data.docs || []);
          setTotalDocs(data.totalDocs || 0);
          setTotalPages(data.totalPages || 1);
        }
      } catch (error) {
        console.error('Failed to fetch items:', error);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
          if (shouldRestoreScroll.current) {
            shouldRestoreScroll.current = false;
            requestAnimationFrame(() => {
              window.scrollTo(0, savedScrollY.current);
            });
          }
        }
      }
    }
    fetchItems();
    return () => { cancelled = true; };
  }, [filters, currentPage, buildQuery]);

  const goToPage = useCallback((page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', page.toString());
    router.push(`/items?${params.toString()}`, { scroll: false });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [searchParams, router]);

  const handleFiltersChange = useCallback((newFilters: ItemFiltersState) => {
    setFilters(newFilters);
    const params = new URLSearchParams();
    if (newFilters.search) params.set('search', newFilters.search);
    if (newFilters.category?.length) params.set('category', newFilters.category.join(','));
    if (newFilters.rarity?.length) params.set('rarity', newFilters.rarity.join(','));
    if (newFilters.tradeable) params.set('tradeable', 'true');
    if (newFilters.accountBound) params.set('accountBound', 'true');
    if (newFilters.cashShopItem) params.set('cashShopItem', 'true');
    if (newFilters.eventOnly) params.set('eventOnly', 'true');
    params.set('page', '1');
    router.push(`/items?${params.toString()}`, { scroll: false });
  }, [router]);

  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  return (
    <div className="container py-8">
      <div className="flex flex-col gap-6 mb-8">
        <div>
          <div className="flex items-baseline gap-3">
            <h1 className="text-4xl font-bold">Items</h1>
            {!isLoading && (
              <span className="text-lg text-muted-foreground font-medium">
                ({totalDocs} total)
              </span>
            )}
          </div>
          <p className="text-muted-foreground mt-2">
            Browse all items in Digimon Masters Online &mdash; evolution items, equipment, consumables, materials, and more.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <aside className="lg:col-span-1">
          <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto px-1 pr-2 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
            <ItemFilters filters={filters} onFiltersChange={handleFiltersChange} />
          </div>
        </aside>

        <div className="lg:col-span-3">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="h-24 w-full" />
                </div>
              ))}
            </div>
          ) : items.length > 0 ? (
            <>
              <div className="mb-4 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, totalDocs)} of {totalDocs} items
                </div>
                {totalPages > 1 && (
                  <div className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((item: any) => (
                  <Link key={item.id} href={`/items/${item.slug}`}>
                    <Card className="card-hover h-full group">
                      <CardHeader className="pb-3">
                        <div className="flex items-start gap-3">
                          {item.icon?.url ? (
                            <div className="w-10 h-10 rounded bg-muted/50 flex items-center justify-center flex-shrink-0 overflow-hidden border border-border/50">
                              <Image
                                src={item.icon.url}
                                alt={item.name}
                                width={32}
                                height={32}
                                className="object-contain"
                              />
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded bg-muted/50 flex items-center justify-center flex-shrink-0 border border-border/50">
                              <Package className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-sm leading-tight group-hover:text-primary transition-colors">
                              {item.name}
                            </CardTitle>
                            {item.description && (
                              <CardDescription className="text-xs mt-1 line-clamp-2">
                                {item.description}
                              </CardDescription>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {item.category && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              {CATEGORY_LABELS[item.category] || item.category}
                            </Badge>
                          )}
                          {item.rarity && (
                            <Badge className={`text-[10px] px-1.5 py-0 border ${RARITY_COLORS[item.rarity] || ''}`}>
                              {item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1)}
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                    </Card>
                  </Link>
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
                      .filter(page => (
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 2 && page <= currentPage + 2)
                      ))
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
              <p className="text-xl font-semibold mb-2">No items found</p>
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
