/**
 * Parser Service — extracts Digimon data from wiki HTML and wikitext.
 * Pure parsing logic — no DB access, no side effects.
 *
 * HTML fallback / digivolution / overview parsing is in parser-html.service.ts
 */
import * as cheerio from 'cheerio';
import { DIGIMON_FORMS } from '@dmo-kb/shared';
import { createLogger } from './logger';
import {
  normalizeDigimonName,
  extractFullImagePath,
  toAbsoluteWikiUrl,
  mapAttackerType,
} from '../utils/helpers';
import type {
  DigimonPreview,
  DigimonSkill,
} from '../types/scraper.types';
import {
  parseHtmlFallbacks,
  parseDigivolutions,
  parseOverview,
  enrichSkillsFromAttackTable,
  enrichSkillIconsFromHtml,
} from './parser-html.service';

const log = createLogger('parser');

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Parse a complete DigimonPreview from wiki HTML + optional wikitext.
 */
export function parseDigimonFromWiki(
  html: string,
  wikitext: string,
  digimonSlug: string,
): DigimonPreview {
  const $ = cheerio.load(html);

  const preview = createEmptyPreview(digimonSlug);

  // Phase 1: Extract images
  const images = extractImages($, digimonSlug);

  // Phase 2: Parse wikitext (primary source)
  if (wikitext) {
    parseWikitextFields(wikitext, preview);
    parseWikitextStats(wikitext, preview);
    parseWikitextSkills(wikitext, preview);
    parseWikitextSpecialEffects(wikitext, preview);
  }

  // Phase 3: Parse skills from HTML tables (backup / enrichment)
  if (preview.skills.length === 0) {
    parseHtmlSkillsFallback($, preview);
  }
  enrichSkillsFromAttackTable($, preview);
  enrichSkillIconsFromHtml($, preview);

  // Phase 4: HTML fallbacks for missing core fields
  parseHtmlFallbacks($, wikitext, preview, digimonSlug);

  // Phase 5: Digivolutions
  parseDigivolutions($, wikitext, preview, digimonSlug);

  // Phase 6: Overview (pros/cons)
  parseOverview($, wikitext, preview);

  // Phase 7: Special form detection (must run after category parsing)
  applyFormOverrides(preview);

  // Attach raw image URLs (will be downloaded later by scraper service)
  preview.iconUrl = images.iconUrl || undefined;
  preview.mainImageUrl = images.mainImageUrl || undefined;

  return preview;
}

/**
 * Fetch the wikitext source by hitting the edit page.
 */
export async function fetchWikitext(digimonSlug: string): Promise<string> {
  const editUrl = `https://dmowiki.com/index.php?title=${encodeURIComponent(digimonSlug)}&action=edit`;
  try {
    const response = await fetch(editUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    });
    if (response.ok) {
      const editHtml = await response.text();
      const $edit = cheerio.load(editHtml);
      const val = $edit('textarea#wpTextbox1').val();
      return typeof val === 'string' ? val : '';
    }
  } catch {
    log.debug({ slug: digimonSlug }, 'Could not fetch edit page for wikitext');
  }
  return '';
}

// ── Empty Preview Factory ───────────────────────────────────────────────────

function createEmptyPreview(slug: string): DigimonPreview {
  return {
    name: slug,
    slug: slug.toLowerCase().replace(/\s+/g, '-'),
    form: 'Rookie',
    element: 'Neutral',
    attribute: 'None',
    type: null,
    attackerType: null,
    families: [],
    names: { japanese: '', katakana: '', korean: '', chinese: '', thai: '' },
    rank: null,
    defaultLevel: null,
    unlockItems: [],
    unlockRequirements: null,
    introduction: null,
    icon: null,
    mainImage: null,
    stats: { hp: 0, at: 0, de: 0, as: 0, ds: 0, ct: 0, ht: 0, ev: 0 },
    maxStats: { hp: 0, at: 0, de: 0, as: 0, ds: 0, ct: 0, ht: 0, ev: 0 },
    statsNote: null,
    skills: [],
    digivolutions: { digivolvesFrom: [], digivolvesTo: [] },
    deckBuffs: [],
    rideable: null,
    isRiding: false,
    canBeRidden: false,
    canBeHatched: false,
    available: false,
    availableFromEgg: false,
    location: null,
    availableInGDMO: null,
    jogressFrom: null,
    jogressRequirement: null,
    unlockedAtLevel: null,
    unlockedWithItem: null,
    requiredToEvolve: null,
    specialEffects: null,
    uRankPassives: null,
    sssPassives: null,
    overview: { pros: [], cons: [] },
    published: false,
  };
}

