/**
 * Auto-rename media files when attached to Digimon or Items.
 *
 * If a media document has a generic filename (e.g. 001.png, 002.png),
 * it gets renamed to match the parent entity + field purpose.
 *
 * Examples:
 *   Digimon "Agumon" icon  → Agumon_Icon.png
 *   Digimon "Agumon" main  → Agumon_Artwork.png
 *   Item "Option Change Stone" icon → Option_Change_Stone_Icon.png
 */
import path from 'path';
import fs from 'fs';
import type { CollectionAfterChangeHook } from 'payload/types';

const MEDIA_DIR = path.resolve(process.cwd(), 'media');

/** Matches filenames that are purely numeric (with optional leading zeros) */
const GENERIC_FILENAME_RE = /^0*\d+\.(png|jpe?g|gif|webp|svg)$/i;

function isGenericFilename(filename: string): boolean {
  return GENERIC_FILENAME_RE.test(filename);
}

/** Sanitize entity name for use in a filename */
function sanitizeName(name: string): string {
  return name
    .replace(/[()]/g, '')          // remove parens
    .replace(/[']/g, '')           // remove apostrophes
    .replace(/[^a-zA-Z0-9\s-]/g, '') // keep alphanumeric, space, dash
    .trim()
    .replace(/\s+/g, '_');         // spaces → underscores
}

/**
 * Rename a media file on disk + update the media document in DB.
 * Handles the main file and all Payload-generated image sizes.
 */
async function renameMediaFile(
  payload: any,
  mediaId: string,
  newBaseName: string, // e.g. "Agumon_Icon" (without extension)
): Promise<void> {
  try {
    const mediaDoc = await payload.findByID({ collection: 'media', id: mediaId });
    if (!mediaDoc?.filename) return;

    const oldFilename = mediaDoc.filename as string;
    if (!isGenericFilename(oldFilename)) return;

    const ext = path.extname(oldFilename);
    const oldBase = path.basename(oldFilename, ext);
    const newFilename = `${newBaseName}${ext}`;

    // Check if target filename already exists — append a number if so
    let finalFilename = newFilename;
    let finalBase = newBaseName;
    let counter = 1;
    while (fs.existsSync(path.join(MEDIA_DIR, finalFilename))) {
      // If the existing file IS the same file, no rename needed
      const existingPath = path.join(MEDIA_DIR, finalFilename);
      const oldPath = path.join(MEDIA_DIR, oldFilename);
      try {
        const oldStat = fs.statSync(oldPath);
        const newStat = fs.statSync(existingPath);
        if (oldStat.ino === newStat.ino) break; // same file
      } catch { /* ignore */ }

      finalBase = `${newBaseName}_${counter}`;
      finalFilename = `${finalBase}${ext}`;
      counter++;
    }

    // Rename main file
    const oldPath = path.join(MEDIA_DIR, oldFilename);
    const newPath = path.join(MEDIA_DIR, finalFilename);

    if (!fs.existsSync(oldPath)) return;
    if (oldPath !== newPath) {
      fs.renameSync(oldPath, newPath);
    }

    // Rename size variants (e.g. 001-400x400.png → Agumon_Icon-400x400.png)
    const updateSizes: Record<string, any> = {};
    const sizes = mediaDoc.sizes || {};
    for (const [sizeName, sizeData] of Object.entries(sizes) as [string, any][]) {
      if (!sizeData?.filename) continue;
      const sizeOldFilename = sizeData.filename as string;
      const sizeExt = path.extname(sizeOldFilename);
      // Extract the size suffix like "-400x400"
      const sizeSuffix = sizeOldFilename.replace(oldBase, '').replace(sizeExt, '');
      const sizeNewFilename = `${finalBase}${sizeSuffix}${sizeExt}`;

      const sizeOldPath = path.join(MEDIA_DIR, sizeOldFilename);
      const sizeNewPath = path.join(MEDIA_DIR, sizeNewFilename);

      if (fs.existsSync(sizeOldPath) && sizeOldPath !== sizeNewPath) {
        fs.renameSync(sizeOldPath, sizeNewPath);
      }

      updateSizes[sizeName] = {
        ...sizeData,
        filename: sizeNewFilename,
      };
    }

    // Update the media document in DB
    await payload.update({
      collection: 'media',
      id: mediaId,
      data: {
        filename: finalFilename,
        ...(Object.keys(updateSizes).length > 0 ? { sizes: { ...sizes, ...updateSizes } } : {}),
      },
    });
  } catch (err) {
    console.error(`[rename-media] Failed to rename media ${mediaId}:`, err);
  }
}

/** Field mapping: which fields get which suffix */
interface FieldMapping {
  field: string;
  suffix: string;
}

/**
 * Create an afterChange hook for a collection that auto-renames generic media.
 */
export function createMediaRenameHook(
  nameField: string,
  mappings: FieldMapping[],
): CollectionAfterChangeHook {
  return async ({ doc, req }) => {
    if (!req.payload || !doc) return doc;

    const entityName = doc[nameField];
    if (!entityName || typeof entityName !== 'string') return doc;

    const safeName = sanitizeName(entityName);
    if (!safeName) return doc;

    for (const { field, suffix } of mappings) {
      const mediaId = typeof doc[field] === 'object' ? doc[field]?.id : doc[field];
      if (!mediaId) continue;

      const newBase = `${safeName}_${suffix}`;
      // Fire and forget — don't block the response
      renameMediaFile(req.payload, String(mediaId), newBase).catch(() => {});
    }

    return doc;
  };
}
