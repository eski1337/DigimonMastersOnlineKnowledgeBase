/**
 * Audit Diff Engine
 *
 * Computes a minimal, human-readable diff between two document snapshots.
 * - Ignores system fields (updatedAt, createdAt, _status, etc.)
 * - Flattens nested objects with dot-notation keys
 * - Handles arrays by comparing JSON representations
 * - Returns null if nothing meaningful changed
 */

const IGNORED_FIELDS = new Set([
  'updatedAt',
  'createdAt',
  '_status',
  '_verificationToken',
  '__v',
  'id',
  '_id',
  'globalType',
  'loginAttempts',
  'lockUntil',
  'salt',
  'hash',
  'resetPasswordToken',
  'resetPasswordExpiration',
]);

export interface DiffEntry {
  field: string;
  before: unknown;
  after: unknown;
}

function isPlainObject(val: unknown): val is Record<string, unknown> {
  return val !== null && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date);
}

function normalizeValue(val: unknown): unknown {
  if (val === undefined || val === null || val === '') return null;
  if (val instanceof Date) return val.toISOString();
  if (typeof val === 'object') return JSON.stringify(val);
  return val;
}

/**
 * Flatten an object into dot-notation key-value pairs.
 * Arrays are kept as JSON strings for comparison.
 */
function flatten(obj: Record<string, unknown>, prefix = ''): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (IGNORED_FIELDS.has(key)) continue;

    const path = prefix ? `${prefix}.${key}` : key;

    if (Array.isArray(value)) {
      // Store arrays as JSON for comparison
      result[path] = JSON.stringify(value);
    } else if (isPlainObject(value)) {
      Object.assign(result, flatten(value as Record<string, unknown>, path));
    } else {
      result[path] = normalizeValue(value);
    }
  }

  return result;
}

/**
 * Compute diff between before and after documents.
 * Returns an array of changed fields, or null if no meaningful changes.
 */
export function computeDiff(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown> | null | undefined,
): DiffEntry[] | null {
  if (!before && !after) return null;

  // For creates, we don't need a diff — the action itself is the event
  if (!before) return null;

  const flatBefore = flatten(before || {});
  const flatAfter = flatten(after || {});

  const allKeys = new Set([...Object.keys(flatBefore), ...Object.keys(flatAfter)]);
  const changes: DiffEntry[] = [];

  for (const key of allKeys) {
    if (IGNORED_FIELDS.has(key.split('.')[0])) continue;

    const bVal = normalizeValue(flatBefore[key]);
    const aVal = normalizeValue(flatAfter[key]);

    if (bVal !== aVal) {
      changes.push({
        field: key,
        before: flatBefore[key] ?? null,
        after: flatAfter[key] ?? null,
      });
    }
  }

  return changes.length > 0 ? changes : null;
}

/**
 * Truncate large diff values for storage efficiency.
 * Keeps first N chars and appends "... (truncated)"
 */
export function truncateDiffValues(diff: DiffEntry[], maxLen = 500): DiffEntry[] {
  return diff.map(entry => ({
    ...entry,
    before: truncateVal(entry.before, maxLen),
    after: truncateVal(entry.after, maxLen),
  }));
}

function truncateVal(val: unknown, maxLen: number): unknown {
  if (typeof val === 'string' && val.length > maxLen) {
    return val.substring(0, maxLen) + '… (truncated)';
  }
  return val;
}
