import { MetadataRoute } from 'next';
import { fetchCMSCollection } from '@/lib/cms-client';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${BASE_URL}/digimon`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/patch-notes`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${BASE_URL}/guides`, changeFrequency: 'weekly', priority: 0.7 },
  ];

  // Fetch all published digimon slugs
  try {
    const digimon = await fetchCMSCollection<{ slug: string; updatedAt: string }>('digimon', {
      where: { published: { equals: true } },
      limit: 2000,
      sort: '-updatedAt',
    });
    for (const d of digimon.docs) {
      entries.push({
        url: `${BASE_URL}/digimon/${d.slug}`,
        lastModified: new Date(d.updatedAt),
        changeFrequency: 'weekly',
        priority: 0.6,
      });
    }
  } catch {
    // CMS unavailable — skip dynamic digimon entries
  }

  // Fetch all published patch notes slugs
  try {
    const patchNotes = await fetchCMSCollection<{ slug: string; updatedAt: string }>('patchNotes', {
      where: { published: { equals: true } },
      limit: 500,
      sort: '-publishedDate',
    });
    for (const p of patchNotes.docs) {
      entries.push({
        url: `${BASE_URL}/patch-notes/${p.slug}`,
        lastModified: new Date(p.updatedAt),
        changeFrequency: 'monthly',
        priority: 0.5,
      });
    }
  } catch {
    // CMS unavailable — skip dynamic patch notes entries
  }

  return entries;
}