// ── Image Extraction ────────────────────────────────────────────────────────

function extractImages($: cheerio.CheerioAPI, slug: string) {
  let iconUrl = '';
  let mainImageUrl = '';

  // Priority 1: mw-file-element in infobox (non-icon)
  const infoboxArtwork = $('.infobox img.mw-file-element, .digimon-infobox img.mw-file-element')
    .filter((_, img) => !($(img).attr('src') || '').includes('_Icon'))
    .first();

  if (infoboxArtwork.length > 0) {
    const src = infoboxArtwork.attr('src') || '';
    if (src) {
      const imagePath = extractFullImagePath(src);
      mainImageUrl = toAbsoluteWikiUrl(imagePath);
    }
  }

  // Fallback 2: Scraper div / infoboxhover
  if (!mainImageUrl) {
    const scraperDiv = $('#scraper-digimon-image, .infoboxhover').first();
    if (scraperDiv.length > 0) {
      const img = scraperDiv.find('img').first();
      const src = img.attr('src') || '';
      if (src && !src.includes('_Icon')) {
        mainImageUrl = toAbsoluteWikiUrl(extractFullImagePath(src));
      }
    }
  }

  // Icon: find in infobox
  const imageInfobox = $('.infobox, .digimon-infobox').first();
  if (imageInfobox.length > 0) {
    iconUrl = findBestIcon($, imageInfobox, slug);
  }

  // Global fallback for icon
  if (!iconUrl) {
    iconUrl = findIconGlobalFallback($, slug);
  }

  // Global fallback for main image
  if (!mainImageUrl) {
    mainImageUrl = findMainImageGlobalFallback($, slug);
  }

  return { iconUrl, mainImageUrl };
}

function findBestIcon($: cheerio.CheerioAPI, infobox: cheerio.Cheerio<any>, slug: string): string {
  const icons = infobox.find('img[src*="_Icon.png"]');
  const variations = buildNameVariations(slug);
  let selected: string | undefined;

  icons.each((_, icon) => {
    const src = $(icon).attr('src') || '';
    if (src && !src.includes('TBD.png')) {
      const isMatch = variations.some((v) => src.toLowerCase().includes(v.toLowerCase().replace(/ /g, '_')));
      if (isMatch) { selected = src; return false; }
    }
  });

  if (!selected) {
    icons.each((_, icon) => {
      const src = $(icon).attr('src') || '';
      if (src && !src.includes('TBD.png')) { selected = src; return false; }
    });
  }

  if (!selected && icons.length > 0) {
    selected = icons.first().attr('src') || undefined;
  }

  return selected ? toAbsoluteWikiUrl(selected) : '';
}

function findIconGlobalFallback($: cheerio.CheerioAPI, slug: string): string {
  const variations = buildNameVariations(slug);
  let selected: string | undefined;

  $('img[src*="_Icon.png"]').each((_, img) => {
    const src = $(img).attr('src');
    if (src && !src.includes('TBD.png')) {
      const isMatch = variations.some((v) => src.toLowerCase().includes(v.toLowerCase().replace(/ /g, '_')));
      if (isMatch) { selected = src; return false; }
      if (!selected) selected = src;
    }
  });

  return selected ? toAbsoluteWikiUrl(selected) : '';
}

