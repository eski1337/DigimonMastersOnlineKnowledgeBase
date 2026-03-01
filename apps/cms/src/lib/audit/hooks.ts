/**
 * Global Audit Hooks
 *
 * Factory functions that produce Payload hooks for any collection.
 * Attach these to collections via the `withAuditHooks` wrapper.
 *
 * Strategy:
 * - afterChange: log create/update with diff
 * - afterDelete: log delete
 * - Skip the 'audit-logs' collection itself to prevent recursion
 * - Skip media collection to avoid noise from image resizing
 */

import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionBeforeChangeHook,
} from 'payload/types';
import { writeAuditLog, buildAuditFromChange, buildAuditFromDelete } from './logger';

// Store previous doc state per request for diff computation
const PREV_DOC_KEY = '_auditPreviousDoc';

/**
 * beforeChange hook: snapshot the previous document state for updates.
 * This runs BEFORE the change is applied, so we can capture the "before" state.
 */
export function auditBeforeChangeHook(collectionSlug: string): CollectionBeforeChangeHook {
  return async ({ req, operation, originalDoc, data }) => {
    if (operation === 'update' && originalDoc) {
      // Attach previous doc to the request object for afterChange to use
      (req as any)[PREV_DOC_KEY] = JSON.parse(JSON.stringify(originalDoc));
    }
    return data;
  };
}

/**
 * afterChange hook: log create and update operations.
 */
export function auditAfterChangeHook(collectionSlug: string): CollectionAfterChangeHook {
  return async ({ req, operation, doc, previousDoc }) => {
    // Use previousDoc from args if available, otherwise use our snapshot
    const prevDoc = previousDoc || (req as any)[PREV_DOC_KEY];

    const entry = buildAuditFromChange({
      req,
      operation: operation as 'create' | 'update',
      collection: collectionSlug,
      doc,
      previousDoc: prevDoc,
    });

    if (entry && req.payload) {
      // Fire and forget — don't await in production to avoid slowing the response
      writeAuditLog(req.payload, entry);
    }

    // Clean up
    delete (req as any)[PREV_DOC_KEY];

    return doc;
  };
}

/**
 * afterDelete hook: log delete operations.
 */
export function auditAfterDeleteHook(collectionSlug: string): CollectionAfterDeleteHook {
  return async ({ req, doc }) => {
    const entry = buildAuditFromDelete({
      req,
      collection: collectionSlug,
      doc,
    });

    if (req.payload) {
      writeAuditLog(req.payload, entry);
    }

    return doc;
  };
}

/** Collections to SKIP audit logging for */
const SKIP_COLLECTIONS = new Set(['audit-logs']);

/**
 * Attach audit hooks to a collection config.
 * Returns a new config with audit hooks merged into existing hooks.
 * Skips collections in the exclusion list.
 */
export function withAuditHooks<T extends { slug: string; hooks?: any }>(config: T): T {
  if (SKIP_COLLECTIONS.has(config.slug)) return config;

  const existingHooks = config.hooks || {};

  return {
    ...config,
    hooks: {
      ...existingHooks,
      beforeChange: [
        ...(existingHooks.beforeChange || []),
        auditBeforeChangeHook(config.slug),
      ],
      afterChange: [
        ...(existingHooks.afterChange || []),
        auditAfterChangeHook(config.slug),
      ],
      afterDelete: [
        ...(existingHooks.afterDelete || []),
        auditAfterDeleteHook(config.slug),
      ],
    },
  };
}
