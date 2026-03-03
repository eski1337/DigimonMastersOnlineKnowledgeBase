import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

const CMS_URL = process.env.CMS_INTERNAL_URL || process.env.NEXT_PUBLIC_CMS_URL || 'http://localhost:3001';

interface CMSItem {
  id: string;
  name: string;
  slug: string;
  description?: string;
  category?: string;
  rarity?: string;
  icon?: { url: string } | null;
  published?: boolean;
}

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

async function getItems(): Promise<CMSItem[]> {
  try {
    const res = await fetch(
      `${CMS_URL}/api/items?where[published][equals]=true&sort=name&limit=200&depth=1`,
      { next: { revalidate: 60 } },
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.docs || [];
  } catch {
    return [];
  }
}

export default async function ItemsPage() {
  const items = await getItems();

  return (
    <div className="container py-8">
      <div className="flex flex-col gap-6 mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Items</h1>
          <p className="text-muted-foreground">
            Browse all items in Digimon Masters Online &mdash; evolution items, equipment, consumables, materials, and more.
          </p>
        </div>
      </div>

      {items.length === 0 && (
        <p className="text-muted-foreground">No items published yet.</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {items.map(item => (
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
    </div>
  );
}
