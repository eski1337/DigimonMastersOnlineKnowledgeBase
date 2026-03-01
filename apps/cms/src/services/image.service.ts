/**
 * Image Service — handles downloading images from external sources
 * and uploading them to Payload CMS media collection.
 */
import crypto from 'crypto';
import { createLogger } from './logger';
import { MediaRepository } from '../repositories/media.repository';
import type { ImageMetadata } from '../types/scraper.types';

const log = createLogger('image-service');

export class ImageService {
  constructor(private readonly mediaRepo: MediaRepository) {}

  /**
   * Download an image from a URL (with Cloudflare bypass strategies)
   * and upload it to Payload media collection.
   * Returns the media document ID, or null on failure.
   */
  async downloadAndUpload(
    imageUrl: string,
    filename: string,
    metadata: ImageMetadata,
  ): Promise<string | null> {
    try {
      log.debug({ url: imageUrl }, 'Downloading image');

      let response: Response | null = null;
      let finalUrl = imageUrl;

      // Attempt 1: Direct fetch
      response = await this.tryDirectFetch(imageUrl, filename);

      // Attempt 2: CF Proxy (if direct failed and URL is dmowiki.com)
      if ((!response || !response.ok) && imageUrl.includes('dmowiki.com')) {
        const proxyResult = await this.tryCfProxy(imageUrl, filename);
        if (proxyResult) {
          response = proxyResult;
          finalUrl = imageUrl;
        }
      }

      // Attempt 3: Wayback Machine
      if ((!response || !response.ok) && imageUrl.includes('dmowiki.com')) {
        const waybackResult = await this.tryWayback(imageUrl, filename);
        if (waybackResult) {
          response = waybackResult.response;
          finalUrl = waybackResult.url;
        }
      }

      if (!response || !response.ok) {
        log.warn({ url: imageUrl, status: response?.status }, 'Failed to download image (all strategies)');
        return null;
      }

      return await this.uploadToPayload(response, imageUrl, filename, metadata);
    } catch (error: any) {
      log.error({ url: imageUrl, error: error.message }, 'Error downloading/uploading image');
      return null;
    }
  }

  private async tryDirectFetch(imageUrl: string, filename: string): Promise<Response | null> {
    try {
      const response = await fetch(imageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(10000),
      });

      if (response.status === 403 || response.status === 503) {
        const text = await response.text();
        if (text.includes('Just a moment') || text.includes('challenge-platform') || text.includes('cf-')) {
          log.info({ filename }, 'Cloudflare blocked direct fetch, trying fallbacks');
          return null;
        }
      }

      return response;
    } catch (err: any) {
      log.debug({ filename, error: err.message }, 'Direct fetch failed');
      return null;
    }
  }

  private async tryCfProxy(imageUrl: string, filename: string): Promise<Response | null> {
    try {
      const proxyCheck = await fetch('http://127.0.0.1:8191', { signal: AbortSignal.timeout(2000) });
      const proxyData = await proxyCheck.json() as any;
      if (proxyData.status === 'ready') {
        const proxyUrl = `http://127.0.0.1:8191/image?url=${encodeURIComponent(imageUrl)}`;
        log.debug({ filename }, 'Trying CF proxy');
        const response = await fetch(proxyUrl, { signal: AbortSignal.timeout(20000) });
        if (response.ok) {
          log.info({ filename }, 'Got image via CF proxy');
          return response;
        }
      }
    } catch (err: any) {
      log.debug({ filename, error: err.message }, 'CF proxy not available');
    }
    return null;
  }

  private async tryWayback(
    imageUrl: string,
    filename: string,
  ): Promise<{ response: Response; url: string } | null> {
    const waybackUrl = `https://web.archive.org/web/2024if_/${imageUrl}`;
    try {
      log.debug({ filename }, 'Trying Wayback Machine');
      const response = await fetch(waybackUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(15000),
      });
      if (response.ok) {
        log.info({ filename }, 'Got image via Wayback Machine');
        return { response, url: waybackUrl };
      }
    } catch (err: any) {
      log.debug({ filename, error: err.message }, 'Wayback also failed');
    }
    return null;
  }

  private async uploadToPayload(
    response: Response,
    imageUrl: string,
    filename: string,
    metadata: ImageMetadata,
  ): Promise<string | null> {
    const buffer = Buffer.from(await response.arrayBuffer());
    const hash = crypto.createHash('md5').update(buffer).digest('hex');

    // Check if image from this exact source URL already exists
    const existing = await this.mediaRepo.findBySourceUrl(imageUrl);
    if (existing) {
      log.debug({ filename, id: existing.id, source: imageUrl }, 'Image already exists (same source URL)');
      return String(existing.id);
    }

    log.debug({ url: imageUrl, filename, hash }, 'Uploading new image');

    const file = {
      data: buffer,
      mimetype: response.headers.get('content-type') || 'image/png',
      name: filename,
      size: buffer.length,
    };

    const media = await this.mediaRepo.create(
      {
        alt: filename.replace(/\.(png|jpg|jpeg|gif)$/i, ''),
        imageType: metadata.imageType,
        sourceUrl: imageUrl,
        sourceFile: filename,
        belongsTo: metadata.belongsTo || {},
        hash,
        importedAt: new Date().toISOString(),
        lastChecked: new Date().toISOString(),
        isOutdated: false,
        tags: metadata.tags?.map((tag) => ({ tag })) || [],
        source: 'DMO Wiki',
        credits: 'DMO Wiki / Joymax',
      },
      file,
    );

    log.info({ filename, id: media.id, hash }, 'Successfully uploaded image');
    return String(media.id);
  }
}
