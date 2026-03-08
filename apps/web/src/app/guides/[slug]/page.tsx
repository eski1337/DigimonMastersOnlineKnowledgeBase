import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, BookOpen, Calendar, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { BlockRenderer, extractHeadings } from '@/components/guides/BlockRenderer';

const CMS_URL = process.env.CMS_INTERNAL_URL || process.env.NEXT_PUBLIC_CMS_URL || 'http://localhost:3001';
const CMS_ADMIN_URL = process.env.NEXT_PUBLIC_CMS_URL || 'https://cms.dmokb.info';

interface CMSGuide {
  id: string;
  title: string;
  slug: string;
  summary?: string;
  tags?: { tag: string }[];
  published?: boolean;
  layout?: any[];
  content?: any[];
  coverImage?: { url: string } | null;
  author?: { name: string } | null;
  createdAt: string;
  updatedAt: string;
}

async function getGuide(slug: string): Promise<CMSGuide | null> {
  try {
    const res = await fetch(
      `${CMS_URL}/api/guides?where[slug][equals]=${slug}&where[published][equals]=true&limit=1&depth=1`,
      { next: { revalidate: 60 } },
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.docs?.[0] || null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const guide = await getGuide(params.slug);
  if (!guide) return { title: 'Guide Not Found' };
  return {
    title: `${guide.title} - DMO KB`,
    description: guide.summary || '',
  };
}

export default async function GuidePage({ params }: { params: { slug: string } }) {
  const guide = await getGuide(params.slug);
  if (!guide) notFound();

  const headings = extractHeadings(guide.layout || []);
  const updatedDate = new Date(guide.updatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="container py-8 max-w-5xl">
      <Link href="/guides" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Guides
      </Link>

      {/* Hero header */}
      <div className="relative rounded-xl border border-border bg-gradient-to-br from-primary/5 via-background to-primary/5 p-6 md:p-8 mb-8">
        <div className="flex items-start gap-4">
          <div className="hidden sm:flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <BookOpen className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl md:text-4xl font-bold mb-3 text-foreground">{guide.title}</h1>

            <div className="flex flex-wrap items-center gap-3 mb-3">
              {guide.tags && guide.tags.length > 0 && guide.tags.map(t => (
                <Badge key={t.tag} variant="secondary" className="text-xs">{t.tag}</Badge>
              ))}
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" /> Updated {updatedDate}
              </span>
            </div>

            {guide.summary && (
              <p className="text-muted-foreground leading-relaxed text-sm md:text-base">{guide.summary}</p>
            )}
          </div>
        </div>

        {/* Edit in CMS link */}
        <a
          href={`${CMS_ADMIN_URL}/admin/collections/guides/${guide.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute top-4 right-4 inline-flex items-center gap-1 text-[11px] text-muted-foreground/50 hover:text-primary/70 transition-colors"
        >
          <ExternalLink className="h-3 w-3" /> Edit
        </a>
      </div>

      {/* Table of Contents */}
      {headings.length > 2 && (
        <nav className="rounded-lg border border-border bg-secondary/30 p-4 mb-8">
          <h2 className="text-sm font-semibold text-foreground mb-2">Contents</h2>
          <ul className="space-y-1">
            {headings.map((h, i) => (
              <li key={i} className={h.level === 'h3' ? 'pl-4' : ''}>
                <a href={`#${h.id}`} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  {h.text}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {/* Content */}
      {guide.layout && guide.layout.length > 0 ? (
        <div className="prose-custom">
          <BlockRenderer blocks={guide.layout} />
        </div>
      ) : (
        <div className="text-muted-foreground">
          <p>This guide has no content yet. Add content blocks in the CMS editor.</p>
        </div>
      )}
    </div>
  );
}
