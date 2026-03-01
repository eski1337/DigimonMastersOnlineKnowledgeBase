/**
 * Parser HTML Service — HTML fallback parsing, digivolution extraction, overview parsing.
 * Split from parser.service.ts to keep files under 500 lines.
 * Pure parsing logic — no DB access, no side effects.
 */
import * as cheerio from 'cheerio';
import { DIGIMON_FAMILIES } from '@dmo-kb/shared';
import { normalizeDigimonName } from '../utils/helpers';
import type { DigimonPreview, DigivolutionEntry } from '../types/scraper.types';

// ── HTML Skill Enrichment ───────────────────────────────────────────────────

export function enrichSkillsFromAttackTable($: cheerio.CheerioAPI, p: DigimonPreview): void {
  const attackTable = $('table.attacktable, table.wikitable')
    .filter((_, t) => $(t).find('th').text().includes('Lv.'))
    .first();
  if (attackTable.length === 0) return;

  attackTable.find('tr').each((rowIdx, row) => {
    if (rowIdx === 0) return;
    const cells = $(row).find('td');
    if (cells.length < 27) return;

    const iconImg = $(cells[0]).find('img').first();
    let skillIconPath: string | null = null;
    if (iconImg.length > 0) {
      const src = iconImg.attr('src');
      if (src?.includes('/images/')) skillIconPath = src;
    }

    const skillName = $(cells[1]).text().trim();
    if (!skillName) return;

    const match = p.skills.find((s) => s.name.toLowerCase() === skillName.toLowerCase());
    if (!match) return;

    if (skillIconPath) match.imageId = skillIconPath;

    const dmg: { level: number; damage: number }[] = [];
    for (let lvl = 1; lvl <= 25; lvl++) {
      const v = parseInt($(cells[lvl + 1]).text().trim());
      if (!isNaN(v)) dmg.push({ level: lvl, damage: v });
    }
    if (dmg.length === 25) match.damagePerLevel = dmg;
  });
}

export function enrichSkillIconsFromHtml($: cheerio.CheerioAPI, p: DigimonPreview): void {
  if (p.skills.length === 0) return;
  $('table').each((_, table) => {
    if ($(table).find('img[src*="Icon"]').length === 0) return;
    $(table).find('tr').each((_, row) => {
      const cells = $(row).find('td');
      if (cells.length < 2) return;
      const nameCell = cells.first().find('b');
      if (nameCell.length === 0) return;
      const htmlName = nameCell.text().trim();
      if (!htmlName) return;
      const match = p.skills.find((s) => s.name.toLowerCase() === htmlName.toLowerCase());
      if (!match) return;
      const iconImg = cells.first().find('img[src*="Icon"]').first();
      if (iconImg.length > 0) {
        const src = iconImg.attr('src');
        if (src?.includes('/images/') && (!match.imageId || !match.imageId.includes('/'))) {
          match.imageId = src;
        }
      }
    });
  });
}

// ── HTML Fallbacks ──────────────────────────────────────────────────────────

export function parseHtmlFallbacks(
  $: cheerio.CheerioAPI,
  wikitext: string,
  p: DigimonPreview,
  slug: string,
): void {
  // Name from page title
  if (!p.name || p.name === slug) {
    const title = $('h1.firstHeading').text().trim();
    if (title) p.name = title;
  }

  // X-Antibody normalization
  if (p.name.includes('(X-Antibody System)')) {
    p.name = p.name.replace(' (X-Antibody System)', ' X');
    p.slug = p.name.toLowerCase().replace(/\s+/g, '-').replace(/[()]/g, '');
  }

  // Introduction
  if (!p.introduction) {
    let intro = '';
    $('p').each((i, el) => {
      if (i < 5) { const t = $(el).text().trim(); if (t) intro += t + '\n\n'; }
    });
    if (intro) p.introduction = intro.trim();
  }

  // Categories
  $('.mw-normal-catlinks a').each((_, el) => {
    const cat = $(el).text().trim();
    parseCategoryField(cat, p);
  });

  p.families = [...new Set(p.families)];

  // SSS passives from HTML (if not found in wikitext)
  if (!p.sssPassives && p.rank?.includes('SSS')) {
    parseSssPassivesFromHtml($, p);
  }

  // Infobox fields (canBeRidden, canBeHatched, available, families, etc.)
  parseInfoboxFields($, p);
}

