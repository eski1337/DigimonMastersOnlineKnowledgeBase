# Content Editor Guide

Guide for content authors using the Payload CMS admin interface.

---

## Accessing the CMS

1. Navigate to `http://localhost:3001/admin` (dev) or your production CMS URL
2. Log in with your credentials
3. Your role determines what you can edit (member/editor/admin/owner)

---

## Collections Overview

| Collection | What to Create | Who Can Edit |
|------------|---------------|--------------|
| Digimon | Digimon entries with stats, skills, evolutions | Editor+ |
| Evolution Lines | Visual evolution trees | Editor+ |
| Maps | Game map information | Editor+ |
| Quests | Quest guides and walkthroughs | Editor+ |
| Guides | User guides and tutorials | Editor+ |
| Tools | Calculators and utilities | Editor+ |
| Patch Notes | Game update notes | Editor+ |
| Events | In-game events | Editor+ |
| Media | Images and files | Editor+ |
| Items | In-game items | Editor+ |

---

## Creating Content

### 1. Digimon Entry

**Navigate**: Collections → Digimon → Create New

**Required Fields**:
- **Name**: Digimon name (e.g., "Agumon")
- **Slug**: URL-friendly (auto-generated from name, e.g., "agumon")
- **Form**: Evolution stage (Rookie, Champion, etc.)
- **Attribute**: Data, Vaccine, or Virus
- **Element**: Land, Fire, Ice, etc.

**Optional but Recommended**:
- **Introduction**: Lore/description
- **Rank**: Power tier (N, A, S, SS, SSS, U)
- **Type**: Classification (Dragon, Beast, etc.)
- **Icon**: Small icon image (64x64)
- **Main Image**: Main sprite/artwork
- **Stats**: HP, DS, AT, DE, CT, HT, BL, EV
- **Skills**: Add skills with name, description, type

**Digivolutions**:
- **Digivolves From**: Previous forms (just enter names)
- **Digivolves To**: Next forms with level/item requirements
- **Jogress**: DNA Digivolution partners

**Publishing**:
- Check "Published" to make visible on site
- Leave unchecked for draft mode

### 2. Guide Entry

**Navigate**: Collections → Guides → Create New

**Required Fields**:
- **Title**: Guide title
- **Slug**: Auto-generated URL
- **Content**: Rich text editor (see formatting below)

**Optional**:
- **Summary**: Short description (shown in lists)
- **Tags**: For categorization (beginner, advanced, pvp, etc.)
- **Cover Image**: Upload from Media collection

**Rich Text Formatting**:
- **Bold**: Select text → B button
- **Lists**: Use bullet/numbered list buttons
- **Links**: Select text → link icon → paste URL
- **Headings**: Select text → dropdown → H2/H3
- **Code**: Inline code or code blocks

### 3. Quest Entry

**Navigate**: Collections → Quests → Create New

**Required Fields**:
- **Title**: Quest name
- **Slug**: Auto-generated
- **Type**: Main, Side, Repeatable, Daily, Event, or Tutorial

**Optional**:
- **Map Ref**: Link to related map
- **Level**: Required level
- **Steps**: Add steps in order
  - Each step has order number + description
- **Rewards**: Add reward items
  - Type (exp, item, bits), item name, quantity
- **Repeatable**: Check if quest can be repeated
- **Prereqs**: List prerequisite quest titles

### 4. Map Entry

**Navigate**: Collections → Maps → Create New

**Required Fields**:
- **Name**: Map name (e.g., "File Island")
- **Slug**: Auto-generated

**Optional**:
- **Region**: Geographic area
- **Level Range**: "1-10", "50-60", etc.
- **Image**: Map image/screenshot
- **Bosses**: List of boss names
- **NPCs**: Add NPCs with name/type/location
- **Portals**: Portal connections to other maps
- **Notes**: Additional information (rich text)

---

## Working with Images

### Uploading Images

1. **Navigate**: Collections → Media → Upload
2. **Drag & drop** or click to browse
3. **Add alt text** for accessibility
4. **Save**

### Using Images in Content

**In Digimon**:
- Icon: Select from Media collection
- Main Image: Select from Media collection
- Additional Images: Add multiple

**In Guides** (Rich Text):
- Place cursor where image should go
- Click image button in toolbar
- Select from Media collection or upload new

### Image Best Practices

- **File format**: PNG for icons, JPG for photos, WebP for web
- **Size**: Under 500KB per image
- **Dimensions**: Icons 64x64, main images max 800px width
- **Alt text**: Describe image for screen readers

---

## Slugs

**What**: URL-friendly identifier (e.g., "agumon", "beginner-guide")

**Auto-generation**: Created from title/name automatically
- "Agumon" → "agumon"
- "Beginner's Guide" → "beginners-guide"
- "ShineGreymon (Burst Mode)" → "shinegreymon-burst-mode"

