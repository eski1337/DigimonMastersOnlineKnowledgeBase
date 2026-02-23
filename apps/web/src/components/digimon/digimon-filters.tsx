'use client';

import Image from 'next/image';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  DIGIMON_ELEMENTS,
  DIGIMON_ATTRIBUTES,
  DIGIMON_RANKS,
  DIGIMON_FAMILIES,
  DIGIMON_FORMS,
  DIGIMON_ATTACKER_TYPES,
} from '@dmo-kb/shared';
import type { DigimonFilters } from '@dmo-kb/shared';

const getElementIconPath = (element: string) =>
  `/icons/Elements/${element.replace(/\s+/g, '_')}.png`;

const getAttributeIconPath = (attribute: string) => {
  if (attribute === 'Unknown') return '/icons/Attributes/Unknown_Attribute.png';
  // 'Free' removed - use 'None' instead
  return `/icons/Attributes/${attribute}.png`;
};

const getRankIconPath = (rank: string) =>
  `/icons/Ranks/${rank}.png`;

const getFamilyIconPath = (family: string) => {
  const familyMap: Record<string, string> = {
    'Dark Area': 'DarkArea',
    'Deep Savers': 'DeepSavers',
    "Dragon's Roar": 'DragonsRoar',
    'Jungle Troopers': 'JungleTroopers',
    'Metal Empire': 'MetalEmpire',
    'Nature Spirits': 'NatureSpirits',
    'Nightmare Soldiers': 'NightmareSoliders',
    'Virus Busters': 'VirusBusters',
    'Wind Guardians': 'WindGuardians',
    'Unknown': 'Unknown',
    'TBD': 'TBD',
  };
  const fileName = familyMap[family] || family.replace(/\s+/g, '').replace(/'/g, '');
  return `/icons/Families/${fileName}.png`;
};

const getAttackerTypeIconPath = (attackerType: string) => {
  const typeMap: Record<string, string> = {
    'Quick Attacker': 'QuickAttacker',
    'Short Attacker': 'ShortAttacker',
    'Near Attacker': 'NearAttacker',
    'Defender': 'Defender',
  };
  const fileName = typeMap[attackerType] || attackerType.replace(/\s+/g, '');
  return `/icons/AttackerType/${fileName}.png`;
};

interface DigimonFiltersProps {
  filters: DigimonFilters;
  onFiltersChange: (filters: DigimonFilters) => void;
}

export function DigimonFilters({ filters, onFiltersChange }: DigimonFiltersProps) {
  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, search: value || undefined });
  };

  const toggleFilter = <K extends keyof DigimonFilters>(
    key: K,
    value: NonNullable<DigimonFilters[K]>[number]
  ) => {
    const currentValues = (filters[key] as string[]) || [];
    const newValues = currentValues.includes(value as string)
      ? currentValues.filter(v => v !== value)
      : [...currentValues, value as string];

    onFiltersChange({
      ...filters,
      [key]: newValues.length > 0 ? newValues : undefined,
    });
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  const hasActiveFilters =
    filters.element?.length ||
    filters.attribute?.length ||
    filters.rank?.length ||
    filters.family?.length ||
    filters.form?.length ||
    filters.attackerType?.length ||
    filters.search;

  return (
    <div className="space-y-6">
      <div>
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search Digimon..."
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

      <div className="space-y-4">
        {/* Element */}
        <div>
          <h3 className="font-semibold mb-3 text-sm">Element</h3>
          <div className="flex flex-wrap gap-1.5">
            {DIGIMON_ELEMENTS.map(element => (
              <button
                key={element}
                onClick={() => toggleFilter('element', element)}
                title={element}
                className={`relative rounded-lg p-1.5 transition-all hover:scale-110 ${
                  filters.element?.includes(element)
                    ? 'bg-orange-500/30 ring-2 ring-orange-500 shadow-lg shadow-orange-500/20'
                    : 'bg-muted/20 hover:bg-muted/40 opacity-70 hover:opacity-100'
                }`}
              >
                <Image src={getElementIconPath(element)} alt={element} width={32} height={32} unoptimized />
              </button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Attribute */}
        <div>
          <h3 className="font-semibold mb-3 text-sm">Attribute</h3>
          <div className="flex flex-wrap gap-1.5">
            {DIGIMON_ATTRIBUTES.map(attribute => (
              <button
                key={attribute}
                onClick={() => toggleFilter('attribute', attribute)}
                title={attribute}
                className={`relative rounded-lg p-1.5 transition-all hover:scale-110 ${
                  filters.attribute?.includes(attribute)
                    ? 'bg-orange-500/30 ring-2 ring-orange-500 shadow-lg shadow-orange-500/20'
                    : 'bg-muted/20 hover:bg-muted/40 opacity-70 hover:opacity-100'
                }`}
              >
                <Image src={getAttributeIconPath(attribute)} alt={attribute} width={32} height={32} unoptimized />
              </button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Rank */}
        <div>
          <h3 className="font-semibold mb-3 text-sm">Rank</h3>
          <div className="flex flex-wrap gap-1.5">
            {DIGIMON_RANKS.map(rank => (
              <button
                key={rank}
                onClick={() => toggleFilter('rank', rank)}
                title={rank}
                className={`relative rounded-lg p-1 transition-all hover:scale-110 ${
                  filters.rank?.includes(rank)
                    ? 'bg-orange-500/30 ring-2 ring-orange-500 shadow-lg shadow-orange-500/20'
                    : 'bg-muted/20 hover:bg-muted/40 opacity-70 hover:opacity-100'
                }`}
              >
                <Image src={getRankIconPath(rank)} alt={rank} width={36} height={36} unoptimized />
              </button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Family */}
        <div>
          <h3 className="font-semibold mb-3 text-sm">Family</h3>
          <div className="flex flex-wrap gap-1.5">
            {DIGIMON_FAMILIES.map(family => (
              <button
                key={family}
                onClick={() => toggleFilter('family', family)}
                title={family}
                className={`relative rounded-lg p-1.5 transition-all hover:scale-110 ${
                  filters.family?.includes(family)
                    ? 'bg-orange-500/30 ring-2 ring-orange-500 shadow-lg shadow-orange-500/20'
                    : 'bg-muted/20 hover:bg-muted/40 opacity-70 hover:opacity-100'
                }`}
              >
                <Image src={getFamilyIconPath(family)} alt={family} width={32} height={32} unoptimized />
              </button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Form - no icons, keep as text badges */}
        <div>
          <h3 className="font-semibold mb-3 text-sm">Form</h3>
          <div className="flex flex-wrap gap-2">
            {DIGIMON_FORMS.map(form => (
              <Badge
                key={form}
                variant={filters.form?.includes(form) ? 'default' : 'outline'}
                className="cursor-pointer text-xs"
                onClick={() => toggleFilter('form', form)}
              >
                {form}
              </Badge>
            ))}
          </div>
        </div>

        <Separator />

        {/* Attacker Type */}
        <div>
          <h3 className="font-semibold mb-3 text-sm">Attacker Type</h3>
          <div className="flex flex-wrap gap-1.5">
            {DIGIMON_ATTACKER_TYPES.map(type => (
              <button
                key={type}
                onClick={() => toggleFilter('attackerType', type)}
                title={type}
                className={`relative rounded-lg p-1.5 transition-all hover:scale-110 ${
                  filters.attackerType?.includes(type)
                    ? 'bg-orange-500/30 ring-2 ring-orange-500 shadow-lg shadow-orange-500/20'
                    : 'bg-muted/20 hover:bg-muted/40 opacity-70 hover:opacity-100'
                }`}
              >
                <Image src={getAttackerTypeIconPath(type)} alt={type} width={36} height={36} unoptimized />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
