/**
 * DMO Wiki Scraper — Popup Script
 * Generic page ripper: scrape any dmowiki.com page or bulk-scrape all links.
 * Auto-downloads JSON + HTML + TXT on scrape.
 */

let lastScrapedData = null;
let bulkData = {};

const $ = id => document.getElementById(id);
const statusBox = $('statusBox');
const scrapeBtn = $('scrapeBtn');
const resultSection = $('resultSection');
const statsGrid = $('statsGrid');
const bulkLinksBtn = $('bulkLinksBtn');
const bulkSection = $('bulkSection');
const progressFill = $('progressFill');
const progressText = $('progressText');
const bulkDownloadBtn = $('bulkDownloadBtn');

function setStatus(msg, type = 'info') {
  statusBox.className = 'status ' + type;
  statusBox.innerHTML = `<span>${msg}</span>`;
}

function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

function renderResults(data) {
  $('pageTitle').textContent = data.title || '(untitled)';
  $('pageType').textContent = `${data.pageType || 'unknown'} · ${data.slug || ''}`;

  const stats = [
    { num: data.sections?.length || 0, label: 'Sections' },
    { num: data.tables?.length || 0, label: 'Tables' },
    { num: data.images?.length || 0, label: 'Images' },
    { num: Object.keys(data.infobox?.fields || {}).length, label: 'Infobox' },
  ];
  statsGrid.innerHTML = stats.map(s =>
    `<div class="stat"><div class="num">${s.num}</div><div class="label">${s.label}</div></div>`
  ).join('');

  // Sections
  const secEl = $('sectionsList');
  const secContent = $('sectionsContent');
  if (data.sections?.length > 0) {
    secEl.style.display = 'block';
    secContent.innerHTML = data.sections.map(s =>
      `<span class="tag" title="${esc(s.text?.substring(0, 100) || '')}">${'—'.repeat(s.level - 1)} ${esc(s.heading)}</span>`
    ).join('');
  } else {
    secEl.style.display = 'none';
  }

  // Categories
  const catEl = $('categoriesList');
  const catContent = $('categoriesContent');
  if (data.categories?.length > 0) {
    catEl.style.display = 'block';
    catContent.innerHTML = data.categories.map(c => `<span class="tag">${esc(c)}</span>`).join('');
  } else {
    catEl.style.display = 'none';
  }

  // Infobox
  const ibEl = $('infoboxInfo');
  const ibContent = $('infoboxContent');
  if (data.infobox && Object.keys(data.infobox.fields || {}).length > 0) {
    ibEl.style.display = 'block';
    ibContent.innerHTML = Object.entries(data.infobox.fields).map(([k, v]) =>
      `<div style="display:flex;gap:6px;"><span style="color:#a1a1aa;min-width:80px;">${esc(k)}</span><span>${esc(v)}</span></div>`
    ).join('');
  } else {
    ibEl.style.display = 'none';
  }
}

/* ── Inject + scrape helper ────────────────────────────────────────── */

async function injectAndScrape(tabId) {
  try {
    await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] });
  } catch (e) { /* already injected */ }
  return chrome.tabs.sendMessage(tabId, { action: 'scrape' });
}

/* ── Download as single ZIP ────────────────────────────────────────── */

function getImageFilename(src, index) {
  try {
    const url = new URL(src);
    const pathParts = url.pathname.split('/');
    let filename = decodeURIComponent(pathParts[pathParts.length - 1]);
    filename = filename.replace(/^\d+px-/, '');
    filename = filename.replace(/[^a-zA-Z0-9._()-]/g, '_');
    return filename || `image_${index}.png`;
  } catch {
    return `image_${index}.png`;
  }
}

// Fetch images via content script (same-origin, avoids CORS)
async function fetchImagesViaContentScript(tabId, urls) {
  const BATCH_SIZE = 10;
  const results = {};
  for (let i = 0; i < urls.length; i += BATCH_SIZE) {
    const batch = urls.slice(i, i + BATCH_SIZE);
    const batchResults = await chrome.tabs.sendMessage(tabId, { action: 'fetchImages', urls: batch });
    if (Array.isArray(batchResults)) {
      for (const r of batchResults) {
        if (r.data) results[r.url] = r.data;
      }
    }
  }
  return results;
}

function dataUriToArrayBuffer(dataUri) {
  const base64 = dataUri.split(',')[1];
  const binary = atob(base64);
  const buf = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i);
  return buf.buffer;
}

