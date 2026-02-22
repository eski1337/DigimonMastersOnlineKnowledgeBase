# Known Issues & Technical Debt - DMO Knowledge Base

Documented issues, limitations, and priority action items.

---

## Critical Issues

### 1. No Automated Test Coverage
**Priority**: 🔴 **CRITICAL**

**Problem**:
- Zero unit tests
- Zero integration tests
- Zero end-to-end tests
- All testing is manual

**Impact**:
- High risk of regression bugs
- Difficult to refactor with confidence
- Time-consuming manual QA
- Production bugs more likely

**Recommendation**:
```bash
# Add testing frameworks
pnpm add -D vitest @testing-library/react @testing-library/jest-dom
pnpm add -D playwright  # E2E tests

# Create test structure
tests/
├── unit/           # Component & utility tests
├── integration/    # API & database tests
└── e2e/            # Full user flows
```

**Priority Tasks**:
1. Add Vitest for unit tests
2. Test critical utilities (auth, validation)
3. Test Digimon CRUD operations
4. Add Playwright for E2E (auth, import)
5. Set up CI/CD with test automation

---

### 2. Monolithic server.ts File
**Priority**: 🔴 **CRITICAL**

**Problem**:
- Single 155KB file (`apps/cms/src/server.ts`)
- Contains Express server + DMO Wiki scraper + API logic
- Hard to maintain, test, and extend

**Current Structure**:
```
server.ts (155,683 bytes)
├── Express server setup
├── Payload CMS initialization
├── DMO Wiki scraper (Cheerio)
├── Image downloading logic
├── API route handlers
└── Error handling
```

**Recommended Refactoring**:
```
apps/cms/src/
├── server.ts                  # Express setup only (< 200 lines)
├── scrapers/
│   ├── dmowiki/
│   │   ├── index.ts          # Main scraper interface
│   │   ├── parser.ts         # HTML parsing
│   │   ├── extractors/
│   │   │   ├── stats.ts      # Extract stats
│   │   │   ├── skills.ts     # Extract skills
│   │   │   ├── evolutions.ts # Extract evolutions
│   │   │   └── images.ts     # Extract images
│   │   └── utils.ts          # Helper functions
│   └── types.ts
├── services/
│   ├── image-service.ts      # Image download/processing
│   ├── digimon-service.ts    # Digimon business logic
│   └── import-service.ts     # Import orchestration
└── utils/
    ├── logger.ts
    └── error-handler.ts
```

**Benefits**:
- Easier to test individual modules
- Better code organization
- Easier to onboard developers
- Can reuse scraper logic elsewhere

---

### 3. Production Deployment Not Configured
**Priority**: 🟡 **HIGH**

**Missing**:
- MongoDB configured for localhost only
- No production environment setup
- SMTP configured for Mailpit (dev only)
- No CI/CD pipeline
- No monitoring/logging
- No backup strategy

**Blockers**:
- Cannot deploy to production
- No automated deployment
- No rollback strategy
- No health monitoring

**Required Steps**:
1. Set up MongoDB Atlas (cloud database)
2. Configure production SMTP (SendGrid/Resend)
3. Deploy CMS to VPS/Railway/Render
4. Deploy frontend to Vercel/Netlify
5. Set up error tracking (Sentry)
6. Configure logging (Winston/Pino)
7. Implement database backups
8. Create deployment documentation

---

## High Priority Issues

### 4. Role Auto-Upgrade Hook (Development Mode)
**Priority**: 🟡 **HIGH**

**Issue**:
Auto-upgrade hook in `Users.ts` promotes all users to 'editor' in development:
```typescript
if (isDevelopment && ['guest', 'member'].includes(data.role)) {
  data.role = 'editor';
}
```

**Risk**:
- Could accidentally run in production if `NODE_ENV` not set correctly
- Users might get unexpected permissions

**Solution**:
- Add explicit environment check
- Document clearly in deployment guide
- Add production validation tests
- Consider feature flag instead

---

### 5. Missing Rate Limiting
**Priority**: 🟡 **HIGH**

**Issue**:
Rate limit configured but not enforced:
```env
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=60000
```

**Impact**:
- Vulnerable to DoS attacks
- No protection against brute force
- API abuse possible
- No import throttling

**Solution**:
```typescript
// Add express-rate-limit
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: process.env.RATE_LIMIT_WINDOW_MS,
  max: process.env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);
```

---

### 6. Email System (Dev Only)
**Priority**: 🟡 **HIGH**

**Issue**:
- Using Mailpit for development
- No production SMTP configured
- Email verification won't work in production

**Impact**:
- Cannot send emails in production
- User verification broken
- Password reset broken

**Solution**:
- Integrate Resend or SendGrid
- Add email templates
- Configure production SMTP
- Test email delivery

---

## Medium Priority Issues

