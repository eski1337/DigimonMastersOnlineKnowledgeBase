/**
 * Shared utility helpers for the CMS.
 * Pure functions — no side effects, no DB access.
 */

/**
 * Normalize Digimon names: "(X-Antibody System)" → " X"
 */
export function normalizeDigimonName(name: string): string {
  if (!name) return name;
  return name.replace(' (X-Antibody System)', ' X');
}

/**
 * Extract a wiki thumbnail path to the full-resolution image path.
 * /images/thumb/2/26/Examon.png/250px-Examon.png → /images/2/26/Examon.png
 */
export function extractFullImagePath(src: string): string {
  if (!src.includes('/thumb/')) return src;

  const thumbMatch = src.match(
    /\/images\/thumb\/([a-f0-9]\/[a-f0-9]{2}\/.+?\.(?:png|jpg|jpeg|gif))/i,
  );
  if (thumbMatch) return `/images/${thumbMatch[1]}`;

  const simpleMatch = src.match(
    /\/images\/thumb\/(.*?\.(?:png|jpg|jpeg|gif))/i,
  );
  if (simpleMatch) return `/images/${simpleMatch[1]}`;

  return src;
}

/**
 * Convert a possibly-relative wiki image path to a full URL.
 */
export function toAbsoluteWikiUrl(path: string): string {
  return path.startsWith('http') ? path : `https://dmowiki.com${path}`;
}

/**
 * Safely parse a number from an unknown value.
 * Returns undefined if the value can't be parsed.
 */
export function safeParseNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const num = Number(value);
  return isNaN(num) ? undefined : num;
}

/**
 * Map attacker-type abbreviations to full names.
 */
export function mapAttackerType(abbrev: string): string | null {
  const map: Record<string, string> = {
    QA: 'Quick Attacker',
    SA: 'Short Attacker',
    NA: 'Near Attacker',
    DE: 'Defender',
  };
  return map[abbrev] ?? null;
}
