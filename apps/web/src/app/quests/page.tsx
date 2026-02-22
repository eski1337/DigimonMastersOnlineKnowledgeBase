import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

const mockQuests = [
  {
    id: '1',
    slug: 'welcome-to-dmo',
    title: 'Welcome to DMO',
    type: 'Tutorial' as const,
    level: 1,
    rewards: [{ type: 'Item', item: 'Beginner Box', quantity: 1 }],
  },
  {
    id: '2',
    slug: 'first-battle',
    title: 'Your First Battle',
    type: 'Main' as const,
    level: 3,
    rewards: [{ type: 'Experience', item: '500 EXP', quantity: 1 }],
  },
];

export default function QuestsPage() {
  return (
    <div className="container py-8">
      <div className="flex flex-col gap-6 mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Quests</h1>
          <p className="text-muted-foreground">
            Complete quests to progress through the game and earn rewards.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {mockQuests.map(quest => (
          <Link key={quest.id} href={`/quests/${quest.slug}`}>
            <Card className="card-hover">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle>{quest.title}</CardTitle>
                    <CardDescription>Level {quest.level}</CardDescription>
                  </div>
                  <Badge variant="secondary">{quest.type}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  Rewards: {quest.rewards.map(r => r.item).join(', ')}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
