import { Metadata } from 'next';
import Link from 'next/link';
import { Calendar, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { fetchCMSCollection } from '@/lib/cms-client';
import { stripHTML } from '@/lib/sanitize-html';
import type { PatchNoteDoc } from '@/types/payload-responses';

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
    limit: 50,
  });

  return (
    <div className="container py-8">
      <div className="flex flex-col gap-6 mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Patch Notes</h1>
          <p className="text-muted-foreground">
            Stay up to date with the latest game updates and patch notes
          </p>
        </div>
      </div>

      {patchNotes.docs.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              No patch notes available yet. Check back later!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {patchNotes.docs.map((patch) => (
            <Card key={patch.id} className="hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <Link 
                      href={`/patch-notes/${patch.slug}`}
                      className="hover:underline"
                    >
                      <CardTitle className="text-2xl mb-2">
                        {patch.title}
                      </CardTitle>
                    </Link>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <time dateTime={patch.publishedDate}>
                          {new Date(patch.publishedDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </time>
                      </div>
                      {patch.version && (
                        <Badge variant="secondary">v{patch.version}</Badge>
                      )}
                    </div>
                  </div>
                  {patch.url && (
                    <Link
                      href={patch.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary"
                    >
                      <ExternalLink className="h-5 w-5" />
                    </Link>
                  )}
                </div>
              </CardHeader>
              {patch.content && (
                <CardContent>
                  <CardDescription className="line-clamp-3">
                    {stripHTML(patch.htmlContent || patch.content || '').substring(0, 200)}...
                  </CardDescription>
                  <Link
                    href={`/patch-notes/${patch.slug}`}
                    className="text-primary hover:underline text-sm mt-2 inline-block"
                  >
                    Read more →
                  </Link>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {patchNotes.totalPages > 1 && (
        <div className="mt-8 flex justify-center">
          <p className="text-sm text-muted-foreground">
            Showing {patchNotes.docs.length} of {patchNotes.totalDocs} patch notes
          </p>
        </div>
      )}
    </div>
  );
}
