import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen } from 'lucide-react';
import Link from 'next/link';

const CMS_URL = process.env.CMS_INTERNAL_URL || process.env.NEXT_PUBLIC_CMS_URL || 'http://localhost:3001';

interface CMSGuide {
  id: string;
  title: string;
  slug: string;
  summary?: string;
  tags?: { tag: string }[];
  published?: boolean;
  coverImage?: { url: string } | null;
}

async function getGuides(): Promise<CMSGuide[]> {
  try {
    const res = await fetch(
      `${CMS_URL}/api/guides?where[published][equals]=true&sort=title&limit=100&depth=1`,
      { next: { revalidate: 60 } },
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.docs || [];
  } catch {
    return [];
  }
}

export default async function GuidesPage() {
  const guides = await getGuides();

  return (
    <div className="container py-8">
      <div className="flex flex-col gap-6 mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Guides</h1>
          <p className="text-muted-foreground">
            Comprehensive guides and walkthroughs for Digimon Masters Online.
          </p>
        </div>
      </div>

      {guides.length === 0 && (
        <p className="text-muted-foreground">No guides published yet.</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {guides.map(guide => (
          <Link key={guide.id} href={`/guides/${guide.slug}`}>
            <Card className="card-hover h-full">
              <CardHeader>
                <div className="flex items-start gap-3 mb-2">
                  <BookOpen className="h-5 w-5 text-primary mt-0.5" />
                  <div className="flex-1">
                    <CardTitle className="mb-2">{guide.title}</CardTitle>
                    {guide.summary && (
                      <CardDescription>{guide.summary}</CardDescription>
                    )}
                  </div>
                </div>
                {guide.tags && guide.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {guide.tags.map(t => (
                      <Badge key={t.tag} variant="secondary">
                        {t.tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
