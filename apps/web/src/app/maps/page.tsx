import type { Metadata } from 'next';
import { MapsExplorer } from '@/components/maps/maps-explorer';

export const metadata: Metadata = {
  title: 'Maps & Areas — DMO World Map, Dungeons & Locations',
  description:
    'Interactive map database for Digimon Masters Online. All Real World and Digital World locations, dungeons, raid maps, wild Digimon spawns, NPCs and item drops for GDMO, KDMO & all servers.',
  keywords: [
    'DMO maps', 'DMO map database', 'Digimon Masters maps',
    'DMO dungeons', 'DMO raid maps', 'DMO locations',
    'DMO wild Digimon', 'DMO spawns', 'GDMO maps', 'KDMO maps',
    'DMO Digital World', 'DMO Real World',
  ],
  openGraph: {
    title: 'Maps & Areas — DMO Knowledge Base',
    description: 'All DMO maps, dungeons, and locations with wild Digimon spawns and NPC info.',
  },
};

const CMS_URL = process.env.CMS_INTERNAL_URL || process.env.NEXT_PUBLIC_CMS_URL || 'http://localhost:3001';

interface CMSMap {
  id: string;
  name: string;
  slug: string;
  world?: string;
  area?: string;
  mapType?: string;
  levelRange?: string;
  description?: string;
  sortOrder?: number;
  hexCol?: number | null;
  hexRow?: number | null;
  image?: { url: string } | null;
  published?: boolean;
}

async function getMaps(): Promise<CMSMap[]> {
  try {
    const res = await fetch(
      `${CMS_URL}/api/maps?where[published][equals]=true&sort=sortOrder&limit=200&depth=1`,
      { next: { revalidate: 60 } },
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.docs || [];
  } catch {
    return [];
  }
}

export default async function MapsPage() {
  const maps = await getMaps();
  return <MapsExplorer maps={maps} />;
}
