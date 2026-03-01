import { Card, CardContent } from '@/components/ui/card';
import { Heart, Users, BookOpen, Shield } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About - DMO KB',
  description: 'Learn about DMO KB, a community-driven knowledge base for Digimon Masters Online.',
};

export default function AboutPage() {
  return (
    <div className="container py-12 max-w-4xl">
      <h1 className="text-4xl font-bold mb-3">About DMO KB</h1>
      <p className="text-lg text-muted-foreground mb-10 leading-relaxed">
        DMO KB is a comprehensive, community-driven knowledge base for{' '}
        <strong className="text-foreground">Digimon Masters Online</strong>. Our goal is to provide accurate,
        up-to-date information about every aspect of the game — from Digimon stats and evolution lines
        to crafting guides and quest walkthroughs.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <Heart className="h-6 w-6 text-primary shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold mb-1">Made by Fans</h3>
                <p className="text-sm text-muted-foreground">
                  Built and maintained by passionate DMO players who want to share their knowledge with the community.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <Users className="h-6 w-6 text-primary shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold mb-1">Community-Driven</h3>
                <p className="text-sm text-muted-foreground">
                  Anyone can contribute. Editors and community members help keep information accurate and current.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <BookOpen className="h-6 w-6 text-primary shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold mb-1">Comprehensive Data</h3>
                <p className="text-sm text-muted-foreground">
                  Detailed Digimon profiles, evolution trees, skill data, item databases, crafting guides, and more.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <Shield className="h-6 w-6 text-primary shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold mb-1">Always Free</h3>
                <p className="text-sm text-muted-foreground">
                  DMO KB is and will always be free to use. No paywalls, no premium tiers — just open information.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <h2 className="text-2xl font-bold mb-4">Disclaimer</h2>
      <p className="text-sm text-muted-foreground leading-relaxed">
        DMO KB is an unofficial fan project and is not affiliated with, endorsed by, or connected to
        Bandai Namco, MOVE Games, or any official Digimon Masters Online entity. All game assets, names,
        and related content are property of their respective owners. This project exists solely as a
        community resource for players.
      </p>
    </div>
  );
}
