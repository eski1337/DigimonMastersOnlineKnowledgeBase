import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, ShoppingCart, Swords, BookOpen, Link2, Clock, TrendingUp, Sparkles } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { resolveMediaUrl } from '@/lib/icon-paths';

const CMS_URL = process.env.CMS_INTERNAL_URL || process.env.NEXT_PUBLIC_CMS_URL || 'http://localhost:3001';

interface CMSItem {
  id: string;
  name: string;
  slug: string;
  description?: string;
  category?: string;
  rarity?: string;
  maxStack?: number;
  tradeable?: boolean;
  accountBound?: boolean;
  cashShopItem?: boolean;
  eventOnly?: boolean;
  icon?: { url: string } | null;
  image?: { url: string } | null;
  additionalImages?: { image?: { url: string }; caption?: string }[];
  effects?: { stat?: string; value?: string; duration?: string }[];
  cooldown?: string;
  levelRequirement?: number;
  obtainMethods?: { method?: string; source?: string; dropRate?: string; notes?: string }[];
  craftingRecipe?: {
    npc?: string;
    cost?: string;
    successRate?: string;
    materials?: { item: string; amount?: number; icon?: { url: string } }[];
  };
  usedFor?: string;
  relatedDigimon?: { id: string; name: string; slug: string; icon?: { url: string } }[];
  relatedItems?: { id: string; name: string; slug: string; icon?: { url: string } }[];
  relatedGuide?: { id: string; title: string; slug: string } | null;
  notes?: any;
  published?: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  evolution: 'Evolution Item', unlock: 'Unlock Item', 'ride-mode-unlock': 'Ride Mode Unlock', consumable: 'Consumable',
  equipment: 'Equipment', material: 'Material', quest: 'Quest Item',
  egg: 'Egg / Mercenary', costume: 'Costume / Skin', token: 'Token / Currency',
  booster: 'Booster / Buff', digivice: 'Digivice', accessory: 'Accessory',
  seal: 'Seal', card: 'Card', other: 'Other',
};

const CATEGORY_COLORS: Record<string, string> = {
  evolution: 'from-green-400 to-emerald-500',
  unlock: 'from-cyan-400 to-blue-500',
  'ride-mode-unlock': 'from-teal-400 to-cyan-500',
  consumable: 'from-red-400 to-pink-500',
  equipment: 'from-orange-400 to-amber-500',
  material: 'from-stone-400 to-stone-500',
  quest: 'from-yellow-400 to-amber-500',
  egg: 'from-pink-400 to-rose-500',
  costume: 'from-fuchsia-400 to-purple-500',
  token: 'from-yellow-400 to-yellow-500',
  booster: 'from-lime-400 to-green-500',
  digivice: 'from-blue-400 to-indigo-500',
  accessory: 'from-violet-400 to-purple-500',
  seal: 'from-teal-400 to-cyan-500',
  card: 'from-indigo-400 to-blue-500',
  other: 'from-gray-400 to-gray-500',
};

