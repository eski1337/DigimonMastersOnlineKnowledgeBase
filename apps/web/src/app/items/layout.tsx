import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Item Database — All DMO Items, Materials & Equipment',
  description:
    'Complete item database for Digimon Masters Online. Evolution items, consumables, equipment, materials, eggs, costumes, tokens and more. Browse, search and filter all items in GDMO, KDMO & all servers.',
  keywords: [
    'DMO items', 'DMO item database', 'Digimon Masters items',
    'DMO evolution items', 'DMO equipment', 'DMO materials',
    'DMO consumables', 'DMO eggs', 'DMO costumes',
    'GDMO items', 'KDMO items',
  ],
  openGraph: {
    title: 'Item Database — DMO Knowledge Base',
    description: 'Complete item database for Digimon Masters Online.',
  },
};

export default function ItemsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
