import type { Metadata } from 'next';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Cog } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Game Systems — DMO Mechanics & Systems Explained',
  description:
    'Detailed explanations of all Digimon Masters Online game systems. Size system, attribute advantage, OCS, sealing, hatching, evolution mechanics and more for GDMO, KDMO & all servers.',
  keywords: [
    'DMO systems', 'DMO game mechanics', 'Digimon Masters systems',
    'DMO size system', 'DMO OCS', 'DMO sealing', 'DMO hatching',
    'DMO attribute system', 'GDMO systems', 'DMO evolution system',
  ],
  openGraph: {
    title: 'Game Systems — DMO Knowledge Base',
    description: 'All DMO game mechanics and systems explained in detail.',
  },
};

const CMS_URL = process.env.CMS_INTERNAL_URL || process.env.NEXT_PUBLIC_CMS_URL || 'http://localhost:3001';

interface CMSSystem {
  id: string;
  title: string;
  slug: string;
  summary?: string;
  tags?: { tag: string }[];
  published?: boolean;
  coverImage?: { url: string } | null;
}

async function getSystems(): Promise<CMSSystem[]> {
  try {
    const res = await fetch(
      `${CMS_URL}/api/systems?where[published][equals]=true&sort=title&limit=100&depth=1`,
      { next: { revalidate: 60 } },
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.docs || [];
  } catch {
    return [];
  }
}

export default async function SystemsPage() {
  const systems = await getSystems();

  return (
    <div className="container py-8">
      <div className="flex flex-col gap-6 mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Systems</h1>
          <p className="text-muted-foreground">
            Game systems, mechanics, and features in Digimon Masters Online.
          </p>
        </div>
      </div>

      {systems.length === 0 && (
        <p className="text-muted-foreground">No systems published yet.</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {systems.map(system => (
          <Link key={system.id} href={`/systems/${system.slug}`}>
            <Card className="card-hover h-full">
              <CardHeader>
                <div className="flex items-start gap-3 mb-2">
                  <Cog className="h-5 w-5 text-primary mt-0.5" />
                  <div className="flex-1">
                    <CardTitle className="mb-2">{system.title}</CardTitle>
                    {system.summary && (
                      <CardDescription>{system.summary}</CardDescription>
                    )}
                  </div>
                </div>
                {system.tags && system.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {system.tags.map(t => (
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
