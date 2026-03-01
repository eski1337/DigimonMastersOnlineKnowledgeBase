/**
 * Media Repository — all Payload CMS media collection access.
 */
import type { Payload } from 'payload';

export class MediaRepository {
  constructor(private readonly payload: Payload) {}

  async findBySourceUrl(sourceUrl: string) {
    const result = await this.payload.find({
      collection: 'media',
      where: { sourceUrl: { equals: sourceUrl } },
      limit: 1,
    });
    return result.docs[0] ?? null;
  }

  async findById(id: string) {
    return this.payload.findByID({ collection: 'media', id });
  }

  async create(data: Record<string, any>, file: { data: Buffer; mimetype: string; name: string; size: number }) {
    return this.payload.create({ collection: 'media', data, file });
  }
}