/* ── Full-page screenshot capture ────────────────────────────────── */

async function captureFullPage(tabId) {
  // Step 1: Hide fixed/sticky elements (nav bars, overlays, search bars)
  await chrome.tabs.sendMessage(tabId, { action: 'prepareScreenshot' });
  await sleep(300);

  // Step 2: Get page dimensions AFTER hiding fixed elements
  const dims = await chrome.tabs.sendMessage(tabId, { action: 'getPageDimensions' });
  const { scrollHeight, viewportWidth, viewportHeight } = dims;

  // Device pixel ratio — capture at actual resolution
  const dpr = window.devicePixelRatio || 1;

  // Calculate how many full viewport captures we need
  const numFull = Math.floor(scrollHeight / viewportHeight);
  const remainder = scrollHeight % viewportHeight;
  const totalCaptures = numFull + (remainder > 0 ? 1 : 0);

  const captures = []; // { dataUri, srcY, srcH, dstY }

  // Capture full viewports from top
  for (let i = 0; i < numFull; i++) {
    const scrollY = i * viewportHeight;
    await chrome.tabs.sendMessage(tabId, { action: 'scrollTo', x: 0, y: scrollY });
    await sleep(250);

    const dataUri = await chrome.tabs.captureVisibleTab(null, { format: 'png' });
    captures.push({
      dataUri,
      srcY: 0,                       // take from top of captured image
      srcH: viewportHeight * dpr,    // full viewport height
      dstY: scrollY * dpr,           // position in final canvas
    });
  }

  // Capture the last partial viewport (if any) by scrolling to the very bottom
  if (remainder > 0) {
    const scrollY = scrollHeight - viewportHeight; // scroll so bottom of page aligns with bottom of viewport
    await chrome.tabs.sendMessage(tabId, { action: 'scrollTo', x: 0, y: scrollY });
    await sleep(250);

    const dataUri = await chrome.tabs.captureVisibleTab(null, { format: 'png' });
    // Only take the bottom portion of this capture (the remainder)
    const overlap = viewportHeight - remainder;
    captures.push({
      dataUri,
      srcY: overlap * dpr,           // skip the overlapping top part
      srcH: remainder * dpr,         // only the new content at the bottom
      dstY: numFull * viewportHeight * dpr, // position after all full captures
    });
  }

  // Step 3: Restore page state
  await chrome.tabs.sendMessage(tabId, { action: 'restoreAfterScreenshot' });

  // Step 4: Stitch captures into a single canvas
  const canvasW = viewportWidth * dpr;
  const canvasH = scrollHeight * dpr;
  const canvas = new OffscreenCanvas(canvasW, canvasH);
  const ctx = canvas.getContext('2d');

  for (const cap of captures) {
    const blob = await (await fetch(cap.dataUri)).blob();
    const img = await createImageBitmap(blob);
    // drawImage(source, srcX, srcY, srcW, srcH, dstX, dstY, dstW, dstH)
    ctx.drawImage(img, 0, cap.srcY, img.width, cap.srcH, 0, cap.dstY, img.width, cap.srcH);
    img.close();
  }

  const resultBlob = await canvas.convertToBlob({ type: 'image/png' });
  return resultBlob;
}

