'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { CmsImage } from '@/components/ui/cms-image';
import type { Digimon } from '@dmo-kb/shared';
import { getElementIconPath, getAttributeIconPath, getRankIconPath } from '@/lib/icon-paths';
import styles from './digimon-card.module.css';

interface DigimonCardProps {
  digimon: Digimon;
  priority?: boolean;
}

export function DigimonCard({ digimon, priority = false }: DigimonCardProps) {
  // Cast to any because our actual schema differs from the shared type
  const d = digimon as any;
  
  const getElementColor = (element: string) => {
    const colors: Record<string, string> = {
      Fire: 'bg-red-500/20 text-red-400 border-red-500/50',
      Water: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
      Ice: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50',
      Wind: 'bg-green-500/20 text-green-400 border-green-500/50',
      Thunder: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
      Light: 'bg-orange-500/20 text-orange-400 border-orange-500/50',
      'Pitch Black': 'bg-purple-500/20 text-purple-400 border-purple-500/50',
      Land: 'bg-amber-500/20 text-amber-400 border-amber-500/50',
      Wood: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50',
      Steel: 'bg-slate-500/20 text-slate-400 border-slate-500/50',
    };
    return colors[element] || 'bg-gray-500/20 text-gray-400 border-gray-500/50';
  };

  const getAttributeColor = (attribute: string) => {
    const colors: Record<string, string> = {
      Data: 'bg-blue-500/20 text-blue-400 border-blue-500',
      Vaccine: 'bg-green-500/20 text-green-400 border-green-500',
      Virus: 'bg-red-500/20 text-red-400 border-red-500',
      Unknown: 'bg-black/40 text-gray-300 border-black',
      None: 'bg-yellow-500/20 text-yellow-400 border-yellow-500',
    };
    return colors[attribute] || 'bg-gray-500/20 text-gray-400 border-gray-500/50';
  };

  // Get image URL - use original main image URL.
  // NOTE: Payload "sizes.card" can be square-cropped depending on collection config,
  // which causes visibly cut-off Digimon in the grid.
  let imageUrl: string | undefined;
  if (typeof d.mainImage === 'object' && d.mainImage) {
    imageUrl = d.mainImage.url;
  } else if (typeof d.mainImage === 'string' && d.mainImage.startsWith('http')) {
    imageUrl = d.mainImage;
  }
  // Fallback to icon
  if (!imageUrl) {
    imageUrl = typeof d.icon === 'object' && d.icon ? d.icon.url : undefined;
  }
  
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

  const imageWidth =
    typeof d.mainImage === 'object' && d.mainImage?.width ? d.mainImage.width : 1024;
  const imageHeight =
    typeof d.mainImage === 'object' && d.mainImage?.height ? d.mainImage.height : 1024;

  return (
    <Link href={`/digimon/${d.slug}`} prefetch={false}>
      <Card className="overflow-hidden group h-full flex flex-col transition-shadow duration-200 hover:shadow-lg">
        <CardHeader className="p-0">
          <div className={styles.mediaStage}>
            {imageUrl ? (
              <div className={styles.mediaInner}>
                <CmsImage
                  src={imageUrl}
                  alt={d.name}
                  width={imageWidth}
                  height={imageHeight}
                  className={styles.digimonImage}
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 250px"
                  loading={priority ? 'eager' : 'lazy'}
                  priority={priority}
                  quality={75}
                  showLoadingShimmer={false}
                  fallbackText="No Image"
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <div className="text-6xl mb-2">❓</div>
                  <div className="text-sm">No Image</div>
                </div>
              </div>
            )}
            {d.rank && (
              <div className="absolute top-2 right-2 z-10">
                <Image 
                  src={getRankIconPath(d.rank)} 
                  alt={d.rank}
                  width={36}
                  height={36}
                  className="inline-block drop-shadow-lg"
                  unoptimized
                />
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4 flex-1 flex flex-col">
          <div className="mb-3">
            <h3 className="font-bold text-lg line-clamp-1">{d.name}</h3>
            <div className="flex items-center gap-2">
              {d.form && (
                <span className="text-sm text-muted-foreground">{d.form}</span>
              )}
              {d.type && (
                <span className="text-xs text-muted-foreground/70">• {d.type}</span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-auto">
            {d.element && (
              <Badge 
                variant="outline" 
                className={`${getElementColor(d.element)} flex items-center gap-1.5`}
                title={d.element}
              >
                <Image 
                  src={getElementIconPath(d.element)} 
                  alt={d.element}
                  width={20}
                  height={20}
                  className="inline-block"
                  unoptimized
                />
                <span className="text-xs">{d.element}</span>
              </Badge>
            )}
            {d.attribute && (
              <Badge 
                variant="outline" 
                className={`${getAttributeColor(d.attribute)} flex items-center gap-1.5`}
                title={d.attribute}
              >
                <Image 
                  src={getAttributeIconPath(d.attribute)} 
                  alt={d.attribute}
                  width={20}
                  height={20}
                  className="inline-block"
                  unoptimized
                />
                <span className="text-xs">{d.attribute}</span>
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
