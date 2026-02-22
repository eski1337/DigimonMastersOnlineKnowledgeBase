# API Routes & Endpoints - DMO Knowledge Base

Complete reference for all frontend routes and API endpoints.

---

## Frontend Routes (Next.js App Router)

### Public Pages
| Route | File | Description |
|-------|------|-------------|
| `/` | `app/page.tsx` | Homepage |
| `/digimon` | `app/digimon/page.tsx` | Digimon list view |
| `/digimon/[slug]` | `app/digimon/[slug]/page.tsx` | Digimon detail page |
| `/digimon/[slug]/digivolutions` | `app/digimon/[slug]/digivolutions/page.tsx` | Evolution tree view |
| `/guides` | `app/guides/page.tsx` | Guides list |
| `/maps` | `app/maps/page.tsx` | Maps list |
| `/quests` | `app/quests/page.tsx` | Quests list |
| `/patch-notes` | `app/patch-notes/page.tsx` | Patch notes list |
| `/patch-notes/[slug]` | `app/patch-notes/[slug]/page.tsx` | Patch note detail |
| `/tools` | `app/tools/page.tsx` | Tools/calculators |

### Authentication Pages
| Route | File | Description |
|-------|------|-------------|
| `/auth/signin` | `app/auth/signin/page.tsx` | Sign in page |
| `/auth/register` | `app/auth/register/page.tsx` | Registration page |
| `/auth/verify` | `app/auth/verify/page.tsx` | Email verification check |
| `/auth/welcome` | `app/auth/welcome/page.tsx` | Post-registration welcome |
| `/auth/error` | `app/auth/error/page.tsx` | Auth error page |
| `/auth/resend-verification` | `app/auth/resend-verification/page.tsx` | Resend verification email |
| `/verify-email` | `app/verify-email/page.tsx` | Email verification handler |

### Protected Pages (Require Auth)
| Route | File | Description |
|-------|------|-------------|
| `/profile` | `app/profile/page.tsx` | User profile |
| `/settings` | `app/settings/page.tsx` | User settings |

### Special Routes
| Route | Description |
|-------|-------------|
| `/404` | Not found page |
| `/500` | Error page |
| `/loading` | Loading state |

---

## API Routes (Next.js)

### Authentication
| Method | Route | File | Description |
|--------|-------|------|-------------|
| `GET/POST` | `/api/auth/[...nextauth]` | `app/api/auth/[...nextauth]/route.ts` | NextAuth handler (all auth) |

### Digimon API
| Method | Route | File | Description |
|--------|-------|------|-------------|
| `GET` | `/api/digimon` | `app/api/digimon/route.ts` | List Digimon (with filters) |
| `GET` | `/api/digimon/[id]` | `app/api/digimon/[id]/route.ts` | Get single Digimon |

### Evolution Lines API
| Method | Route | File | Description |
|--------|-------|------|-------------|
| `GET` | `/api/evolution-lines` | `app/api/evolution-lines/route.ts` | List evolution lines |
| `GET` | `/api/evolution-lines/[id]` | `app/api/evolution-lines/[id]/route.ts` | Get single evolution line |

### Search API
| Method | Route | File | Description |
|--------|-------|------|-------------|
| `GET` | `/api/search` | `app/api/search/route.ts` | Global search |

### Health Checks
| Method | Route | File | Description |
|--------|-------|------|-------------|
| `GET` | `/api/health` | `app/api/health/route.ts` | Health check |
| `GET` | `/api/healthz` | `app/api/healthz/route.ts` | Kubernetes-style health |

---

## Payload CMS API

Base URL: `http://localhost:3001/api`

### Collections (REST API)
All collections follow REST conventions:
- `GET /api/{collection}` - List items
- `GET /api/{collection}/{id}` - Get item
- `POST /api/{collection}` - Create item
- `PATCH /api/{collection}/{id}` - Update item
- `DELETE /api/{collection}/{id}` - Delete item

