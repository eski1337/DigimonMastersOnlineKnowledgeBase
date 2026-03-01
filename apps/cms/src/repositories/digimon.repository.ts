/**
 * Digimon Repository — all Payload CMS digimon collection access.
 */
import type { Payload } from 'payload';

export class DigimonRepository {
  constructor(private readonly payload: Payload) {}

  async findBySlug(slug: string) {
    const result = await this.payload.find({
      collection: 'digimon',
      where: { slug: { equals: slug } },
      limit: 1,
    });
    return result.docs[0] ?? null;
  }

  async findByName(name: string) {
    const result = await this.payload.find({
      collection: 'digimon',
      where: { name: { equals: name } },
      limit: 1,
    });
    return result.docs[0] ?? null;
  }

  async findByNameContains(name: string, limit = 100) {
    return this.payload.find({
      collection: 'digimon',
      where: { name: { contains: name } },
      limit,
    });
  }

  async findAll(limit = 100, page = 1, depth = 1) {
    return this.payload.find({ collection: 'digimon', limit, page, depth });
  }

  async findAllPaginated(depth = 1): Promise<any[]> {
    const all: any[] = [];
    let page = 1;
    while (true) {
      const batch = await this.payload.find({ collection: 'digimon', limit: 100, page, depth });
      all.push(...batch.docs);
      if (!batch.hasNextPage) break;
      page++;
    }
    return all;
  }

  async findUnpublished(limit = 1000) {
    return this.payload.find({
      collection: 'digimon',
      where: { _status: { not_equals: 'published' } },
      limit,
    });
  }

  async create(data: Record<string, any>) {
    return this.payload.create({ collection: 'digimon', data });
  }

  async update(id: string, data: Record<string, any>) {
    return this.payload.update({ collection: 'digimon', id, data });
  }

  async delete(id: string) {
    return this.payload.delete({ collection: 'digimon', id });
  }
}
