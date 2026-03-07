import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Digimon Database — All Digimon Stats, Forms & Evolutions',
  description:
    'Browse all Digimon in Digimon Masters Online. Filter by element, attribute, rank, form and family. Full stats, digivolution chains and artwork for every Digimon in GDMO, KDMO, NADMO, TWDMO, HKDMO & THDMO.',
  keywords: [
    'DMO Digimon list', 'DMO Digimon database', 'Digimon Masters Digimon',
    'DMO stats', 'DMO tier list', 'GDMO Digimon', 'KDMO Digimon',
    'DMO Rookie', 'DMO Mega', 'DMO Burst Mode', 'DMO Jogress',
    'Digimon Masters evolution', 'DMO digivolution chart',
  ],
  openGraph: {
    title: 'Digimon Database — DMO Knowledge Base',
    description: 'Complete Digimon database for Digimon Masters Online. Stats, evolutions, artwork & more.',
  },
};

export default function DigimonLayout({ children }: { children: React.ReactNode }) {
  return children;
}
