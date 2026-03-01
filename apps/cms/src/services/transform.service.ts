/**
 * Transform Service — prepares parsed Digimon data for Payload CMS persistence.
 * Pure transformations — no DB access, no side effects.
 */
import { safeParseNumber } from '../utils/helpers';
import type { DigimonPreview, ValidationSummary } from '../types/scraper.types';

/**
 * Build a validation summary showing which fields were parsed successfully.
 */
export function buildValidationSummary(preview: DigimonPreview): ValidationSummary {
  const complete: string[] = [];
  const partial: string[] = [];
  const missing: string[] = [];

  // Core fields
  preview.name ? complete.push('Name') : missing.push('Name');
  preview.form && preview.form !== 'Rookie' ? complete.push('Form') : partial.push('Form (defaulted to Rookie)');
  preview.rank ? complete.push('Rank') : missing.push('Rank');
  preview.attribute && preview.attribute !== 'None' ? complete.push('Attribute') : partial.push('Attribute (defaulted to None)');
  preview.element && preview.element !== 'Neutral' ? complete.push('Element') : partial.push('Element (defaulted to Neutral)');
  preview.type ? complete.push('Type') : missing.push('Type');
  preview.attackerType ? complete.push('Attacker Type') : missing.push('Attacker Type');
  preview.families.length > 0 ? complete.push(`Families (${preview.families.length})`) : missing.push('Families');

  // Stats
  preview.stats.hp > 0 || preview.maxStats.hp > 0 ? complete.push('Stats') : missing.push('Stats');

  // Skills
  preview.skills.length > 0 ? complete.push(`Skills (${preview.skills.length})`) : missing.push('Skills');

  // Digivolutions
  const from = preview.digivolutions.digivolvesFrom.length;
  const to = preview.digivolutions.digivolvesTo.length;
  from > 0 || to > 0 ? complete.push(`Digivolutions (From: ${from}, To: ${to})`) : missing.push('Digivolutions');

  // Optional fields
  if (preview.deckBuffs?.length > 0) complete.push(`Deck Buffs (${preview.deckBuffs.length})`);
  if (preview.specialEffects) complete.push('Special Effects (F1-F4)');
  if (preview.uRankPassives) complete.push('U-Rank Passives');
  if (preview.sssPassives) complete.push('SSS+ Passives');
  if (preview.jogressFrom?.length) complete.push('Jogress Components');
  if (preview.rideable) complete.push('Rideable Name');
  if (preview.introduction) complete.push('Introduction');
  if (preview.overview?.pros?.length || preview.overview?.cons?.length) {
    complete.push(`Overview (Pros: ${preview.overview.pros.length}, Cons: ${preview.overview.cons.length})`);
  }
  if (preview.icon) complete.push('Icon Image');
  if (preview.mainImage) complete.push('Main Image');

  return { complete, partial, missing };
}

/**
 * Prepare a preview object for display (resolve media URLs, flatten damage arrays).
 */
export async function preparePreviewForDisplay(
  preview: DigimonPreview,
  resolveMediaUrl: (id: string) => Promise<{ url?: string; filename?: string; sourceUrl?: string } | null>,
): Promise<any> {
  const display = JSON.parse(JSON.stringify(preview));

  // Resolve icon URL
  if (display.icon) {
    const media = await resolveMediaUrl(display.icon);
    if (media) {
      display.iconUrl = media.url || `/media/${media.filename}`;
      display.iconSourceUrl = media.sourceUrl;
    }
  }

  // Resolve main image URL
  if (display.mainImage) {
    const media = await resolveMediaUrl(display.mainImage);
    if (media) {
      display.mainImageUrl = media.url || `/media/${media.filename}`;
      display.mainImageSourceUrl = media.sourceUrl;
    }
  }

  // Resolve skill icon URLs + flatten damage arrays
  if (display.skills && Array.isArray(display.skills)) {
    display.skills = await Promise.all(
      display.skills.map(async (skill: any) => {
        if (skill.damagePerLevel && Array.isArray(skill.damagePerLevel)) {
          const values = skill.damagePerLevel.map((d: any) =>
            typeof d === 'object' && d.damage !== undefined ? d.damage : d,
          );
          skill.damagePerLevel = values.join(', ');
        }
        if (skill.icon) {
          const media = await resolveMediaUrl(skill.icon);
          if (media) {
            skill.iconUrl = media.url || `/media/${media.filename}`;
            skill.iconSourceUrl = media.sourceUrl;
          }
        }
        return skill;
      }),
    );
  }

  return display;
}

/**
 * Transform raw import data into the shape Payload CMS expects for upsert.
 * Strips display-only fields, coerces types, nests grouped fields.
 */
export function transformForSave(data: any): any {
  // Remove display-only URL fields
  delete data.iconUrl;
  delete data.mainImageUrl;
  delete data.iconSourceUrl;
  delete data.mainImageSourceUrl;

  // Transform skills
  if (data.skills && Array.isArray(data.skills)) {
    data.skills = data.skills.map((skill: any) => {
      delete skill.iconUrl;
      delete skill.iconSourceUrl;

      // Flatten damagePerLevel
      if (skill.damagePerLevel && Array.isArray(skill.damagePerLevel)) {
        const values = skill.damagePerLevel.map((d: any) =>
          typeof d === 'object' && d.damage !== undefined ? d.damage : d,
        );
        skill.damagePerLevel = values.join(', ');
      }

      // Coerce numeric fields
      skill.cooldown = safeParseNumber(skill.cooldown);
      skill.dsConsumption = safeParseNumber(skill.dsConsumption);
      skill.skillPointsPerUpgrade = safeParseNumber(skill.skillPointsPerUpgrade);
      skill.animationTime = safeParseNumber(skill.animationTime);

      return skill;
    });
  }

  // Coerce stat fields
  const statFields = ['hp', 'at', 'de', 'as', 'ds', 'ct', 'ht', 'ev'];
  const coerceStats = (obj: any) => {
    if (!obj) return obj;
    for (const f of statFields) {
      obj[f] = safeParseNumber(obj[f]);
    }
    return obj;
  };
  if (data.stats) data.stats = coerceStats(data.stats);
  if (data.maxStats) data.maxStats = coerceStats(data.maxStats);

  // Coerce top-level numeric fields
  data.sizePct = safeParseNumber(data.sizePct);
  data.defaultLevel = safeParseNumber(data.defaultLevel);

  // Auto-publish
  data.published = true;

  // Nest grouped fields into Payload CMS structure
  if (data.canBeRidden !== undefined) {
    if (!data.rideability) data.rideability = {};
    data.rideability.canBeRidden = data.canBeRidden;
    delete data.canBeRidden;
  }

  if (data.canBeHatched !== undefined || data.available !== undefined) {
    if (!data.availability) data.availability = {};
    if (data.canBeHatched !== undefined) {
      data.availability.canBeHatched = data.canBeHatched;
      delete data.canBeHatched;
    }
    if (data.available !== undefined) {
      data.availability.available = data.available;
      delete data.available;
    }
  }

  return data;
}
