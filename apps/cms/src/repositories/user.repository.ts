/**
 * User Repository — all Payload CMS users collection access.
 */
import type { Payload } from 'payload';

export class UserRepository {
  constructor(private readonly payload: Payload) {}

  async findByUsername(username: string) {
    const result = await this.payload.find({
      collection: 'users',
      where: { username: { equals: username } },
      limit: 1,
      depth: 0,
    });
    return result.docs[0] ?? null;
  }

  async findByUsernameFuzzy(username: string) {
    const result = await this.payload.find({
      collection: 'users',
      where: { username: { like: username } },
      limit: 1,
      depth: 0,
    });
    return result.docs[0] ?? null;
  }

  async findByEmail(email: string) {
    const result = await this.payload.find({
      collection: 'users',
      where: { email: { equals: email } },
      limit: 1,
      depth: 0,
    });
    return result.docs[0] ?? null;
  }

  async findByEmailFuzzy(email: string) {
    const result = await this.payload.find({
      collection: 'users',
      where: { email: { like: email } },
      limit: 1,
      depth: 0,
    });
    return result.docs[0] ?? null;
  }
}
