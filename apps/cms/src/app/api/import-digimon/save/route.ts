import type { Request, Response } from 'express';
import { getPayload } from 'payload';
import config from '../../../../payload.config';
import { env } from '../../../../utils/env';

export async function POST(request: Request, response: Response) {
  try {
    const digimonData = request.body;

    if (!digimonData || !digimonData.name) {
      return response.status(400).json({
        error: 'Invalid Digimon data'
      });
    }

    // Get Payload instance
    const payload = await getPayload({ config, secret: env.PAYLOAD_SECRET });

    // Check if already exists
    const existing = await payload.find({
      collection: 'digimon',
      where: {
        slug: {
          equals: digimonData.slug,
        },
      },
      limit: 1,
    });

    if (existing.docs.length > 0) {
      return response.status(409).json({
        error: 'A Digimon with this slug already exists'
      });
    }

    // Create new Digimon
    const newDigimon = await payload.create({
      collection: 'digimon',
      data: digimonData,
    });

    return response.json({
      success: true,
      digimon: newDigimon,
    });
  } catch (error: any) {
    console.error('Save error:', error);
    return response.status(500).json({
      error: error.message || 'Failed to save Digimon'
    });
  }
}