function parseCategoryField(cat: string, p: DigimonPreview): void {
  const formList = ['Rookie', 'Champion', 'Ultimate', 'Mega', 'In-Training', 'Fresh', 'Armor', 'Hybrid', 'Burst Mode', 'Jogress', 'Side Mega'];
  if ((!p.form || p.form === 'Rookie') && formList.includes(cat)) p.form = cat;

  if (!p.attribute || p.attribute === 'None') {
    if (cat.includes('Virus Attribute')) p.attribute = 'Virus';
    if (cat.includes('Vaccine Attribute')) p.attribute = 'Vaccine';
    if (cat.includes('Data Attribute')) p.attribute = 'Data';
  }

  if (!p.element || p.element === 'Neutral') {
    const elemMap: Record<string, string> = {
      'Fire Attribute': 'Fire', 'Water Attribute': 'Water', 'Ice Attribute': 'Ice',
      'Land Attribute': 'Land', 'Wind Attribute': 'Wind', 'Thunder Attribute': 'Thunder',
      'Light Attribute': 'Light', 'Pitch Black Attribute': 'Pitch Black',
      'Steel Attribute': 'Steel', 'Wood Attribute': 'Wood',
    };
    for (const [key, val] of Object.entries(elemMap)) {
      if (cat.includes(key)) { p.element = val; break; }
    }
  }

  if (!p.attackerType) {
    for (const at of ['Quick Attacker', 'Short Attacker', 'Near Attacker', 'Defender']) {
      if (cat.includes(at)) { p.attackerType = at; break; }
    }
  }

  // Families
  const knownFamilies = [
    "Dragon's Roar", 'Nature Spirits', 'Deep Savers', 'Nightmare Soldiers',
    'Wind Guardians', 'Metal Empire', 'Virus Busters', 'Jungle Troopers', 'Dark Area',
  ];
  for (const fam of knownFamilies) {
    if (cat.includes(fam) && !p.families.includes(fam)) p.families.push(fam);
  }
}

function parseSssPassivesFromHtml($: cheerio.CheerioAPI, p: DigimonPreview): void {
  const sss: any = {};
  $('h2, h3, h4').each((_, heading) => {
    const txt = $(heading).text().trim();
    if (txt.includes('SSS') && txt.includes('Rank Passives')) {
      let cur = $(heading).next();
      let passiveText = '';
      while (cur.length > 0 && !cur.is('h2, h3, h4')) {
        passiveText += cur.text() + '\n';
        cur = cur.next();
      }
      const virusM = passiveText.match(/Virus:\s*Permanent\s+Skilldamage\s+([\d.]+)%\s+increase/i);
      if (virusM) sss.virus = `Permanent Skilldamage ${virusM[1]}% increase`;
      const darkM = passiveText.match(/Darkness:\s*Stack Effect:\s*Attack\s+([\d/%\s]+)/i);
      if (darkM) sss.darkness = `Stack Effect: Attack ${darkM[1]}`;
    }
  });
  if (Object.keys(sss).length > 0) p.sssPassives = sss;
}

function parseInfoboxFields($: cheerio.CheerioAPI, p: DigimonPreview): void {
  const infobox = $('.infobox, .digimon-infobox, #scraper-infobox').first();
  if (infobox.length === 0) return;

  infobox.find('tr').each((_, row) => {
    const cells = $(row).find('td');
    if (cells.length < 2) return;
    const label = $(cells[0]).text().trim().toLowerCase();
    const valueEl = $(cells[1]);
    const valueText = valueEl.text().trim();

    if (label.includes('can be') && label.includes('ridden')) p.canBeRidden = valueText.toLowerCase().includes('yes');
    if (label.includes('can be') && label.includes('hatched')) p.canBeHatched = valueText.toLowerCase().includes('yes');
    if (label.includes('available')) p.available = valueText.toLowerCase().includes('yes');

    if (label.includes('unlocked with item')) {
      const item = valueEl.find('a').last().text().trim();
      if (item) p.unlockedWithItem = item;
    }
    if (label.includes('required to evolve')) {
      const item = valueEl.find('a').last().text().trim();
      if (item) p.requiredToEvolve = item;
    }

    if (label === 'families' || label === 'family') {
      for (const fam of DIGIMON_FAMILIES) {
        if (valueText.includes(fam) && !p.families.includes(fam)) p.families.push(fam);
      }
    }
  });
}

// ── Digivolution Parsing ────────────────────────────────────────────────────

export function parseDigivolutions(
  $: cheerio.CheerioAPI,
  wikitext: string,
  p: DigimonPreview,
  slug: string,
): void {
  parseInfoboxDigivolutions($, p);
  parseDigivolvesSection($, p);
  parseSimpleTableDigivolutions($, p);
  parseHeadingTableDigivolutions($, p);

  if (p.digivolutions.digivolvesFrom.length === 0 && p.digivolutions.digivolvesTo.length === 0) {
    parseIconBasedDigivolutions($, p, slug);
  }
}

