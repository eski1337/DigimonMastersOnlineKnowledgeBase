import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin } from 'lucide-react';
import Link from 'next/link';

const mockMaps = [
  {
    id: '1',
    slug: 'file-city',
    name: 'File City',
    region: 'Server Continent',
    levelRange: '1-10',
    description: 'The starting city for all Tamers.',
  },
  {
    id: '2',
    slug: 'gate-of-the-four-guardians',
    name: 'Gate of the Four Guardians',
    region: 'Server Continent',
    levelRange: '10-20',
    description: 'A gateway protected by four legendary guardians.',
  },
];

export default function MapsPage() {
  return (
    <div className="container py-8">
      <div className="flex flex-col gap-6 mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Maps</h1>
          <p className="text-muted-foreground">
            Explore all locations in the Digital World with detailed information.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockMaps.map(map => (
          <Link key={map.id} href={`/maps/${map.slug}`}>
            <Card className="card-hover h-full">
              <CardHeader>
                <MapPin className="h-10 w-10 text-primary mb-3" />
                <CardTitle>{map.name}</CardTitle>
                <CardDescription>{map.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{map.region}</Badge>
                  <Badge variant="secondary">Level {map.levelRange}</Badge>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
