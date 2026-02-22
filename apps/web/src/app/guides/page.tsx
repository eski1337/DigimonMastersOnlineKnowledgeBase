import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Clock } from 'lucide-react';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';

const mockGuides = [
  {
    id: '1',
    slug: 'beginner-guide',
    title: 'Complete Beginner Guide to DMO',
    summary: 'Everything you need to know to start your journey in Digimon Masters Online.',
    tags: ['Beginner', 'Tutorial'],
    createdAt: new Date(),
  },
  {
    id: '2',
    slug: 'digivolution-guide',
    title: 'Understanding Digivolution',
    summary: 'Learn how evolution works and how to get the strongest Digimon.',
    tags: ['Digivolution', 'Advanced'],
    createdAt: new Date(),
  },
];

export default function GuidesPage() {
  return (
    <div className="container py-8">
      <div className="flex flex-col gap-6 mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Guides</h1>
          <p className="text-muted-foreground">
            Learn from the community with comprehensive guides and tutorials.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {mockGuides.map(guide => (
          <Link key={guide.id} href={`/guides/${guide.slug}`}>
            <Card className="card-hover h-full">
              <CardHeader>
                <div className="flex items-start gap-3 mb-2">
                  <BookOpen className="h-5 w-5 text-primary mt-0.5" />
                  <div className="flex-1">
                    <CardTitle className="mb-2">{guide.title}</CardTitle>
                    <CardDescription>{guide.summary}</CardDescription>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {guide.tags.map(tag => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Clock className="mr-1 h-4 w-4" />
                  {formatDate(guide.createdAt)}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
