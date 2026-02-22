# Search Strategy

Current implementation and future enhancement path for search functionality.

---

## Current Implementation

### Approach

**MongoDB Text Search** against core collections via Payload CMS API.

- **No external service** (Algolia/Meilisearch) yet
- **Simple, fast** for current scale (<1000 Digimon, <100 guides)
- **Toggleable** for future adapter swap

### API Endpoint

**File**: `apps/web/src/app/api/search/route.ts`

```
GET /api/search?q={query}&page={n}&limit={n}
```

**Query Parameters**:
| Param | Type | Required | Default | Validation |
|-------|------|----------|---------|------------|
| `q` | string | ✅ | - | Min 1 char, max 100 |
| `page` | number | ❌ | 1 | Min 1 |
| `limit` | number | ❌ | 10 | Max 50 |

**Rate Limiting**: 100 requests per 60 seconds per IP

### Validation Schema

```typescript
// Zod schema in apps/web/src/lib/validation-schemas.ts
searchQuerySchema = z.object({
  q: z.string().min(1).max(100),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});
```

---

## Search Flow

```
1. User types query → Browser
2. Browser → GET /api/search?q=greymon
3. Next.js API Route:
   a. Validate query (Zod)
   b. Check rate limit (100/min per IP)
   c. Parallel fetch to CMS:
      - GET /api/digimon?where[name][like]=greymon&limit=5
      - GET /api/guides?where[title][like]=greymon&limit=5
      - GET /api/quests?where[title][like]=greymon&limit=5
      - GET /api/maps?where[name][like]=greymon&limit=5
      - GET /api/tools?where[title][like]=greymon&limit=5
   d. Aggregate results
   e. Transform to standard shape
4. Browser ← JSON response
5. React updates UI
```

---

## Response Shape

```typescript
{
  success: true,
  query: "greymon",
  results: [
    {
      type: "digimon",           // digimon|guide|quest|map|tool
      id: "65a1b2c3d4e5f6789",
      title: "Greymon",
      slug: "greymon",
      description: "A Mega Fire Vaccine",  // Contextual snippet
      image: "http://localhost:3001/media/greymon.png",
      metadata: {                // Type-specific data
        rank: "A",
        element: "Fire",
        attribute: "Vaccine"
      }
    },
    // ... more results
  ],
  total: 15,
  page: 1,
  limit: 10
}
```

---

## Indexed Fields

### MongoDB Text Indexes

**Current** (via Payload):
- Digimon: `name` field (Payload's default search)
- Guides: `title`, `summary` fields
- Quests: `title` field
- Maps: `name` field

**Recommended** (add manually):

```javascript
// Run in MongoDB shell or migration script
db.digimon.createIndex({ 
  name: "text", 
  introduction: "text" 
}, {
  weights: { name: 10, introduction: 1 },
  name: "digimon_text_search"
});

db.guides.createIndex({ 
  title: "text", 
  summary: "text",
  content: "text"
}, {
  weights: { title: 10, summary: 5, content: 1 },
  name: "guides_text_search"
});

db.quests.createIndex({ 
  title: "text",
  notes: "text"
}, {
  weights: { title: 10, notes: 1 },
  name: "quests_text_search"
});
```

---

## Relevance Strategy

### Current

**Simple**: Payload's `[like]` operator (case-insensitive substring match)

```
where[name][like]=greymon
→ Matches: "Greymon", "MetalGreymon", "ShineGreymon"
```

### Planned (with text indexes)

**Text score** ordering:

```javascript
// In CMS API or aggregation pipeline
{
  $text: { $search: "greymon" }
},
{
  score: { $meta: "textScore" }
}
// Sort by score descending
```

**Weighting**:
- Exact name match: 10x
- Title/summary: 5x
- Body content: 1x

---

## Performance

### Current Metrics

- **Latency**: 200-400ms (dev, localhost)
- **Collections searched**: 5 parallel requests
- **Results per collection**: Max 5
- **Total results**: Max 25

### Optimization Path

1. **Add text indexes** (immediate 2-3x speedup)
2. **Cache popular queries** (Redis, 60s TTL)
3. **Debounce frontend** (300ms delay)
4. **Pagination** (already implemented)

---

## Rate Limiting

**Implementation**: `apps/web/src/lib/api-handler.ts`

```typescript
// Applied via withErrorHandler wrapper
export const GET = withErrorHandler(searchHandler, {
  maxRequests: 100,
  windowMs: 60 * 1000, // 1 minute
});
```

**Configuration** (via .env):
```env
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=60000
```

**Enforcement**:
- Per IP address
- 429 status on exceed
- Headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`

---

## Error Handling

### Validation Errors

```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "path": ["q"],
      "message": "Query must be at least 1 character"
    }
  ]
}
```

### Rate Limit Exceeded

```json
{
  "success": false,
  "error": "Too many requests",
  "retryAfter": 45
}
```

### CMS Unavailable

```json
{
  "success": false,
  "error": "Service temporarily unavailable",
  "results": []
}
```

**Behavior**: Returns empty results, doesn't throw

---

## Future Enhancements

### Phase 1: Text Indexes (Week 1)

- [ ] Add MongoDB text indexes to collections
- [ ] Update search to use `$text` operator
- [ ] Sort by text score
- [ ] Add search analytics (track queries)

### Phase 2: Search Service Adapter (Month 1)

**Goal**: Pluggable search backend

```typescript
// apps/web/src/lib/search/adapter.ts
interface SearchAdapter {
  search(query: string, options: SearchOptions): Promise<SearchResult[]>;
  index(collection: string, documents: any[]): Promise<void>;
  deleteIndex(collection: string): Promise<void>;
}

