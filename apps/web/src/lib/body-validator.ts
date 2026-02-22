/**
 * Request Body Size Validation
 * 
 * Validates request body size to prevent large payload attacks.
 */

import { NextRequest } from 'next/server';
import { ApiErrorResponse } from './api-handler';

// Default limits (in bytes)
const DEFAULT_JSON_LIMIT = 1024 * 1024; // 1MB
const DEFAULT_TEXT_LIMIT = 1024 * 1024; // 1MB
const DEFAULT_FORM_LIMIT = 10 * 1024 * 1024; // 10MB

export interface BodySizeOptions {
  maxSize?: number;
  type?: 'json' | 'text' | 'form';
}

/**
 * Validate request body size before parsing
 */
export async function validateBodySize(
  request: NextRequest,
  options: BodySizeOptions = {}
): Promise<void> {
  const contentLength = request.headers.get('content-length');
  
  if (!contentLength) {
    // If no content-length header, we'll check after reading
    return;
  }
  
  const size = parseInt(contentLength, 10);
  const maxSize = options.maxSize || getDefaultLimit(options.type);
  
  if (size > maxSize) {
    throw ApiErrorResponse.badRequest(
      `Request body too large. Maximum size is ${formatBytes(maxSize)}`,
      { 
        actualSize: formatBytes(size),
        maxSize: formatBytes(maxSize),
      }
    );
  }
}

/**
 * Parse JSON with size validation
 */
export async function parseJsonBody<T = any>(
  request: NextRequest,
  maxSize?: number
): Promise<T> {
  await validateBodySize(request, { maxSize, type: 'json' });
  
  try {
    const text = await request.text();
    
    // Double-check actual size
    const actualSize = new Blob([text]).size;
    const limit = maxSize || DEFAULT_JSON_LIMIT;
    
    if (actualSize > limit) {
      throw ApiErrorResponse.badRequest(
        `Request body too large. Maximum size is ${formatBytes(limit)}`,
        { 
          actualSize: formatBytes(actualSize),
          maxSize: formatBytes(limit),
        }
      );
    }
    
    return JSON.parse(text);
  } catch (error) {
    if (error instanceof ApiErrorResponse) {
      throw error;
    }
    throw ApiErrorResponse.badRequest('Invalid JSON body');
  }
}

/**
 * Parse text with size validation
 */
export async function parseTextBody(
  request: NextRequest,
  maxSize?: number
): Promise<string> {
  await validateBodySize(request, { maxSize, type: 'text' });
  
  const text = await request.text();
  const actualSize = new Blob([text]).size;
  const limit = maxSize || DEFAULT_TEXT_LIMIT;
  
  if (actualSize > limit) {
    throw ApiErrorResponse.badRequest(
      `Request body too large. Maximum size is ${formatBytes(limit)}`,
      { 
        actualSize: formatBytes(actualSize),
        maxSize: formatBytes(limit),
      }
    );
  }
  
  return text;
}

/**
 * Parse FormData with size validation
 */
export async function parseFormBody(
  request: NextRequest,
  maxSize?: number
): Promise<FormData> {
  await validateBodySize(request, { maxSize, type: 'form' });
  
  try {
    return await request.formData();
  } catch (error) {
    throw ApiErrorResponse.badRequest('Invalid form data');
  }
}

/**
 * Get default size limit based on content type
 */
function getDefaultLimit(type?: 'json' | 'text' | 'form'): number {
  switch (type) {
    case 'json':
      return DEFAULT_JSON_LIMIT;
    case 'text':
      return DEFAULT_TEXT_LIMIT;
    case 'form':
      return DEFAULT_FORM_LIMIT;
    default:
      return DEFAULT_JSON_LIMIT;
  }
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Body size middleware wrapper for API routes
 */
export function withBodySizeLimit(maxSize: number) {
  return async (request: NextRequest) => {
    await validateBodySize(request, { maxSize });
  };
}
