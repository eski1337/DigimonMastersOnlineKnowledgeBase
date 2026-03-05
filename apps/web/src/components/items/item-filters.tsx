'use client';

import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export interface ItemFiltersState {
  search?: string;
  category?: string[];
  rarity?: string[];
  tradeable?: boolean;
  accountBound?: boolean;
  cashShopItem?: boolean;
  eventOnly?: boolean;
}

const ITEM_CATEGORIES = [
  { value: 'evolution', label: 'Evolution' },
  { value: 'unlock', label: 'Unlock' },
  { value: 'consumable', label: 'Consumable' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'material', label: 'Material' },
  { value: 'quest', label: 'Quest' },
  { value: 'egg', label: 'Egg / Mercenary' },
  { value: 'costume', label: 'Costume' },
  { value: 'token', label: 'Token / Currency' },
  { value: 'booster', label: 'Booster' },
  { value: 'digivice', label: 'Digivice' },
  { value: 'accessory', label: 'Accessory' },
  { value: 'seal', label: 'Seal' },
  { value: 'card', label: 'Card' },
  { value: 'other', label: 'Other' },
];

const ITEM_RARITIES = [
  { value: 'common', label: 'Common', color: 'bg-gray-500/20 text-gray-300 border-gray-500/40 hover:bg-gray-500/30' },
  { value: 'uncommon', label: 'Uncommon', color: 'bg-green-500/20 text-green-300 border-green-500/40 hover:bg-green-500/30' },
  { value: 'rare', label: 'Rare', color: 'bg-blue-500/20 text-blue-300 border-blue-500/40 hover:bg-blue-500/30' },
  { value: 'epic', label: 'Epic', color: 'bg-purple-500/20 text-purple-300 border-purple-500/40 hover:bg-purple-500/30' },
  { value: 'legendary', label: 'Legendary', color: 'bg-orange-500/20 text-orange-300 border-orange-500/40 hover:bg-orange-500/30' },
  { value: 'event', label: 'Event', color: 'bg-pink-500/20 text-pink-300 border-pink-500/40 hover:bg-pink-500/30' },
  { value: 'cash', label: 'Cash Shop', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40 hover:bg-yellow-500/30' },
];

const ITEM_PROPERTIES = [
  { key: 'tradeable' as const, label: 'Tradeable' },
  { key: 'accountBound' as const, label: 'Account Bound' },
  { key: 'cashShopItem' as const, label: 'Cash Shop' },
  { key: 'eventOnly' as const, label: 'Event Only' },
];

interface ItemFiltersProps {
  filters: ItemFiltersState;
  onFiltersChange: (filters: ItemFiltersState) => void;
}

export function ItemFilters({ filters, onFiltersChange }: ItemFiltersProps) {
  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, search: value || undefined });
  };

  const toggleMulti = (key: 'category' | 'rarity', value: string) => {
    const current = (filters[key] as string[]) || [];
    const next = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    onFiltersChange({ ...filters, [key]: next.length > 0 ? next : undefined });
  };

  const toggleBool = (key: 'tradeable' | 'accountBound' | 'cashShopItem' | 'eventOnly') => {
    onFiltersChange({ ...filters, [key]: filters[key] ? undefined : true });
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  const hasActiveFilters =
    filters.category?.length ||
    filters.rarity?.length ||
    filters.tradeable ||
    filters.accountBound ||
    filters.cashShopItem ||
    filters.eventOnly ||
    filters.search;

  return (
    <div className="space-y-6">
      <div>
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            value={filters.search || ''}
            onChange={e => handleSearchChange(e.target.value)}
            className="pl-10"
            type="search"
          />
        </div>
      </div>

      {hasActiveFilters && (
        <Button variant="outline" size="sm" onClick={clearFilters} className="w-full">
          <X className="mr-2 h-4 w-4" />
          Clear Filters
        </Button>
      )}

      <Separator />

      {/* Category */}
      <div>
        <h3 className="font-semibold mb-3 text-sm">Category</h3>
        <div className="flex flex-wrap gap-1.5">
          {ITEM_CATEGORIES.map(cat => (
            <Badge
              key={cat.value}
              variant={filters.category?.includes(cat.value) ? 'default' : 'outline'}
              className="cursor-pointer text-xs"
              onClick={() => toggleMulti('category', cat.value)}
            >
              {cat.label}
            </Badge>
          ))}
        </div>
      </div>

      <Separator />

      {/* Rarity */}
      <div>
        <h3 className="font-semibold mb-3 text-sm">Rarity</h3>
        <div className="flex flex-wrap gap-1.5">
          {ITEM_RARITIES.map(r => (
            <button
              key={r.value}
              onClick={() => toggleMulti('rarity', r.value)}
              className={`text-xs font-medium px-2.5 py-1 rounded-md border transition-all ${
                filters.rarity?.includes(r.value)
                  ? `${r.color} ring-2 ring-offset-1 ring-offset-background ring-current`
                  : 'bg-muted/20 text-muted-foreground border-border hover:bg-muted/40'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <Separator />

      {/* Properties */}
      <div>
        <h3 className="font-semibold mb-3 text-sm">Properties</h3>
        <div className="flex flex-wrap gap-1.5">
          {ITEM_PROPERTIES.map(prop => (
            <Badge
              key={prop.key}
              variant={filters[prop.key] ? 'default' : 'outline'}
              className="cursor-pointer text-xs"
              onClick={() => toggleBool(prop.key)}
            >
              {prop.label}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
