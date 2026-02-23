import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Gem, Swords, Map, Wrench } from 'lucide-react';
import Link from 'next/link';

const guides = [
  {
    id: '1',
    slug: 'true-digivice',
    title: 'True Digivice',
    summary: 'Complete crafting guide for all 11 True Digivice types, materials, locations, and resetting.',
    tags: ['Equipment', 'Crafting', 'Tokyo-Odaiba'],
    icon: Gem,
  },
];

export default function GuidesPage() {
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {guides.map(guide => {
          const Icon = guide.icon;
          return (
            <Link key={guide.id} href={`/guides/${guide.slug}`}>
              <Card className="card-hover h-full">
                <CardHeader>
                  <div className="flex items-start gap-3 mb-2">
                    <Icon className="h-5 w-5 text-primary mt-0.5" />
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
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