function findMainImageGlobalFallback($: cheerio.CheerioAPI, slug: string): string {
  const found: string[] = [];
  $('img').each((_, img) => {
    const src = $(img).attr('src') || '';
    if (
      src.toLowerCase().includes(slug.toLowerCase()) &&
      !src.includes('_Icon') &&
      src.includes('/images/')
    ) {
      found.push(toAbsoluteWikiUrl(extractFullImagePath(src)));
    }
  });
  return found[0] || '';
}

function buildNameVariations(slug: string): string[] {
  return [
    slug,
    slug.replace(/-/g, '_'),
    slug.replace(/-/g, ' '),
    slug.replace(/[()]/g, ''),
    slug.replace(/-/g, '_').replace(/[()]/g, ''),
    slug.replace(/\(/g, '%28').replace(/\)/g, '%29').replace(/-/g, '_'),
    slug.replace(/-/g, ' ').replace(/\s+/g, '_').replace(/\(/g, '_%28').replace(/\)/g, '%29'),
  ];
}

// ── Wikitext Parsing ────────────────────────────────────────────────────────

function parseWikitextFields(wikitext: string, p: DigimonPreview): void {
  const nameFields: [RegExp, keyof typeof p.names][] = [
    [/\|katakana=([^\n|]+)/i, 'katakana'],
    [/\|japname=([^\n|]+)/i, 'japanese'],
    [/\|koreanname=([^\n|]+)/i, 'korean'],
    [/\|hkname=([^\n|]+)/i, 'chinese'],
    [/\|thainame=([^\n|]+)/i, 'thai'],
  ];
  for (const [re, key] of nameFields) {
    const m = wikitext.match(re);
    if (m?.[1]?.trim()) (p.names as any)[key] = m[1].trim();
  }

  const nameMatch = wikitext.match(/\|name=([^\n|]+)/i);
  if (nameMatch?.[1]?.trim()) p.name = nameMatch[1].trim();

  const formMatch = wikitext.match(/\|form=([^\n|]+)/i);
  if (formMatch?.[1]?.trim()) p.form = formMatch[1].trim();

  const attrMatch = wikitext.match(/\|attribute=([^\n|]+)/i);
  if (attrMatch?.[1]?.trim()) p.attribute = attrMatch[1].trim();

  const natAttrMatch = wikitext.match(/\|naturalattribute=([^\n|]+)/i);
  if (natAttrMatch?.[1]?.trim()) p.element = natAttrMatch[1].trim();

  const attTypeMatch = wikitext.match(/\|atttype=([^\n|]+)/i);
  if (attTypeMatch?.[1]?.trim()) {
    const mapped = mapAttackerType(attTypeMatch[1].trim());
    if (mapped) p.attackerType = mapped;
  }

  const rankMatch = wikitext.match(/\|rank=([NASSU+]+)/i);
  if (rankMatch?.[1]) p.rank = rankMatch[1];

  for (const re of [/\|family=([^\n|]+)/i, /\|family2=([^\n|]+)/i, /\|family3=([^\n|]+)/i]) {
    const m = wikitext.match(re);
    if (m?.[1]?.trim()) {
      const val = m[1].trim();
      if (!p.families.includes(val)) p.families.push(val);
    }
  }

  for (const re of [/\|unlocked=([^\n|]+)/i, /\|unlocked2=([^\n|]+)/i, /\|unlocked3=([^\n|]+)/i]) {
    const m = wikitext.match(re);
    if (m?.[1]?.trim()) p.deckBuffs.push(m[1].trim());
  }

  const rideable = wikitext.match(/\|rideable=([^\n|]+)/i);
  if (rideable?.[1]?.trim()) p.rideable = rideable[1].trim();

  const jogressMatch = wikitext.match(/\|jogress=\[\[([^\]]+)\]\][^[]*\[\[([^\]]+)\]\]/i);
  if (jogressMatch) p.jogressFrom = [jogressMatch[1].trim(), jogressMatch[2].trim()];

  const typeMatch = wikitext.match(/\|type=([^\n|]+)/i);
  if (typeMatch?.[1]?.trim()) p.type = typeMatch[1].trim();

  const levelMatch = wikitext.match(/\|level=(\d+)/i);
  if (levelMatch?.[1]) p.defaultLevel = parseInt(levelMatch[1]);

  const ridingMatch = wikitext.match(/\|riding=(Yes|No)/i);
  if (ridingMatch?.[1]) p.isRiding = ridingMatch[1].toLowerCase() === 'yes';

  const eggMatch = wikitext.match(/\|egg=(Yes|No)/i);
  if (eggMatch?.[1]) p.availableFromEgg = eggMatch[1].toLowerCase() === 'yes';

  const locationMatch = wikitext.match(/\|location=([^\n|]+)/i);
  if (locationMatch?.[1]?.trim()) p.location = locationMatch[1].trim();

  const gdmoMatch = wikitext.match(/\|gdmo=(Yes|No)/i);
  if (gdmoMatch?.[1]) p.availableInGDMO = gdmoMatch[1].toLowerCase() === 'yes';

  const neededMatch = wikitext.match(/\|needed=([^\n|]+)/i);
  if (neededMatch?.[1]?.trim()) p.jogressRequirement = neededMatch[1].trim();

  const toMatch = wikitext.match(/\|to=\[\[([^\]]+)\]\]/i);
  if (toMatch?.[1]?.trim()) {
    const name = normalizeDigimonName(toMatch[1].trim());
    if (!p.digivolutions.digivolvesTo.find((d) => d.name === name)) {
      p.digivolutions.digivolvesTo.push({ name });
    }
  }
  const fromMatch = wikitext.match(/\|from=\[\[([^\]]+)\]\]/i);
  if (fromMatch?.[1]?.trim()) {
    const name = normalizeDigimonName(fromMatch[1].trim());
    if (!p.digivolutions.digivolvesFrom.find((d) => d.name === name)) {
      p.digivolutions.digivolvesFrom.push({ name });
    }
  }
}

