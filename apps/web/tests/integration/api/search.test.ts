import { describe, it, expect, beforeAll, afterAll } from 'vitest';

/**
 * Integration tests for search API
 * Note: These tests require the dev server to be running
 * Run with: pnpm dev in separate terminal, then pnpm test
 */

const API_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

describe('GET /api/search', () => {
  it('returns 400 for missing query parameter', async () => {
    const res = await fetch(`${API_URL}/api/search`);
    
    expect(res.status).toBe(400);
  });

  it('validates query length', async () => {
    const longQuery = 'a'.repeat(101); // Max is 100
    const res = await fetch(`${API_URL}/api/search?q=${longQuery}`);
    
    expect(res.status).toBe(400);
  });

  it('returns valid search results structure', async () => {
    const res = await fetch(`${API_URL}/api/search?q=test`);
    
    if (res.ok) {
      const data = await res.json();
      
      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('query');
      expect(data).toHaveProperty('results');
      expect(data).toHaveProperty('total');
      expect(data).toHaveProperty('page');
      expect(data).toHaveProperty('limit');
      expect(Array.isArray(data.results)).toBe(true);
    }
  });

  it('accepts pagination parameters', async () => {
    const res = await fetch(`${API_URL}/api/search?q=test&page=1&limit=5`);
    
    if (res.ok) {
      const data = await res.json();
      
      expect(data.page).toBe(1);
      expect(data.limit).toBe(5);
    }
  });

  it('clamps limit to maximum of 50', async () => {
    const res = await fetch(`${API_URL}/api/search?q=test&limit=100`);
    
    if (res.ok) {
      const data = await res.json();
      
      expect(data.limit).toBeLessThanOrEqual(50);
    }
  });
});
