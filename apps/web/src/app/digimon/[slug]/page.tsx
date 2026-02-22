import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SkillsSection } from '@/components/digimon/skills-section';
import { DigivolutionTreeButton } from '@/components/digimon/digivolution-tree-button';
import { ImageModal } from '@/components/digimon/image-modal';
import { LocalizedNames } from '@/components/digimon/localized-names';
import { EvolutionTreeV2 as EvolutionTree } from '@/components/digimon/evolution-tree-v2';
import { VisualEvolutionEditor } from '@/components/digimon/visual-evolution-editor';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import type { PayloadMedia } from '@/types/digimon';

const CMS_URL = process.env.NEXT_PUBLIC_CMS_URL || 'http://localhost:3001';

async function getDigimon(slug: string) {
  try {
    const response = await fetch(
      `${CMS_URL}/api/digimon?where[slug][equals]=${slug}&where[published][equals]=true&limit=1&depth=1`,
      {
        next: { revalidate: 5 },
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.docs?.[0] || null;
  } catch (error: unknown) {
    console.error('Error fetching Digimon:', error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}

export default async function DigimonDetailPage({ params }: { params: { slug: string } }) {
  const [d, session] = await Promise.all([
    getDigimon(params.slug),
    getServerSession(authOptions)
  ]);

  if (!d) {
    notFound();
  }

  // Get image URL - prefer mainImage, fallback to icon, then placeholder
  let imageUrl = typeof d.mainImage === 'string' 
    ? d.mainImage 
    : (d.mainImage as PayloadMedia)?.url || 
      (typeof d.icon === 'string' ? d.icon : (d.icon as PayloadMedia)?.url);
  
  // Use placeholder if no image or if it's a wrong icon
  const shouldUsePlaceholder = !imageUrl || 
      imageUrl.includes('/Families/') || 
      imageUrl.includes('/Attributes/') ||
      imageUrl.includes('Virus_Busters') ||
      imageUrl.includes('VirusBuster') ||
      imageUrl.includes('VB.png') ||
      imageUrl.includes('Alphamon_(X-Antibody_System)_Icon'); // Specific bad icon
  
  if (shouldUsePlaceholder) {
    imageUrl = '/icons/Placeholder/digiplaceholder.png';
  }

  // Icon path helpers
  const getElementIconPath = (element: string) => {
    const normalizedElement = element?.replace(/\s+/g, '_');
    return `/icons/Elements/${normalizedElement}.png`;
  };

  const getAttributeIconPath = (attribute: string) => {
    // Handle special case for Unknown attribute
    if (attribute === 'Unknown') {
      return `/icons/Attributes/Unknown_Attribute.png`;
    }
    return `/icons/Attributes/${attribute}.png`;
  };

  const getRankIconPath = (rank: string) => {
    return `/icons/Ranks/${rank}.png`;
  };

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

  const getStatIconPath = (stat: string) => {
    return `/icons/Stats/${stat.toUpperCase()}.png`;
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

  // Get rank color for rarity indication
  const getRankColor = (rank: string) => {
    const colors: Record<string, string> = {
      'N': 'from-gray-400 to-gray-500',           // Bronze/Common
      'A': 'from-blue-400 to-blue-500',          // Silver/Uncommon
      'A+': 'from-blue-400 to-blue-500',
      'S': 'from-purple-400 to-purple-500',      // Gold/Rare
      'S+': 'from-purple-400 to-purple-500',
      'SS': 'from-pink-400 to-pink-500',         // Diamond/Epic
      'SS+': 'from-pink-400 to-pink-500',
      'SSS': 'from-orange-400 to-orange-500',    // Crown/Legendary
      'SSS+': 'from-orange-400 to-orange-500',
      'U': 'from-cyan-400 to-cyan-500',          // Unique
      'U+': 'from-cyan-400 to-cyan-500',
    };
    return colors[rank] || 'from-blue-400 to-purple-400';
  };

  return (
    <div className="container py-8 max-w-7xl">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-8">
        {/* Main Content */}
        <div className="space-y-8">
          {/* Title and Button */}
          <div className="flex items-start justify-between mb-4">
            <h1 className={`text-5xl font-bold bg-gradient-to-r ${getRankColor(d.rank)} bg-clip-text text-transparent`}>
              {d.name}
            </h1>
            <DigivolutionTreeButton slug={params.slug} />
          </div>

          {/* Introduction - Always show */}
          <Card className="bg-gradient-to-br from-[#1d2021] to-[#282828] border-orange-500/30">
            <CardHeader>
              <CardTitle className="text-xl text-orange-400">About</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg leading-relaxed text-muted-foreground whitespace-pre-wrap">
                {d.introduction || 'No description available yet.'}
              </p>
            </CardContent>
          </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Base Stats - Always show */}
        <Card className="bg-gradient-to-br from-[#1d2021] to-[#282828] border-orange-500/30">
          <CardHeader>
            <CardTitle className="text-xl text-orange-400">Base Stats</CardTitle>
          </CardHeader>
          <CardContent>
            {d.stats && Object.values(d.stats).some((v: any) => v > 0) ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(d.stats).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg hover:bg-orange-500/20 transition-colors">
                      <Image 
                        src={getStatIconPath(key)} 
                        alt={key}
                        width={48}
                        height={48}
                        style={{ width: 'auto', height: 'auto' }}
                        className="flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0 text-center text-base font-bold text-orange-300 tabular-nums">
                        {String(value)}{(key === 'ct' || key === 'ev') ? '%' : ''}
                      </div>
                    </div>
                  ))}
                </div>
                {d.sizePct && (
                  <div className="mt-3 pt-3 border-t border-orange-500/20">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Digimon Size</span>
                      <span className="text-lg font-bold text-orange-400 tabular-nums">{d.sizePct}%</span>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-lg">No base stats available</p>
                <p className="text-sm mt-2">Stats data has not been imported yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Max Stats - Always show */}
        <Card className="bg-gradient-to-br from-[#1d2021] to-[#282828] border-purple-500/30">
          <CardHeader>
            <CardTitle className="text-xl text-purple-400">Max Stats (Lv 140, 100% Size)</CardTitle>
          </CardHeader>
          <CardContent>
            {d.maxStats && Object.values(d.maxStats).some((v: any) => v > 0) ? (
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(d.maxStats).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg hover:bg-purple-500/20 transition-colors">
                    <Image 
                      src={getStatIconPath(key)} 
                      alt={key}
                      width={48}
                      height={48}
                      style={{ width: 'auto', height: 'auto' }}
                      className="flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0 text-center text-base font-bold text-purple-300 tabular-nums">
                      {String(value)}{(key === 'ct' || key === 'ev') ? '%' : ''}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-lg">No max stats available</p>
                <p className="text-sm mt-2">Max stats data has not been imported yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>


      {/* Complete Evolution Tree - Always show */}
      <EvolutionTree
        currentDigimon={{ 
          name: d.name, 
          slug: d.slug,
          icon: typeof d.icon === 'string' ? d.icon : (d.icon as PayloadMedia)?.url,
          rank: d.rank
        }}
        digivolvesFrom={d.digivolutions?.digivolvesFrom || []}
        digivolvesTo={d.digivolutions?.digivolvesTo || []}
      />

      {/* Visual Evolution Editor - Only for Owner/Admin/Editor */}
      <VisualEvolutionEditor
        digimonId={d.id}
        digimonName={d.name}
        digimonSlug={d.slug}
        userRole={session?.user?.role}
      />

      {/* Skills - Always show */}
      {d.skills && d.skills.length > 0 ? (
        <SkillsSection skills={d.skills} />
      ) : (
        <Card className="bg-gradient-to-br from-[#1d2021] to-[#282828] border-blue-500/30">
          <CardHeader>
            <CardTitle className="text-xl text-blue-400">Skills & Abilities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-lg">No skills available</p>
              <p className="text-sm mt-2">Skills data has not been imported yet</p>
            </div>
          </CardContent>
        </Card>
      )}
        </div>

        {/* Sticky Infobox Sidebar */}
        <div>
          <div className="sticky top-20">
            <Card className="overflow-hidden bg-gradient-to-br from-[#1d2021] to-[#282828]">
              {/* Title Bar */}
              <div className="bg-gradient-to-r from-orange-600 to-orange-500 px-4 py-3">
                <h2 className="text-xl font-bold text-white">{d.name}</h2>
                {/* Localized Names - Collapsible */}
                {d.names && <LocalizedNames names={d.names} />}
              </div>

              {/* Image */}
              <div className="relative aspect-square bg-gradient-to-br from-[#2a2a2a] to-[#1a1a1a] overflow-hidden">
                {imageUrl ? (
                  <ImageModal imageUrl={imageUrl} alt={d.name} />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <div className="text-6xl">❓</div>
                  </div>
                )}
              </div>

              {/* Info List - 2 Column Grid for better spacing */}
              <div className="p-5 text-sm">
                {/* Grid Layout */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                  
                  {/* ROW 1: Rank, Form, Attribute, Element */}
                  {/* Rank */}
                  <div className="flex flex-col items-center justify-center py-2 border-b border-muted/20 min-h-[100px]">
                    <span className="text-orange-400 font-semibold text-xs mb-2">Rank:</span>
                    <div className="flex items-center justify-center flex-1">
                      {d.rank ? (
                        <Link href={`/digimon?rank=${encodeURIComponent(d.rank)}`} title={`View all ${d.rank} Digimon`}>
                          <Image 
                            src={getRankIconPath(d.rank)} 
                            alt={d.rank} 
                            width={56} 
                            height={56} 
                            style={{ width: 'auto', height: 'auto' }}
                            title={d.rank}
                            className="cursor-pointer hover:scale-110 transition-transform"
                          />
                        </Link>
                      ) : (
                        <span className="text-white text-xs">-</span>
                      )}
                    </div>
                  </div>

                  {/* Form */}
                  <div className="flex flex-col items-center justify-center py-2 border-b border-muted/20 min-h-[100px]">
                    <span className="font-semibold text-orange-400 text-xs mb-2">Form:</span>
                    <div className="flex items-center justify-center flex-1">
                      {d.form ? (
                        <Link href={`/digimon?form=${encodeURIComponent(d.form)}`} title={`View all ${d.form} Digimon`}>
                          <span className="font-semibold text-white text-sm text-center hover:text-orange-300 transition-colors cursor-pointer">{d.form}</span>
                        </Link>
                      ) : (
                        <span className="font-semibold text-white text-sm text-center">-</span>
                      )}
                    </div>
                  </div>

                  {/* Attribute */}
                  <div className="flex flex-col items-center justify-center py-2 border-b border-muted/20 min-h-[100px]">
                    <span className="text-orange-400 font-semibold text-xs mb-2">Attribute:</span>
                    <div className="flex items-center justify-center flex-1">
                      {d.attribute ? (
                        <Link href={`/digimon?attribute=${encodeURIComponent(d.attribute)}`} title={`View all ${d.attribute} Digimon`}>
                          <Image 
                            src={getAttributeIconPath(d.attribute)} 
                            alt={d.attribute} 
                            width={48} 
                            height={48} 
                            style={{ width: 'auto', height: 'auto' }}
                            title={d.attribute}
                            className="cursor-pointer hover:scale-110 transition-transform"
                          />
                        </Link>
                      ) : (
                        <span className="text-white text-xs">-</span>
                      )}
                    </div>
                  </div>

                  {/* Element */}
                  <div className="flex flex-col items-center justify-center py-2 border-b border-muted/20 min-h-[100px]">
                    <span className="text-orange-400 font-semibold text-xs mb-2">Element:</span>
                    <div className="flex items-center justify-center flex-1">
                      {d.element ? (
                        <Link href={`/digimon?element=${encodeURIComponent(d.element)}`} title={`View all ${d.element} Digimon`}>
                          <Image 
                            src={getElementIconPath(d.element)} 
                            alt={d.element} 
                            width={48} 
                            height={48} 
                            style={{ width: 'auto', height: 'auto' }}
                            title={d.element}
                            className="cursor-pointer hover:scale-110 transition-transform"
                          />
                        </Link>
                      ) : (
                        <span className="text-white text-xs">-</span>
                      )}
                    </div>
                  </div>

                  {/* ROW 2: Type, Attacker Type, Family */}
                  {/* Type */}
                  <div className="flex flex-col items-center justify-center py-2 border-b border-muted/20 min-h-[100px]">
                    <span className="font-semibold text-orange-400 text-xs mb-2">Type:</span>
                    <div className="flex items-center justify-center flex-1">
                      <span className="font-semibold text-white text-xs text-center">{d.type || '-'}</span>
                    </div>
                  </div>

                  {/* Attacker Type */}
                  <div className="flex flex-col items-center justify-center py-2 border-b border-muted/20 min-h-[100px]">
                    <span className="text-orange-400 font-semibold text-xs mb-2 whitespace-nowrap">Attacker Type:</span>
                    <div className="flex items-center justify-center flex-1">
                      {d.attackerType ? (
                        <Link href={`/digimon?attackerType=${encodeURIComponent(d.attackerType)}`} title={`View all ${d.attackerType} Digimon`}>
                          <Image 
                            src={getAttackerTypeIconPath(d.attackerType)} 
                            alt={d.attackerType} 
                            width={55} 
                            height={55} 
                            style={{ width: 'auto', height: 'auto' }}
                            title={d.attackerType}
                            className="cursor-pointer hover:scale-110 transition-transform"
                          />
                        </Link>
                      ) : (
                        <span className="text-white text-xs">-</span>
                      )}
                    </div>
                  </div>

                  {/* Family - Span 2 cols */}
                  <div className="flex flex-col items-center justify-center py-3 border-b border-muted/20 col-span-2 min-h-[110px]">
                    <span className="text-orange-400 font-semibold text-xs mb-3">Family:</span>
                    <div className="flex items-center justify-center flex-1 w-full">
                      <div className="flex gap-4 justify-center flex-wrap">
                        {d.families && d.families.length > 0 ? (
                          d.families.map((family: string, idx: number) => (
                            <Link key={idx} href={`/digimon?family=${encodeURIComponent(family)}`} title={`View all ${family} Digimon`}>
                              <Image 
                                src={getFamilyIconPath(family)} 
                                alt={family} 
                                width={52} 
                                height={52}
                                style={{ width: 'auto', height: 'auto' }}
                                className="object-contain cursor-pointer hover:scale-110 transition-transform"
                                title={family}
                              />
                            </Link>
                          ))
                        ) : (
                          <span className="font-semibold text-xs text-white">-</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ROW 3: Level, Requires, Item */}
                  {/* Level needed */}
                  <div className="flex flex-col items-center justify-center py-3 border-b border-muted/20 min-h-[80px]">
                    <span className="font-semibold text-orange-400 text-xs mb-2">Level needed:</span>
                    <span className="font-semibold text-white text-sm">{d.defaultLevel || d.unlockRequirements?.unlockedAtLevel || '-'}</span>
                  </div>

                  {/* Requires */}
                  <div className="flex flex-col items-center justify-center py-3 border-b border-muted/20 min-h-[80px]">
                    <span className="font-semibold text-orange-400 text-xs mb-2">Requires:</span>
                    <span className="font-semibold text-white text-sm text-center">{d.unlockRequirements?.requiredToEvolve || '-'}</span>
                  </div>

                  {/* Item needed - Span 2 cols */}
                  <div className="flex flex-col items-center justify-center py-3 border-b border-muted/20 col-span-2 min-h-[80px]">
                    <span className="font-semibold text-orange-400 text-xs mb-2">Item needed:</span>
                    <div className="flex items-center gap-2 flex-wrap justify-center">
                      {(d.unlockItems?.length > 0 || d.unlockedWithItem || d.unlockRequirements?.unlockedWithItem) ? (
                        (d.unlockItems || [d.unlockedWithItem || d.unlockRequirements?.unlockedWithItem]).filter(Boolean).map((item: string, idx: number) => (
                          <span key={idx} className="font-semibold text-sm text-white">{item}</span>
                        ))
                      ) : (
                        <span className="font-semibold text-sm text-white">-</span>
                      )}
                    </div>
                  </div>


                  {/* ROW 4: Digivolved from, Digivolves to */}
                  {/* Digivolved from - Span 2 cols */}
                  <div className="flex flex-col py-1.5 border-b border-muted/20 col-span-2">
                    <span className="font-semibold text-orange-400 text-xs mb-1">Digivolved from:</span>
                    <div className="flex flex-col gap-0.5">
                      {d.digivolutions?.digivolvesFrom && d.digivolutions.digivolvesFrom.length > 0 ? (
                        d.digivolutions.digivolvesFrom.slice(0, 2).map((prev: any, idx: number) => (
                          <Link key={idx} href={`/digimon/${prev.slug || prev.name?.toLowerCase().replace(/\s+/g, '-')}`}>
                            <span className="font-semibold text-xs text-white hover:text-orange-300">{prev.name}</span>
                          </Link>
                        ))
                      ) : (
                        <span className="font-semibold text-xs text-white">-</span>
                      )}
                    </div>
                  </div>

                  {/* Digivolves to - Span 2 cols */}
                  <div className="flex flex-col py-1.5 border-b border-muted/20 col-span-2">
                    <span className="font-semibold text-orange-400 text-xs mb-1">Digivolves to:</span>
                    <div className="flex flex-col gap-0.5">
                      {d.digivolutions?.digivolvesTo && d.digivolutions.digivolvesTo.length > 0 ? (
                        d.digivolutions.digivolvesTo.slice(0, 2).map((next: any, idx: number) => (
                          <Link key={idx} href={`/digimon/${next.slug || next.name?.toLowerCase().replace(/\s+/g, '-')}`}>
                            <span className="font-semibold text-xs text-white hover:text-orange-300">{next.name}</span>
                          </Link>
                        ))
                      ) : (
                        <span className="font-semibold text-xs text-white">-</span>
                      )}
                    </div>
                  </div>

                  {/* Availability Section - Span 4 cols */}
                  <div className="col-span-4 mt-2 space-y-1.5">
                    {/* Can be ridden */}
                    <div className={`flex items-center justify-between py-2 px-2 rounded ${(d.canBeRidden || d.rideability?.canBeRidden) ? 'bg-lime-400/90' : 'bg-muted/10'}`}>
                      <span className={`font-semibold text-xs ${(d.canBeRidden || d.rideability?.canBeRidden) ? 'text-black' : 'text-orange-400'}`}>Can be ridden:</span>
                      <span className={`font-semibold text-lg ${(d.canBeRidden || d.rideability?.canBeRidden) ? 'text-black' : 'text-white'}`}>
                        {(d.canBeRidden || d.rideability?.canBeRidden) ? '✓' : '✗'}
                      </span>
                    </div>

                    {/* Can be hatched */}
                    <div className={`flex items-center justify-between py-2 px-2 rounded ${(d.canBeHatched || d.availability?.canBeHatched) ? 'bg-lime-400/90' : 'bg-muted/10'}`}>
                      <span className={`font-semibold text-xs ${(d.canBeHatched || d.availability?.canBeHatched) ? 'text-black' : 'text-orange-400'}`}>Can be hatched:</span>
                      <span className={`font-semibold text-lg ${(d.canBeHatched || d.availability?.canBeHatched) ? 'text-black' : 'text-white'}`}>
                        {(d.canBeHatched || d.availability?.canBeHatched) ? '✓' : '✗'}
                      </span>
                    </div>

                    {/* Available */}
                    <div className={`flex items-center justify-between py-2 px-2 rounded ${(d.available || d.availability?.available) ? 'bg-lime-400/90' : 'bg-muted/10'}`}>
                      <span className={`font-semibold text-xs ${(d.available || d.availability?.available) ? 'text-black' : 'text-orange-400'}`}>Available:</span>
                      <span className={`font-semibold text-lg ${(d.available || d.availability?.available) ? 'text-black' : 'text-white'}`}>
                        {(d.available || d.availability?.available) ? '✓' : '✗'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
