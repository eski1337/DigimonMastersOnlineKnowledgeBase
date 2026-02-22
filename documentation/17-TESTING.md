# Testing Guide

Strategy, commands, and examples for testing the DMO Knowledge Base.

---

## Overview

**Current Status**: ⚠️ No automated tests yet

**Planned Stack**:
- **Unit Tests**: Vitest (for utilities, hooks, components)
- **Integration Tests**: Vitest + MSW (API mocking)
- **E2E Tests**: Playwright (user flows)

---

## Folder Structure (Planned)

```
dmo-kb/
├── apps/web/
│   ├── src/
│   └── tests/
│       ├── unit/              # Component & utility tests
│       │   ├── lib/
│       │   │   ├── auth.test.ts
│       │   │   └── filters.test.ts
│       │   └── components/
│       │       └── digimon-card.test.tsx
│       ├── integration/       # API route tests
│       │   ├── api/
│       │   │   ├── search.test.ts
│       │   │   └── health.test.ts
│       │   └── mocks/
│       │       └── handlers.ts
│       └── e2e/               # End-to-end tests
│           ├── auth.spec.ts
│           ├── digimon-browse.spec.ts
│           └── search.spec.ts
│
├── apps/cms/
│   └── tests/
│       ├── collections/       # Collection validation tests
│       └── hooks/             # Hook behavior tests
│
└── playwright.config.ts       # E2E test config
```

---

## Setup Instructions

### 1. Install Dependencies

```bash
# Unit & Integration tests
pnpm add -D vitest @vitest/ui @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom

# API mocking
pnpm add -D msw

# E2E tests
pnpm add -D @playwright/test
npx playwright install
```

### 2. Configure Vitest

Create `vitest.config.ts` in repo root:

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './apps/web/src'),
    },
  },
});
```

### 3. Test Setup File

Create `tests/setup.ts`:

```typescript
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock NextAuth
vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: null,
    status: 'unauthenticated',
  }),
}));
```

### 4. Playwright Config

Create `playwright.config.ts`:

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './apps/web/tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

---

## Test Examples

### Unit Test: Utility Function

`apps/web/tests/unit/lib/filters.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { filterDigimonByRank } from '@/lib/filters';

describe('filterDigimonByRank', () => {
  it('filters SSS rank Digimon', () => {
    const digimon = [
      { name: 'Agumon', rank: 'A' },
      { name: 'Omegamon', rank: 'SSS' },
    ];
    const result = filterDigimonByRank(digimon, 'SSS');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Omegamon');
  });
});
```

### Unit Test: React Component

`apps/web/tests/unit/components/digimon-card.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DigimonCard } from '@/components/digimon/digimon-card';

describe('DigimonCard', () => {
  it('renders Digimon name and rank', () => {
    const digimon = {
      id: '1',
      name: 'Agumon',
      slug: 'agumon',
      rank: 'A',
      element: 'Fire',
      attribute: 'Vaccine',
    };
    
    render(<DigimonCard digimon={digimon} />);
    
    expect(screen.getByText('Agumon')).toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument();
  });
});
```

### Integration Test: API Route

`apps/web/tests/integration/api/search.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { server } from '../mocks/server';

beforeAll(() => server.listen());
afterAll(() => server.close());

describe('GET /api/search', () => {
  it('returns search results', async () => {
    const res = await fetch('http://localhost:3000/api/search?q=agumon');
    const data = await res.json();
    
    expect(res.status).toBe(200);
    expect(data.results).toBeDefined();
    expect(data.results.length).toBeGreaterThan(0);
  });
  
  it('validates query parameter', async () => {
    const res = await fetch('http://localhost:3000/api/search');
    expect(res.status).toBe(400);
  });
});
```

### E2E Test: User Flow

`apps/web/tests/e2e/digimon-browse.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Digimon Browse', () => {
  test('should display Digimon list', async ({ page }) => {
    await page.goto('/digimon');
    
    // Wait for Digimon cards to load
    await expect(page.locator('[data-testid="digimon-card"]').first()).toBeVisible();
    
    // Check pagination
    await expect(page.locator('text=Page 1')).toBeVisible();
  });
  
  test('should filter by rank', async ({ page }) => {
    await page.goto('/digimon');
    
    // Select SSS rank filter
    await page.click('[data-testid="rank-filter"]');
    await page.click('text=SSS');
    
    // Verify filtered results
    const cards = page.locator('[data-testid="digimon-card"]');
    await expect(cards.first()).toContainText('SSS');
  });
  
  test('should navigate to detail page', async ({ page }) => {
    await page.goto('/digimon');
    
    // Click first Digimon card
    await page.locator('[data-testid="digimon-card"]').first().click();
    
    // Verify detail page loaded
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.url()).toContain('/digimon/');
  });
});
```

---

## Commands

Add to `package.json`:

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug"
  }
}
```

### Run Tests

```bash
# Unit & Integration tests
pnpm test              # Watch mode
pnpm test:ui           # Visual UI
pnpm test:coverage     # With coverage report

# E2E tests
pnpm test:e2e          # Headless
pnpm test:e2e:ui       # Interactive UI
pnpm test:e2e:debug    # Debug mode

# Run specific test
pnpm test filters.test.ts
pnpm test:e2e auth.spec.ts
```

---

## Coverage Goals

| Area | Target | Priority |
|------|--------|----------|
| Utilities (lib/) | 90%+ | High |
| API Routes | 80%+ | High |
| Components | 70%+ | Medium |
| E2E Critical Flows | 100% | High |

**Critical Flows** (must have E2E coverage):
1. User authentication (Discord + Credentials)
2. Digimon browsing & filtering
3. Search functionality
4. Content creation (editor role)
5. Profile management

---

## CI/CD Integration

### GitHub Actions Example

`.github/workflows/test.yml`:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      mongodb:
        image: mongo:6
        ports:
          - 27017:27017
    
    steps:
      - uses: actions/checkout@v3
      
      - uses: pnpm/action-setup@v2
        with:
          version: 10
      
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'pnpm'
      
      - run: pnpm install
      - run: pnpm typecheck
      - run: pnpm lint
      - run: pnpm test --run
      - run: npx playwright install --with-deps
      - run: pnpm test:e2e
      
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

---

## Testing Best Practices

### DO ✅

- Test behavior, not implementation
- Use semantic queries (`getByRole`, `getByLabelText`)
- Mock external APIs (CMS, Discord)
- Test error states
- Add data-testid for complex queries
- Keep tests isolated (no shared state)
- Use factory functions for test data

### DON'T ❌

- Test implementation details
- Rely on CSS selectors
- Share state between tests
- Skip cleanup
- Test third-party libraries
- Write flaky tests (timeouts without reason)

---

## Next Steps

1. Install testing dependencies
2. Create test folder structure
3. Write unit tests for utilities
4. Add integration tests for API routes
5. Implement E2E tests for critical flows
6. Set up CI/CD pipeline
7. Achieve 80%+ coverage
8. Add visual regression testing (optional)

---

## Resources

- [Vitest Docs](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Playwright Docs](https://playwright.dev/)
- [MSW (API Mocking)](https://mswjs.io/)
