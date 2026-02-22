# Data Models & Schemas - DMO Knowledge Base

Complete database schema reference for all Payload CMS collections.

---

## Collections Overview

| Collection | Purpose | Fields | Access Level |
|------------|---------|--------|--------------|
| Users | User accounts + RBAC | 12 | Public read, restricted write |
| Digimon | Digimon database | 40+ | Public read, editor write |
| EvolutionLines | Evolution trees | 7 | Public read, editor write |
| Media | File uploads | 10 | Public read, editor write |
| Items | In-game items | 8 | Public read, editor write |
| Maps | Game maps | 10 | Public read, editor write |
| Quests | Quest data | 12 | Public read, editor write |
| Guides | User guides | 8 | Public read, editor write |
| Tools | Calculators/utilities | 7 | Public read, editor write |
| PatchNotes | Patch notes | 7 | Public read, editor write |
| Events | In-game events | 7 | Public read, editor write |

---

## Users Collection

**File**: `apps/cms/src/collections/Users.ts`

### Fields
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | text | ✅ | User email (unique) |
| `username` | text | ❌ | Optional username |
| `password` | text | ✅ | Hashed password |
| `role` | select | ✅ | RBAC role (guest/member/editor/admin/owner) |
| `discordId` | text | ❌ | Discord user ID (OAuth) |
| `discordUsername` | text | ❌ | Discord username |
| `avatar` | text | ❌ | Avatar URL |
| `verified` | checkbox | - | Email verification status |
| `_verified` | date | - | Verification date |
| `_verificationToken` | text | - | Email verification token |
| `loginAttempts` | number | - | Failed login count |
| `lockUntil` | date | - | Account lock expiry |

### Role Hierarchy
1. **guest** - Read-only access
2. **member** - Default registered user
3. **editor** - Can create/edit content
4. **admin** - Full content management
5. **owner** - Full system access

### Hooks
- `beforeChange`: Auto-upgrade to 'editor' in development mode
- Email verification HTML generation
- Discord role sync (optional)

---

## Digimon Collection

**File**: `apps/cms/src/collections/Digimon.ts` (558 lines)

### Core Fields
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | text | ✅ | Digimon name |
| `slug` | text | ✅ | URL-friendly identifier (unique) |
| `introduction` | textarea | ❌ | Lore/description |
| `form` | select | ✅ | Stage (Rookie, Champion, etc.) |
| `rank` | select | ❌ | Power tier (N, A, S, SS, SSS, U) |
| `type` | text | ❌ | Classification (Dragon, Beast, etc.) |
| `attackerType` | select | ❌ | Combat role (QA, SA, NA, DE) |
| `attribute` | select | ✅ | Type affinity (Data, Vaccine, Virus) |
| `element` | select | ✅ | Elemental type |
| `families` | select (multi) | ❌ | Family groups |
| `published` | checkbox | - | Visibility status |

### Localized Names (Group)
| Field | Type | Description |
|-------|------|-------------|
| `names.japanese` | text | 日本語 name |
| `names.katakana` | text | カタカナ name |
| `names.korean` | text | 한국어 name |
| `names.chinese` | text | 中文 name |
| `names.thai` | text | ไทย name |

### Images
| Field | Type | Relation | Description |
|-------|------|----------|-------------|
| `icon` | upload | → Media | Small icon (64x64) |
| `mainImage` | upload | → Media | Main sprite/artwork |
| `images` | array | → Media[] | Additional images |

### Digivolutions (Group)
| Field | Type | Description |
|-------|------|-------------|
| `digivolutions.digivolvesFrom` | array | Previous evolution stages |
| `digivolutions.digivolvesFrom[].name` | text | Digimon name |
| `digivolutions.digivolvesFrom[].requirements` | textarea | Level/stat/item requirements |
| `digivolutions.digivolvesTo` | array | Next evolution stages |
| `digivolutions.digivolvesTo[].name` | text | Digimon name |
| `digivolutions.digivolvesTo[].requiredLevel` | number | Level requirement |
| `digivolutions.digivolvesTo[].requiredItem` | text | Item requirement |
| `digivolutions.jogress` | array | DNA Digivolution partners |

### Stats (Group)
| Field | Type | Description |
|-------|------|-------------|
| `stats.hp` | number | Health points |
| `stats.ds` | number | Digi-Soul |
| `stats.at` | number | Attack |
| `stats.de` | number | Defense |
| `stats.ct` | number | Critical |
| `stats.ht` | number | Hit rate |
| `stats.bl` | number | Block |
| `stats.ev` | number | Evade |

### Skills (Array)
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `skills[].name` | text | ✅ | Skill name |
| `skills[].description` | textarea | ✅ | Skill effect |
| `skills[].type` | select | ❌ | Attack/Support/Passive |
| `skills[].element` | text | ❌ | Elemental attribute |
| `skills[].damage` | text | ❌ | Damage range |
| `skills[].cooldown` | number | ❌ | Cooldown (seconds) |
| `skills[].dsUsage` | number | ❌ | DS cost |
| `skills[].aoe` | checkbox | ❌ | Area of effect |
| `skills[].targetCount` | number | ❌ | Number of targets |