**Manual editing**: Can edit if needed
- Keep lowercase
- Use hyphens, not spaces
- No special characters
- Must be unique per collection

**Used in URLs**:
- `/digimon/agumon`
- `/guides/beginners-guide`
- `/maps/file-island`

---

## Publishing Workflow

### Draft Mode

1. Create content
2. Leave "Published" **unchecked**
3. Save
4. Content saved but **not visible** on website

### Publishing

1. Review content
2. Check "Published" checkbox
3. Save
4. Content **immediately visible** on website

### Unpublishing

1. Edit published content
2. **Uncheck** "Published"
3. Save
4. Content **removed** from website but still in CMS

---

## Tags & Categories

### Adding Tags to Guides

1. Edit guide
2. Scroll to "Tags" field
3. Type tag name
4. Press Enter to add
5. Add multiple tags for discoverability

**Recommended Tags**:
- Difficulty: `beginner`, `intermediate`, `advanced`
- Type: `guide`, `tutorial`, `tips`, `strategy`
- Topic: `pvp`, `pve`, `grinding`, `events`, `digivolution`

---

## Relationships

### Linking Content

**Example**: Quest linked to Map

1. Edit quest
2. Find "Map Ref" field
3. Click dropdown
4. Search/select map
5. Save

**Creates**:
- Quest page shows related map
- Map page can show related quests

### Evolution Lines

**Purpose**: Group related Digimon into evolution trees

1. Navigate to Evolution Lines → Create New
2. Name: "Agumon Line"
3. Root Digimon: Select starting Digimon (e.g., Koromon)
4. Digimon in Line: Select all Digimon in the line
5. Visual Layout: Use Visual Evolution Editor (if available)

---

## Common Tasks

### Bulk Importing Digimon

**Use scripts** (requires admin access):

```bash
# Single Digimon from DMO Wiki
pnpm import:dmowiki

# Bulk import multiple
pnpm import:optimized
```

See [DATA_IMPORT_GUIDE.md](./DATA_IMPORT_GUIDE.md)

### Fixing Broken Links

1. Check "References" tab in CMS
2. Update/remove broken relationships
3. Re-save affected content

### Duplicating Content

1. Open existing content
2. Copy all field values
3. Create New
4. Paste values
5. Change slug to avoid conflict
6. Save

---

## Troubleshooting

### "Permission Denied"

- **Member role**: Can only read
- **Solution**: Ask admin to upgrade to Editor role

### "Slug already exists"

- Each slug must be unique
- Add suffix: `agumon-2`, `agumon-x-antibody`
- Or check if duplicate entry exists

### Images Not Displaying

- Check image was uploaded to Media collection
- Verify Media ID is linked in content
- Clear browser cache
- Check file size (under 5MB)

### Content Not Appearing on Website

- Check "Published" checkbox is **checked**
- Save after publishing
- Wait 10-60 seconds for revalidation (ISR)
- Hard refresh browser (Ctrl+Shift+R)

### Rich Text Formatting Lost

- Payload uses Slate editor
- Some HTML may not be supported
- Use editor buttons, don't paste HTML directly
- For code, use Code Block formatting

---

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Save | Ctrl+S |
| Bold | Ctrl+B |
| Italic | Ctrl+I |
| Link | Ctrl+K |
| Undo | Ctrl+Z |
| Redo | Ctrl+Y |

---

## Best Practices

### Content Quality

- ✅ Write clear, concise descriptions
- ✅ Use proper grammar and spelling
- ✅ Add alt text to all images
- ✅ Link to related content
- ✅ Use tags for organization

### Before Publishing

- [ ] Preview content
- [ ] Check all links work
- [ ] Verify images display correctly
- [ ] Add relevant tags
- [ ] Fill required fields
- [ ] Set appropriate publish status

### Maintenance

- Review content quarterly
- Update outdated information
- Remove broken links
- Refresh screenshots/images
- Consolidate duplicate content

---

## Getting Help

- **Technical Issues**: Contact admin
- **Content Questions**: Check this guide
- **Feature Requests**: Submit via GitHub or contact owner
- **Bugs**: Report with screenshots and steps to reproduce

---

## Role Permissions

| Action | Member | Editor | Admin | Owner |
|--------|--------|--------|-------|-------|
| View content | ✅ | ✅ | ✅ | ✅ |
| Create content | ❌ | ✅ | ✅ | ✅ |
| Edit own content | ❌ | ✅ | ✅ | ✅ |
| Edit any content | ❌ | ✅ | ✅ | ✅ |
| Delete content | ❌ | ❌ | ✅ | ✅ |
| Manage users | ❌ | ❌ | ✅ | ✅ |
| System config | ❌ | ❌ | ❌ | ✅ |

Request role upgrade from admins if needed.
