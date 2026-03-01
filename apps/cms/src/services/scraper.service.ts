/**
 * Scraper Service — orchestrates wiki fetching, parsing, and image downloading.
 * Combines parser.service + image.service to produce a complete DigimonPreview.
 */
import { createLogger } from './logger';
import { ImageService } from './image.service';
import { parseDigimonFromWiki, fetchWikitext } from './parser.service';
import { buildValidationSummary, preparePreviewForDisplay } from './transform.service';
import { MediaRepository } from '../repositories/media.repository';
import { extractFullImagePath, toAbsoluteWikiUrl } from '../utils/helpers';
import { fetchWikiPage } from './wiki-fetcher';
import type { DigimonPreview, ImportResult } from '../types/scraper.types';

const log = createLogger('scraper');

export class ScraperService {
  private readonly imageService: ImageService;

  constructor(private readonly mediaRepo: MediaRepository) {
    this.imageService = new ImageService(mediaRepo);
  }

  /**
   * Import a single Digimon from the wiki.
   * Fetches HTML, parses data, downloads images, returns preview + validation.
   */
  async importDigimon(slug: string, pastedHtml?: string): Promise<ImportResult> {
    // Normalize slug
    let digimonSlug = slug;
    if (slug.includes('dmowiki.com')) {
      const match = slug.match(/dmowiki\.com\/(?:wiki\/)?([^/?#]+)/);
      digimonSlug = match ? match[1] : slug;
    }
    digimonSlug = digimonSlug.replace(/_/g, ' ');

    // Get HTML
    let html: string;
    if (pastedHtml && typeof pastedHtml === 'string' && pastedHtml.length > 100) {
      log.info({ slug: digimonSlug, chars: pastedHtml.length }, 'Using pasted HTML');
      html = pastedHtml;
    } else {
      log.info({ slug: digimonSlug }, 'Fetching wiki page');
      const wikiResult = await fetchWikiPage(digimonSlug);
      if (!wikiResult.exists || !wikiResult.html) {
        return {
          success: false,
          error: wikiResult.error || `Wiki page not found: ${digimonSlug}`,
        };
      }
      html = wikiResult.html;
    }

    // Get wikitext (for template data / localized names)
    const wikitext = await fetchWikitext(digimonSlug);

    // Parse
    const preview = parseDigimonFromWiki(html, wikitext, digimonSlug);

    // Resolve image URLs from wikitext fallbacks if parser didn't find them
    this.resolveImageFallbacks(preview, wikitext, digimonSlug);

    // Download images
    await this.downloadImages(preview, digimonSlug);

    // Build validation
    const validation = buildValidationSummary(preview);

    // Prepare display version (resolve media URLs)
    const displayPreview = await preparePreviewForDisplay(preview, async (id: string) => {
      try {
        const doc = await this.mediaRepo.findById(id) as any;
        return doc ? { url: doc.url, filename: doc.filename, sourceUrl: doc.sourceUrl } : null;
      } catch {
        return null;
      }
    });

    return { success: true, preview: displayPreview, validation };
  }

  /**
   * Additional wikitext/URL fallbacks for images when HTML parsing didn't find them.
   */
  private resolveImageFallbacks(preview: DigimonPreview, wikitext: string, slug: string): void {
    // Main image from wikitext |image= field
    if (!preview.mainImageUrl && wikitext) {
      const m = wikitext.match(/\|\s*image\s*=\s*(?:File:|Image:)?([^|\n]+\.(?:png|jpg|jpeg|gif))/i);
      if (m) {
        preview.mainImageUrl = `https://dmowiki.com/Special:Redirect/file/${encodeURIComponent(m[1].trim())}`;
      }
    }

    // Final fallback: direct MediaWiki redirect
    if (!preview.mainImageUrl) {
      preview.mainImageUrl = `https://dmowiki.com/Special:Redirect/file/${encodeURIComponent(slug + '.png')}`;
    }
  }

  /**
   * Download icon, main image, and skill icons.
   */
  private async downloadImages(preview: DigimonPreview, slug: string): Promise<void> {
    const tags = [preview.form, preview.element, preview.attribute].filter(Boolean);

    // Icon
    if (preview.iconUrl) {
      const iconId = await this.imageService.downloadAndUpload(
        preview.iconUrl,
        `${slug}_Icon.png`,
        { imageType: 'digimon-icon', belongsTo: { digimon: slug }, tags },
      );
      if (iconId) preview.icon = iconId;
    }

    // Main image
    if (preview.mainImageUrl) {
      const mainId = await this.imageService.downloadAndUpload(
        preview.mainImageUrl,
        `${slug}.png`,
        { imageType: 'digimon-main', belongsTo: { digimon: slug }, tags },
      );
      if (mainId) preview.mainImage = mainId;
    }

    // Skill icons
    for (const skill of preview.skills) {
      let skillIconUrl: string | null = null;

      if (skill.imageId) {
        const cleanId = skill.imageId.replace(/^File:/i, '').trim();
        if (cleanId.startsWith('/images/')) {
          const imagePath = extractFullImagePath(cleanId);
          skillIconUrl = `https://dmowiki.com${imagePath}`;
        } else {
          skillIconUrl = `https://dmowiki.com/Special:Redirect/file/${encodeURIComponent(cleanId)}`;
        }
      }

      if (skillIconUrl) {
        const skillIconId = await this.imageService.downloadAndUpload(
          skillIconUrl,
          `${skill.name.replace(/\s+/g, '_')}_Icon.png`,
          { imageType: 'skill-icon', belongsTo: { skill: skill.name }, tags: ['skill'] },
        );
        if (skillIconId) {
          skill.icon = skillIconId;
          skill.iconUrl = skillIconUrl;
        }
      }
    }
  }
}
