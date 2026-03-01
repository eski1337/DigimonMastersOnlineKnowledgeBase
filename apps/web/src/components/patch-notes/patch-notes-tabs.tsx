'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Calendar, ExternalLink, Clock, History } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { stripHTML } from '@/lib/sanitize-html';
import type { PatchNoteDoc } from '@/types/payload-responses';

interface PatchNotesTabsProps {
  docs: PatchNoteDoc[];
}

function PatchNoteCard({ patch }: { patch: PatchNoteDoc }) {
  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <Link href={`/patch-notes/${patch.slug}`} className="hover:underline">
              <CardTitle className="text-2xl mb-2">{patch.title}</CardTitle>
            </Link>
            <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
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
              {patch.eventStatus === 'in_progress' && (
                <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                  In Progress
                </Badge>
              )}
              {patch.eventStatus === 'finished' && (
                <Badge variant="secondary">Finished</Badge>
              )}
              {patch.sourceType === 'patchnote' && (
                <Badge variant="outline">Patch Note</Badge>
              )}
              {patch.sourceType === 'event' && !patch.eventStatus && (
                <Badge variant="outline">Event</Badge>
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
  );
}

export function PatchNotesTabs({ docs }: PatchNotesTabsProps) {
  const { current, history } = useMemo(() => {
    const current: PatchNoteDoc[] = [];
    const history: PatchNoteDoc[] = [];

    for (const doc of docs) {
      if (doc.eventStatus === 'in_progress') {
        current.push(doc);
      } else {
        history.push(doc);
      }
    }

    return { current, history };
  }, [docs]);

  const defaultTab = current.length > 0 ? 'current' : 'history';

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

      <Tabs defaultValue={defaultTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="current" className="gap-2">
            <Clock className="h-4 w-4" />
            In Progress
            {current.length > 0 && (
              <Badge variant="default" className="ml-1 bg-green-600 text-xs px-1.5 py-0">
                {current.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            History
            <span className="text-xs text-muted-foreground ml-1">({history.length})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="current">
          {current.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  No active events or patch notes right now.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6">
              {current.map((patch) => (
                <PatchNoteCard key={patch.id} patch={patch} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history">
          {history.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  No past patch notes available yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6">
              {history.map((patch) => (
                <PatchNoteCard key={patch.id} patch={patch} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
