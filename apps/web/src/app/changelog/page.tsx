import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Changelog - DMO KB',
  description: 'See what has changed and been added to DMO KB.',
};

interface ChangelogEntry {
  date: string;
  version: string;
  changes: { type: 'added' | 'changed' | 'fixed'; text: string }[];
}

const changelog: ChangelogEntry[] = [
  {
    date: 'March 3, 2026',
    version: '1.7.0',
    changes: [
      { type: 'added', text: 'Items section — browse all in-game items with detailed profile pages showing effects, obtaining methods, crafting recipes, and related Digimon.' },
      { type: 'added', text: 'Items tab added to the navigation bar (desktop & mobile).' },
      { type: 'added', text: 'Monster Card System guide — comprehensive page covering all card tiers (Regular Lv1–7, High Rank Lv1–6, Highest Lv1–3), summoned Digimon, drops, EXP values, and tips.' },
      { type: 'added', text: 'Language preference now persists across sessions and devices — your chosen language is saved to your account.' },
      { type: 'fixed', text: 'Traditional Chinese (Hong Kong) browser locale now correctly maps to Traditional Chinese instead of falling back to English.' },
      { type: 'fixed', text: 'Scroll position restored when navigating back from a Digimon profile to the list page.' },
    ],
  },
  {
    date: 'March 1, 2026',
    version: '1.5.0',
    changes: [
      { type: 'added', text: 'Digivolution graph — interactive evolution tree on every Digimon profile page showing all evolution paths.' },
      { type: 'added', text: 'Bridge visualization on evolution graphs — edges now show clear gaps at crossings so overlapping lines are distinguishable.' },
      { type: 'changed', text: 'Evolution graph uses smooth-step routing for cleaner connections between nodes.' },
      { type: 'fixed', text: 'Evolution graph edges now render correctly on all Digimon profile pages.' },
    ],
  },
  {
    date: 'February 26, 2026',
    version: '1.4.0',
    changes: [
      { type: 'added', text: 'Maps section — DATS Center map with NPC list, wild Digimon, gallery, and clickable map overlay.' },
      { type: 'added', text: 'Image lightbox with keyboard navigation, loading states, and error handling.' },
      { type: 'changed', text: 'All images now have loading placeholders and smooth fade-in transitions.' },
      { type: 'changed', text: 'Search result thumbnails now gracefully handle broken images instead of showing broken icons.' },
      { type: 'fixed', text: 'Search pagination now works correctly.' },
      { type: 'fixed', text: 'Notification ownership check — users can no longer mark other users\' notifications as read.' },
      { type: 'fixed', text: 'Significant performance improvements across the site.' },
    ],
  },
  {
    date: 'February 25, 2026',
    version: '1.3.0',
    changes: [
      { type: 'added', text: 'Notification system — get notified when someone comments on your profile or sends you a DM.' },
      { type: 'added', text: 'Notification bell in the header with unread count and mark-all-read.' },
      { type: 'added', text: 'D-Ark Limited Edition crafting guide with aura previews, tour maps, and full material tables.' },
      { type: 'changed', text: 'True Digivice guide fully rebuilt with 11 aura images, all crafting/reset tables, and material locations.' },
      { type: 'fixed', text: 'Profile comments and DMs now work reliably.' },
      { type: 'fixed', text: 'User profile lookup now supports both username and display name (case-insensitive).' },
    ],
  },
  {
    date: 'February 2026',
    version: '1.2.0',
    changes: [
      { type: 'added', text: 'Guides section with rich content — tables, callouts, image grids, and more.' },
      { type: 'added', text: 'Edit button on Digimon profiles for editors and admins.' },
      { type: 'added', text: 'Login with username or email.' },
      { type: 'added', text: 'About, Contribute, and Changelog pages.' },
      { type: 'fixed', text: 'Footer links now point to actual pages.' },
    ],
  },
  {
    date: 'January 2026',
    version: '1.1.0',
    changes: [
      { type: 'added', text: 'True Digivice crafting guide with full material tables and aura images.' },
      { type: 'added', text: 'Digimon evolution tree visualization on profile pages.' },
    ],
  },
  {
    date: 'December 2025',
    version: '1.0.0',
    changes: [
      { type: 'added', text: 'Initial launch of DMO KB.' },
      { type: 'added', text: 'Digimon database with profiles, stats, and skill data.' },
      { type: 'added', text: 'Quest database and guide system.' },
      { type: 'added', text: 'User authentication with Discord and credentials.' },
    ],
  },
];

const typeBadge: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  added: { label: 'Added', variant: 'default' },
  changed: { label: 'Changed', variant: 'secondary' },
  fixed: { label: 'Fixed', variant: 'outline' },
};

export default function ChangelogPage() {
  return (
    <div className="container py-12 max-w-3xl">
      <h1 className="text-4xl font-bold mb-3">Changelog</h1>
      <p className="text-muted-foreground mb-10">
        A log of notable changes, new features, and fixes to DMO KB.
      </p>

      <div className="space-y-8">
        {changelog.map((entry) => (
          <Card key={entry.version}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-xl font-bold">v{entry.version}</h2>
                <span className="text-sm text-muted-foreground">{entry.date}</span>
              </div>
              <ul className="space-y-2.5">
                {entry.changes.map((change, i) => {
                  const badge = typeBadge[change.type];
                  return (
                    <li key={i} className="flex items-start gap-2.5 text-sm">
                      <Badge variant={badge.variant} className="text-xs shrink-0 mt-0.5">{badge.label}</Badge>
                      <span className="text-muted-foreground">{change.text}</span>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
