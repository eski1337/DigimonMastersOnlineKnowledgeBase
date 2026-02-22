import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calculator, Timer, TrendingUp, Dices } from 'lucide-react';
import Link from 'next/link';

const tools = [
  {
    id: '1',
    slug: 'clone-calculator',
    title: 'Perfect Clone Calculator',
    description: 'Calculate the perfect clone stats for your Digimon.',
    icon: Calculator,
    type: 'calculator' as const,
  },
  {
    id: '2',
    slug: 'raid-timer',
    title: 'Raid Timer',
    description: 'Track raid spawn times and set notifications.',
    icon: Timer,
    type: 'utility' as const,
  },
  {
    id: '3',
    slug: 'progress-tracker',
    title: 'Progress Tracker',
    description: 'Keep track of your collection and achievements.',
    icon: TrendingUp,
    type: 'tracker' as const,
  },
  {
    id: '4',
    slug: 'gacha-simulator',
    title: 'Gacha Simulator',
    description: 'Simulate gacha pulls and calculate probabilities.',
    icon: Dices,
    type: 'simulator' as const,
  },
];

export default function ToolsPage() {
  return (
    <div className="container py-8">
      <div className="flex flex-col gap-6 mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Tools & Trackers</h1>
          <p className="text-muted-foreground">
            Helpful tools and calculators to enhance your DMO experience.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tools.map(tool => {
          const Icon = tool.icon;
          return (
            <Link key={tool.id} href={`/tools/${tool.slug}`}>
              <Card className="card-hover h-full">
                <CardHeader>
                  <Icon className="h-10 w-10 text-primary mb-3" />
                  <CardTitle>{tool.title}</CardTitle>
                  <CardDescription>{tool.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
