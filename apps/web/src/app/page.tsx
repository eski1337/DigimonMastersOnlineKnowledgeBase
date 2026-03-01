import Link from 'next/link';
import { ArrowRight, Database, Map, BookOpen, Wrench, Shield, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { fetchCMSCollection } from '@/lib/cms-client';
import { stripHTML } from '@/lib/sanitize-html';
import type { PatchNoteDoc } from '@/types/payload-responses';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  // Fetch latest 3 patch notes for the homepage
  let latestPatchNotes: PatchNoteDoc[] = [];
  try {
    const result = await fetchCMSCollection<PatchNoteDoc>('patchNotes', {
      where: { published: { equals: true } },
      sort: '-publishedDate',
      limit: 3,
    });
    latestPatchNotes = result.docs;
  } catch {
    // Silently fail — homepage still renders with fallback
  }
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden space-y-6 pb-8 pt-6 md:pb-12 md:pt-10 lg:py-32">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="container relative flex max-w-[64rem] flex-col items-center gap-4 text-center">
          <Badge variant="secondary" className="text-sm">
            Community-Driven Knowledge Base
          </Badge>
          <h1 className="text-3xl font-bold sm:text-5xl md:text-6xl lg:text-7xl">
            Master the Digital World
          </h1>
          <p className="max-w-[42rem] leading-normal text-muted-foreground sm:text-xl sm:leading-8">
            Your comprehensive guide to Digimon Masters Online. Discover Digimon stats, complete
            quests, explore maps, and use powerful tools to enhance your gameplay.
          </p>
          <div className="flex gap-4">
            <Button asChild size="lg">
              <Link href="/digimon">
                Browse Digimon
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/guides">Read Guides</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container space-y-6 py-8 md:py-12 lg:py-24">
        <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center">
          <h2 className="text-3xl font-bold leading-[1.1] sm:text-3xl md:text-6xl">Features</h2>
          <p className="max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7">
            Everything you need to become a Digimon Master
          </p>
        </div>
        <div className="mx-auto grid justify-center gap-4 sm:grid-cols-2 md:max-w-[64rem] md:grid-cols-3">
          <Card>
            <CardHeader>
              <Database className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Digimon Database</CardTitle>
              <CardDescription>
                Browse hundreds of Digimon with detailed stats, evolution paths, and skills.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <Map className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Interactive Maps</CardTitle>
              <CardDescription>
                Explore every corner of the Digital World with detailed map information.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <BookOpen className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Quest Guides</CardTitle>
              <CardDescription>
                Complete every quest with step-by-step guides and reward information.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <Wrench className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Tools & Calculators</CardTitle>
              <CardDescription>
                Use powerful tools like clone calculators, gacha simulators, and more.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <Shield className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Community Driven</CardTitle>
              <CardDescription>
                Built by players, for players. Contribute and help others learn.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <ArrowRight className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Always Updated</CardTitle>
              <CardDescription>
                Stay current with automatic patch notes and event tracking.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Latest Updates Section */}
      <section className="container space-y-6 py-8 md:py-12 lg:py-24 bg-muted/50">
        <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center">
          <h2 className="text-3xl font-bold leading-[1.1] sm:text-3xl md:text-5xl">
            Latest Updates
          </h2>
          <p className="max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7">
            Stay informed with the latest patch notes and events
          </p>
        </div>
        <div className="mx-auto grid gap-4 md:max-w-[64rem] md:grid-cols-2">
          <div className="space-y-4">
            <Badge variant="secondary" className="text-sm">Patch Notes</Badge>
            {latestPatchNotes.length > 0 ? (
              latestPatchNotes.map((patch) => (
                <Card key={patch.id}>
                  <CardHeader className="pb-2">
                    <Link href={`/patch-notes/${patch.slug}`} className="hover:underline">
                      <CardTitle className="text-lg">{patch.title}</CardTitle>
                    </Link>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <time dateTime={patch.publishedDate}>
                        {new Date(patch.publishedDate).toLocaleDateString('en-US', {
                          year: 'numeric', month: 'short', day: 'numeric',
                        })}
                      </time>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <CardDescription className="line-clamp-2 text-xs">
                      {stripHTML(patch.htmlContent || patch.content || '').substring(0, 120)}...
                    </CardDescription>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Coming Soon</CardTitle>
                  <CardDescription>
                    Latest patch notes will be automatically imported and displayed here.
                  </CardDescription>
                </CardHeader>
              </Card>
            )}
            <Button asChild variant="outline" size="sm">
              <Link href="/patch-notes">View All Patch Notes</Link>
            </Button>
          </div>
          <Card>
            <CardHeader>
              <Badge variant="secondary" className="w-fit mb-2">
                Events
              </Badge>
              <CardTitle>Coming Soon</CardTitle>
              <CardDescription>
                Active and upcoming events will be displayed here automatically.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" size="sm">
                <Link href="/events">View All Events</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container py-8 md:py-12 lg:py-24">
        <div className="mx-auto flex max-w-[58rem] flex-col items-center justify-center gap-4 text-center">
          <h2 className="text-3xl font-bold leading-[1.1] sm:text-3xl md:text-5xl">
            Ready to Start?
          </h2>
          <p className="max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7">
            Join our community and start exploring the Digital World today.
          </p>
          <Button asChild size="lg">
            <Link href="/digimon">
              Explore Digimon Database
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