function parseWikitextStats(wikitext: string, p: DigimonPreview): void {
  const statsMatch = wikitext.match(/\{\{stats\|([^}]+)\}\}/i);
  if (!statsMatch) return;
  const s = statsMatch[1];

  const base = (key: string) => s.match(new RegExp(`base ${key}=([\\d.]+)`, 'i'));
  const max = (key: string) => s.match(new RegExp(`(?<!base )\\b${key}=([\\d.]+)`, 'i'));

  const fields = ['hp', 'ds', 'at', 'de', 'as', 'ct', 'ht', 'ev'] as const;
  for (const f of fields) {
    const b = base(f);
    const m = max(f);
    const isFloat = f === 'ct' || f === 'ev';
    if (b) (p.stats as any)[f] = isFloat ? parseFloat(b[1]) : parseInt(b[1]);
    if (m) (p.maxStats as any)[f] = isFloat ? parseFloat(m[1]) : parseInt(m[1]);
    if (!b && m) (p.stats as any)[f] = (p.maxStats as any)[f];
  }

  const noteMatch = wikitext.match(/\{\{note\|(Approximate statistics with (\d+)% size and level (\d+))\}\}/i);
  if (noteMatch) {
    p.statsNote = { text: noteMatch[1], size: noteMatch[2] + '%', level: parseInt(noteMatch[3]) };
  }
}