function parseInfoboxDigivolutions($: cheerio.CheerioAPI, p: DigimonPreview): void {
  const infobox = $('.infobox, .digimon-infobox, #scraper-infobox').first();
  if (infobox.length === 0) return;

  infobox.find('tr').each((_, row) => {
    const cells = $(row).find('td');
    if (cells.length < 2) return;
    const label = $(cells[0]).text().trim().toLowerCase();

    if (label.includes('digivolves from') || label.includes('digivolved from') || label.includes('prior')) {
      $(cells[1]).find('a').each((_, link) => {
        const href = $(link).attr('href');
        const title = $(link).attr('title') || $(link).text().trim();
        if (href && !href.includes(':') && title?.length) {
          const name = normalizeDigimonName(title);
          if (!p.digivolutions.digivolvesFrom.find((d) => d.name === name)) {
            p.digivolutions.digivolvesFrom.push({ name });
          }
        }
      });
    }

    if (label.includes('digivolves to') || label.includes('next')) {
      const cellHtml = $(cells[1]).html() || '';
      const parts = cellHtml.split(/<br\s*\/?>/i);

      parts.forEach((part) => {
        const $part = $(`<div>${part}</div>`);
        const link = $part.find('a').first();
        if (link.length === 0) return;

        const href = link.attr('href');
        let title = link.attr('title') || link.text().trim();
        if (!href || href.includes(':') || !title?.length) return;

        title = title.replace(/link=\{\{\{[^}]+\}\}\}/g, '').replace(/\{\{\{[^}]+\}\}\}/g, '').trim();
        if (!title || title.includes('{{{') || title.includes('link=')) return;
        title = normalizeDigimonName(title);

        let requiredLevel: number | null = null;
        const beforeLink = part.substring(0, part.indexOf('<a'));
        const lvlM = beforeLink.match(/Lv\.?\s*(\d+)/i);
        if (lvlM) requiredLevel = parseInt(lvlM[1]);

        let requiredItem: string | null = null;
        const afterLink = part.substring(part.indexOf('</a>') + 4);
        const withM = afterLink.match(/\(with\s+([^)]+)\)/i);
        if (withM) requiredItem = withM[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();

        if (!p.digivolutions.digivolvesTo.find((d) => d.name === title)) {
          p.digivolutions.digivolvesTo.push({ name: title!, requiredLevel, requiredItem });
        }
      });
    }
  });
}

function parseDigivolvesSection($: cheerio.CheerioAPI, p: DigimonPreview): void {
  $('h2, h3').each((_, heading) => {
    const text = $(heading).text().trim();
    if (!text.toLowerCase().includes('digivolves') || text.toLowerCase().includes('jogress')) return;

    let cur = $(heading).next();
    let attempts = 0;
    while (cur.length > 0 && attempts < 10) {
      const tag = cur.prop('tagName')?.toLowerCase();
      if (!tag || tag === 'br') { cur = cur.next(); attempts++; continue; }
      if (tag.match(/^h[1-6]$/)) break;

      if (tag === 'table') {
        cur.find('tr').each((_, row) => {
          const links = $(row).find('a[title]').toArray();
          const lvlSpans = $(row).find('.digivolve-level').toArray();
          for (let i = 0; i < links.length - 1; i++) {
            const curName = $(links[i]).attr('title');
            let nextName = $(links[i + 1]).attr('title');
            if (!curName || !nextName || curName.includes(':') || nextName.includes(':')) continue;
            nextName = normalizeDigimonName(nextName);
            if (curName !== p.name) continue;

            const lvlText = $(lvlSpans[i]).text();
            const lvlM = lvlText.match(/Lv\.?\s*(\d+)/i);
            if (!lvlM) continue;
            const level = parseInt(lvlM[1]);

            const existing = p.digivolutions.digivolvesTo.find((d) => d.name === nextName);
            if (existing) {
              existing.requiredLevel = level;
            } else {
              p.digivolutions.digivolvesTo.push({ name: nextName, requiredLevel: level, requiredItem: null });
            }
          }
        });
      }

      cur = cur.next();
      attempts++;
    }
  });
}

function parseSimpleTableDigivolutions($: cheerio.CheerioAPI, p: DigimonPreview): void {
  $('table').each((_, table) => {
    $(table).find('tr').each((_, row) => {
      const cells = $(row).find('td');
      if (cells.length < 2) return;
      const label = $(cells[0]).text().trim().toLowerCase();

      if (label.includes('digivolves from')) {
        addLinksAsDigivolutions($, $(cells[1]), p.digivolutions.digivolvesFrom);
      }
      if (label.includes('digivolves to')) {
        addLinksAsDigivolutions($, $(cells[1]), p.digivolutions.digivolvesTo);
      }
    });
  });
}