### 7. No Error Boundaries
**Priority**: 🟠 **MEDIUM**

**Issue**:
- Limited error boundary implementation
- Errors can crash entire app
- No graceful degradation

**Files to Update**:
- `apps/web/src/app/error.tsx` (exists, needs enhancement)
- `apps/web/src/app/global-error.tsx` (exists, needs enhancement)
- Add error boundaries to critical components

**Recommendation**:
```typescript
// Add to critical sections
<ErrorBoundary fallback={<ErrorFallback />}>
  <DigivolutionEditor />
</ErrorBoundary>
```

---

### 8. No Logging Strategy
**Priority**: 🟠 **MEDIUM**

**Issue**:
- Using `console.log` everywhere
- No structured logging
- No log levels
- No log aggregation

**Solution**:
```bash
pnpm add winston pino
```

**Implement**:
```typescript
// lib/logger.ts
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}
```

---

### 9. No Database Migrations
**Priority**: 🟠 **MEDIUM**

**Issue**:
- Schema changes require manual updates
- No version tracking
- No rollback capability

**Impact**:
- Risk of data loss
- Difficult to sync environments
- No audit trail

**Solution**:
- Implement migration system
- Version control schema changes
- Document migration process

---

### 10. Missing Security Headers
**Priority**: 🟠 **MEDIUM**

**Issue**:
- No security headers configured
- Vulnerable to clickjacking
- No XSS protection headers

**Solution**: See [08-SECURITY.md](./08-SECURITY.md) for header configuration

---

## Low Priority Technical Debt

### 11. Duplicate Code in Import Scripts
**Files**: `scripts/bulk-import-*.ts` (5 variants)

**Issue**: Similar logic duplicated across files
**Solution**: Extract common functionality to shared utility

---

### 12. Hard-Coded URLs
**Issue**: Some localhost URLs hard-coded in components
**Solution**: Use environment variables consistently

---

### 13. Missing TypeScript Strict Checks
**Issue**: Some `any` types used
**Solution**: Enable stricter TypeScript rules, eliminate `any`

---

### 14. No Component Documentation
**Issue**: Complex components lack JSDoc comments
**Solution**: Add Storybook or component documentation

---

### 15. Missing Accessibility Features
**Issue**: Limited ARIA labels and keyboard navigation
**Solution**: Audit with axe-core, add ARIA attributes

---

## Known Bugs (None Currently)

No active bugs reported. This section will track bugs as they're discovered.

---

## Performance Concerns

### 16. Large Payload on Digimon List Page
**Issue**: Fetches all Digimon data at once
**Solution**: Implement cursor-based pagination

### 17. No Image Lazy Loading (Partial)
**Issue**: Some images load eagerly
**Solution**: Add `loading="lazy"` to remaining images

### 18. No Bundle Analysis
**Issue**: Don't know what's in production bundle
**Solution**: Add `@next/bundle-analyzer`

---

## Future Enhancements (Backlog)

### Search Improvements
- [ ] Add full-text search (MeiliSearch/Algolia)
- [ ] Search suggestions/autocomplete
- [ ] Filter persistence in URL
- [ ] Advanced search UI

### Content Features
- [ ] Content versioning
- [ ] Draft/publish workflow
- [ ] Scheduled publishing
- [ ] Content preview
- [ ] Revision history

### User Features
- [ ] User profiles with avatars
- [ ] Activity tracking
- [ ] Favorites/bookmarks
- [ ] User contributions tracking

### Admin Features
- [ ] Bulk operations UI
- [ ] Import queue system
- [ ] Data export functionality
- [ ] Analytics dashboard

### Mobile
- [ ] React Native app
- [ ] Improved mobile PWA
- [ ] Offline data sync
- [ ] Push notifications

### Internationalization
- [ ] i18n framework (next-intl)
- [ ] Multi-language content
- [ ] Locale-based routes
- [ ] Translation management

---

## Priority Matrix

### Must Fix Before Production
1. Automated testing
2. Production deployment setup
3. Rate limiting
4. Production email configuration
5. Security headers
6. Error monitoring
7. Logging system
8. Database backups

### Should Fix Soon
9. Refactor server.ts
10. Role upgrade hook review
11. Error boundaries
12. Database migrations
13. Remove dev dependencies from production

### Nice to Have
14. Bundle analysis
15. Component documentation
16. Advanced search
17. Content versioning
18. i18n support

---

## How to Contribute

### Reporting Issues
1. Check existing issues first
2. Provide reproduction steps
3. Include environment details
4. Add screenshots if applicable

### Proposing Enhancements
1. Open discussion first
2. Explain use case
3. Consider breaking changes
4. Provide implementation ideas

### Fixing Issues
1. Create feature branch
2. Write tests first (TDD)
3. Follow code style
4. Update documentation
5. Submit pull request