async function downloadAllFormats(data, tabId) {
  const slug = (data.slug || data.title || 'page').replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase();
  const zip = new JSZip();

  // ── Full-page screenshot (capture FIRST while page is in natural state) ──
  let hasScreenshot = false;
  if (tabId) {
    try {
      setStatus('Capturing full-page screenshot...', 'info');
      const screenshotBlob = await captureFullPage(tabId);
      zip.file('screenshot.png', screenshotBlob);
      hasScreenshot = true;
    } catch (e) {
      console.warn('Screenshot capture failed:', e);
    }
  }

  // ── Collect unique full-res images ──
  const imageDownloads = [];
  const seenUrls = new Set();

  for (let i = 0; i < (data.images || []).length; i++) {
    const img = data.images[i];
    if (!img.src || seenUrls.has(img.src)) continue;
    seenUrls.add(img.src);
    const filename = getImageFilename(img.src, i);
    let label = '';
    if (i === 0) label = 'main';
    else if (img.context) label = img.context.replace(/\[edit.*$/i, '').trim();
    else if (img.alt) label = img.alt;
    imageDownloads.push({ url: img.src, localName: filename, label });
  }

  for (const ibImg of (data.infobox?.images || [])) {
    if (!ibImg.src || seenUrls.has(ibImg.src)) continue;
    seenUrls.add(ibImg.src);
    const filename = getImageFilename(ibImg.src, imageDownloads.length);
    imageDownloads.push({ url: ibImg.src, localName: filename, label: ibImg.context || '' });
  }

  // ── Download images via content script (same-origin) ──
  let imgOk = 0;
  const imgTotal = imageDownloads.length;
  const imgFolder = zip.folder('images');

  if (imgTotal > 0 && tabId) {
    setStatus(`Fetching ${imgTotal} images via page...`, 'info');
    const allUrls = imageDownloads.map(d => d.url);
    const fetched = await fetchImagesViaContentScript(tabId, allUrls);

    for (let i = 0; i < imageDownloads.length; i++) {
      const img = imageDownloads[i];
      setStatus(`Packing image ${i + 1}/${imgTotal}: ${img.localName}`, 'info');
      const dataUri = fetched[img.url];
      if (dataUri) {
        imgFolder.file(img.localName, dataUriToArrayBuffer(dataUri));
        imgOk++;
      }
    }
  }

  // ── Annotate data with local filenames ──
  const dataWithLocal = JSON.parse(JSON.stringify(data));
  if (dataWithLocal.images) {
    for (const img of dataWithLocal.images) {
      const dl = imageDownloads.find(d => d.url === img.src);
      if (dl) img.localFile = `images/${dl.localName}`;
    }
  }
  if (dataWithLocal.infobox?.images) {
    for (const img of dataWithLocal.infobox.images) {
      const dl = imageDownloads.find(d => d.url === img.src);
      if (dl) img.localFile = `images/${dl.localName}`;
    }
  }

  // ── Build text files ──
  const jsonContent = JSON.stringify(dataWithLocal, null, 2);
  const htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${data.title || ''}</title></head><body>${data.rawHTML || ''}</body></html>`;

  const txtParts = [];
  txtParts.push(`Title: ${data.title || ''}`);
  txtParts.push(`URL: ${data.url || ''}`);
  txtParts.push(`Type: ${data.pageType || ''}`);
  txtParts.push(`Scraped: ${data.scrapedAt || ''}`);
  txtParts.push('');
  if (data.categories?.length) txtParts.push(`Categories: ${data.categories.join(', ')}\n`);
  if (data.infobox && Object.keys(data.infobox.fields || {}).length > 0) {
    txtParts.push('=== Infobox ===');
    for (const [k, v] of Object.entries(data.infobox.fields)) txtParts.push(`  ${k}: ${v}`);
    txtParts.push('');
  }
  if (data.sections?.length) {
    for (const sec of data.sections) {
      txtParts.push(`${'#'.repeat(sec.level)} ${sec.heading}`);
      if (sec.text) txtParts.push(sec.text);
      txtParts.push('');
    }
  }
  if (imageDownloads.length) {
    txtParts.push(`=== Images (${imgOk}/${imgTotal} downloaded) ===`);
    imageDownloads.forEach((img, i) => txtParts.push(`  [${i + 1}] images/${img.localName} ← ${img.url}`));
    txtParts.push('');
  }

  // Add text files to ZIP
  zip.file(`${slug}.json`, jsonContent);
  zip.file(`${slug}.html`, htmlContent);
  zip.file(`${slug}.txt`, txtParts.join('\n'));

  // ── Generate ZIP and download ──
  setStatus(`Packing ZIP...`, 'info');
  const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  const zipUrl = URL.createObjectURL(zipBlob);

  chrome.downloads.download({ url: zipUrl, filename: `${slug}.zip`, saveAs: false });

  return { textFiles: 3, images: imgOk, totalImages: imgTotal, hasScreenshot };
}

/* ── Single page scrape ────────────────────────────────────────────── */

scrapeBtn.addEventListener('click', async () => {
  scrapeBtn.disabled = true;
  setStatus('Scraping...', 'info');

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab.url || !tab.url.includes('dmowiki.com')) {
      setStatus('Not on dmowiki.com — navigate to a wiki page first.', 'warning');
      scrapeBtn.disabled = false;
      return;
    }

    const response = await injectAndScrape(tab.id);

    if (response?.success) {
      lastScrapedData = response.data;
      const d = response.data;
      const total = (d.sections?.length || 0) + (d.tables?.length || 0) + (d.images?.length || 0);
      resultSection.style.display = 'block';
      renderResults(d);

      // Build ZIP with all files + images (pass tabId for image fetching)
      const result = await downloadAllFormats(d, tab.id);
      const ssLabel = result.hasScreenshot ? ' + screenshot' : '';
      setStatus(`✅ "${d.title}" — ZIP: 3 files + ${result.images}/${result.totalImages} images${ssLabel}`, 'success');
    } else {
      setStatus('❌ ' + (response?.error || 'Unknown error'), 'error');
    }
  } catch (e) {
    setStatus('❌ ' + e.message, 'error');
  }

  scrapeBtn.disabled = false;
});

/* ── Bulk scrape (all links on current page) ───────────────────────── */

bulkLinksBtn.addEventListener('click', async () => {
  bulkLinksBtn.disabled = true;
  bulkSection.style.display = 'block';
  bulkData = {};

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab.url?.includes('dmowiki.com')) {
      setStatus('Navigate to dmowiki.com first.', 'warning');
      bulkLinksBtn.disabled = false;
      return;
    }

    setStatus('🔄 Scraping current page for links...', 'info');

    const indexResp = await injectAndScrape(tab.id);
    if (!indexResp?.success || !indexResp.data.links?.length) {
      setStatus('❌ No links found on this page.', 'error');
      bulkLinksBtn.disabled = false;
      return;
    }

    // Filter to internal wiki links only
    const allLinks = indexResp.data.links.filter(l =>
      l.href.includes('dmowiki.com/') &&
      !l.href.includes('action=') &&
      !l.href.includes('Special:') &&
      !l.href.includes('File:') &&
      !l.href.includes('Category:') &&
      !l.href.includes('#') &&
      !l.external &&
      l.text.length > 1
    );

    // Deduplicate
    const uniqueLinks = [];
    const seenHrefs = new Set();
    for (const link of allLinks) {
      if (!seenHrefs.has(link.href)) {
        seenHrefs.add(link.href);
        uniqueLinks.push(link);
      }
    }

    const total = uniqueLinks.length;
    setStatus(`Found ${total} links. Scraping all...`, 'info');

    let done = 0, errors = 0;

    for (const link of uniqueLinks) {
      done++;
      const pct = Math.round((done / total) * 100);
      progressFill.style.width = pct + '%';
      progressText.textContent = `[${done}/${total}] ${link.text}...`;

      try {
        await chrome.tabs.update(tab.id, { url: link.href });
        await waitForLoad(tab.id);
        await sleep(1500);

        // Handle Cloudflare challenge
        const titleCheck = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => document.title,
        });
        if ((titleCheck[0]?.result || '').includes('Just a moment')) {
          progressText.textContent = `[${done}/${total}] ${link.text} — CF challenge...`;
          for (let w = 0; w < 6; w++) {
            await sleep(5000);
            const t2 = await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              func: () => document.title,
            });
            if (!(t2[0]?.result || '').includes('Just a moment')) break;
          }
          await sleep(1000);
        }

        const resp = await injectAndScrape(tab.id);
        if (resp?.success) {
          const slug = (resp.data.slug || link.text).replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase();
          bulkData[slug] = resp.data;
        } else {
          errors++;
        }
      } catch (e) {
        errors++;
      }
    }

    const successCount = Object.keys(bulkData).length;
    setStatus(`✅ Done! ${successCount} pages scraped, ${errors} errors`, 'success');
    progressFill.style.width = '100%';
    progressText.textContent = `Complete: ${successCount}/${total}`;
    bulkDownloadBtn.style.display = 'block';

  } catch (e) {
    setStatus('❌ ' + e.message, 'error');
  }

  bulkLinksBtn.disabled = false;
});

bulkDownloadBtn.addEventListener('click', () => {
  const name = `dmowiki-bulk-${new Date().toISOString().slice(0, 10)}.json`;
  downloadBlob(JSON.stringify(bulkData, null, 2), name, 'application/json');
});

/* ── Utilities ─────────────────────────────────────────────────────── */

function downloadBlob(content, filename, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  chrome.downloads.download({ url, filename, saveAs: false });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function waitForLoad(tabId) {
  return new Promise(resolve => {
    function listener(id, info) {
      if (id === tabId && info.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    }
    chrome.tabs.onUpdated.addListener(listener);
    setTimeout(() => { chrome.tabs.onUpdated.removeListener(listener); resolve(); }, 15000);
  });
}