function parseHeadingTableDigivolutions($: cheerio.CheerioAPI, p: DigimonPreview): void {
  const heading = $('h2:contains("Digivolves"), h3:contains("Digivolves")').first();
  if (heading.length === 0 || p.digivolutions.digivolvesFrom.length > 0 || p.digivolutions.digivolvesTo.length > 0) return;

  const table = heading.nextAll('table').first();
  if (table.length === 0) return;

  table.find('tr').each((_, row) => {
    const cells = $(row).find('td');
    if (cells.length < 2) return;
    const label = $(cells[0]).text().trim().toLowerCase();
    if (label.includes('to')) addLinksAsDigivolutions($, $(cells[1]), p.digivolutions.digivolvesTo);
    else if (label.includes('from')) addLinksAsDigivolutions($, $(cells[1]), p.digivolutions.digivolvesFrom);
  });
}

function parseIconBasedDigivolutions($: cheerio.CheerioAPI, p: DigimonPreview, slug: string): void {
  $('table').each((_, table) => {
    if ($(table).find('img[src*="_Icon.png"]').length === 0) return;

    $(table).find('tr').each((_, row) => {
      $(row).find('td').each((_, cell) => {
        const $cell = $(cell);
        const isCurrentDigimon = $cell.find('.selecteddigivolve').length > 0 || $cell.find(`a[title="${slug}"]`).length > 0;
        if (!isCurrentDigimon) return;

        const selectedSpan = $cell.find('.selecteddigivolve');
        if (selectedSpan.length === 0) return;

        const allElements = $cell.find('a, span.selecteddigivolve');
        const selectedIndex = allElements.index(selectedSpan);

        $cell.find('a[title]').each((_, link) => {
          const title = $(link).attr('title');
          if (!title || title === slug || title.includes(':')) return;
          const name = normalizeDigimonName(title);
          const linkEl = allElements.filter((_, el) => $(el).is($(link)) || $(el).find(link).length > 0);
          const linkIdx = allElements.index(linkEl.first());

          if (linkIdx < selectedIndex) {
            if (!p.digivolutions.digivolvesFrom.find((d) => d.name === name)) {
              p.digivolutions.digivolvesFrom.push({ name });
            }
          } else if (linkIdx > selectedIndex) {
            if (!p.digivolutions.digivolvesTo.find((d) => d.name === name)) {
              p.digivolutions.digivolvesTo.push({ name });
            }
          }
        });
      });
    });
  });
}

function addLinksAsDigivolutions(
  $: cheerio.CheerioAPI,
  cell: cheerio.Cheerio<any>,
  list: DigivolutionEntry[],
): void {
  cell.find('a').each((_, link) => {
    const href = $(link).attr('href');
    const title = $(link).attr('title') || $(link).text().trim();
    if (href && !href.includes(':') && title?.length) {
      const name = normalizeDigimonName(title);
      if (!list.find((d) => d.name === name)) list.push({ name });
    }
  });
}

// ── Overview Parsing ────────────────────────────────────────────────────────

export function parseOverview($: cheerio.CheerioAPI, wikitext: string, p: DigimonPreview): void {
  // Try HTML first
  $('h2, h3').each((_, heading) => {
    if (!$(heading).text().trim().toLowerCase().includes('overview')) return;
    let cur = $(heading).next();
    while (cur.length > 0 && !cur.is('h2')) {
      const text = cur.text().trim();
      if (text.toLowerCase().includes('pros:') || cur.find('*:contains("Pros:")').length > 0) {
        const list = cur.next('ul');
        if (list.length > 0) list.find('li').each((_, li) => { const t = $(li).text().trim(); if (t) p.overview.pros.push(t); });
      }
      if (text.toLowerCase().includes('cons:') || cur.find('*:contains("Cons:")').length > 0) {
        const list = cur.next('ul');
        if (list.length > 0) list.find('li').each((_, li) => { const t = $(li).text().trim(); if (t) p.overview.cons.push(t); });
      }
      cur = cur.next();
      if (cur.is('h2, h3')) break;
    }
  });

  // Wikitext fallback
  if (wikitext && p.overview.pros.length === 0 && p.overview.cons.length === 0) {
    const section = wikitext.match(/==+\s*Overview\s*==+([\s\S]*?)(?===+|$)/i);
    if (section) {
      const prosM = section[1].match(/===?\s*Pros:?\s*===?[\s\S]*?\n([\s\S]*?)(?====|$)/i);
      if (prosM) {
        const items = prosM[1].match(/^\*\s*(.+)$/gm);
        items?.forEach((l) => { const c = l.replace(/^\*\s*/, '').trim(); if (c) p.overview.pros.push(c); });
      }
      const consM = section[1].match(/===?\s*Cons:?\s*===?[\s\S]*?\n([\s\S]*?)(?====|$)/i);
      if (consM) {
        const items = consM[1].match(/^\*\s*(.+)$/gm);
        items?.forEach((l) => { const c = l.replace(/^\*\s*/, '').trim(); if (c) p.overview.cons.push(c); });
      }
    }
  }
}