### Users Collection
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/users/login` | User login |
| `POST` | `/api/users/logout` | User logout |
| `POST` | `/api/users/refresh-token` | Refresh auth token |
| `POST` | `/api/users/me` | Get current user |
| `POST` | `/api/users/forgot-password` | Request password reset |
| `POST` | `/api/users/reset-password` | Reset password |
| `GET` | `/api/users` | List users (admin only) |
| `GET` | `/api/users/{id}` | Get user |
| `PATCH` | `/api/users/{id}` | Update user |
| `DELETE` | `/api/users/{id}` | Delete user |

### Digimon Collection
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| `GET` | `/api/digimon` | List Digimon | Public |
| `GET` | `/api/digimon/{id}` | Get Digimon | Public |
| `POST` | `/api/digimon` | Create Digimon | Editor+ |
| `PATCH` | `/api/digimon/{id}` | Update Digimon | Editor+ |
| `DELETE` | `/api/digimon/{id}` | Delete Digimon | Admin+ |

**Query Parameters**:
- `where[field][operator]=value` - Filtering
- `limit=10` - Pagination limit
- `page=1` - Page number
- `sort=-createdAt` - Sorting
- `depth=1` - Populate relationships

**Example**:
```
GET /api/digimon?where[form][equals]=Mega&limit=20&sort=name
```

### Evolution Lines Collection
| Method | Endpoint | Access |
|--------|----------|--------|
| `GET` | `/api/evolution-lines` | Public |
| `GET` | `/api/evolution-lines/{id}` | Public |
| `POST` | `/api/evolution-lines` | Editor+ |
| `PATCH` | `/api/evolution-lines/{id}` | Editor+ |
| `DELETE` | `/api/evolution-lines/{id}` | Admin+ |

### Media Collection
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| `GET` | `/api/media` | List media | Public |
| `GET` | `/api/media/{id}` | Get media | Public |
| `POST` | `/api/media` | Upload file | Editor+ |
| `DELETE` | `/api/media/{id}` | Delete media | Admin+ |

### Items Collection
| Method | Endpoint | Access |
|--------|----------|--------|
| `GET` | `/api/items` | Public |
| `GET` | `/api/items/{id}` | Public |
| `POST` | `/api/items` | Editor+ |
| `PATCH` | `/api/items/{id}` | Editor+ |
| `DELETE` | `/api/items/{id}` | Admin+ |

### Maps, Quests, Guides, Tools Collections
Same REST pattern as above:
- `/api/maps`
- `/api/quests`
- `/api/guides`
- `/api/tools`

### Patch Notes & Events
- `/api/patch-notes`
- `/api/events`

---

## Custom Endpoints (Payload)

### Email Verification
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/resend-verification` | Resend verification email |

**Request Body**:
```json
{
  "email": "user@example.com"
}
```

### Bulk Skill Update
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/update-digimon-skills` | Update skills for Digimon |

**Request Body**:
```json
{
  "digimonId": "65a1b2c3d4e5f6789",
  "skills": [
    {
      "name": "Pepper Breath",
      "description": "Spits fire at enemy",
      "type": "Attack",
      "element": "Fire"
    }
  ]
}
```

---

## CMS Admin Routes

Base URL: `http://localhost:3001/admin`

### Admin Pages
| Route | Description |
|-------|-------------|
| `/admin` | Dashboard |
| `/admin/collections/digimon` | Digimon management |
| `/admin/collections/users` | User management |
| `/admin/collections/media` | Media library |
| `/admin/account` | Admin account settings |
| `/admin/logout` | Admin logout |

### Batch Import Interface
| Route | Description |
|-------|-------------|
| `/admin/batch-import` | Custom batch import UI |

---

## Query Patterns

### Filtering
```
# Equals
/api/digimon?where[rank][equals]=SSS

# Not equals
/api/digimon?where[rank][not_equals]=N

# Greater than
/api/digimon?where[level][greater_than]=50

# Contains
/api/digimon?where[name][contains]=mon

# In array
/api/digimon?where[element][in]=Fire,Water

# Multiple conditions (AND)
/api/digimon?where[rank][equals]=SSS&where[element][equals]=Fire
```

### Sorting
```
# Ascending
/api/digimon?sort=name

# Descending
/api/digimon?sort=-createdAt

# Multiple fields
/api/digimon?sort=rank,-name
```

### Pagination
```
# Page 1, 10 items
/api/digimon?limit=10&page=1

# Page 2, 20 items
/api/digimon?limit=20&page=2
```

### Population (Relationships)
```
# Populate one level
/api/digimon?depth=1

# Populate two levels
/api/evolution-lines?depth=2
```

---

## Response Formats

### List Response
```json
{
  "docs": [
    { "id": "1", "name": "Agumon", ... },
    { "id": "2", "name": "Gabumon", ... }
  ],
  "totalDocs": 500,
  "limit": 10,
  "totalPages": 50,
  "page": 1,
  "pagingCounter": 1,
  "hasPrevPage": false,
  "hasNextPage": true,
  "prevPage": null,
  "nextPage": 2
}
```

### Single Item Response
```json
{
  "id": "65a1b2c3d4e5f6789",
  "name": "Agumon",
  "slug": "agumon",
  "form": "Rookie",
  "rank": "A",
  "element": "Fire",
  "attribute": "Vaccine",
  ...
}
```

### Error Response
```json
{
  "errors": [
    {
      "message": "Validation failed",
      "field": "name",
      "type": "required"
    }
  ]
}
```

---

## Rate Limiting

Currently configured in `.env`:
```
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=60000
```

- **Default**: 100 requests per 60 seconds per IP
- **Status**: Not enforced in development
- **TODO**: Implement in production

---

## CORS Configuration

Payload CMS CORS (payload.config.ts):
```typescript
cors: [
  process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
]
```

Only frontend origin is allowed to make API calls.
