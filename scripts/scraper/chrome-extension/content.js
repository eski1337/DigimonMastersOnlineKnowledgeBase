/**
 * DMO Wiki Scraper — Content Script
 * Generic page ripper for ANY dmowiki.com page.
 * Extracts all structured content: text sections, tables, images, links, infoboxes.
 */

/* ── Helpers ───────────────────────────────────────────────────────── */

function fixSrc(src) {
  if (!src) return '';
  if (src.startsWith('//')) return 'https:' + src;
  if (src.startsWith('/')) return 'https://dmowiki.com' + src;
  return src;
}

function fixHref(href) {
  if (!href) return '';
  if (href.startsWith('//')) return 'https:' + href;
  if (href.startsWith('/')) return 'https://dmowiki.com' + href;
  return href;
}

/* ── Main scrape function ──────────────────────────────────────────── */

function scrapePage() {
  const url = window.location.href;
  const data = { url, scrapedAt: new Date().toISOString() };

  // Page title
  const h1 = document.querySelector('#firstHeading .mw-page-title-main, #firstHeading, h1');
  data.title = h1 ? h1.textContent.trim() : document.title.replace(/ - .+$/, '').trim();

  // Page slug (from URL)
  const pathMatch = url.match(/dmowiki\.com\/(.+?)(?:[#?]|$)/);
  data.slug = pathMatch ? decodeURIComponent(pathMatch[1]) : '';

  // Detect page type
  data.pageType = detectPageType();

  // Wiki content container
  const content = document.querySelector('.mw-parser-output');
  if (!content) {
    data.error = 'No wiki content found on this page';
    return data;
  }

  // Categories
  data.categories = extractCategories();

  // Infobox (sidebar box on many wiki pages)
  data.infobox = extractInfobox(content);

  // All sections with headings + body text
  data.sections = extractSections(content);

  // All images
  data.images = extractImages(content);

  // All tables (structured)
  data.tables = extractTables(content);

  // All internal links (to other wiki pages)
  data.links = extractLinks(content);

  // Full plain text (for search / fallback)
  data.plainText = content.textContent.replace(/\s+/g, ' ').trim().substring(0, 50000);

  // Raw HTML (for re-parsing later if needed)
  data.rawHTML = content.innerHTML;

  return data;
}

/* ── Page type detection ───────────────────────────────────────────── */

function detectPageType() {
  const url = window.location.href;
  const content = document.querySelector('.mw-parser-output');
  if (!content) return 'unknown';

  const text = content.textContent.toLowerCase();
  const cats = Array.from(document.querySelectorAll('#mw-normal-catlinks a')).map(a => a.textContent.toLowerCase());
  const catsStr = cats.join(' ');

  // Check URL patterns first
  if (/\/Maps$/i.test(url)) return 'map-index';
  if (/\/Category:/i.test(url)) return 'category';

  // Check categories
  if (catsStr.includes('map') || catsStr.includes('location') || catsStr.includes('area')) return 'map';
  if (catsStr.includes('digimon') && !catsStr.includes('system')) return 'digimon';
  if (catsStr.includes('item')) return 'item';
  if (catsStr.includes('quest')) return 'quest';
  if (catsStr.includes('npc')) return 'npc';
  if (catsStr.includes('game system') || catsStr.includes('system')) return 'system';
  if (catsStr.includes('event')) return 'event';
  if (catsStr.includes('dungeon') || catsStr.includes('instance')) return 'dungeon';

  // Fallback: content heuristics
  if (text.includes('wild digimon') && text.includes('npc')) return 'map';
  if (text.includes('digivolution') || text.includes('evolves from') || text.includes('evolves to')) return 'digimon';
  if (text.includes('quest reward') || text.includes('quest giver')) return 'quest';

  return 'other';
}

/* ── Categories ────────────────────────────────────────────────────── */

function extractCategories() {
  const cats = [];
  document.querySelectorAll('#mw-normal-catlinks a').forEach(a => {
    const name = a.textContent.trim();
    if (name && name !== 'Categories') cats.push(name);
  });
  return cats;
}

/* ── Infobox (sidebar info panel) ──────────────────────────────────── */

function extractInfobox(content) {
  // Match standard infobox classes, or the dmowiki float-right wikitable pattern
  const box = content.querySelector('.infobox, .wikitable.infobox, table.infobox, .portable-infobox')
    || content.querySelector('table[style*="float:right"], table[style*="float: right"]');
  if (!box) return null;

  const info = { fields: {}, images: [] };

  box.querySelectorAll('tr').forEach(tr => {
    const ths = tr.querySelectorAll('th');
    const tds = tr.querySelectorAll('td');

    // Standard: th + td
    if (ths.length > 0 && tds.length > 0) {
      const key = ths[0].textContent.trim().replace(/:$/, '');
      const val = tds[0].textContent.trim();
      if (key && val) info.fields[key] = val;
      tds[0].querySelectorAll('img').forEach(img => {
        const src = fixSrc(img.getAttribute('src') || '');
        if (src && !src.includes('pixel')) info.images.push({ src, alt: img.getAttribute('alt') || '', context: key });
      });
    }
    // dmowiki pattern: two td cells where first has a <b> label
    else if (tds.length >= 2) {
      const labelBold = tds[0].querySelector('b');
      const key = (labelBold ? labelBold.textContent : tds[0].textContent).trim().replace(/:$/, '');
      const val = tds[1].textContent.trim();
      if (key && val) info.fields[key] = val;
      tds[1].querySelectorAll('img').forEach(img => {
        const src = fixSrc(img.getAttribute('src') || '');
        if (src && !src.includes('pixel')) info.images.push({ src, alt: img.getAttribute('alt') || '', context: key });
      });
    }
    // Single-cell row with images (header/main image)
    else if (tds.length === 1 || (ths.length === 1 && tds.length === 0)) {
      const cell = tds[0] || ths[0];
      cell.querySelectorAll('img').forEach(img => {
        const src = fixSrc(img.getAttribute('src') || '');
        if (src && !src.includes('pixel')) info.images.push({ src, alt: img.getAttribute('alt') || '', context: 'header' });
      });
    }
  });

  // Caption / title
  const caption = box.querySelector('caption, th[colspan], td[colspan].tableheader');
  if (caption) info.title = caption.textContent.trim();

  return (Object.keys(info.fields).length > 0 || info.images.length > 0) ? info : null;
}

/* ── Sections (headings + body content) ────────────────────────────── */

function extractSections(content) {
  const sections = [];
  const headings = content.querySelectorAll('h2, h3, h4');

  // Content before first heading
  const preContent = [];
  let node = content.firstElementChild;
  while (node && !['H2', 'H3', 'H4'].includes(node.tagName)) {
    if (node.tagName === 'P' && node.textContent.trim()) {
      preContent.push(node.textContent.trim());
    }
    node = node.nextElementSibling;
  }
  if (preContent.length > 0) {
    sections.push({ heading: '(Introduction)', level: 1, text: preContent.join('\n\n') });
  }

  headings.forEach(heading => {
    const headingText = heading.textContent.replace(/\[edit\]/gi, '').trim();
    if (!headingText || headingText === 'Contents' || headingText === 'Navigation menu') return;

    const level = parseInt(heading.tagName.substring(1));
    const bodyParts = [];
    let el = heading.nextElementSibling;

    while (el && !['H2', 'H3', 'H4'].includes(el.tagName)) {
      if (el.tagName === 'P' && el.textContent.trim()) {
        bodyParts.push(el.textContent.trim());
      }
      if (el.tagName === 'UL' || el.tagName === 'OL') {
        const items = Array.from(el.querySelectorAll('li')).map(li => '• ' + li.textContent.trim());
        bodyParts.push(items.join('\n'));
      }
      if (el.tagName === 'DL') {
        const items = Array.from(el.querySelectorAll('dd, dt')).map(d => d.textContent.trim());
        bodyParts.push(items.join('\n'));
      }
      el = el.nextElementSibling;
    }

    sections.push({
      heading: headingText,
      level,
      text: bodyParts.join('\n\n'),
    });
  });

  return sections;
}

/* ── Images ────────────────────────────────────────────────────────── */

function extractImages(content) {
  const images = [];
  const seen = new Set();

  content.querySelectorAll('img').forEach(img => {
    let src = fixSrc(img.getAttribute('src') || '');
    // Skip tiny tracking pixels and UI icons
    if (!src || src.includes('pixel') || src.includes('1x1')) return;
    // Get the full-res version if available (strip /thumb/ path and size suffix)
    const fullRes = src.replace(/\/thumb(\/[a-f0-9]\/[a-f0-9]{2}\/)/, '$1').replace(/\/\d+px-[^/]+$/, '');
    const useSrc = fullRes.includes('/images/') ? fullRes : src;

    if (seen.has(useSrc)) return;
    seen.add(useSrc);

    const alt = img.getAttribute('alt') || '';
    const w = img.naturalWidth || parseInt(img.getAttribute('width') || '0');
    const h = img.naturalHeight || parseInt(img.getAttribute('height') || '0');

    // Find caption if inside a figure/thumb container
    let caption = '';
    const thumbDiv = img.closest('.thumb, .thumbinner, figure, .gallerytext');
    if (thumbDiv) {
      const capEl = thumbDiv.querySelector('.thumbcaption, figcaption, .gallerytext');
      if (capEl) caption = capEl.textContent.trim();
    }

    // Find nearest heading for context
    let context = '';
    let walk = img.closest('div, td, section');
    while (walk && !context) {
      const prev = walk.previousElementSibling;
      if (prev && ['H2', 'H3', 'H4'].includes(prev.tagName)) {
        context = prev.textContent.replace(/\[edit\]/gi, '').trim();
      }
      walk = walk.parentElement;
    }

    images.push({ src: useSrc, thumbnail: src !== useSrc ? src : undefined, alt, caption, context, width: w, height: h });
  });

  return images;
}

/* ── Tables ────────────────────────────────────────────────────────── */

function extractTables(content) {
  const tables = [];

  content.querySelectorAll('table').forEach((table, tableIdx) => {
    // Skip navbox / navigation tables
    if (table.classList.contains('navbox') || table.classList.contains('mbox-small')) return;

    const headers = [];
    const rows = [];

    // Find table title from preceding heading or caption
    let title = '';
    const caption = table.querySelector('caption');
    if (caption) {
      title = caption.textContent.trim();
    } else {
      let prev = table.previousElementSibling;
      if (prev && ['H2', 'H3', 'H4', 'H5'].includes(prev.tagName)) {
        title = prev.textContent.replace(/\[edit\]/gi, '').trim();
      }
    }

    // Header row
    const headerRow = table.querySelector('tr');
    if (headerRow) {
      headerRow.querySelectorAll('th').forEach(th => {
        headers.push(th.textContent.trim());
      });
    }

    // Data rows
    table.querySelectorAll('tr').forEach((tr, idx) => {
      if (idx === 0 && headers.length > 0) return;

      const cells = [];
      tr.querySelectorAll('td, th').forEach(cell => {
        const imgs = [];
        cell.querySelectorAll('img').forEach(img => {
          const src = fixSrc(img.getAttribute('src') || '');
          if (src && !src.includes('pixel')) imgs.push({ src, alt: img.getAttribute('alt') || '' });
        });

        const cellLinks = [];
        cell.querySelectorAll('a[href]').forEach(a => {
          const href = a.getAttribute('href') || '';
          if (href.includes('action=') || href.includes('Special:') || href.includes('File:')) return;
          cellLinks.push({ text: a.textContent.trim(), href: fixHref(href) });
        });

        cells.push({
          text: cell.textContent.trim(),
          html: cell.innerHTML.trim(),
          images: imgs.length > 0 ? imgs : undefined,
          links: cellLinks.length > 0 ? cellLinks : undefined,
          colspan: cell.getAttribute('colspan') ? parseInt(cell.getAttribute('colspan')) : undefined,
          rowspan: cell.getAttribute('rowspan') ? parseInt(cell.getAttribute('rowspan')) : undefined,
        });
      });

      if (cells.length > 0) rows.push(cells);
    });

    if (rows.length > 0 || headers.length > 0) {
      tables.push({ title, headers, rows, index: tableIdx });
    }
  });

  return tables;
}

/* ── Internal links ────────────────────────────────────────────────── */

function extractLinks(content) {
  const links = [];
  const seen = new Set();

  content.querySelectorAll('a[href]').forEach(a => {
    const href = a.getAttribute('href') || '';
    const text = a.textContent.trim();
    if (!text || !href) return;
    // Skip edit links, file links, external links, anchors
    if (href.includes('action=') || href.includes('Special:') || href.includes('File:') || href.includes('Category:')) return;
    if (href.startsWith('#')) return;

    const fullHref = fixHref(href);
    if (seen.has(fullHref)) return;
    seen.add(fullHref);

    const isExternal = !fullHref.includes('dmowiki.com');
    links.push({ text, href: fullHref, external: isExternal || undefined });
  });

  return links;
}

/* ── Message listener ──────────────────────────────────────────────── */

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'scrape') {
    try {
      const data = scrapePage();
      sendResponse({ success: true, data });
    } catch (e) {
      sendResponse({ success: false, error: e.message });
    }
  }

  // Return page dimensions for full-page screenshot stitching
  if (msg.action === 'getPageDimensions') {
    const scrollWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
    const scrollHeight = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    sendResponse({ scrollWidth, scrollHeight, viewportWidth, viewportHeight });
    return;
  }

  // Scroll to a specific position (for screenshot capture)
  if (msg.action === 'scrollTo') {
    window.scrollTo(msg.x || 0, msg.y || 0);
    // Wait for rendering to settle after scroll
    setTimeout(() => {
      sendResponse({ done: true, scrollX: window.scrollX, scrollY: window.scrollY });
    }, 80);
    return true; // keep channel open for async
  }

  // Hide fixed/sticky elements before screenshot capture
  if (msg.action === 'prepareScreenshot') {
    const style = document.createElement('style');
    style.id = '__scraper_screenshot_style';
    style.textContent = `
      /* Hide all fixed & sticky elements during capture */
      *[style*="position: fixed"], *[style*="position:fixed"],
      *[style*="position: sticky"], *[style*="position:sticky"] {
        display: none !important;
      }
      /* Also target common wiki fixed elements by computed style */
      .vector-sticky-header,
      .mw-header-container,
      #mw-navigation,
      .mw-header,
      nav.navbar,
      .fixed-header,
      .sticky-header,
      [role="banner"],
      .vector-header-container.vector-sticky-header-visible {
        display: none !important;
      }
    `;
    document.head.appendChild(style);

    // Also find and hide elements with computed position: fixed/sticky
    const hidden = [];
    document.querySelectorAll('*').forEach(el => {
      const cs = getComputedStyle(el);
      if (cs.position === 'fixed' || cs.position === 'sticky') {
        hidden.push({ el, prev: el.style.display });
        el.style.setProperty('display', 'none', 'important');
      }
    });
    window.__screenshotHidden = hidden;

    // Scroll to top first
    window.scrollTo(0, 0);
    setTimeout(() => {
      sendResponse({ done: true });
    }, 100);
    return true;
  }

  // Restore hidden elements after screenshot capture
  if (msg.action === 'restoreAfterScreenshot') {
    const style = document.getElementById('__scraper_screenshot_style');
    if (style) style.remove();

    if (window.__screenshotHidden) {
      for (const { el, prev } of window.__screenshotHidden) {
        el.style.display = prev;
      }
      delete window.__screenshotHidden;
    }

    window.scrollTo(0, 0);
    sendResponse({ done: true });
    return;
  }

  // Fetch a batch of images from same origin (avoids CORS in popup)
  if (msg.action === 'fetchImages') {
    const urls = msg.urls || [];
    Promise.all(urls.map(async (url) => {
      try {
        const resp = await fetch(url);
        if (!resp.ok) return { url, data: null };
        const blob = await resp.blob();
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve({ url, data: reader.result });
          reader.readAsDataURL(blob);
        });
      } catch {
        return { url, data: null };
      }
    })).then(results => sendResponse(results));
    return true; // keep channel open for async
  }

  return true;
});
