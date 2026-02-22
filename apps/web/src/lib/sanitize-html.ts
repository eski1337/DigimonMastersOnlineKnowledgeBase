/**
 * HTML sanitization utility to prevent XSS attacks.
 * 
 * Uses the `sanitize-html` library with a strict allowlist.
 * This replaces the previous regex-based implementation.
 */

import sanitize from 'sanitize-html';

const SANITIZE_OPTIONS: sanitize.IOptions = {
  allowedTags: [
    'p', 'br', 'strong', 'em', 'b', 'i', 'u', 's',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li',
    'blockquote', 'pre', 'code',
    'a', 'img',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'div', 'span', 'figure', 'figcaption',
  ],
  allowedAttributes: {
    'a': ['href', 'title', 'target', 'rel'],
    'img': ['src', 'alt', 'title', 'width', 'height'],
    'div': ['class'],
    'span': ['class'],
    'code': ['class'],
    'td': ['colspan', 'rowspan'],
    'th': ['colspan', 'rowspan'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  // Disallow all protocols not in allowedSchemes (blocks javascript:, data:, vbscript:)
  disallowedTagsMode: 'discard',
};

/**
 * Sanitize HTML using a strict allowlist. Safe against XSS.
 */
export function sanitizeHTML(html: string): string {
  if (!html) return '';
  return sanitize(html, SANITIZE_OPTIONS);
}

/**
 * Strip all HTML tags, leaving only text content.
 */
export function stripHTML(html: string): string {
  if (!html) return '';
  return sanitize(html, { allowedTags: [], allowedAttributes: {} });
}

/**
 * Escape HTML special characters.
 */
export function escapeHTML(text: string): string {
  if (!text) return '';
  
  const escapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  
  return text.replace(/[&<>"'/]/g, (char) => escapeMap[char] || char);
}

/**
 * Sanitize URL to prevent javascript: and data: protocols.
 */
export function sanitizeURL(url: string): string {
  if (!url) return '';
  
  const trimmed = url.trim().toLowerCase();
  
  if (
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('vbscript:') ||
    trimmed.startsWith('file:')
  ) {
    return '#';
  }
  
  return url;
}