class MongoSearchAdapter implements SearchAdapter { ... }
class AlgoliaSearchAdapter implements SearchAdapter { ... }
```

**Config** (via .env):
```env
SEARCH_ADAPTER=mongodb  # mongodb | algolia | meilisearch
```

### Phase 3: Advanced Features (Month 2-3)

- **Faceted search**: Filter by rank, element, type
- **Autocomplete**: Suggest as user types
- **Fuzzy matching**: "greymen" → "greymon"
- **Synonym support**: "rookie" → "child"
- **Highlighted snippets**: Show matched text
- **Search analytics**: Popular queries, no-results tracking

### Phase 4: Full-Text Search Service (Month 3+)

**Options**:

1. **Algolia** (easiest, paid)
   - Instant setup
   - Great DX
   - $1/month starts
   - 10k searches/month free

2. **Meilisearch** (self-hosted, free)
   - Fast typo-tolerant search
   - Easy to deploy (Docker)
   - No vendor lock-in
   - Requires server maintenance

3. **ElasticSearch** (enterprise, complex)
   - Most powerful
   - Overkill for current scale
   - High maintenance

**Recommendation**: Start with MongoDB → Move to Meilisearch when >5k Digimon or search becomes slow.

---

## Search UI

### Current Implementation

**File**: `apps/web/src/components/search/search-bar.tsx` (if exists)

- Input field with debounce
- Results dropdown
- Click → navigate to item
- Loading states

### Planned Features

- Search history (localStorage)
- Recent searches
- Filter toggles (collection type)
- Sort options (relevance, date, name)
- Empty state with suggestions

---

## Analytics & Monitoring

### Track These Metrics

```typescript
// Log in search handler
logger.info('Search query', {
  query: sanitizedQuery,
  resultsCount: results.length,
  duration: `${Date.now() - startTime}ms`,
  collections: {
    digimon: digimonResults.length,
    guides: guideResults.length,
    // ...
  },
});
```

### Monitor

- **Query distribution**: What are users searching for?
- **No-results rate**: How often do searches fail?
- **Latency p95/p99**: Performance under load
- **Top searches**: What content to prioritize?

---

## Development

### Test Search Locally

```bash
# Start servers
pnpm dev:all

# Test API
curl "http://localhost:3000/api/search?q=agumon"

# With pagination
curl "http://localhost:3000/api/search?q=greymon&page=1&limit=5"
```

### Add New Collection to Search

1. Update `apps/web/src/app/api/search/route.ts`
2. Add parallel fetch for new collection
3. Map results to standard shape
4. Update TypeScript types
5. Add to result aggregation

---

## Security Considerations

- ✅ Rate limiting (100/min per IP)
- ✅ Input validation (Zod schema)
- ✅ Query length limit (max 100 chars)
- ✅ Result limit (max 50 per page)
- ✅ No raw query injection (using Payload's where clause)
- ⚠️ Consider: Add authentication for unlimited searches
- ⚠️ Consider: DDoS protection at infrastructure level

---

## Migration Plan

### Moving from MongoDB to Algolia

```typescript
// 1. Install Algolia
pnpm add algoliasearch

// 2. Create indexing script
// scripts/index-to-algolia.ts
import algoliasearch from 'algoliasearch';

const client = algoliasearch(APP_ID, ADMIN_KEY);
const index = client.initIndex('digimon');

// Fetch all Digimon from Payload
const digimon = await fetchAllDigimon();

// Index to Algolia
await index.saveObjects(digimon.map(d => ({
  objectID: d.id,
  name: d.name,
  slug: d.slug,
  rank: d.rank,
  element: d.element,
  // ... other searchable fields
})));

// 3. Update search route to use Algolia SDK
// 4. Keep MongoDB search as fallback
```

---

## Testing

### Unit Tests

```typescript
// apps/web/tests/unit/lib/search.test.ts
describe('Search validation', () => {
  it('rejects empty query', () => {
    expect(() => searchQuerySchema.parse({ q: '' })).toThrow();
  });
  
  it('clamps limit to max 50', () => {
    const result = searchQuerySchema.parse({ q: 'test', limit: 100 });
    expect(result.limit).toBe(50);
  });
});
```

### Integration Tests

```typescript
// apps/web/tests/integration/api/search.test.ts
describe('GET /api/search', () => {
  it('returns results for valid query', async () => {
    const res = await fetch('/api/search?q=agumon');
    const data = await res.json();
    
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.results).toBeDefined();
  });
});
```

---

## Resources

- [Payload Search Docs](https://payloadcms.com/docs/queries/overview)
- [MongoDB Text Search](https://docs.mongodb.com/manual/text-search/)
- [Algolia Docs](https://www.algolia.com/doc/)
- [Meilisearch Docs](https://docs.meilisearch.com/)
