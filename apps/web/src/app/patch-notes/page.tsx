import { Metadata } from 'next';
import { fetchCMSCollection } from '@/lib/cms-client';
import type { PatchNoteDoc } from '@/types/payload-responses';
import { PatchNotesTabs } from '@/components/patch-notes/patch-notes-tabs';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Patch Notes — DMO Updates, Maintenance & Changes',
  description:
    'All Digimon Masters Online patch notes, maintenance updates, balance changes and new content. Stay up to date with the latest GDMO, KDMO, NADMO, TWDMO & HKDMO patches.',
  keywords: [
    'DMO patch notes', 'DMO updates', 'Digimon Masters patch notes',
    'DMO maintenance', 'DMO changelog', 'GDMO patch notes', 'KDMO patch notes',
    'DMO new Digimon', 'DMO balance changes',
  ],
  openGraph: {
    title: 'Patch Notes — DMO Knowledge Base',
    description: 'Latest Digimon Masters Online patch notes and game updates.',
  },
};

export default async function PatchNotesPage() {
  const patchNotes = await fetchCMSCollection<PatchNoteDoc>('patchNotes', {
    where: {
      published: { equals: true },
    },
    sort: '-publishedDate',
    limit: 200,
  });

  return <PatchNotesTabs docs={patchNotes.docs} />;
}