### Additional Fields
| Field | Type | Description |
|-------|------|-------------|
| `variants` | array | Alternative forms/variants |
| `sizePct` | number | Size percentage (100 = normal) |
| `obtain` | textarea | How to obtain |
| `evolutionLine` | relationship | → EvolutionLines |
| `sourceUrl` | text | DMO Wiki URL |
| `createdAt` | date | Creation timestamp |
| `updatedAt` | date | Last update timestamp |

### Enums (Constants)

**Forms**: Fresh, In-Training, Rookie, Champion, Ultimate, Mega, Side Mega, Burst Mode, Jogress, Armor, X-Antibody variants, Hybrids, DigiXross, Awaken variants, D-Reaper, Unknown, Special (55 total)

**Ranks**: N, A, A+, S, S+, SS, SS+, SSS, SSS+, U, U+

**Attributes**: None, Virus, Vaccine, Data, Unknown

**Elements**: Land, Fire, Ice, Light, Steel, Neutral, Pitch Black, Thunder, Water, Wind, Wood

**Families**: Dark Area, Deep Savers, Dragon's Roar, Jungle Troopers, Metal Empire, Nature Spirits, Nightmare Soldiers, TBD, Unknown, Virus Busters, Wind Guardians

**Attacker Types**: Quick Attacker, Short Attacker, Near Attacker, Defender

---

## EvolutionLines Collection

**File**: `apps/cms/src/collections/EvolutionLines.ts`

### Fields
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | text | ✅ | Evolution line name |
| `rootDigimon` | relationship | ✅ | → Digimon (starting point) |
| `description` | textarea | ❌ | Line description |
| `visualLayout` | json | ❌ | Cytoscape graph data |
| `digimonInLine` | relationship (multi) | ❌ | → Digimon[] |
| `digimonCount` | number | - | Auto-calculated count |
| `isPublic` | checkbox | - | Visibility (default: true) |

### Hooks
- `afterChange`: Updates all Digimon in line with reference to this evolution line

---

## Media Collection

**File**: `apps/cms/src/collections/Media.ts`

### Fields
| Field | Type | Description |
|-------|------|-------------|
| `filename` | text | File name |
| `mimeType` | text | MIME type |
| `filesize` | number | File size (bytes) |
| `width` | number | Image width |
| `height` | number | Image height |
| `alt` | text | Alt text for accessibility |
| `sourceUrl` | text | Original source URL (DMO Wiki) |
| `url` | text | Local URL (auto-generated) |
| `sizes` | json | Responsive image sizes |
| `uploadedBy` | relationship | → Users |

### Image Processing
- **Sharp**: Resize, optimize, convert to WebP
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
| `type` | select | Item category |
| `icon` | upload | → Media |
| `effect` | textarea | Item effect |
| `obtainMethod` | textarea | How to get |
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
| `levelRange` | text | Recommended level |
| `image` | upload | → Media |
| `bosses` | array of text | Boss names |
| `npcs` | array | NPC data |
| `portals` | array | Portal connections |
| `notes` | richText | Additional info |
| `published` | checkbox | Visibility |

---

## Quests Collection

**File**: `apps/cms/src/collections/Quests.ts`

### Fields
| Field | Type | Description |
|-------|------|-------------|
| `title` | text | Quest title |
| `slug` | text | URL slug |
| `type` | select | Main/Side/Repeatable/Daily/Event |
| `mapRef` | relationship | → Maps |
| `level` | number | Required level |
| `steps` | array | Quest steps |
| `rewards` | array | Quest rewards |
| `repeatable` | checkbox | Can repeat |
| `prereqs` | array | Prerequisite quests |
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
| `content` | richText | Full guide content (Slate) |
| `tags` | array | Guide tags |
| `coverImage` | upload | → Media |
| `author` | relationship | → Users |
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
| `description` | textarea | Tool description |
| `config` | json | Tool configuration |
| `published` | checkbox | Visibility (default: true) |

---

## PatchNotes Collection

**File**: `apps/cms/src/collections/PatchNotes.ts`

### Fields
| Field | Type | Description |
|-------|------|-------------|
| `title` | text | Patch title |
| `date` | date | Patch date |
| `body` | richText | Patch content |
| `images` | array | → Media[] |
| `sourceUrl` | text | Official source |
| `locale` | text | Language (default: en) |

---

## Events Collection

**File**: `apps/cms/src/collections/Events.ts`

### Fields
| Field | Type | Description |
|-------|------|-------------|
| `title` | text | Event name |
| `dateRange.start` | date | Start date |
| `dateRange.end` | date | End date |
| `summary` | textarea | Event summary |
| `rewards` | array | Event rewards |
| `sourceUrl` | text | Official source |
| `locale` | text | Language |

---

## Zod Validation Schemas

**File**: `packages/shared/src/schemas.ts`

All Payload collections have corresponding Zod schemas for type-safe validation:
- `userSchema`
- `digimonSchema`
- `mapSchema`
- `questSchema`
- `guideSchema`
- `toolSchema`
- `patchNoteSchema`
- `eventSchema`

Example:
```typescript
export const digimonSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  rank: z.string(),
  attribute: z.enum(['Data', 'Vaccine', 'Virus', 'Unknown']),
  element: z.string(),
  skills: z.array(digimonSkillSchema),
  stats: digimonStatsSchema,
  published: z.boolean().default(false),
  // ...
});
```
