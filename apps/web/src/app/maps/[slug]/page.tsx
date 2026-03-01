import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Building2, Trees, Skull, Swords, PartyPopper, Layers, Users, Shield, ArrowRight, Package, Pencil } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MapGallery, MapOverlayViewer, HeroImageViewer } from '@/components/maps/map-gallery';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const CMS_URL = process.env.CMS_INTERNAL_URL || process.env.NEXT_PUBLIC_CMS_URL || 'http://localhost:3001';
const PUBLIC_CMS_URL = process.env.NEXT_PUBLIC_CMS_URL || 'https://cms.dmokb.info';

interface NPC {
  name: string;
  role?: string;
  icon?: { url: string } | string | null;
}

interface WildDigimon {
  name: string;
  variant?: string;
  behavior?: 'aggressive' | 'defensive';
  hp?: number | null;
  level?: string;
  element?: string;
  attribute?: string;
  icon?: { url: string } | string | null;
}

interface GalleryItem {
  image: { url: string; alt?: string; width?: number; height?: number } | string;
  caption?: string;
}

interface Portal {
  destination: string;
  destinationSlug?: string;
  requirements?: string;
}

interface Boss {
  name: string;
  level?: string;
  hp?: string;
  element?: string;
}

interface Drop {
  monster: string;
  item: string;
  quantity?: string;
  icon?: { url: string } | string | null;
}

interface MapData {
  id: string;
  name: string;
  slug: string;
  region?: string;
  mapType?: string;
  levelRange?: string;
  description?: string;
  image?: { url: string; width?: number; height?: number } | null;
  mapImage?: { url: string; width?: number; height?: number } | null;
  gallery?: GalleryItem[];
  npcs?: NPC[];
  wildDigimon?: WildDigimon[];
  portals?: Portal[];
  bosses?: Boss[];
  drops?: Drop[];
}