function parseWikitextSkills(wikitext: string, p: DigimonPreview): void {
  const attacksMatch = wikitext.match(/\{\{Digimon Attacks\s*\d*[^}]*\n([\s\S]*?)\n\}\}/i);
  if (!attacksMatch) return;
  const str = attacksMatch[1];

  for (let i = 1; i <= 10; i++) {
    const nameM = str.match(new RegExp(`\\|attack${i}=([^\\n|]+)`, 'i'));
    if (!nameM?.[1]?.trim()) continue;

    const skill: DigimonSkill = { name: nameM[1].trim(), type: 'Attack' };

    const attr = str.match(new RegExp(`\\|attribute${i}=([^\\n|]+)`, 'i'));
    const cd = str.match(new RegExp(`\\|cooldown${i}=(\\d+)`, 'i'));
    const ds = str.match(new RegExp(`\\|atk${i}ds=(\\d+)`, 'i'));
    const imgid = str.match(new RegExp(`\\|atk${i}imgid=([^\\n|]+)`, 'i'));
    const anim = str.match(new RegExp(`\\|anim${i}=([\\d.]+)`, 'i'));
    const desc = str.match(new RegExp(`\\|atk${i}desc=([^\\n|]+)`, 'i'));
    const lvl1 = str.match(new RegExp(`\\|atk${i}lv1=(\\d+)`, 'i'));
    const upgrade = str.match(new RegExp(`\\|atk${i}upgrade=(\\d+)`, 'i'));
    const sp = str.match(new RegExp(`\\|skillpoint${i}=([\\d?]+)`, 'i'));

    if (attr?.[1]?.trim()) skill.element = attr[1].trim();
    if (cd) skill.cooldown = parseInt(cd[1]);
    if (ds) skill.dsConsumption = parseInt(ds[1]);
    if (anim) skill.animationTime = parseFloat(anim[1]);
    if (desc?.[1]?.trim()) skill.description = desc[1].trim();
    if (sp) skill.skillPointsPerUpgrade = sp[1] === '?' ? null : parseInt(sp[1]);
    if (imgid?.[1]?.trim()) skill.imageId = imgid[1].trim().replace(/,\s*$/, '');

    if (lvl1 && upgrade) {
      const baseDmg = parseInt(lvl1[1]);
      const upg = parseInt(upgrade[1]);
      skill.damagePerLevel = Array.from({ length: 25 }, (_, j) => ({
        level: j + 1,
        damage: baseDmg + upg * j,
      }));
    }

    p.skills.push(skill);
  }
}

function parseWikitextSpecialEffects(wikitext: string, p: DigimonPreview): void {
  const specialEffects: any = {};
  for (let i = 1; i <= 4; i++) {
    const m = wikitext.match(
      new RegExp(
        `'''F${i} Special (?:Effect|Buff)[^']*- ([^']+)'''[\\s\\S]{0,500}?Duration[:\\s]+(\\d+)[^\\n]*[\\s\\S]{0,200}?Activation[:\\s]+([\\d.]+)%[\\s\\S]{0,300}?(?:Buff|Debuff) Effect[:\\s]+([^\\n]+)`,
        'i',
      ),
    );
    if (m) {
      specialEffects[`f${i}`] = { name: m[1].trim(), duration: m[2], activation: m[3], effect: m[4].trim() };
    }
  }
  if (Object.keys(specialEffects).length > 0) p.specialEffects = specialEffects;

  const uRank: any = {};
  const uAttrPairs: [string, string][] = [
    ['Vaccine U', 'Vaccine'], ['Virus U', 'Virus'], ['Data U', 'Data'], ['Unknown U', 'Unknown'],
  ];
  for (const [tmpl, val] of uAttrPairs) {
    if (wikitext.includes(`{{${tmpl}}}`)) { uRank.attribute = val; break; }
  }
  const uElemPairs: [string, string][] = [
    ['Light U', 'Light'], ['Darkness U', 'Pitch Black'], ['Pitch Black U', 'Pitch Black'],
    ['Thunder U', 'Thunder'], ['Wood U', 'Wood'], ['Steel U', 'Steel'],
    ['Fire U', 'Fire'], ['Water U', 'Water'], ['Ice U', 'Ice'], ['Wind U', 'Wind'],
  ];
  for (const [tmpl, val] of uElemPairs) {
    if (wikitext.includes(`{{${tmpl}}}`)) { uRank.element = val; break; }
  }
  if (Object.keys(uRank).length > 0) p.uRankPassives = uRank;

  const sssPassives: any = {};
  const sssSection = wikitext.match(/===?\s*SSS\+?\s*Rank Passives:?===?[\s\S]*?(?====|$)/i);
  if (sssSection) {
    const txt = sssSection[0];
    const virusM = txt.match(/'''?Virus:?'''?[\s\S]*?Permanent\s+Skilldamage\s+([\d.]+)%\s+increase/i);
    if (virusM) sssPassives.virus = `Permanent Skilldamage ${virusM[1]}% increase`;
    const darkM = txt.match(/'''?Darkness:?'''?[\s\S]*?Stack Effect:\s*Attack\s+([\d/%\s]+)/i);
    if (darkM) sssPassives.darkness = `Stack Effect: Attack ${darkM[1]}`;
    const vaccineM = txt.match(/'''?Vaccine:?'''?[\s\S]*?(Permanent[^\\n]+)/i);
    if (vaccineM) sssPassives.vaccine = vaccineM[1].trim();
    const dataM = txt.match(/'''?Data:?'''?[\s\S]*?(Permanent[^\\n]+|Stack Effect:[^\\n]+)/i);
    if (dataM) sssPassives.data = dataM[1].trim();
  }
  if (Object.keys(sssPassives).length > 0) p.sssPassives = sssPassives;
}

