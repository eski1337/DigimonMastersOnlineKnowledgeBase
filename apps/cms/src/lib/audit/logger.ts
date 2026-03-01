/**
 * Centralized Audit Logger
 *
 * Writes immutable audit entries to the 'audit-logs' collection.
 * Designed to be called from Payload hooks (afterChange, afterDelete).
 * Uses Payload's local API to bypass access control for internal writes.
 */

import type { Payload } from 'payload';
import { computeDiff, truncateDiffValues, type DiffEntry } from './diff';

export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'login'
  | 'logout'
  | 'publish'
  | 'unpublish'
  | 'status_change'
  | 'role_change'
  | 'bulk_operation';

export interface AuditLogInput {
  user?: string | null;           // User ID
  userEmail?: string | null;      // Denormalized for fast display
  userName?: string | null;       // Denormalized for fast display
  action: AuditAction;
  collection: string;
  documentId?: string;
  documentTitle?: string;
  diff?: DiffEntry[] | null;
  metadata?: Record<string, unknown>;
}

// Guard against recursive logging
let isLogging = false;

/**
 * Write an audit log entry. Fire-and-forget — never throws,
 * never blocks the main operation, never recurses.
 */
export async function writeAuditLog(
  payload: Payload,
  input: AuditLogInput,
): Promise<void> {
  // Prevent recursion (audit-logs hooks calling this again)
  if (isLogging) return;

  isLogging = true;
  try {
    const diff = input.diff ? truncateDiffValues(input.diff) : undefined;

    await payload.create({
      collection: 'audit-logs',
      // Use overrideAccess so the write bypasses access control
      overrideAccess: true,
      data: {
        user: input.user || null,
        userEmail: input.userEmail || 'system',
        userName: input.userName || 'System',
        action: input.action,
        targetCollection: input.collection,
        documentId: input.documentId || undefined,
        documentTitle: input.documentTitle || undefined,
        diff: diff ? JSON.stringify(diff) : undefined,
        metadata: input.metadata ? JSON.stringify(input.metadata) : undefined,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    // Never let audit logging break the main operation
    console.error('[AuditLog] Failed to write entry:', err);
  } finally {
    isLogging = false;
  }
}

/**
 * Build an audit entry from a Payload afterChange hook context.
 * Automatically computes the diff and extracts user info.
 */
export function buildAuditFromChange(args: {
  req: any;
  operation: 'create' | 'update';
  collection: string;
  doc: Record<string, unknown>;
  previousDoc?: Record<string, unknown>;
}): AuditLogInput | null {
  const { req, operation, collection, doc, previousDoc } = args;

  // Compute diff for updates
  let diff: DiffEntry[] | null = null;
  let action: AuditAction = operation;

  if (operation === 'update' && previousDoc) {
    diff = computeDiff(previousDoc, doc);
    // Skip if nothing meaningful changed
    if (!diff) return null;

    // Detect special actions from the diff
    const publishChange = diff.find(d => d.field === 'published');
    if (publishChange) {
      action = publishChange.after === true || publishChange.after === 'true'
        ? 'publish'
        : 'unpublish';
    }

    const statusChange = diff.find(d => d.field === 'status');
    if (statusChange) {
      action = 'status_change';
    }

    const roleChange = diff.find(d => d.field === 'role');
    if (roleChange) {
      action = 'role_change';
    }
  }

  // Extract document title from common fields
  const title = (doc.name || doc.title || doc.email || doc.slug || doc.id) as string | undefined;

  return {
    user: req.user?.id || null,
    userEmail: req.user?.email || null,
    userName: req.user?.name || req.user?.username || null,
    action,
    collection,
    documentId: doc.id as string,
    documentTitle: title ? String(title) : undefined,
    diff,
    metadata: extractMetadata(req),
  };
}

/**
 * Build an audit entry from a Payload afterDelete hook context.
 */
export function buildAuditFromDelete(args: {
  req: any;
  collection: string;
  doc: Record<string, unknown>;
}): AuditLogInput {
  const { req, collection, doc } = args;
  const title = (doc.name || doc.title || doc.email || doc.slug || doc.id) as string | undefined;

  return {
    user: req.user?.id || null,
    userEmail: req.user?.email || null,
    userName: req.user?.name || req.user?.username || null,
    action: 'delete',
    collection,
    documentId: doc.id as string,
    documentTitle: title ? String(title) : undefined,
    diff: null,
    metadata: extractMetadata(req),
  };
}

function extractMetadata(req: any): Record<string, unknown> | undefined {
  const meta: Record<string, unknown> = {};
  const ip = req.headers?.['x-forwarded-for'] || req.headers?.['x-real-ip'] || req.ip;
  const ua = req.headers?.['user-agent'];
  if (ip) meta.ip = typeof ip === 'string' ? ip.split(',')[0].trim() : ip;
  if (ua) meta.userAgent = ua;
  return Object.keys(meta).length > 0 ? meta : undefined;
}
