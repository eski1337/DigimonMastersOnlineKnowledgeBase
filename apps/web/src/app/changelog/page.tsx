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
    date: 'March 2, 2026',
    version: '1.6.0',
    changes: [
      { type: 'added', text: 'CMS admin panel now supports Traditional Chinese (繁體中文) — language selector available in the admin UI.' },
      { type: 'fixed', text: 'Scroll position is now restored when navigating back from a Digimon profile to the Digimon list page.' },
      { type: 'fixed', text: 'CMS i18n locale keys corrected (zhTw → zh) so all collection labels and group names properly display in Chinese.' },
    ],
  },
  {
    date: 'March 1, 2026',
    version: '1.5.0',
    changes: [
      { type: 'added', text: 'Visual Evolution Editor — fully interactive graph editor with drag-and-drop nodes, click-to-connect edges, and one-click save to the database.' },
      { type: 'added', text: 'Edit button on Digivolution Graph (visible to editors/admins) links directly to the CMS editor with the line preselected.' },
      { type: 'added', text: 'Edge popup in the editor for setting evolution type, required level, and required item per connection.' },
      { type: 'added', text: 'Armor evolution type added to the editor dropdown.' },
      { type: 'added', text: 'Bridge visualization on evolution graphs — edges now show clear gaps at crossings so overlapping lines are distinguishable.' },
      { type: 'added', text: 'Smart alignment guides and toggleable gap markers in the evolution editor for precise node placement.' },
      { type: 'added', text: 'Top/bottom handles on editor nodes for vertical connections in complex evolution trees.' },
      { type: 'changed', text: 'Evolution graph on Digimon profiles rewritten to use new evolution-edges + evolution-lines collections with React Flow.' },
      { type: 'changed', text: 'Edge routing upgraded — auto-assigns handles based on relative node positions for clean connections.' },
      { type: 'changed', text: 'Profile evolution nodes use smooth-step routing for angled connections, straight lines for horizontal same-height connections.' },
      { type: 'fixed', text: 'Phantom Digimon no longer appear in the editor — edges pointing outside the current line are filtered out on load.' },
      { type: 'fixed', text: 'Duplicate edges no longer appear after saving and reloading — bidirectional deduplication on connect, load, and save.' },
      { type: 'fixed', text: 'Edge popup in the editor now reliably appears on click (event propagation fix).' },
      { type: 'fixed', text: 'Evolution graph edges now render correctly on Digimon profile pages (ConnectionMode.Loose fix).' },
      { type: 'fixed', text: 'Edge handle positions (top/bottom/left/right) persist correctly across save and reload.' },
    ],
  },
  {
    date: 'February 26, 2026',
    version: '1.4.0',
    changes: [
      { type: 'added', text: 'Reusable CmsImage component — all CMS images now have automatic retry with exponential backoff, shimmer loading placeholders, and smooth fade-in transitions.' },
      { type: 'added', text: 'Lightbox loading spinner and error state with manual retry button.' },
      { type: 'added', text: 'Maps section — DATS Center map with NPC list, wild Digimon, gallery, and clickable map overlay.' },
      { type: 'changed', text: 'Digimon card images now use shared CmsImage component instead of manual retry logic (cleaner, consistent).' },
      { type: 'changed', text: 'Image modal on Digimon detail pages now uses the full lightbox (keyboard navigation, loading states, error handling).' },
      { type: 'changed', text: 'Evolution tree icons upgraded from raw <img> to Next.js Image for proper lazy loading and accessibility.' },
      { type: 'changed', text: 'Map gallery, map overlay, and map listing images all upgraded with retry, shimmer, and error fallback.' },
      { type: 'changed', text: 'Search result thumbnails now gracefully handle broken images instead of showing broken icons.' },
      { type: 'fixed', text: 'CORS bypass vulnerability — strict origin checking prevents malicious domain spoofing on the CMS.' },
      { type: 'fixed', text: 'CMS admin token is now cached (1 hour) instead of logging in on every single API request — major performance improvement.' },
      { type: 'fixed', text: 'Notification ownership check — users can no longer mark other users\' notifications as read.' },
      { type: 'fixed', text: 'Audit logs now use reliable JWT auth instead of cookie forwarding, and admins can access them (not just owners).' },
      { type: 'fixed', text: 'Search pagination actually works now — page/limit params were validated but never applied to results.' },
      { type: 'fixed', text: 'Lightbox close button no longer double-fires due to event bubbling.' },
      { type: 'fixed', text: 'All server-side API routes now use internal CMS URL to avoid unnecessary public network hops.' },
      { type: 'fixed', text: 'Rate limit response header no longer hardcodes the limit value.' },
      { type: 'fixed', text: 'Login cookie now has Secure flag in production.' },
    ],
  },
  {
    date: 'February 25, 2026',
    version: '1.3.0',
    changes: [
      { type: 'added', text: 'Notification system — get notified when someone comments on your profile or sends you a DM.' },
      { type: 'added', text: 'Notification bell in the header with unread count, mark-all-read, and 30-second polling.' },
      { type: 'added', text: 'D-Ark Limited Edition crafting guide with aura previews, tour maps, and full material tables.' },
      { type: 'changed', text: 'True Digivice guide fully rebuilt with 11 aura images, all crafting/reset tables, and material locations.' },
      { type: 'added', text: 'All guide images uploaded to CMS media (65+ images across both guides).' },
      { type: 'fixed', text: 'Profile comments and DMs now work reliably — switched CMS auth from cookies to JWT tokens (Node.js 20 compatibility).' },
      { type: 'fixed', text: 'User profile lookup now supports both username and display name (case-insensitive).' },
      { type: 'fixed', text: 'CMS hooks no longer overwrite real user IDs when the web API proxies requests.' },
    ],
  },
  {
    date: 'February 2026',
    version: '1.2.0',
    changes: [
      { type: 'added', text: 'Guides are now fully editable through the CMS with block-based content (Rich Text, Tables, Callouts, Image Grids).' },
      { type: 'added', text: 'Edit button on Digimon profiles for editors and admins.' },
      { type: 'added', text: 'Login with username or email on both the website and CMS.' },
      { type: 'changed', text: 'Digimon editor reorganized with tabs and sidebar published toggle.' },
      { type: 'added', text: 'About, Contribute, and Changelog pages.' },
      { type: 'fixed', text: 'Footer links now point to actual pages instead of 404s.' },
    ],
  },
  {
    date: 'January 2026',
    version: '1.1.0',
    changes: [
      { type: 'added', text: 'True Digivice crafting guide with full material tables and aura images.' },
      { type: 'added', text: 'Digimon evolution tree visualization.' },
      { type: 'added', text: 'Kanban task board for internal project management.' },
      { type: 'changed', text: 'Redesigned CMS admin dashboard with modern dark theme.' },
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
      { type: 'added', text: 'Payload CMS backend for content management.' },
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