// ── HTML Skill Parsing ──────────────────────────────────────────────────────

function parseHtmlSkillsFallback($: cheerio.CheerioAPI, p: DigimonPreview): void {
  $('table').each((_, table) => {
    const rows = $(table).find('tr');
    rows.each((idx, row) => {
      const cells = $(row).find('td');
      const nameCell = cells.first().find('b');
      if (nameCell.length > 0 && cells.length >= 5) {
        const skillName = nameCell.text().trim();
        if (!skillName) return;
        const skill: DigimonSkill = { name: skillName, type: 'Attack' };

        const iconImg = cells.first().find('img[src*="Icon"]').first();
        if (iconImg.length > 0) {
          const src = iconImg.attr('src');
          if (src?.includes('/images/')) skill.imageId = src;
        }

        const elemImg = $(cells[1]).find('img').first();
        if (elemImg.length > 0) skill.element = elemImg.attr('alt')?.trim() || 'Neutral';

        const cdText = $(cells[2]).text().trim();
        const cdM = cdText.match(/(\d+)\s*seconds?\s*cooldown/i);
        if (cdM) skill.cooldown = parseInt(cdM[1]);

        const dsText = $(cells[3]).text().trim();
        const dsM = dsText.match(/(\d+)\s*DS/i);
        if (dsM) skill.dsConsumption = parseInt(dsM[1]);

        const spText = $(cells[4]).text().trim();
        const spM = spText.match(/(\d+)\s*skill\s*points?\s*per\s*upgrade/i);
        if (spM) skill.skillPointsPerUpgrade = parseInt(spM[1]);

        if (cells.length > 5) {
          const animText = $(cells[5]).text().trim();
          const animM = animText.match(/([\d.]+)\s*seconds?\s*animation/i);
          if (animM) skill.animationTime = parseFloat(animM[1]);
        }

        const nextRow = rows.eq(idx + 1);
        if (nextRow.length > 0) {
          const descCell = nextRow.find('td.atkdesc');
          if (descCell.length > 0) skill.description = descCell.text().trim();
        }

        p.skills.push(skill);
      }
    });
  });
}

// ── Form Overrides ──────────────────────────────────────────────────────────

function applyFormOverrides(p: DigimonPreview): void {
  if (p.name.includes('D-Reaper')) p.form = 'D-Reaper';
  if (p.name.includes('(Burst Mode)') && !p.form.includes('Burst Mode')) p.form = 'Burst Mode';

  if (p.name.includes('(X-Antibody System)')) {
    p.form = p.form + ' X';
  } else if (p.name.includes('(X-Antibody)') && !p.form.includes('X')) {
    p.form = p.form + ' (X-Antibody)';
  }

  if (p.name.includes('(Awaken)') && !p.form.includes('Awaken')) {
    p.form = p.form + ' (Awaken)';
  }

  const isValid = DIGIMON_FORMS.includes(p.form as any);
  if (!isValid) {
    log.warn({ name: p.name, form: p.form }, 'Form may fail validation');
  }
}