const RARITY_STYLES: Record<string, { gradient: string; badge: string; border: string }> = {
  common:    { gradient: 'from-gray-500 to-gray-600', badge: 'bg-gray-500/20 text-gray-300 border-gray-500/40', border: 'border-gray-500/30' },
  uncommon:  { gradient: 'from-green-500 to-green-600', badge: 'bg-green-500/20 text-green-300 border-green-500/40', border: 'border-green-500/30' },
  rare:      { gradient: 'from-blue-500 to-blue-600', badge: 'bg-blue-500/20 text-blue-300 border-blue-500/40', border: 'border-blue-500/30' },
  epic:      { gradient: 'from-purple-500 to-purple-600', badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40', border: 'border-purple-500/30' },
  legendary: { gradient: 'from-orange-500 to-amber-500', badge: 'bg-orange-500/20 text-orange-300 border-orange-500/40', border: 'border-orange-500/30' },
  event:     { gradient: 'from-pink-500 to-rose-500', badge: 'bg-pink-500/20 text-pink-300 border-pink-500/40', border: 'border-pink-500/30' },
  cash:      { gradient: 'from-yellow-500 to-amber-500', badge: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40', border: 'border-yellow-500/30' },
};

const METHOD_LABELS: Record<string, string> = {
  drop: 'Monster Drop', quest: 'Quest Reward', craft: 'Crafting / NPC',
  cash: 'Cash Shop', event: 'Event', 'rare-machine': 'Rare Machine',
  'digital-draw': 'Digital Draw', trade: 'Trade', arena: 'Arena Reward',
  dungeon: 'Dungeon Reward', other: 'Other',
};

async function getItem(slug: string): Promise<CMSItem | null> {
  try {
    const res = await fetch(
      `${CMS_URL}/api/items?where[slug][equals]=${slug}&where[published][equals]=true&limit=1&depth=2`,
      { next: { revalidate: 60 } },
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.docs?.[0] || null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const item = await getItem(params.slug);
  if (!item) return { title: 'Item Not Found' };
  return {
    title: `${item.name} - DMO KB`,
    description: item.description || `${item.name} item in Digimon Masters Online`,
  };
}

export default async function ItemPage({ params }: { params: { slug: string } }) {
  const item = await getItem(params.slug);
  if (!item) notFound();

  const rarityStyle = RARITY_STYLES[item.rarity || ''] || RARITY_STYLES.common;
  const categoryColor = CATEGORY_COLORS[item.category || 'other'] || CATEGORY_COLORS.other;
  const rawIconUrl = typeof item.icon === 'object' ? item.icon?.url : null;
  const rawImageUrl = typeof item.image === 'object' ? item.image?.url : null;
  const iconUrl = resolveMediaUrl(rawImageUrl || rawIconUrl) || null;
  const hasEffects = item.effects && item.effects.length > 0;
  const hasObtainMethods = item.obtainMethods && item.obtainMethods.length > 0;
  const hasCrafting = item.craftingRecipe?.materials && item.craftingRecipe.materials.length > 0;
  const hasRelatedDigimon = item.relatedDigimon && item.relatedDigimon.length > 0;
  const hasRelatedItems = item.relatedItems && item.relatedItems.length > 0;

  return (
    <div className="container py-8 max-w-6xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link href="/items" className="hover:text-foreground transition-colors">Items</Link>
        <span>/</span>
        <span className="text-foreground font-medium">{item.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 lg:gap-8">
        {/* ── Main Content ────────────────────────────────────────── */}
        <div className="space-y-6">
          {/* Hero */}
          <div className="flex items-start gap-5">
            {iconUrl ? (
              <div className={`w-20 h-20 rounded-xl bg-muted/50 flex items-center justify-center flex-shrink-0 overflow-hidden border-2 ${rarityStyle.border}`}>
                <Image
                  src={iconUrl}
                  alt={item.name}
                  width={64}
                  height={64}
                  className="object-contain"
                />
              </div>
            ) : (
              <div className={`w-20 h-20 rounded-xl bg-muted/50 flex items-center justify-center flex-shrink-0 border-2 ${rarityStyle.border}`}>
                <Package className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
            <div className="min-w-0">
              <h1 className={`text-3xl sm:text-4xl font-bold bg-gradient-to-r ${categoryColor} bg-clip-text text-transparent break-words`}>
                {item.name}
              </h1>
              <div className="flex flex-wrap gap-2 mt-2">
                {item.category && (
                  <Badge variant="secondary">{CATEGORY_LABELS[item.category] || item.category}</Badge>
                )}
                {item.rarity && (
                  <Badge className={`border ${rarityStyle.badge}`}>
                    {item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1)}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          {item.description && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Description</CardTitle></CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{item.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Usage */}
          {item.usedFor && (
            <Card className={`${rarityStyle.border}`}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Swords className="h-5 w-5 text-primary" /> Usage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{item.usedFor}</p>
              </CardContent>
            </Card>
          )}

          {/* Effects */}
          {hasEffects && (
            <Card className="border-emerald-500/30">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-emerald-400" /> Effects
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {item.effects!.map((eff, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                      <TrendingUp className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold text-foreground">{eff.stat}</span>
                        {eff.value && <span className="ml-2 text-emerald-400 font-bold">{eff.value}</span>}
                      </div>
                      {eff.duration && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {eff.duration}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                {item.cooldown && (
                  <div className="mt-3 pt-3 border-t border-emerald-500/20 flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" /> Cooldown: <span className="text-foreground font-medium">{item.cooldown}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Obtaining */}
          {hasObtainMethods && (
            <Card className="border-blue-500/30">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-blue-400" /> How to Obtain
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {item.obtainMethods!.map((m, i) => (
                    <div key={i} className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        {m.method && (
                          <Badge variant="secondary" className="text-xs">{METHOD_LABELS[m.method] || m.method}</Badge>
                        )}
                        {m.source && <span className="font-medium text-foreground text-sm">{m.source}</span>}
                        {m.dropRate && (
                          <span className="text-xs text-blue-400 ml-auto">Drop Rate: {m.dropRate}</span>
                        )}
                      </div>
                      {m.notes && <p className="text-xs text-muted-foreground mt-1">{m.notes}</p>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Crafting Recipe */}
          {hasCrafting && (
            <Card className="border-amber-500/30">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="h-5 w-5 text-amber-400" /> Crafting Recipe
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(item.craftingRecipe!.npc || item.craftingRecipe!.cost || item.craftingRecipe!.successRate) && (
                  <div className="flex flex-wrap gap-4 mb-4 text-sm">
                    {item.craftingRecipe!.npc && (
                      <div><span className="text-muted-foreground">NPC:</span> <span className="font-medium text-foreground">{item.craftingRecipe!.npc}</span></div>
                    )}
                    {item.craftingRecipe!.cost && (
                      <div><span className="text-muted-foreground">Cost:</span> <span className="font-medium text-amber-400">{item.craftingRecipe!.cost}</span></div>
                    )}
                    {item.craftingRecipe!.successRate && (
                      <div><span className="text-muted-foreground">Rate:</span> <span className="font-medium text-foreground">{item.craftingRecipe!.successRate}</span></div>
                    )}
                  </div>
                )}
                <div className="space-y-2">
                  {item.craftingRecipe!.materials!.map((mat, i) => (
                    <div key={i} className="flex items-center gap-3 p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                      {mat.icon?.url && resolveMediaUrl(mat.icon.url) && (
                        <Image src={resolveMediaUrl(mat.icon.url)} alt={mat.item} width={24} height={24} className="object-contain flex-shrink-0" />
                      )}
                      <span className="text-sm font-medium text-foreground">{mat.item}</span>
                      {mat.amount && <span className="text-sm text-amber-400 ml-auto font-bold">x{mat.amount}</span>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Related Digimon */}
          {hasRelatedDigimon && (
            <Card className="border-orange-500/30">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Link2 className="h-5 w-5 text-orange-400" /> Related Digimon
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {item.relatedDigimon!.map(digi => (
                    <Link key={digi.id} href={`/digimon/${digi.slug}`} className="flex items-center gap-2 p-2 bg-orange-500/10 border border-orange-500/20 rounded-lg hover:bg-orange-500/20 transition-colors">
                      {digi.icon?.url && resolveMediaUrl(digi.icon.url) && (
                        <Image src={resolveMediaUrl(digi.icon.url)} alt={digi.name} width={28} height={28} className="object-contain" />
                      )}
                      <span className="text-sm font-medium">{digi.name}</span>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Related Items */}
          {hasRelatedItems && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" /> Related Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {item.relatedItems!.map(rel => (
                    <Link key={rel.id} href={`/items/${rel.slug}`} className="flex items-center gap-2 p-2 bg-primary/10 border border-primary/20 rounded-lg hover:bg-primary/20 transition-colors">
                      {rel.icon?.url && resolveMediaUrl(rel.icon.url) && (
                        <Image src={resolveMediaUrl(rel.icon.url)} alt={rel.name} width={24} height={24} className="object-contain" />
                      )}
                      <span className="text-sm font-medium">{rel.name}</span>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Related Guide */}
          {item.relatedGuide && (
            <Link href={`/guides/${item.relatedGuide.slug}`}>
              <Card className="border-primary/30 hover:bg-primary/5 transition-colors cursor-pointer">
                <CardContent className="py-4 flex items-center gap-3">
                  <BookOpen className="h-5 w-5 text-primary flex-shrink-0" />
                  <div>
                    <p className="text-sm text-muted-foreground">Related Guide</p>
                    <p className="font-semibold text-primary">{item.relatedGuide.title}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )}
        </div>

        {/* ── Sidebar Infobox ─────────────────────────────────────── */}
        <div>
          <Card className="overflow-hidden sticky top-20">
            {/* Header */}
            <div className={`bg-gradient-to-r ${categoryColor} px-4 py-3`}>
              <h2 className="text-lg font-bold text-white break-words">{item.name}</h2>
            </div>

            {/* Icon */}
            <div className="flex justify-center py-6 bg-muted/30">
              {iconUrl ? (
                <div className={`w-32 h-32 rounded-xl bg-background/80 flex items-center justify-center border-2 ${rarityStyle.border}`}>
                  <Image
                    src={iconUrl}
                    alt={item.name}
                    width={96}
                    height={96}
                    className="object-contain"
                  />
                </div>
              ) : (
                <div className="w-32 h-32 rounded-xl bg-background/80 flex items-center justify-center border-2 border-border">
                  <Package className="h-12 w-12 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="p-4 space-y-3 text-sm">
              {item.category && (
                <div className="flex justify-between items-center py-1.5 border-b border-muted/30">
                  <span className="text-muted-foreground font-medium">Category</span>
                  <Badge variant="secondary">{CATEGORY_LABELS[item.category]}</Badge>
                </div>
              )}
              {item.rarity && (
                <div className="flex justify-between items-center py-1.5 border-b border-muted/30">
                  <span className="text-muted-foreground font-medium">Rarity</span>
                  <Badge className={`border ${rarityStyle.badge}`}>
                    {item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1)}
                  </Badge>
                </div>
              )}
              {item.maxStack && item.maxStack > 1 && (
                <div className="flex justify-between items-center py-1.5 border-b border-muted/30">
                  <span className="text-muted-foreground font-medium">Stack Size</span>
                  <span className="font-semibold">{item.maxStack}</span>
                </div>
              )}
              {item.levelRequirement && (
                <div className="flex justify-between items-center py-1.5 border-b border-muted/30">
                  <span className="text-muted-foreground font-medium">Required Level</span>
                  <span className="font-semibold">{item.levelRequirement}</span>
                </div>
              )}

              {/* Flags */}
              <div className="space-y-1.5 pt-1">
                <div className={`flex items-center justify-between py-1.5 px-2 rounded ${item.tradeable ? 'bg-lime-400/90' : 'bg-muted/10'}`}>
                  <span className={`font-semibold text-xs ${item.tradeable ? 'text-black' : 'text-muted-foreground'}`}>Tradeable</span>
                  <span className={`font-bold ${item.tradeable ? 'text-black' : 'text-muted-foreground'}`}>{item.tradeable ? '✓' : '✗'}</span>
                </div>
                <div className={`flex items-center justify-between py-1.5 px-2 rounded ${item.accountBound ? 'bg-red-400/80' : 'bg-muted/10'}`}>
                  <span className={`font-semibold text-xs ${item.accountBound ? 'text-white' : 'text-muted-foreground'}`}>Account Bound</span>
                  <span className={`font-bold ${item.accountBound ? 'text-white' : 'text-muted-foreground'}`}>{item.accountBound ? '✓' : '✗'}</span>
                </div>
                {item.cashShopItem && (
                  <div className="flex items-center justify-between py-1.5 px-2 rounded bg-yellow-400/80">
                    <span className="font-semibold text-xs text-black">Cash Shop</span>
                    <span className="font-bold text-black">✓</span>
                  </div>
                )}
                {item.eventOnly && (
                  <div className="flex items-center justify-between py-1.5 px-2 rounded bg-pink-400/80">
                    <span className="font-semibold text-xs text-white">Event Only</span>
                    <span className="font-bold text-white">✓</span>
                  </div>
                )}
              </div>

            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
