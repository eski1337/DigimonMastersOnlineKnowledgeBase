import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Calendar, ExternalLink, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { fetchCMSBySlug } from '@/lib/cms-client';
import { sanitizeHTML } from '@/lib/sanitize-html';
import type { PatchNoteDoc } from '@/types/payload-responses';

export const dynamic = 'force-dynamic';

interface PatchNotePageProps {
  params: {
    slug: string;
  };
}

export async function generateMetadata({ params }: PatchNotePageProps): Promise<Metadata> {
  const patchNote = await fetchCMSBySlug<PatchNoteDoc>('patchNotes', params.slug);

  if (!patchNote) {
    return {
      title: 'Patch Note Not Found',
    };
  }

  return {
    title: `${patchNote.title} | DMO Knowledge Base`,
    description: patchNote.content.substring(0, 160),
  };
}

export default async function PatchNotePage({ params }: PatchNotePageProps) {
  const patchNote = await fetchCMSBySlug<PatchNoteDoc>('patchNotes', params.slug);

  if (!patchNote) {
    notFound();
  }

  return (
    <div className="container py-8 max-w-4xl">
      <div className="mb-6">
        <Link href="/patch-notes">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Patch Notes
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1">
              <CardTitle className="text-3xl mb-4">
                {patchNote.title}
              </CardTitle>
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <time dateTime={patchNote.publishedDate}>
                    {new Date(patchNote.publishedDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </time>
                </div>
                {patchNote.version && (
                  <Badge variant="secondary">Version {patchNote.version}</Badge>
                )}
              </div>
            </div>
            {patchNote.url && (
              <Link
                href={patchNote.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="sm">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Official Source
                </Button>
              </Link>
            )}
          </div>
        </CardHeader>

        <CardContent>
          <div 
            className="prose prose-gray dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ 
              __html: sanitizeHTML(patchNote.htmlContent || patchNote.content || '') 
            }}
          />
        </CardContent>
      </Card>

      <div className="mt-6 text-center">
        <Link href="/patch-notes">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            View All Patch Notes
          </Button>
        </Link>
      </div>
    </div>
  );
}
