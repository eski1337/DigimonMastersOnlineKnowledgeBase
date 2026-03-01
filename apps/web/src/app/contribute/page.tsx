import { Card, CardContent } from '@/components/ui/card';
import { PenLine, Bug, BookPlus, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contribute - DMO KB',
  description: 'Learn how you can contribute to DMO KB and help improve the knowledge base.',
};

export default function ContributePage() {
  return (
    <div className="container py-12 max-w-4xl">
      <h1 className="text-4xl font-bold mb-3">Contribute</h1>
      <p className="text-lg text-muted-foreground mb-10 leading-relaxed">
        DMO KB is a community project — we rely on contributions from players like you to keep our
        information accurate and comprehensive. Here are ways you can help:
      </p>

      <div className="space-y-6 mb-12">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <PenLine className="h-6 w-6 text-primary shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-lg mb-2">Edit & Improve Content</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  If you spot outdated or incorrect information, registered editors can update Digimon profiles,
                  guides, and other content directly through our CMS. Create an account and request editor access
                  on our Discord.
                </p>
                <Link href="/auth/signin" className="text-sm text-primary hover:underline">
                  Sign in or create an account →
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <Bug className="h-6 w-6 text-orange-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-lg mb-2">Report Issues</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Found a bug, broken page, or missing data? Let us know through Discord or GitHub Issues
                  so we can fix it quickly.
                </p>
                <a href="https://discord.gg/dmokb" target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                  Report on Discord →
                </a>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <BookPlus className="h-6 w-6 text-green-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-lg mb-2">Write Guides</h3>
                <p className="text-sm text-muted-foreground">
                  Have deep knowledge about a game mechanic, crafting path, or strategy? Write a guide!
                  Guides can be created and managed through our CMS editor. Contact us on Discord to get started.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <MessageSquare className="h-6 w-6 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-lg mb-2">Join the Community</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Join our Discord server to discuss DMO, suggest features, coordinate with other contributors,
                  and stay up to date with the latest changes.
                </p>
                <a href="https://discord.gg/dmokb" target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                  Join Discord →
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