const MAP_TYPE_CONFIG: Record<string, { icon: typeof MapPin; label: string; color: string; bg: string }> = {
  town:     { icon: Building2,    label: 'Town / Hub',    color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  field:    { icon: Trees,        label: 'Field / Zone',  color: 'text-green-400',   bg: 'bg-green-500/10' },
  dungeon:  { icon: Skull,        label: 'Dungeon',       color: 'text-red-400',     bg: 'bg-red-500/10' },
  raid:     { icon: Swords,       label: 'Raid',          color: 'text-orange-400',  bg: 'bg-orange-500/10' },
  event:    { icon: PartyPopper,  label: 'Event',         color: 'text-yellow-400',  bg: 'bg-yellow-500/10' },
  instance: { icon: Layers,       label: 'Instance',      color: 'text-blue-400',    bg: 'bg-blue-500/10' },
};

function imgUrl(media: { url: string } | string | null | undefined): string | null {
  if (!media) return null;
  const url = typeof media === 'string' ? media : media.url;
  if (!url) return null;
  return url.startsWith('http') ? url : `${PUBLIC_CMS_URL}${url}`;
}

function getElementIconPath(element: string): string {
  return `/icons/Elements/${element.replace(/\s+/g, '_')}.png`;
}

function getAttributeIconPath(attribute: string): string {
  if (attribute === 'Unknown') return '/icons/Attributes/Unknown_Attribute.png';
  return `/icons/Attributes/${attribute}.png`;
}

function getBehaviorIconPath(behavior: string): string {
  return `/icons/Behavior/${behavior === 'aggressive' ? 'Aggressive' : 'Defensive'}.png`;
}


async function getMap(slug: string): Promise<MapData | null> {
  try {
    const res = await fetch(
      `${CMS_URL}/api/maps?where[slug][equals]=${encodeURIComponent(slug)}&where[published][equals]=true&depth=2&limit=1`,
      { next: { revalidate: 60 } },
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.docs?.[0] || null;
  } catch {
    return null;
  }
}

async function fetchDigimonIcons(): Promise<Record<string, string>> {
  try {
    const res = await fetch(
      `${CMS_URL}/api/digimon?limit=700&depth=1`,
      { next: { revalidate: 300 } },
    );
    if (!res.ok) return {};
    const data = await res.json();
    const lookup: Record<string, string> = {};
    for (const d of data.docs || []) {
      const url = typeof d.mainImage === 'object' && d.mainImage?.url
        ? d.mainImage.url
        : null;
      if (url && d.name) {
        lookup[d.name] = url.startsWith('http') ? url : `${PUBLIC_CMS_URL}${url}`;
      }
    }
    return lookup;
  } catch {
    return {};
  }
}

interface WildDigimonGroup {
  baseName: string;
  entries: WildDigimon[];
}

function groupWildDigimon(list: WildDigimon[]): WildDigimonGroup[] {
  const map = new Map<string, WildDigimon[]>();
  const order: string[] = [];
  for (const d of list) {
    if (!map.has(d.name)) {
      map.set(d.name, []);
      order.push(d.name);
    }
    map.get(d.name)!.push(d);
  }
  return order.map(name => ({ baseName: name, entries: map.get(name)! }));
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const map = await getMap(params.slug);
  if (!map) return { title: 'Map Not Found' };
  return {
    title: `${map.name} - Maps - DMO KB`,
    description: map.description || `Explore ${map.name} in Digimon Masters Online.`,
  };
}

export default async function MapDetailPage({ params }: { params: { slug: string } }) {
  const map = await getMap(params.slug);
  if (!map) notFound();

  const typeConf = MAP_TYPE_CONFIG[map.mapType || ''] || { icon: MapPin, label: map.mapType || 'Map', color: 'text-primary', bg: 'bg-primary/10' };
  const TypeIcon = typeConf.icon;
  const heroImg = imgUrl(map.image);
  const mapOverlay = imgUrl(map.mapImage);

  const digimonIcons = await fetchDigimonIcons();
  const wildGroups = groupWildDigimon(map.wildDigimon || []);

  const session = await getServerSession(authOptions);
  const userRole = (session?.user as any)?.role;
  const canEdit = ['owner', 'admin', 'editor'].includes(userRole);

  return (
    <div className="container py-8 max-w-6xl">
      {/* Breadcrumb + Edit */}
      <div className="flex items-center justify-between mb-6">
        <nav className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/maps" className="hover:text-foreground transition-colors">Maps</Link>
          <span>/</span>
          <span className="text-foreground font-medium">{map.name}</span>
        </nav>
        {canEdit && (
          <a
            href={`${PUBLIC_CMS_URL}/admin/collections/maps/${map.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md border border-border bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          >
            <Pencil className="h-3 w-3" />
            Edit
          </a>
        )}
      </div>

      {/* Hero Section */}
      <div className="relative rounded-2xl overflow-hidden mb-8">
        {heroImg ? (
          <HeroImageViewer src={heroImg} alt={map.name}>
            <Image
              src={heroImg}
              alt={map.name}
              fill
              className="object-cover"
              sizes="(max-width: 1200px) 100vw, 1200px"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-8">
              <div className="flex items-center gap-3 mb-3">
                <Badge className={`${typeConf.bg} ${typeConf.color} border-0`}>
                  <TypeIcon className="h-3.5 w-3.5 mr-1" />
                  {typeConf.label}
                </Badge>
                {map.region && <Badge variant="secondary">{map.region}</Badge>}
                {map.levelRange && <Badge variant="secondary">Lv. {map.levelRange}</Badge>}
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-white drop-shadow-lg">{map.name}</h1>
              {map.description && (
                <p className="text-white/80 mt-3 max-w-2xl text-lg">{map.description}</p>
              )}
            </div>
          </HeroImageViewer>
        ) : (
          <div className="bg-gradient-to-br from-card to-muted p-8 rounded-2xl border">
            <div className="flex items-center gap-3 mb-3">
              <Badge className={`${typeConf.bg} ${typeConf.color} border-0`}>
                <TypeIcon className="h-3.5 w-3.5 mr-1" />
                {typeConf.label}
              </Badge>
              {map.region && <Badge variant="secondary">{map.region}</Badge>}
              {map.levelRange && <Badge variant="secondary">Lv. {map.levelRange}</Badge>}
            </div>
            <h1 className="text-4xl font-bold">{map.name}</h1>
            {map.description && (
              <p className="text-muted-foreground mt-3 max-w-2xl text-lg">{map.description}</p>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-8">

          {/* NPCs Section */}
          {map.npcs && map.npcs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  NPCs
                  <span className="text-sm font-normal text-muted-foreground">({map.npcs.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {map.npcs.map((npc, i) => {
                    const npcIcon = imgUrl(npc.icon);
                    return (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-secondary/30 transition-colors">
                        {npcIcon ? (
                          <Image
                            src={npcIcon}
                            alt={npc.name}
                            width={36}
                            height={36}
                            className="rounded-md flex-shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-md bg-secondary flex items-center justify-center flex-shrink-0">
                            <Users className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm leading-tight">{npc.name}</p>
                          {npc.role && (
                            <p className="text-xs text-muted-foreground leading-tight mt-0.5">&lt;{npc.role}&gt;</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Wild Digimon Section */}
          {wildGroups.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-destructive" />
                  Wild Digimon
                  <span className="text-sm font-normal text-muted-foreground">({(map.wildDigimon || []).length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-base">
                    <thead>
                      <tr className="border-b text-muted-foreground text-sm">
                        <th className="text-left py-2 pr-3 font-medium">Digimon</th>
                        <th className="text-center py-2 px-2 font-medium">Behavior</th>
                        <th className="text-center py-2 px-2 font-medium">HP</th>
                        <th className="text-center py-2 px-2 font-medium">Level</th>
                        <th className="text-center py-2 px-2 font-medium">Attribute</th>
                        <th className="text-center py-2 pl-2 font-medium">Element</th>
                      </tr>
                    </thead>
                    <tbody>
                      {wildGroups.map((group, gi) => {
                        const digiSlug = group.baseName.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/--+/g, '-').trim();
                        const iconSrc = digimonIcons[group.baseName] || null;
                        return group.entries.map((d, ei) => {
                          const behavior = d.behavior || 'defensive';
                          const isFirst = ei === 0;
                          const isLast = ei === group.entries.length - 1;
                          const variantLabel = d.variant ? `(${d.variant})` : '';
                          return (
                            <tr
                              key={`${gi}-${ei}`}
                              className={`hover:bg-secondary/20 transition-colors ${isLast && gi < wildGroups.length - 1 ? 'border-b-2 border-border' : ei < group.entries.length - 1 ? 'border-b border-border/30' : ''}`}
                            >
                              <td className="py-2 pr-3">
                                <div className="flex items-center gap-2">
                                  {isFirst ? (
                                    iconSrc ? (
                                      <Image src={iconSrc} alt={group.baseName} width={56} height={56} className="rounded flex-shrink-0" />
                                    ) : (
                                      <div className="w-14 h-14 rounded bg-secondary flex-shrink-0" />
                                    )
                                  ) : (
                                    <div className="w-14 flex-shrink-0" />
                                  )}
                                  <div className="min-w-0">
                                    {isFirst ? (
                                      <Link href={`/digimon/${digiSlug}`} className="font-semibold hover:text-primary transition-colors">
                                        {group.baseName}
                                      </Link>
                                    ) : (
                                      <span className="text-muted-foreground pl-1">{variantLabel}</span>
                                    )}
                                    {isFirst && variantLabel && (
                                      <span className="text-muted-foreground ml-1">{variantLabel}</span>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="py-2 px-2 text-center">
                                <span className="inline-flex items-center" title={behavior === 'aggressive' ? 'Aggressive' : 'Defensive'}>
                                  <Image src={getBehaviorIconPath(behavior)} alt={behavior} width={40} height={40} unoptimized />
                                </span>
                              </td>
                              <td className="py-2 px-2 text-center text-muted-foreground">
                                {d.hp ? d.hp.toLocaleString() : ''}
                              </td>
                              <td className="py-2 px-2 text-center text-muted-foreground">
                                {d.level || ''}
                              </td>
                              <td className="py-2 px-2 text-center">
                                {d.attribute && (
                                  <span className="inline-flex items-center" title={d.attribute}>
                                    <Image src={getAttributeIconPath(d.attribute)} alt={d.attribute} width={36} height={36} unoptimized />
                                  </span>
                                )}
                              </td>
                              <td className="py-2 pl-2 text-center">
                                {d.element && (
                                  <span className="inline-flex items-center" title={d.element}>
                                    <Image src={getElementIconPath(d.element)} alt={d.element} width={36} height={36} unoptimized />
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        });
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Drops Section */}
          {map.drops && map.drops.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-amber-400" />
                  Drops
                  <span className="text-sm font-normal text-muted-foreground">({map.drops.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const grouped = new Map<string, Drop[]>();
                  const order: string[] = [];
                  for (const d of map.drops!) {
                    const key = d.monster || 'Various';
                    if (!grouped.has(key)) { grouped.set(key, []); order.push(key); }
                    grouped.get(key)!.push(d);
                  }
                  return (
                    <div className="space-y-4">
                      {order.map((monster) => (
                        <div key={monster} className="rounded-lg border bg-card overflow-hidden">
                          <div className="px-4 py-2 bg-secondary/40 border-b">
                            <span className="font-semibold text-sm">{monster}</span>
                          </div>
                          <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {grouped.get(monster)!.map((drop, di) => {
                              const dropIcon = imgUrl(drop.icon);
                              return (
                                <div key={di} className="flex items-center gap-3 p-2 rounded-md hover:bg-secondary/20 transition-colors">
                                  {dropIcon ? (
                                    <Image src={dropIcon} alt={drop.item} width={28} height={28} className="rounded flex-shrink-0" />
                                  ) : (
                                    <div className="w-7 h-7 rounded bg-secondary flex items-center justify-center flex-shrink-0">
                                      <Package className="h-3.5 w-3.5 text-muted-foreground" />
                                    </div>
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium leading-tight">{drop.item}</p>
                                  </div>
                                  {drop.quantity && (
                                    <Badge variant="outline" className="text-xs flex-shrink-0">{drop.quantity}</Badge>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          )}

          {/* Gallery */}
          {map.gallery && map.gallery.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Gallery</CardTitle>
              </CardHeader>
              <CardContent>
                <MapGallery
                  images={map.gallery
                    .map((item) => ({
                      src: imgUrl(item.image) || '',
                      caption: item.caption || map.name,
                    }))
                    .filter((img) => img.src)}
                />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Map Image */}
          {mapOverlay && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Map</CardTitle>
              </CardHeader>
              <CardContent>
                <MapOverlayViewer src={mapOverlay} alt={`${map.name} map`} />
              </CardContent>
            </Card>
          )}

          {/* Connected Maps / Portals */}
          {map.portals && map.portals.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <ArrowRight className="h-4 w-4" />
                  Connected Maps
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {map.portals.map((p, i) => {
                    const slug = p.destinationSlug;
                    const inner = (
                      <div className={`flex items-center justify-between p-3 rounded-lg border text-sm transition-colors ${slug ? 'hover:bg-secondary/30 hover:border-primary/30 cursor-pointer' : 'bg-muted/50'}`}>
                        <span className="font-medium">{p.destination}</span>
                        <div className="flex items-center gap-2">
                          {p.requirements && (
                            <Badge variant="outline" className="text-xs">{p.requirements}</Badge>
                          )}
                          {slug && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />}
                        </div>
                      </div>
                    );
                    return slug ? (
                      <Link key={i} href={`/maps/${slug}`}>{inner}</Link>
                    ) : (
                      <div key={i}>{inner}</div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Bosses */}
          {map.bosses && map.bosses.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Skull className="h-4 w-4 text-red-400" />
                  Bosses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {map.bosses.map((b, i) => (
                    <div key={i} className="p-2 rounded bg-muted/50 text-sm space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{b.name}</span>
                        {b.level && <Badge variant="outline" className="text-xs">Lv. {b.level}</Badge>}
                      </div>
                      {(b.hp || b.element) && (
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          {b.hp && <span>HP: {b.hp}</span>}
                          {b.element && <span>Element: {b.element}</span>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Info</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3 text-sm">
                {map.mapType && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Type</dt>
                    <dd className="font-medium">{typeConf.label}</dd>
                  </div>
                )}
                {map.region && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Region</dt>
                    <dd className="font-medium">{map.region}</dd>
                  </div>
                )}
                {map.levelRange && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Level Range</dt>
                    <dd className="font-medium">{map.levelRange}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">NPCs</dt>
                  <dd className="font-medium">{map.npcs?.length || 0}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Wild Digimon</dt>
                  <dd className="font-medium">{map.wildDigimon?.length || 0}</dd>
                </div>
                {(map.drops?.length || 0) > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Drops</dt>
                    <dd className="font-medium">{map.drops!.length}</dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
