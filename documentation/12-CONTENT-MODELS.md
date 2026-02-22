# Content Models - Payload CMS Collections

Complete schema reference for all collections with fields, types, relationships, and indexing strategy.

---

## Collections Overview

| Collection | Purpose | Slug Pattern | Indexed Fields | Relations |
|------------|---------|--------------|----------------|-----------|
| Digimon | Digimon entries | `agumon`, `gabumon` | slug, name, rank, element, published | evolutionLine, icon, mainImage |
| Users | User accounts + RBAC | N/A | email, username, role | N/A |
| EvolutionLines | Evolution trees | `agumon-line` | slug, name | rootDigimon, digimonInLine[] |
| Media | File uploads | N/A | filename, sourceUrl | uploadedBy |
| Items | In-game items | `healing-potion` | slug, name, type | icon |
| Maps | Game maps | `file-island` | slug, name, region | image |
| Quests | Quest data | `find-agumon` | slug, title, type | mapRef |
| Guides | User guides | `beginner-guide` | slug, title, tags[] | author, coverImage |
| Tools | Calculators/utilities | `stat-calculator` | slug, title, type | N/A |
| PatchNotes | Patch notes | `patch-2-5` | title, date | images[] |
| Events | In-game events | `summer-event-2024` | title, dateRange | N/A |

---

## Digimon Collection

**File**: `apps/cms/src/collections/Digimon.ts`

### Core Fields

| Field | Type | Required | Unique | Default | Description |
|-------|------|----------|--------|---------|-------------|
| `name` | text | ✅ | ❌ | - | Digimon name (e.g., "Agumon") |
| `slug` | text | ✅ | ✅ | - | URL slug (e.g., "agumon") |
| `introduction` | textarea | ❌ | ❌ | - | Lore/flavor text |
| `form` | select | ✅ | ❌ | - | Evolution stage (55 options) |
| `rank` | select | ❌ | ❌ | - | Power tier (N/A/S/SS/SSS/U) |
| `type` | text | ❌ | ❌ | - | Classification (Dragon, Beast, etc.) |
| `attackerType` | select | ❌ | ❌ | - | QA/SA/NA/DE |
| `attribute` | select | ✅ | ❌ | - | Data/Vaccine/Virus/Unknown |
| `element` | select | ✅ | ❌ | - | Land/Fire/Ice/Light/Steel/etc. |
| `families` | select | ❌ | ❌ | [] | Multi-select families |
| `published` | checkbox | ❌ | ❌ | false | Visibility status |

### Localized Names (Group)

```typescript
names: {
  japanese: string;        // 日本語 name
  katakana: string;        // カタカナ
  korean: string;          // 한국어
  chinese: string;         // 中文
  thai: string;            // ไทย
}
```

### Images (Relationships)

```typescript
icon: Media;              // Small icon (64x64)
mainImage: Media;         // Main sprite
images: Media[];          // Additional images
```

### Digivolutions (Group)

```typescript
digivolutions: {
  digivolvesFrom: [{
    name: string;                    // Required
    requirements: string;            // Optional
  }];
  
  digivolvesTo: [{
    name: string;                    // Required
    requiredLevel: number;           // Optional
    requiredItem: string;            // Optional
  }];
  
  jogress: [{
    partner: Digimon;                // Relationship
    result: Digimon;                 // Relationship
    requirements: string;            // Optional
  }];
}
```

### Stats (Group)

```typescript
stats: {
  hp: number;            // Health
  ds: number;            // Digi-Soul
  at: number;            // Attack
  de: number;            // Defense
  ct: number;            // Critical
  ht: number;            // Hit Rate
  bl: number;            // Block
  ev: number;            // Evade
}
```

### Skills (Array)

```typescript
skills: [{
  name: string;                      // Required
  description: textarea;             // Required
  type: 'Attack'|'Support'|'Passive'; // Optional
  element: string;                   // Optional
  damage: string;                    // Optional
  cooldown: number;                  // Optional (seconds)
  dsUsage: number;                   // Optional (DS cost)
  aoe: boolean;                      // Optional
  targetCount: number;               // Optional
}]
```

### Other Fields

```typescript
variants: [{
  name: string;
  description: textarea;
  image: Media;
}];

sizePct: number;              // 100 = normal size
obtain: textarea;             // How to obtain
evolutionLine: EvolutionLines; // Relationship
sourceUrl: text;              // DMO Wiki URL
```

