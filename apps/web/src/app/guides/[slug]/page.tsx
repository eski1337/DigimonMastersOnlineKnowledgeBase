import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { BlockRenderer } from '@/components/guides/BlockRenderer';

const CMS_URL = process.env.CMS_INTERNAL_URL || process.env.NEXT_PUBLIC_CMS_URL || 'http://localhost:3001';

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

  return (
    <div className="container py-8 max-w-5xl">
      <Link href="/guides" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Guides
      </Link>

      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-3">{guide.title}</h1>

        {guide.tags && guide.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {guide.tags.map(t => (
              <Badge key={t.tag} variant="secondary">{t.tag}</Badge>
            ))}
          </div>
        )}

        {guide.summary && (
          <p className="text-muted-foreground leading-relaxed">{guide.summary}</p>
        )}
      </div>

      {/* Render layout blocks if available */}
      {guide.layout && guide.layout.length > 0 ? (
        <BlockRenderer blocks={guide.layout} />
      ) : (
        <div className="text-muted-foreground">
          <p>This guide has no content yet. Add content blocks in the CMS editor.</p>
        </div>
      )}
    </div>
  );
}
