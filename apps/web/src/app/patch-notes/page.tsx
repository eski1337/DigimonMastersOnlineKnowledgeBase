import { Metadata } from 'next';
import { fetchCMSCollection } from '@/lib/cms-client';
import type { PatchNoteDoc } from '@/types/payload-responses';
import { PatchNotesTabs } from '@/components/patch-notes/patch-notes-tabs';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Patch Notes | DMO Knowledge Base',
  description: 'Official Digimon Masters Online patch notes and game updates',
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