### Indexes

```javascript
// Recommended MongoDB indexes
db.digimon.createIndex({ slug: 1 }, { unique: true });
db.digimon.createIndex({ name: 1 });
db.digimon.createIndex({ published: 1 });
db.digimon.createIndex({ rank: 1, element: 1 });
db.digimon.createIndex({ form: 1 });
```

### Access Control

- **Read**: Public (published only)
- **Create**: Editor+
- **Update**: Editor+
- **Delete**: Admin+

---

## Users Collection

**File**: `apps/cms/src/collections/Users.ts`

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | email | ✅ | User email (unique, auth) |
| `username` | text | ❌ | Optional username |
| `password` | password | ✅ | Hashed password |
| `role` | select | ✅ | guest/member/editor/admin/owner |
| `discordId` | text | ❌ | Discord OAuth ID |
| `discordUsername` | text | ❌ | Discord username |
| `avatar` | text | ❌ | Avatar URL |
| `verified` | checkbox | - | Email verification status |
| `_verified` | date | - | Verification timestamp |
| `_verificationToken` | text | - | Verification token |

### Role Enum

```typescript
type UserRole = 'guest' | 'member' | 'editor' | 'admin' | 'owner';
```

### Hooks

- `beforeChange`: Auto-upgrade to 'editor' in development mode
- Email verification HTML generation

### Access Control

- **Read**: Public (own profile + admins)
- **Create**: Public (registration)
- **Update**: Self + Admin+
- **Delete**: Admin+

---

## EvolutionLines Collection

**File**: `apps/cms/src/collections/EvolutionLines.ts`

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | text | ✅ | Line name (e.g., "Agumon Line") |
| `slug` | text | ✅ | URL slug |
| `rootDigimon` | relationship | ✅ | Starting Digimon |
| `description` | textarea | ❌ | Line description |
| `visualLayout` | json | ❌ | Cytoscape graph data |
| `digimonInLine` | relationship | ❌ | All Digimon in line (multi) |
| `digimonCount` | number | - | Auto-calculated |
| `isPublic` | checkbox | - | Default: true |

### Visual Layout Structure

```typescript
visualLayout: {
  nodes: [{
    id: string;           // Digimon ID
    position: { x: number; y: number };
  }];
  edges: [{
    source: string;       // From Digimon ID
    target: string;       // To Digimon ID
  }];
}
```

### Hooks

- `afterChange`: Updates all Digimon with evolution line reference

---

## Media Collection

**File**: `apps/cms/src/collections/Media.ts`

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `filename` | text | Generated filename |
| `mimeType` | text | MIME type |
| `filesize` | number | Bytes |
| `width` | number | Image width (px) |
| `height` | number | Image height (px) |
| `alt` | text | Alt text (accessibility) |
| `sourceUrl` | text | Original DMO Wiki URL |
| `url` | text | Local URL (auto-generated) |
| `sizes` | json | Responsive sizes |
| `uploadedBy` | relationship | User who uploaded |

### Image Processing

- **Sharp**: Resize, optimize, WebP conversion
- **Deduplication**: By `sourceUrl` field
- **Storage**: `/media` folder

---

## Items Collection

**File**: `apps/cms/src/collections/Items.ts`

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | text | Item name |
| `slug` | text | URL slug |
| `description` | textarea | Item description |
| `type` | select | Consumable/Equipment/Material/etc. |
| `icon` | relationship | Media (icon image) |
| `effect` | textarea | What the item does |
| `obtainMethod` | textarea | How to get it |
| `published` | checkbox | Visibility |

---

## Maps Collection

**File**: `apps/cms/src/collections/Maps.ts`

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | text | Map name |
| `slug` | text | URL slug |
| `region` | text | Geographic region |
| `levelRange` | text | "1-10", "50-60", etc. |
| `image` | relationship | Map image (Media) |
| `bosses` | array (text) | Boss names |
| `npcs` | array (group) | NPC data with name/type/location |
| `portals` | array (group) | Portal connections + requirements |
| `notes` | richText | Additional info (Slate) |
| `published` | checkbox | Visibility |

---

## Quests Collection

**File**: `apps/cms/src/collections/Quests.ts`

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `title` | text | Quest title |
| `slug` | text | URL slug |
| `type` | select | Main/Side/Repeatable/Daily/Event/Tutorial |
| `mapRef` | relationship | Map (optional) |
| `level` | number | Required level |
| `steps` | array (group) | Quest steps with order + description |
| `rewards` | array (group) | Reward type/item/quantity |
| `repeatable` | checkbox | Can repeat |
| `prereqs` | array (text) | Prerequisite quest titles |
| `notes` | richText | Additional notes |
| `published` | checkbox | Visibility |

---

## Guides Collection

**File**: `apps/cms/src/collections/Guides.ts`

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `title` | text | Guide title |
| `slug` | text | URL slug |
| `summary` | textarea | Short summary |
| `content` | richText | Full guide (Slate editor) |
| `tags` | array (text) | Guide tags |
| `coverImage` | relationship | Cover image (Media) |
| `author` | relationship | User who created |
| `published` | checkbox | Visibility |

---

## Tools Collection

**File**: `apps/cms/src/collections/Tools.ts`

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `title` | text | Tool name |
| `slug` | text | URL slug |
| `type` | select | calculator/tracker/utility/simulator |
| `description` | textarea | What the tool does |
| `config` | json | Tool-specific configuration |
| `published` | checkbox | Default: true |

---

## PatchNotes Collection

**File**: `apps/cms/src/collections/PatchNotes.ts`

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `title` | text | Patch title ("Version 2.5") |
| `date` | date | Patch release date |
| `body` | richText | Patch content |
| `images` | array (relationship) | Screenshot images |
| `sourceUrl` | text | Official source URL |
| `locale` | text | Language (default: "en") |

---

## Events Collection

**File**: `apps/cms/src/collections/Events.ts`

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `title` | text | Event name |
| `dateRange.start` | date | Event start date |
| `dateRange.end` | date | Event end date (optional) |
| `summary` | textarea | Event summary |
| `rewards` | array (text) | Event rewards |
| `sourceUrl` | text | Official source URL |
| `locale` | text | Language |

---

## Indexing Strategy

### High-Priority Indexes

```javascript
// Slugs (unique, frequent lookups)
db.digimon.createIndex({ slug: 1 }, { unique: true });
db.maps.createIndex({ slug: 1 }, { unique: true });
db.quests.createIndex({ slug: 1 }, { unique: true });
db.guides.createIndex({ slug: 1 }, { unique: true });

// Published status (filtering)
db.digimon.createIndex({ published: 1 });
db.guides.createIndex({ published: 1 });
db.quests.createIndex({ published: 1 });

// Text search
db.digimon.createIndex({ name: "text", introduction: "text" });
db.guides.createIndex({ title: "text", summary: "text", content: "text" });
db.quests.createIndex({ title: "text", notes: "text" });

// Relationships
db.digimon.createIndex({ evolutionLine: 1 });
db.media.createIndex({ uploadedBy: 1 });

// Compound indexes
db.digimon.createIndex({ rank: 1, element: 1 });
db.digimon.createIndex({ form: 1, published: 1 });
```

### Medium-Priority Indexes

```javascript
// Filtering fields
db.digimon.createIndex({ attribute: 1 });
db.digimon.createIndex({ families: 1 });
db.quests.createIndex({ type: 1 });
db.maps.createIndex({ region: 1 });

// Deduplication
db.media.createIndex({ sourceUrl: 1 }, { unique: true, sparse: true });

// Auth
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ username: 1 }, { unique: true, sparse: true });
```

### Monitoring

```javascript
// Check index usage
db.digimon.aggregate([{ $indexStats: {} }]);

// Explain query performance
db.digimon.find({ slug: "agumon" }).explain("executionStats");
```

---

## Migration Notes

### Adding New Fields

1. Add field to Payload collection config
2. Restart CMS server (auto-generates types)
3. Update Zod schemas in `packages/shared` if needed
4. No manual migration needed (Mongoose auto-creates fields)

### Schema Changes

Payload handles schema evolution automatically via Mongoose. For breaking changes:
1. Write migration script in `scripts/migrations/`
2. Run before deployment
3. Document in CHANGELOG.md

### Seeding

```bash
# Seed all data
pnpm seed

# Seed specific collection
pnpm seed:digimon
```

See `scripts/seed.ts` and `scripts/seed-digimon.ts` for implementation.
