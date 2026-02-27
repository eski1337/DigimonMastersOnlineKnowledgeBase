import express from 'express';
import payload from 'payload';
import dotenv from 'dotenv';
import path from 'path';
import * as cheerio from 'cheerio';
// import { Readable } from 'stream';
import crypto from 'crypto';
import { DIGIMON_FAMILIES } from '@dmo-kb/shared';
import { env } from './utils/env';
import { logger } from './services/logger';
import { fetchWikiPage, warmupWiki, isWikiWarmedUp, closeBrowser } from './services/wiki-fetcher';

dotenv.config({ path: '../../.env' });

// Helper function to normalize Digimon names (X-Antibody System → X)
function normalizeDigimonName(name: string): string {
  if (!name) return name;
  return name.replace(' (X-Antibody System)', ' X');
}

const app = express();
app.use(express.json({ limit: '10mb' }));

// CORS: Allow requests from web app and dev proxies
app.use((req, res, next) => {
  const allowedOrigins = new Set([
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    process.env.NEXT_PUBLIC_APP_URL,
    'https://dmokb.info',
    'https://cms.dmokb.info',
  ].filter(Boolean) as string[]);
  const origin = req.headers.origin;
  if (origin && allowedOrigins.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Custom login page — replaces Payload's built-in login form.
// Registered BEFORE payload.init() so it takes precedence over Payload's SPA catch-all.
// Uses type="text" natively so usernames work without any client-side hacks.
app.get('/admin/login', (_req, res) => {
  const serverURL = process.env.NODE_ENV === 'production'
    ? 'https://cms.dmokb.info'
    : (process.env.NEXT_PUBLIC_CMS_URL || 'http://localhost:3001');
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Login - DMO KB CMS</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0c0c0c; color: #e0e0e0; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    .login-card { width: 100%; max-width: 420px; padding: 48px 40px; background: #1a1a1a; border-radius: 12px; border: 1px solid #333; }
    .logo { text-align: center; margin-bottom: 32px; }
    .logo h1 { font-size: 24px; font-weight: 700; color: #fff; }
    .logo p { font-size: 13px; color: #888; margin-top: 4px; }
    .field { margin-bottom: 20px; }
    .field label { display: block; font-size: 13px; font-weight: 600; color: #ccc; margin-bottom: 6px; }
    .field input { width: 100%; padding: 10px 14px; background: #111; border: 1px solid #444; border-radius: 6px; color: #fff; font-size: 15px; outline: none; transition: border-color 0.2s; }
    .field input:focus { border-color: #f97316; }
    .field input::placeholder { color: #666; }
    .btn { width: 100%; padding: 12px; background: #f97316; color: #fff; border: none; border-radius: 6px; font-size: 15px; font-weight: 600; cursor: pointer; transition: background 0.2s; }
    .btn:hover { background: #ea580c; }
    .btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .error { background: #dc2626; color: #fff; padding: 10px 14px; border-radius: 6px; font-size: 13px; margin-bottom: 16px; display: none; }
    .forgot { text-align: center; margin-top: 16px; }
    .forgot a { color: #888; font-size: 13px; text-decoration: none; }
    .forgot a:hover { color: #f97316; }
  </style>
</head>
<body>
  <div class="login-card">
    <div class="logo">
      <h1>DMO Knowledge Base</h1>
      <p>CMS Admin Panel</p>
    </div>
    <div class="error" id="error"></div>
    <form id="loginForm" novalidate>
      <div class="field">
        <label for="identifier">Email or Username</label>
        <input type="text" id="identifier" name="email" placeholder="Username or email@example.com" autocomplete="username" required>
      </div>
      <div class="field">
        <label for="password">Password</label>
        <input type="password" id="password" name="password" placeholder="••••••••" autocomplete="current-password" required>
      </div>
      <button type="submit" class="btn" id="submitBtn">Login</button>
    </form>
    <div class="forgot">
      <a href="/admin/forgot">Forgot password?</a>
    </div>
  </div>
  <script>
    document.getElementById('loginForm').addEventListener('submit', async function(e) {
      e.preventDefault();
      var btn = document.getElementById('submitBtn');
      var errEl = document.getElementById('error');
      btn.disabled = true;
      btn.textContent = 'Logging in...';
      errEl.style.display = 'none';
      try {
        var res = await fetch('${serverURL}/api/users/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            email: document.getElementById('identifier').value.trim(),
            password: document.getElementById('password').value
          })
        });
        var data = await res.json();
        if (res.ok && data.token) {
          document.cookie = 'payload-token=' + data.token + '; path=/; max-age=7200; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}';
          window.location.href = '/admin';
        } else {
          errEl.textContent = data.errors?.[0]?.message || 'Invalid credentials. Please try again.';
          errEl.style.display = 'block';
        }
      } catch (err) {
        errEl.textContent = 'Connection error. Please try again.';
        errEl.style.display = 'block';
      }
      btn.disabled = false;
      btn.textContent = 'Login';
    });
  </script>
</body>
</html>`);
});

// Username-to-email login middleware — allows CMS login with username OR email
app.use('/api/users/login', async (req, res, next) => {
  if (req.method === 'POST' && req.body?.email && !req.body.email.includes('@')) {
    try {
      const username = req.body.email;
      // Case-insensitive lookup using regex
      const result = await payload.find({
        collection: 'users',
        where: { username: { like: `^${username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$` } },
        limit: 1,
        depth: 0,
      });
      if (result.docs.length === 0) {
        // Fallback: try exact match in case 'like' doesn't work as expected
        const exact = await payload.find({
          collection: 'users',
          where: { username: { equals: username } },
          limit: 1,
          depth: 0,
        });
        if (exact.docs.length > 0) {
          req.body.email = exact.docs[0].email;
          logger.info({ username }, 'Resolved username to email for login (exact)');
        }
      } else {
        req.body.email = result.docs[0].email;
        logger.info({ username }, 'Resolved username to email for login');
      }
    } catch (e) {
      // Fall through — Payload will return its own invalid-credentials error
    }
  }
  next();
});

// Serve static images from D:\DMOKBNEW\Images
const imagesPath = path.resolve(__dirname, '..', '..', '..', 'Images');
logger.info({ path: imagesPath }, 'Serving static images');
app.use('/Images', express.static(imagesPath));

// Helper function to download and upload images to Payload with metadata
async function downloadAndUploadImage(
  imageUrl: string, 
  filename: string,
  metadata: {
    imageType: string;
    belongsTo?: { digimon?: string; skill?: string; item?: string };
    tags?: string[];
  }
): Promise<string | null> {
  try {
    logger.debug({ url: imageUrl }, 'Downloading image');
    
    // Try direct fetch first, then Wayback Machine if Cloudflare blocks
    let response: Response | null = null;
    let finalUrl = imageUrl;
    
    // Attempt 1: Direct fetch
    try {
      response = await fetch(imageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(10000),
      });
      
      // Check for Cloudflare block
      if (response.status === 403 || response.status === 503) {
        const text = await response.text();
        if (text.includes('Just a moment') || text.includes('challenge-platform') || text.includes('cf-')) {
          console.log(`[image-dl] Cloudflare blocked direct fetch for ${filename}, trying Wayback...`);
          response = null; // Force Wayback fallback
        }
      }
    } catch (err: any) {
      console.log(`[image-dl] Direct fetch failed for ${filename}: ${err.message}`);
      response = null;
    }
    
    // Attempt 2: CF Proxy (if available and URL is dmowiki.com)
    if ((!response || !response.ok) && imageUrl.includes('dmowiki.com')) {
      try {
        const proxyCheck = await fetch('http://127.0.0.1:8191', { signal: AbortSignal.timeout(2000) });
        const proxyData = await proxyCheck.json() as any;
        if (proxyData.status === 'ready') {
          const proxyUrl = `http://127.0.0.1:8191/image?url=${encodeURIComponent(imageUrl)}`;
          console.log(`[image-dl] Trying CF proxy for ${filename}...`);
          response = await fetch(proxyUrl, { signal: AbortSignal.timeout(20000) });
          if (response.ok) {
            finalUrl = imageUrl; // Keep original URL as sourceUrl
            console.log(`[image-dl] ✅ Got image via CF proxy`);
          }
        }
      } catch (err: any) {
        console.log(`[image-dl] CF proxy not available: ${err.message}`);
      }
    }
    
    // Attempt 3: Wayback Machine (if CF proxy also failed)
    if ((!response || !response.ok) && imageUrl.includes('dmowiki.com')) {
      const waybackUrl = `https://web.archive.org/web/2024if_/${imageUrl}`;
      try {
        console.log(`[image-dl] Trying Wayback: ${waybackUrl.substring(0, 80)}...`);
        response = await fetch(waybackUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
          redirect: 'follow',
          signal: AbortSignal.timeout(15000),
        });
        if (response.ok) {
          finalUrl = waybackUrl;
          console.log(`[image-dl] ✅ Got image via Wayback Machine`);
        }
      } catch (err: any) {
        console.log(`[image-dl] Wayback also failed: ${err.message}`);
      }
    }

    if (!response || !response.ok) {
      logger.warn({ url: imageUrl, status: response?.status }, 'Failed to download image (direct + Wayback)');
      return null;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    
    // Calculate MD5 hash for duplicate detection
    const hash = crypto.createHash('md5').update(buffer).digest('hex');
    
    // Check if image from this EXACT SOURCE URL already exists
    // This is the most reliable way - same source URL = definitely same image
    const existing = await payload.find({
      collection: 'media',
      where: {
        sourceUrl: {
          equals: imageUrl,
        },
      },
      limit: 1,
    });

    if (existing.docs.length > 0) {
      const existingMedia = existing.docs[0];
      logger.debug({ filename, id: existingMedia.id, source: imageUrl }, 'Image already exists (same source URL)');
      // Return the media ID for relationship fields
      return String(existingMedia.id);
    }
    
    logger.debug({ url: imageUrl, filename, hash }, 'New image from source');
    
    // Create a file object that Payload can handle
    const file = {
      data: buffer,
      mimetype: response.headers.get('content-type') || 'image/png',
      name: filename,
      size: buffer.length,
    };

    // Upload to Payload media collection with comprehensive metadata
    const media = await payload.create({
      collection: 'media',
      data: {
        alt: filename.replace(/\.(png|jpg|jpeg|gif)$/i, ''),
        imageType: metadata.imageType,
        sourceUrl: imageUrl,
        sourceFile: filename,
        belongsTo: metadata.belongsTo || {},
        hash: hash,
        importedAt: new Date().toISOString(),
        lastChecked: new Date().toISOString(),
        isOutdated: false,
        tags: metadata.tags?.map(tag => ({ tag })) || [],
        source: 'DMO Wiki',
        credits: 'DMO Wiki / Joymax',
      },
      file,
    });

    console.log(`Successfully uploaded: ${filename} (ID: ${media.id}, Hash: ${hash})`);
    // Return the media ID for relationship fields
    return String(media.id);
  } catch (error: any) {
    console.error(`❌ Error downloading/uploading image ${imageUrl}:`);
    console.error(`❌ Error message:`, error.message || error);
    if (error.code) console.error(`❌ Error code:`, error.code);
    return null;
  }
}

// SECURITY: Strip sensitive fields from /api/users responses for unauthenticated requests
app.use('/api/users', (req, res, next) => {
  // Only intercept GET requests (list/read operations)
  if (req.method !== 'GET') return next();

  const originalJson = res.json.bind(res);
  res.json = (body: any) => {
    // Check if the request has a valid JWT token (authenticated)
    const authHeader = req.headers.authorization;
    const hasCookie = req.headers.cookie?.includes('payload-token');
    const isAuthenticated = !!(authHeader || hasCookie);

    if (!isAuthenticated && body) {
      const stripUser = (user: any) => {
        if (!user || typeof user !== 'object') return user;
        const { email, discordId, loginAttempts, lockUntil, ...safe } = user;
        return safe;
      };

      if (body.docs && Array.isArray(body.docs)) {
        body.docs = body.docs.map(stripUser);
      } else if (body.id) {
        body = stripUser(body);
      }
    }
    return originalJson(body);
  };
  next();
});

const start = async () => {
  // Clean up any old script patches from build/index.html
  try {
    const fs = require('fs');
    const adminHtmlPath = path.resolve(__dirname, '..', 'build', 'index.html');
    if (fs.existsSync(adminHtmlPath)) {
      let html = fs.readFileSync(adminHtmlPath, 'utf8');
      if (html.includes('username-login-patch')) {
        html = html.replace(/<!-- username-login-patch[^>]*-->[\s\S]*?<\/script>\s*/g, '');
        fs.writeFileSync(adminHtmlPath, html, 'utf8');
        logger.info('Cleaned old patches from admin HTML');
      }
    }
  } catch (_e) { /* non-critical */ }

  await payload.init({
    secret: env.PAYLOAD_SECRET,
    express: app,
    onInit: async () => {
      payload.logger.info(`Payload Admin URL: ${payload.getAdminURL()}`);
    },
  });

  // SECURITY: Auth middleware for import/batch endpoints — requires editor+ role
  const requireEditorAuth = async (req: any, res: any, next: any) => {
    try {
      const token = req.headers.authorization?.replace('JWT ', '') || req.cookies?.['payload-token'];
      if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      const user = await payload.find({
        collection: 'users',
        where: { id: { equals: req.user?.id } },
        limit: 1,
        depth: 0,
      });
      const role = req.user?.role || user.docs?.[0]?.role;
      if (!role || !['editor', 'admin', 'owner'].includes(role)) {
        return res.status(403).json({ error: 'Editor role or higher required' });
      }
      next();
    } catch {
      return res.status(401).json({ error: 'Authentication failed' });
    }
  };

  // Serve import Digimon page
  app.get('/import-digimon', (req, res) => {
    res.sendFile(path.join(__dirname, 'routes', 'import-digimon.html'));
  });
  
  // Redirect from admin to make it easier
  app.get('/admin/import', (req, res) => {
    res.redirect('/import-digimon');
  });

  // Wiki warmup endpoint (legacy — now returns success immediately since we use Wayback Machine)
  app.post('/api/wiki-warmup', async (_req, res) => {
    try {
      const result = await warmupWiki();
      if (result.success) {
        return res.json({ status: 'ok', message: result.message });
      }
      return res.status(500).json({ error: result.message });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // Wiki warmup status check
  app.get('/api/wiki-warmup', (_req, res) => {
    res.json({ warmedUp: isWikiWarmedUp() });
  });

  // Import API endpoint
  // Accepts { slug } to auto-fetch, or { slug, html } to use pasted HTML
  app.post('/api/import-digimon', requireEditorAuth, async (req, res) => {
    try {
      const { slug, html: pastedHtml } = req.body;

      if (!slug) {
        return res.status(400).json({ error: 'Digimon name or URL is required' });
      }

      // Extract slug from URL if needed
      let digimonSlug = slug;
      if (slug.includes('dmowiki.com')) {
        const match = slug.match(/dmowiki\.com\/(?:wiki\/)?([^/?#]+)/);
        digimonSlug = match ? match[1] : slug;
      }
      
      // Clean up slug - replace underscores with spaces for wiki lookup
      digimonSlug = digimonSlug.replace(/_/g, ' ');

      let html: string;

      if (pastedHtml && typeof pastedHtml === 'string' && pastedHtml.length > 100) {
        // Use pasted HTML directly (bypasses Cloudflare)
        console.log(`Using pasted HTML for: ${digimonSlug} (${pastedHtml.length} chars)`);
        html = pastedHtml;
      } else {
        // Try automated fetch via Wayback Machine (bypasses Cloudflare)
        console.log('Fetching wiki page for:', digimonSlug);
        
        const wikiResult = await fetchWikiPage(digimonSlug);
        
        if (!wikiResult.exists || !wikiResult.html) {
          return res.status(404).json({ 
            error: wikiResult.error || `Wiki page not found: ${digimonSlug}`,
            cloudflareBlocked: wikiResult.error?.includes('Cloudflare'),
            hint: 'If Cloudflare is blocking, open the wiki page in your browser, press Ctrl+U to view source, copy the HTML, and use the "Paste HTML" mode.'
          });
        }
        html = wikiResult.html;
      }

      const $ = cheerio.load(html);
      
      // Extract image URLs from the wiki page
      let iconUrl = '';
      let mainImageUrl = '';
      
      console.log('\n=== IMAGE DETECTION START ===');
      console.log(`Searching for main artwork for: ${digimonSlug}`);
      
      // DEBUG: Log infobox images specifically
      console.log('\n🔍 Debugging: Looking for mw-file-element images in infobox...');
      const infoboxImages = $('.infobox img.mw-file-element, .digimon-infobox img.mw-file-element');
      console.log(`Found ${infoboxImages.length} mw-file-element images in infobox`);
      
      infoboxImages.each((i, img) => {
        const src = $(img).attr('src') || '';
        const alt = $(img).attr('alt') || '';
        console.log(`  [${i}] src: ${src}`);
        console.log(`      alt: ${alt}`);
        console.log(`      is_icon: ${src.includes('_Icon')}`);
      });
      console.log('');
      
      // PRIORITY METHOD 1: Find main artwork from infobox with mw-file-element class
      const infoboxArtwork = $('.infobox img.mw-file-element, .digimon-infobox img.mw-file-element').filter((i, img) => {
        const src = $(img).attr('src') || '';
        return !src.includes('_Icon'); // Exclude icon images
      }).first();
      
      console.log('Infobox artwork (mw-file-element, non-icon) found:', infoboxArtwork.length > 0);
      
      if (infoboxArtwork.length > 0) {
        const src = infoboxArtwork.attr('src') || '';
        console.log('Artwork src:', src);
        
        if (src) {
          let imagePath = src;
          console.log('Original path:', imagePath);
          
          // Handle thumbnail paths: /images/thumb/2/26/Examon.png/250px-Examon.png
          // Extract to: /images/2/26/Examon.png
          if (imagePath.includes('/thumb/')) {
            const thumbMatch = imagePath.match(/\/images\/thumb\/([a-f0-9]\/[a-f0-9]{2}\/.+?\.(?:png|jpg|jpeg|gif))/i);
            if (thumbMatch) {
              imagePath = `/images/${thumbMatch[1]}`;
              console.log('Extracted from thumbnail:', imagePath);
            } else {
              const simpleMatch = imagePath.match(/\/images\/thumb\/(.*?\.(?:png|jpg|jpeg|gif))/i);
              if (simpleMatch) {
                imagePath = `/images/${simpleMatch[1]}`;
                console.log('Extracted from thumbnail (simple):', imagePath);
              }
            }
          }
          mainImageUrl = imagePath.startsWith('http') ? imagePath : `https://dmowiki.com${imagePath}`;
          console.log(`✅ Found main artwork via mw-file-element:`, mainImageUrl);
        }
      }
      
      // FALLBACK METHOD 2: Try older selectors if mw-file-element didn't work
      if (!mainImageUrl) {
        console.log('⚠️ mw-file-element not found, trying fallback selectors...');
        const scraperImageDiv = $('#scraper-digimon-image, .infoboxhover').first();
        console.log('Scraper div found:', scraperImageDiv.length > 0);
        if (scraperImageDiv.length > 0) {
          const scraperImg = scraperImageDiv.find('img').first();
          console.log('Image in scraper div:', scraperImg.length > 0);
          if (scraperImg.length > 0) {
            const src = scraperImg.attr('src') || '';
            console.log('Image src:', src);
            if (src && !src.includes('_Icon')) {
              let imagePath = src;
              console.log('Original path:', imagePath);
              
              if (imagePath.includes('/thumb/')) {
                const thumbMatch = imagePath.match(/\/images\/thumb\/([a-f0-9]\/[a-f0-9]{2}\/.+?\.(?:png|jpg|jpeg|gif))/i);
                if (thumbMatch) {
                  imagePath = `/images/${thumbMatch[1]}`;
                  console.log('Extracted from thumbnail:', imagePath);
                } else {
                  const simpleMatch = imagePath.match(/\/images\/thumb\/(.*?\.(?:png|jpg|jpeg|gif))/i);
                  if (simpleMatch) {
                    imagePath = `/images/${simpleMatch[1]}`;
                    console.log('Extracted from thumbnail (simple):', imagePath);
                  }
                }
              }
              mainImageUrl = imagePath.startsWith('http') ? imagePath : `https://dmowiki.com${imagePath}`;
              console.log(`✅ Found main artwork in scraper div:`, mainImageUrl);
            }
          }
        }
      }
      
      // Find icon from infobox
      const imageInfobox = $('.infobox, .digimon-infobox').first();
      if (imageInfobox.length > 0) {
        // Look for icon in infobox - prefer matching Digimon name
        const infoboxIcons = imageInfobox.find('img[src*="_Icon.png"]');
        let selectedIcon: string | undefined = undefined;
        
        console.log(`\n🔍 DEBUG: Found ${infoboxIcons.length} icons in infobox`);
        infoboxIcons.each((i, icon) => {
          const src = $(icon).attr('src') || '';
          console.log(`  [${i}] ${src}`);
        });
        
        // Create pattern variations for the Digimon name
        const nameVariations = [
          digimonSlug, // Original slug: shinegreymon-burst-mode
          digimonSlug.replace(/-/g, '_'), // shinegreymon_burst_mode
          digimonSlug.replace(/-/g, ' '), // shinegreymon burst mode
          digimonSlug.replace(/[()]/g, ''), // shinegreymonburstmode (no parens)
          digimonSlug.replace(/-/g, '_').replace(/[()]/g, ''), // shinegreymon_burst_mode (no parens)
          // URL-encoded version: ShineGreymon_%28Burst_Mode%29
          digimonSlug.replace(/\(/g, '%28').replace(/\)/g, '%29').replace(/-/g, '_'),
          // Without hyphens but with spaces in parens: ShineGreymon (Burst Mode)
          digimonSlug.replace(/-/g, ' ').replace(/\s+/g, '_').replace(/\(/g, '_%28').replace(/\)/g, '%29'),
        ];
        
        // First try to find exact name match
        infoboxIcons.each((_, icon) => {
          const src = $(icon).attr('src') || '';
          if (src && !src.includes('TBD.png')) {
            // Check if this icon matches the Digimon name
            const isMatch = nameVariations.some(variation => 
              src.toLowerCase().includes(variation.toLowerCase().replace(/ /g, '_'))
            );
            
            if (isMatch) {
              selectedIcon = src;
              console.log(`✓ Found exact name match icon: ${src}`);
              return false; // break loop
            }
          }
        });
        
        // If no exact match, take first non-TBD icon
        if (!selectedIcon) {
          infoboxIcons.each((_, icon) => {
            const src = $(icon).attr('src') || '';
            if (src && !src.includes('TBD.png')) {
              selectedIcon = src;
              console.log(`⚠️ Using first non-TBD icon (no exact match): ${src}`);
              return false; // break loop
            }
          });
        }
        
        // Last resort: take first icon even if TBD
        if (!selectedIcon && infoboxIcons.length > 0) {
          const firstSrc = infoboxIcons.first().attr('src');
          if (firstSrc) {
            selectedIcon = firstSrc;
            console.log(`⚠️ Using first icon (may be TBD): ${firstSrc}`);
          }
        }
        
        if (selectedIcon) {
          const iconSrc = String(selectedIcon);
          iconUrl = iconSrc.startsWith('http') ? iconSrc : `https://dmowiki.com${iconSrc}`;
          console.log('Found icon in infobox:', iconUrl);
        }
      }
      
      // Fallback: Search all images if not found in infobox
      if (!iconUrl || !mainImageUrl) {
        $('img').each((_, img) => {
          const src = $(img).attr('src') || '';
          
          // Look for icon that matches the Digimon name (flexible matching)
          // Handle both URL-encoded and space variations
          const iconPatterns = [
            `${digimonSlug}_Icon.png`,
            `${digimonSlug.replace(/-/g, '_')}_Icon.png`,
            `${digimonSlug.replace(/_/g, ' ')}_Icon.png`.replace(/ /g, '_'),
          ];
          
          // Skip TBD.png and only match actual Digimon icons
          if (!iconUrl && !src.includes('TBD.png') && iconPatterns.some(pattern => src.includes(pattern))) {
            iconUrl = src.startsWith('http') ? src : `https://dmowiki.com${src}`;
            console.log('Found matching icon:', iconUrl);
          }
          
          // Find main image
          if (!mainImageUrl && src.includes(`${digimonSlug}.png`) && !src.includes('_Icon')) {
            let imagePath = src;
            if (imagePath.includes('/thumb/')) {
              const thumbMatch = imagePath.match(/\/images\/thumb\/([a-f0-9]\/[a-f0-9]{2}\/.+?\.(?:png|jpg|jpeg|gif))/i);
              if (thumbMatch) {
                imagePath = `/images/${thumbMatch[1]}`;
              } else {
                const simpleMatch = imagePath.match(/\/images\/thumb\/(.*?\.(?:png|jpg|jpeg|gif))/i);
                if (simpleMatch) {
                  imagePath = `/images/${simpleMatch[1]}`;
                }
              }
            }
            mainImageUrl = imagePath.startsWith('http') ? imagePath : `https://dmowiki.com${imagePath}`;
            console.log(`Found main image for ${digimonSlug}:`, mainImageUrl);
          }
        });
      }
      
      // Also fetch the edit page to get template data (for localized names)
      const editUrl = `https://dmowiki.com/index.php?title=${encodeURIComponent(digimonSlug)}&action=edit`;
      let wikitext = '';
      try {
        const editResponse = await fetch(editUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        });
        if (editResponse.ok) {
          const editHtml = await editResponse.text();
          const $edit = cheerio.load(editHtml);
          // Extract wikitext from the edit textarea
          const textareaVal = $edit('textarea#wpTextbox1').val();
          wikitext = typeof textareaVal === 'string' ? textareaVal : '';
        }
      } catch (e) {
        console.log('Could not fetch edit page for template data');
      }

      // Parse Digimon data
      const preview: any = {
        name: digimonSlug,
        slug: digimonSlug.toLowerCase().replace(/\s+/g, '-'),
        form: 'Rookie',
        element: 'Neutral',
        attribute: 'None',
        type: null as string | null, // Bird, Beast, Dragon, etc.
        attackerType: null as string | null, // QA, SA, NA, DE
        families: [],
        names: {
          japanese: '',
          katakana: '',
          korean: '',
          chinese: '',
          thai: '',
        },
        rank: null as string | null,
        defaultLevel: null as number | null,
        unlockItems: [] as string[],
        unlockRequirements: null as any,
        introduction: null as string | null,
        icon: null as string | null,
        mainImage: null as string | null,
        stats: { hp: 0, at: 0, de: 0, as: 0, ds: 0, ct: 0, ht: 0, ev: 0 },
        maxStats: { hp: 0, at: 0, de: 0, as: 0, ds: 0, ct: 0, ht: 0, ev: 0 },
        statsNote: null as { text: string; size: string; level: number } | null,
        skills: [],
        digivolutions: {
          digivolvesFrom: [],
          digivolvesTo: [],
        },
        deckBuffs: [] as string[],
        rideable: null as string | null,
        isRiding: false,
        canBeRidden: false,
        canBeHatched: false,
        available: false,
        availableFromEgg: false,
        location: null as string | null,
        availableInGDMO: null as boolean | null,
        jogressFrom: null as string[] | null,
        jogressRequirement: null as string | null, // Jogress Chip, DigiXros Chip, etc.
        unlockedAtLevel: null as number | null,
        unlockedWithItem: null as string | null,
        requiredToEvolve: null as string | null,
        specialEffects: null as any,
        uRankPassives: null as any,
        sssPassives: null as any,
        overview: {
          pros: [] as string[],
          cons: [] as string[],
        },
        published: false,
      };
      
      // Extract localized names from wikitext template
      if (wikitext) {
        const katakanaMatch = wikitext.match(/\|katakana=([^\n|]+)/);
        if (katakanaMatch && katakanaMatch[1].trim()) {
          preview.names.katakana = katakanaMatch[1].trim();
        }
        
        const japnameMatch = wikitext.match(/\|japname=([^\n|]+)/);
        if (japnameMatch && japnameMatch[1].trim()) {
          preview.names.japanese = japnameMatch[1].trim();
        }
        
        const koreannameMatch = wikitext.match(/\|koreanname=([^\n|]+)/);
        if (koreannameMatch && koreannameMatch[1].trim()) {
          preview.names.korean = koreannameMatch[1].trim();
        }
        
        const hknameMatch = wikitext.match(/\|hkname=([^\n|]+)/);
        if (hknameMatch && hknameMatch[1].trim()) {
          preview.names.chinese = hknameMatch[1].trim();
        }
        
        const thainameMatch = wikitext.match(/\|thainame=([^\n|]+)/);
        if (thainameMatch && thainameMatch[1].trim()) {
          preview.names.thai = thainameMatch[1].trim();
        }
      }

      // ============================================
      // PARSING PRIORITY: WIKITEXT FIRST, HTML FALLBACK
      // ============================================
      
      // STEP 1: Parse from WIKITEXT (Primary Source - Most Reliable)
      console.log('Step 1: Parsing from wikitext template...');
      if (wikitext) {
        console.log('Wikitext found, parsing template...');
        
        // Name from template (PRIMARY SOURCE)
        const nameMatch = wikitext.match(/\|name=([^\n|]+)/i);
        if (nameMatch?.[1]?.trim()) {
          preview.name = nameMatch[1].trim();
          console.log('✓ Name from wikitext:', preview.name);
        }
        
        // Form from template (PRIMARY SOURCE)
        const formMatch = wikitext.match(/\|form=([^\n|]+)/i);
        if (formMatch?.[1]?.trim()) {
          preview.form = formMatch[1].trim();
          console.log('✓ Form from wikitext:', preview.form);
          console.log('  → Raw match:', formMatch[1]);
          console.log('  → After trim:', preview.form);
        } else {
          console.log('⚠️ No form found in wikitext template');
        }
        
        // Attribute from template (PRIMARY SOURCE)
        const attributeMatch = wikitext.match(/\|attribute=([^\n|]+)/i);
        if (attributeMatch?.[1]?.trim()) {
          preview.attribute = attributeMatch[1].trim();
          console.log('✓ Attribute from wikitext:', preview.attribute);
        }
        
        // Natural Attribute = Element (PRIMARY SOURCE)
        const naturalAttrMatch = wikitext.match(/\|naturalattribute=([^\n|]+)/i);
        if (naturalAttrMatch?.[1]?.trim()) {
          preview.element = naturalAttrMatch[1].trim();
          console.log('✓ Element from wikitext:', preview.element);
        }
        
        // Attacker Type from template (PRIMARY SOURCE)
        const attTypeMatch = wikitext.match(/\|atttype=([^\n|]+)/i);
        if (attTypeMatch?.[1]?.trim()) {
          const attType = attTypeMatch[1].trim();
          // Map abbreviations to full names
          if (attType === 'QA') preview.attackerType = 'Quick Attacker';
          else if (attType === 'SA') preview.attackerType = 'Short Attacker';
          else if (attType === 'NA') preview.attackerType = 'Near Attacker';
          else if (attType === 'DE') preview.attackerType = 'Defender';
          else {
            console.log(`⚠️ Unknown attacker type '${attType}' - skipping`);
            // Don't set attackerType to invalid value
          }
          if (preview.attackerType) {
            console.log('✓ Attacker Type from wikitext:', preview.attackerType);
          }
        }
        
        // Rank (N, A, S, SS, SSS, SSS+, U) - handle SSS+ correctly
        const rankMatch = wikitext.match(/\|rank=([NASSU+]+)/i);
        if (rankMatch?.[1]) preview.rank = rankMatch[1];
        
        // Additional families from wikitext (family, family2, family3)
        const family1 = wikitext.match(/\|family=([^\n|]+)/i);
        const family2 = wikitext.match(/\|family2=([^\n|]+)/i);
        const family3 = wikitext.match(/\|family3=([^\n|]+)/i);
        
        // Validate and add families (only if they're in the allowed list)
        const familyValues = [family1, family2, family3];
        for (const familyMatch of familyValues) {
          if (familyMatch?.[1]?.trim()) {
            const familyValue = familyMatch[1].trim();
            // Check if family is in allowed list
            if (DIGIMON_FAMILIES.includes(familyValue as any)) {
              if (!preview.families.includes(familyValue)) {
                preview.families.push(familyValue);
                console.log('✓ Family from wikitext:', familyValue);
              }
            } else {
              console.log(`⚠️ Unrecognized family '${familyValue}' - skipping (not in allowed list)`);
            }
          }
        }
        
        // Deck Buffs (unlocked, unlocked2, unlocked3)
        const unlocked1 = wikitext.match(/\|unlocked=([^\n|]+)/i);
        const unlocked2 = wikitext.match(/\|unlocked2=([^\n|]+)/i);
        const unlocked3 = wikitext.match(/\|unlocked3=([^\n|]+)/i);
        
        if (unlocked1?.[1]?.trim()) preview.deckBuffs.push(unlocked1[1].trim());
        if (unlocked2?.[1]?.trim()) preview.deckBuffs.push(unlocked2[1].trim());
        if (unlocked3?.[1]?.trim()) preview.deckBuffs.push(unlocked3[1].trim());
        
        // Rideable name
        const rideable = wikitext.match(/\|rideable=([^\n|]+)/i);
        if (rideable?.[1]?.trim()) preview.rideable = rideable[1].trim();
        
        // Jogress components
        const jogressMatch = wikitext.match(/\|jogress=\[\[([^\]]+)\]\][^[]*\[\[([^\]]+)\]\]/i);
        if (jogressMatch) {
          preview.jogressFrom = [jogressMatch[1].trim(), jogressMatch[2].trim()];
        }
        
        // Type (Bird, Beast, Dragon, etc.)
        const typeMatch = wikitext.match(/\|type=([^\n|]+)/i);
        if (typeMatch?.[1]?.trim()) preview.type = typeMatch[1].trim();
        
        // Default Level
        const levelMatch = wikitext.match(/\|level=(\d+)/i);
        if (levelMatch?.[1]) preview.defaultLevel = parseInt(levelMatch[1]);
        
        // Riding (Yes/No)
        const ridingMatch = wikitext.match(/\|riding=(Yes|No)/i);
        if (ridingMatch?.[1]) preview.isRiding = ridingMatch[1].toLowerCase() === 'yes';
        
        // Egg availability (Yes/No)
        const eggMatch = wikitext.match(/\|egg=(Yes|No)/i);
        if (eggMatch?.[1]) preview.availableFromEgg = eggMatch[1].toLowerCase() === 'yes';
        
        // Location
        const locationMatch = wikitext.match(/\|location=([^\n|]+)/i);
        if (locationMatch?.[1]?.trim()) preview.location = locationMatch[1].trim();
        
        // GDMO availability (Yes/No)
        const gdmoMatch = wikitext.match(/\|gdmo=(Yes|No)/i);
        if (gdmoMatch?.[1]) preview.availableInGDMO = gdmoMatch[1].toLowerCase() === 'yes';
        
        // Jogress/DigiXros requirement (Jogress Chip, DigiXros Chip, etc.)
        const neededMatch = wikitext.match(/\|needed=([^\n|]+)/i);
        if (neededMatch?.[1]?.trim()) preview.jogressRequirement = neededMatch[1].trim();
        
        // Digivolution from wikitext (|to= and |from=)
        const toMatch = wikitext.match(/\|to=\[\[([^\]]+)\]\]/i);
        if (toMatch?.[1]?.trim()) {
          const toName = normalizeDigimonName(toMatch[1].trim());
          if (!preview.digivolutions.digivolvesTo.find((d: any) => d.name === toName)) {
            preview.digivolutions.digivolvesTo.push({ name: toName });
          }
        }
        
        const fromMatch = wikitext.match(/\|from=\[\[([^\]]+)\]\]/i);
        if (fromMatch?.[1]?.trim()) {
          const fromName = normalizeDigimonName(fromMatch[1].trim());
          if (!preview.digivolutions.digivolvesFrom.find((d: any) => d.name === fromName)) {
            preview.digivolutions.digivolvesFrom.push({ name: fromName });
          }
        }
      }

      // Extract stats from wikitext template
      if (wikitext) {
        const statsMatch = wikitext.match(/\{\{stats\|([^}]+)\}\}/i);
        if (statsMatch) {
          console.log('Found stats template');
          const statsStr = statsMatch[1];
          
          // Parse base stats (with 'base' prefix)
          const baseHp = statsStr.match(/base hp=(\d+)/i);
          const baseDs = statsStr.match(/base ds=(\d+)/i);
          const baseAt = statsStr.match(/base at=(\d+)/i);
          const baseDe = statsStr.match(/base de=(\d+)/i);
          const baseAs = statsStr.match(/base as=(\d+)/i);
          const baseCt = statsStr.match(/base ct=([\d.]+)%?/i);
          const baseHt = statsStr.match(/base ht=(\d+)/i);
          const baseEv = statsStr.match(/base ev=([\d.]+)%?/i);
          
          // Parse max stats (100% size, lv 140 - without 'base' prefix)
          // Match patterns like |hp=927 but NOT |base hp=
          const maxHp = statsStr.match(/(?<!base )\bhp=(\d+)/i);
          const maxDs = statsStr.match(/(?<!base )\bds=(\d+)/i);
          const maxAt = statsStr.match(/(?<!base )\bat=(\d+)/i);
          const maxDe = statsStr.match(/(?<!base )\bde=(\d+)/i);
          const maxAs = statsStr.match(/(?<!base )\bas=(\d+)/i);
          const maxCt = statsStr.match(/(?<!base )\bct=([\d.]+)%?/i);
          const maxHt = statsStr.match(/(?<!base )\bht=(\d+)/i);
          const maxEv = statsStr.match(/(?<!base )\bev=([\d.]+)%?/i);
          
          // Set base stats
          if (baseHp) preview.stats.hp = parseInt(baseHp[1]);
          if (baseDs) preview.stats.ds = parseInt(baseDs[1]);
          if (baseAt) preview.stats.at = parseInt(baseAt[1]);
          if (baseDe) preview.stats.de = parseInt(baseDe[1]);
          if (baseAs) preview.stats.as = parseInt(baseAs[1]);
          if (baseCt) preview.stats.ct = parseFloat(baseCt[1]);
          if (baseHt) preview.stats.ht = parseInt(baseHt[1]);
          if (baseEv) preview.stats.ev = parseFloat(baseEv[1]);
          
          // Set max stats
          if (maxHp) preview.maxStats.hp = parseInt(maxHp[1]);
          if (maxDs) preview.maxStats.ds = parseInt(maxDs[1]);
          if (maxAt) preview.maxStats.at = parseInt(maxAt[1]);
          if (maxDe) preview.maxStats.de = parseInt(maxDe[1]);
          if (maxAs) preview.maxStats.as = parseInt(maxAs[1]);
          if (maxCt) preview.maxStats.ct = parseFloat(maxCt[1]);
          if (maxHt) preview.maxStats.ht = parseInt(maxHt[1]);
          if (maxEv) preview.maxStats.ev = parseFloat(maxEv[1]);
          
          // If no base stats found, use max stats as base (for cases where only 100% stats exist)
          if (!baseHp && maxHp) preview.stats.hp = preview.maxStats.hp;
          if (!baseDs && maxDs) preview.stats.ds = preview.maxStats.ds;
          if (!baseAt && maxAt) preview.stats.at = preview.maxStats.at;
          if (!baseDe && maxDe) preview.stats.de = preview.maxStats.de;
          if (!baseAs && maxAs) preview.stats.as = preview.maxStats.as;
          if (!baseCt && maxCt) preview.stats.ct = preview.maxStats.ct;
          if (!baseHt && maxHt) preview.stats.ht = preview.maxStats.ht;
          if (!baseEv && maxEv) preview.stats.ev = preview.maxStats.ev;
        }
        
        // Extract stats note (size% and level) - capture the full text
        const noteMatch = wikitext.match(/\{\{note\|(Approximate statistics with (\d+)% size and level (\d+))\}\}/i);
        if (noteMatch) {
          preview.statsNote = {
            text: noteMatch[1],
            size: noteMatch[2] + '%',
            level: parseInt(noteMatch[3])
          };
        }
      }
      
      // Extract skills/attacks from wikitext template
      if (wikitext) {
        // Try both "Digimon Attacks" and "Digimon Attacks 2" templates
        const attacksMatch = wikitext.match(/\{\{Digimon Attacks\s*\d*[^}]*\n([\s\S]*?)\n\}\}/i);
        if (attacksMatch) {
          console.log('Found Digimon Attacks template');
          const attacksStr = attacksMatch[1];
          
          // Parse multiple attacks (attack1, attack2, etc.)
          for (let i = 1; i <= 10; i++) {
            const attackName = attacksStr.match(new RegExp(`\\|attack${i}=([^\\n|]+)`, 'i'));
            if (!attackName || !attackName[1].trim()) continue;
            
            console.log(`Found skill ${i}: ${attackName[1].trim()}`);
            
            const skill: any = {
              name: attackName[1].trim(),
              type: 'Attack',
            };
            
            // Extract all skill properties
            const attribute = attacksStr.match(new RegExp(`\\|attribute${i}=([^\\n|]+)`, 'i'));
            const cooldown = attacksStr.match(new RegExp(`\\|cooldown${i}=(\\d+)`, 'i'));
            const ds = attacksStr.match(new RegExp(`\\|atk${i}ds=(\\d+)`, 'i'));
            const imgid = attacksStr.match(new RegExp(`\\|atk${i}imgid=([^\\n|]+)`, 'i'));
            const anim = attacksStr.match(new RegExp(`\\|anim${i}=([\\d.]+)`, 'i'));
            const desc = attacksStr.match(new RegExp(`\\|atk${i}desc=([^\\n|]+)`, 'i'));
            const lvl1 = attacksStr.match(new RegExp(`\\|atk${i}lv1=(\\d+)`, 'i'));
            const upgrade = attacksStr.match(new RegExp(`\\|atk${i}upgrade=(\\d+)`, 'i'));
            const skillpoint = attacksStr.match(new RegExp(`\\|skillpoint${i}=([\\d?]+)`, 'i'));
            
            if (attribute && attribute[1].trim()) skill.element = attribute[1].trim();
            if (cooldown) skill.cooldown = parseInt(cooldown[1]);
            if (ds) skill.dsConsumption = parseInt(ds[1]);
            if (anim) skill.animationTime = parseFloat(anim[1]);
            if (desc && desc[1].trim()) skill.description = desc[1].trim();
            if (skillpoint) {
              // Save to correct field: skillPointsPerUpgrade (not skillPointsRequired!)
              const sp = skillpoint[1];
              skill.skillPointsPerUpgrade = sp === '?' ? null : parseInt(sp);
            }
            if (imgid && imgid[1].trim()) {
              // Remove trailing comma if present
              skill.imageId = imgid[1].trim().replace(/,\s*$/, '');
            }
            
            // Calculate damage per level (1-25)
            if (lvl1 && upgrade) {
              const baseDamage = parseInt(lvl1[1]);
              const upgradeAmount = parseInt(upgrade[1]);
              const damagePerLevel: { level: number; damage: number }[] = [];
              
              for (let level = 1; level <= 25; level++) {
                const damage = baseDamage + (upgradeAmount * (level - 1));
                damagePerLevel.push({ level, damage });
              }
              
              skill.damagePerLevel = damagePerLevel;
            }
            
            preview.skills.push(skill);
          }
        } else {
          console.log('WARNING: Digimon Attacks template not found in wikitext, trying HTML backup');
        }
      }
      
      // Backup: Parse skills from HTML if wikitext parsing failed
      if (preview.skills.length === 0) {
        console.log('Attempting to parse skills from HTML table...');
        $('table').each((_, table) => {
          const $table = $(table);
          const rows = $table.find('tr');
          
          rows.each((idx, row) => {
            const $row = $(row);
            const cells = $row.find('td');
            
            // Check if this is a skill name row (has bold tag)
            const skillNameCell = cells.first().find('b');
            if (skillNameCell.length > 0 && cells.length >= 5) {
              const skillName = skillNameCell.text().trim();
              if (!skillName) return;
              
              const skill: any = {
                name: skillName,
                type: 'Attack',
              };
              
              // Extract skill icon from HTML (first cell, before skill name)
              const skillIconImg = cells.first().find('img[src*="Icon"]').first();
              if (skillIconImg.length > 0) {
                const src = skillIconImg.attr('src');
                if (src && src.includes('/images/')) {
                  // Store full path (MediaWiki uses hash-based directories)
                  skill.imageId = src;
                  console.log(`Found skill icon in HTML: ${skill.imageId}`);
                }
              }
              
              // Parse element from image alt text
              const elementImg = $(cells[1]).find('img').first();
              if (elementImg.length > 0) {
                skill.element = elementImg.attr('alt')?.trim() || 'Neutral';
              }
              
              // Parse cooldown
              const cooldownText = $(cells[2]).text().trim();
              const cooldownMatch = cooldownText.match(/(\d+)\s*seconds?\s*cooldown/i);
              if (cooldownMatch) skill.cooldown = parseInt(cooldownMatch[1]);
              
              // Parse DS consumption
              const dsText = $(cells[3]).text().trim();
              const dsMatch = dsText.match(/(\d+)\s*DS/i);
              if (dsMatch) skill.dsConsumption = parseInt(dsMatch[1]);
              
              // Parse skill points per upgrade
              const spText = $(cells[4]).text().trim();
              const spMatch = spText.match(/(\d+)\s*skill\s*points?\s*per\s*upgrade/i);
              if (spMatch) skill.skillPointsPerUpgrade = parseInt(spMatch[1]);
              
              // Parse animation time
              const animText = $(cells[5]).text().trim();
              const animMatch = animText.match(/([\d.]+)\s*seconds?\s*animation/i);
              if (animMatch) skill.animationTime = parseFloat(animMatch[1]);
              
              // Get description from next row
              const nextRow = rows.eq(idx + 1);
              if (nextRow.length > 0) {
                const descCell = nextRow.find('td.atkdesc');
                if (descCell.length > 0) {
                  skill.description = descCell.text().trim();
                }
              }
              
              preview.skills.push(skill);
              console.log(`Parsed skill from HTML: ${skillName}`);
            }
          });
        });
      }
      
      // ============================================
      // STEP 4: Parse Skills Table for Icons and Damage Stats
      // ============================================
      console.log('Step 4: Parsing skills table for complete data...');
      
      // Find the attack table (has class "attacktable")
      const attackTable = $('table.attacktable, table.wikitable').filter((_, table) => {
        const $table = $(table);
        // Check if this table has attack damage columns (Lv.1, Lv.2, etc.)
        const hasLevelColumns = $table.find('th').text().includes('Lv.');
        return hasLevelColumns;
      }).first();
      
      if (attackTable.length > 0) {
        console.log('Found attack stats table!');
        
        attackTable.find('tr').each((rowIdx, row) => {
          if (rowIdx === 0) return; // Skip header row
          
          const $row = $(row);
          const cells = $row.find('td');
          
          if (cells.length >= 27) { // Icon + Name + 25 levels
            // Get skill icon from first cell
            const iconCell = $(cells[0]);
            const iconImg = iconCell.find('img').first();
            let skillIconFilename = null;
            
            if (iconImg.length > 0) {
              const src = iconImg.attr('src');
              if (src) {
                // Store the FULL path from /images/... (MediaWiki uses hash-based directories)
                // Example: /images/b/bb/Ninja_Blade.png or /images/thumb/b/bb/Ninja_Blade.png/32px-Ninja_Blade.png
                if (src.includes('/images/')) {
                  skillIconFilename = src; // Store full path
                }
              }
            }
            
            // Get skill name from second cell
            const nameCell = $(cells[1]);
            const skillName = nameCell.text().trim();
            
            if (skillName) {
              // Find matching skill in our array
              const matchingSkill = preview.skills.find((s: any) => 
                s.name.toLowerCase() === skillName.toLowerCase()
              );
              
              if (matchingSkill) {
                // Update icon if found - ALWAYS prefer HTML table path over wikitext filename
                if (skillIconFilename) {
                  // Overwrite even if imageId exists - HTML path is more reliable than wikitext filename
                  matchingSkill.imageId = skillIconFilename; // Full path stored
                  console.log(`✓ Found skill icon in table: ${skillName} -> ${skillIconFilename}`);
                }
                
                // Parse damage values for all 25 levels
                const damageValues: { level: number; damage: number }[] = [];
                for (let lvl = 1; lvl <= 25; lvl++) {
                  const damageCell = $(cells[lvl + 1]); // +1 because cell 0 is icon, cell 1 is name
                  const damageText = damageCell.text().trim();
                  const damage = parseInt(damageText);
                  
                  if (!isNaN(damage)) {
                    damageValues.push({ level: lvl, damage });
                  }
                }
                
                if (damageValues.length === 25) {
                  matchingSkill.damagePerLevel = damageValues;
                  console.log(`✓ Parsed ${damageValues.length} damage levels for ${skillName}`);
                }
              }
            }
          }
        });
      }
      
      // ============================================
      // STEP 5: Fill in Missing Skill Icons from HTML (Fallback)
      // ============================================
      console.log('Step 5: Checking for remaining missing skill icons...');
      
      // For skills that don't have icons from wikitext, try to find them in HTML
      if (preview.skills.length > 0) {
        $('table').each((_, table) => {
          const $table = $(table);
          
          // Check if this is a skills table (has attack icons)
          const hasSkillIcons = $table.find('img[src*="Icon"]').length > 0;
          if (!hasSkillIcons) return;
          
          $table.find('tr').each((_, row) => {
            const $row = $(row);
            const cells = $row.find('td');
            
            if (cells.length >= 2) {
              // Try to find skill name in this row
              const skillNameCell = cells.first().find('b');
              if (skillNameCell.length === 0) return;
              
              const skillNameFromHTML = skillNameCell.text().trim();
              if (!skillNameFromHTML) return;
              
              // Find matching skill in our parsed skills
              const matchingSkill = preview.skills.find((s: any) => 
                s.name.toLowerCase() === skillNameFromHTML.toLowerCase()
              );
              
              if (matchingSkill) {
                // Extract icon from HTML - prefer HTML path over wikitext filename
                const skillIconImg = cells.first().find('img[src*="Icon"]').first();
                if (skillIconImg.length > 0) {
                  const src = skillIconImg.attr('src');
                  if (src && src.includes('/images/')) {
                    // Check if current imageId is just a filename (no path) - if so, overwrite with full path
                    const shouldOverwrite = !matchingSkill.imageId || !matchingSkill.imageId.includes('/');
                    if (shouldOverwrite) {
                      matchingSkill.imageId = src;
                      console.log(`→ Found icon for "${matchingSkill.name}" in HTML: ${src}`);
                    }
                  }
                }
              }
            }
          });
        });
      }
      
      // Parse F1/F2/F3/F4 Special Effects from wikitext
      if (wikitext) {
        const specialEffects: any = {};
        
        for (let i = 1; i <= 4; i++) {
          const effectMatch = wikitext.match(new RegExp(`'''F${i} Special (?:Effect|Buff)[^']*- ([^']+)'''[\\s\\S]{0,500}?Duration[:\\s]+(\\d+)[^\\n]*[\\s\\S]{0,200}?Activation[:\\s]+([\\d.]+)%[\\s\\S]{0,300}?(?:Buff|Debuff) Effect[:\\s]+([^\\n]+)`, 'i'));
          if (effectMatch) {
            specialEffects[`f${i}`] = {
              name: effectMatch[1].trim(),
              duration: effectMatch[2],
              activation: effectMatch[3],
              effect: effectMatch[4].trim()
            };
          }
        }
        
        if (Object.keys(specialEffects).length > 0) {
          preview.specialEffects = specialEffects;
        }
        
        // Parse U Rank Passives
        const uRankPassives: any = {};
        
        if (wikitext.includes('{{Vaccine U}}')) uRankPassives.attribute = 'Vaccine';
        else if (wikitext.includes('{{Virus U}}')) uRankPassives.attribute = 'Virus';
        else if (wikitext.includes('{{Data U}}')) uRankPassives.attribute = 'Data';
        else if (wikitext.includes('{{Unknown U}}')) uRankPassives.attribute = 'Unknown';
        
        if (wikitext.includes('{{Light U}}')) uRankPassives.element = 'Light';
        else if (wikitext.includes('{{Darkness U}}') || wikitext.includes('{{Pitch Black U}}')) uRankPassives.element = 'Pitch Black';
        else if (wikitext.includes('{{Thunder U}}')) uRankPassives.element = 'Thunder';
        else if (wikitext.includes('{{Wood U}}')) uRankPassives.element = 'Wood';
        else if (wikitext.includes('{{Steel U}}')) uRankPassives.element = 'Steel';
        else if (wikitext.includes('{{Fire U}}')) uRankPassives.element = 'Fire';
        else if (wikitext.includes('{{Water U}}')) uRankPassives.element = 'Water';
        else if (wikitext.includes('{{Ice U}}')) uRankPassives.element = 'Ice';
        else if (wikitext.includes('{{Wind U}}')) uRankPassives.element = 'Wind';
        
        if (Object.keys(uRankPassives).length > 0) {
          preview.uRankPassives = uRankPassives;
        }
        
        // Parse SSS+ Rank Passives (different from U-Rank)
        const sssPassives: any = {};
        
        // Look for SSS+ Rank Passives section in wikitext
        const sssPassiveSection = wikitext.match(/===?\s*SSS\+?\s*Rank Passives:?===?[\s\S]*?(?====|$)/i);
        if (sssPassiveSection) {
          const passiveText = sssPassiveSection[0];
          
          // Parse Virus passive
          const virusMatch = passiveText.match(/'''?Virus:?'''?[\s\S]*?Permanent\s+Skilldamage\s+([\d.]+)%\s+increase/i);
          if (virusMatch) {
            sssPassives.virus = `Permanent Skilldamage ${virusMatch[1]}% increase`;
          }
          
          // Parse Darkness passive
          const darknessMatch = passiveText.match(/'''?Darkness:?'''?[\s\S]*?Stack Effect:\s*Attack\s+([\d/%\s]+)/i);
          if (darknessMatch) {
            sssPassives.darkness = `Stack Effect: Attack ${darknessMatch[1]}`;
          }
          
          // Parse Vaccine passive
          const vaccineMatch = passiveText.match(/'''?Vaccine:?'''?[\s\S]*?(Permanent[^\\n]+)/i);
          if (vaccineMatch) {
            sssPassives.vaccine = vaccineMatch[1].trim();
          }
          
          // Parse Data passive
          const dataMatch = passiveText.match(/'''?Data:?'''?[\s\S]*?(Permanent[^\\n]+|Stack Effect:[^\\n]+)/i);
          if (dataMatch) {
            sssPassives.data = dataMatch[1].trim();
          }
        }
        
        if (Object.keys(sssPassives).length > 0) {
          preview.sssPassives = sssPassives;
        }
      }
      
      // Parse SSS+ Rank Passives from HTML if not found in wikitext
      if (!preview.sssPassives && preview.rank?.includes('SSS')) {
        console.log('Attempting to parse SSS+ passives from HTML...');
        const sssPassives: any = {};
        
        // Find SSS+ Rank Passives heading
        $('h2, h3, h4').each((_, heading) => {
          const headingText = $(heading).text().trim();
          if (headingText.includes('SSS') && headingText.includes('Rank Passives')) {
            console.log('Found SSS+ Rank Passives section');
            
            // Get all text between this heading and the next heading
            let currentElement = $(heading).next();
            let passiveText = '';
            
            while (currentElement.length > 0 && !currentElement.is('h2, h3, h4')) {
              passiveText += currentElement.text() + '\n';
              currentElement = currentElement.next();
            }
            
            console.log('SSS+ Passive text:', passiveText);
            
            // Parse Virus
            const virusMatch = passiveText.match(/Virus:\s*Permanent\s+Skilldamage\s+([\d.]+)%\s+increase/i);
            if (virusMatch) {
              sssPassives.virus = `Permanent Skilldamage ${virusMatch[1]}% increase`;
            }
            
            // Parse Darkness
            const darknessMatch = passiveText.match(/Darkness:\s*Stack Effect:\s*Attack\s+([\d/%\s]+)/i);
            if (darknessMatch) {
              sssPassives.darkness = `Stack Effect: Attack ${darknessMatch[1]}`;
            }
          }
        });
        
        if (Object.keys(sssPassives).length > 0) {
          preview.sssPassives = sssPassives;
        }
      }
      
      // Parse Overview section (Pros/Cons)
      $('h2, h3').each((_, heading) => {
        const headingText = $(heading).text().trim();
        if (headingText.toLowerCase().includes('overview')) {
          console.log('Found Overview section');
          
          // Find Pros subsection
          let currentElement = $(heading).next();
          while (currentElement.length > 0 && !currentElement.is('h2')) {
            const text = currentElement.text().trim();
            
            if (text.toLowerCase().includes('pros:') || currentElement.find('*:contains("Pros:")').length > 0) {
              // Get all list items after Pros
              const prosList = currentElement.next('ul');
              if (prosList.length > 0) {
                prosList.find('li').each((_, li) => {
                  const proText = $(li).text().trim();
                  if (proText) preview.overview.pros.push(proText);
                });
              }
            }
            
            if (text.toLowerCase().includes('cons:') || currentElement.find('*:contains("Cons:")').length > 0) {
              // Get all list items after Cons
              const consList = currentElement.next('ul');
              if (consList.length > 0) {
                consList.find('li').each((_, li) => {
                  const conText = $(li).text().trim();
                  if (conText) preview.overview.cons.push(conText);
                });
              }
            }
            
            currentElement = currentElement.next();
            if (currentElement.is('h2, h3')) break;
          }
        }
      });
      
      // Parse from wikitext if HTML didn't work
      if (wikitext && preview.overview.pros.length === 0 && preview.overview.cons.length === 0) {
        const overviewSection = wikitext.match(/==+\s*Overview\s*==+([\s\S]*?)(?===+|$)/i);
        if (overviewSection) {
          const overviewText = overviewSection[1];
          
          // Parse Pros
          const prosMatch = overviewText.match(/===?\s*Pros:?\s*===?[\s\S]*?\n([\s\S]*?)(?====|$)/i);
          if (prosMatch) {
            const prosText = prosMatch[1];
            const prosList = prosText.match(/^\*\s*(.+)$/gm);
            if (prosList) {
              prosList.forEach(pro => {
                const cleanPro = pro.replace(/^\*\s*/, '').trim();
                if (cleanPro) preview.overview.pros.push(cleanPro);
              });
            }
          }
          
          // Parse Cons
          const consMatch = overviewText.match(/===?\s*Cons:?\s*===?[\s\S]*?\n([\s\S]*?)(?====|$)/i);
          if (consMatch) {
            const consText = consMatch[1];
            const consList = consText.match(/^\*\s*(.+)$/gm);
            if (consList) {
              consList.forEach(con => {
                const cleanCon = con.replace(/^\*\s*/, '').trim();
                if (cleanCon) preview.overview.cons.push(cleanCon);
              });
            }
          }
        }
      }
      
      // ============================================
      // STEP 2: HTML FALLBACK for Missing Fields
      // ============================================
      console.log('Step 2: Using HTML as fallback for missing fields...');
      
      // Name fallback: Use page title if not found in wikitext
      if (!preview.name || preview.name === digimonSlug) {
        const pageTitle = $('h1.firstHeading').text().trim();
        if (pageTitle) {
          preview.name = pageTitle;
          console.log('→ Name from HTML page title:', preview.name);
        }
      }
      
      // Normalize X-Antibody System naming: Replace "(X-Antibody System)" with " X"
      if (preview.name.includes('(X-Antibody System)')) {
        const originalName = preview.name;
        preview.name = preview.name.replace(' (X-Antibody System)', ' X');
        // Regenerate slug from new name
        preview.slug = preview.name.toLowerCase().replace(/\s+/g, '-').replace(/[()]/g, '');
        console.log(`🔄 Renamed X-Antibody System: "${originalName}" → "${preview.name}"`);
        console.log(`   Slug updated to: "${preview.slug}"`);
      }
      
      // Introduction fallback: Extract from HTML paragraphs if not in wikitext
      if (!preview.introduction) {
        let fullIntro = '';
        $('p').each((i, el) => {
          const text = $(el).text().trim();
          if (text && i < 5) {
            fullIntro += text + '\n\n';
          }
        });
        if (fullIntro) {
          preview.introduction = fullIntro.trim();
          console.log('→ Introduction from HTML paragraphs');
        }
      }
      
      // Parse HTML categories as fallback for core fields
      console.log('\n🔍 Checking HTML categories for fallback data...');
      console.log(`📋 Form BEFORE category parsing: "${preview.form}"`);
      
      // Log all categories found
      const allCategories: string[] = [];
      $('.mw-normal-catlinks a').each((_, el) => {
        allCategories.push($(el).text().trim());
      });
      console.log(`📋 ALL categories found on page:`, allCategories);
      
      $('.mw-normal-catlinks a').each((_, el) => {
        const category = $(el).text().trim();
        
        // Form fallback
        if (!preview.form || preview.form === 'Rookie') {
          if (['Rookie', 'Champion', 'Ultimate', 'Mega', 'In-Training', 'Fresh', 'Armor', 'Hybrid', 'Burst Mode', 'Jogress', 'Side Mega'].includes(category)) {
            console.log(`  → Found matching category: "${category}"`);
            console.log(`  → Setting form from "${preview.form}" to "${category}"`);
            preview.form = category;
            console.log('→ Form from HTML category:', preview.form);
          }
        }
        
        // Attribute fallback
        if (!preview.attribute || preview.attribute === 'None') {
          if (category.includes('Virus Attribute')) preview.attribute = 'Virus';
          if (category.includes('Vaccine Attribute')) preview.attribute = 'Vaccine';
          if (category.includes('Data Attribute')) preview.attribute = 'Data';
          if (preview.attribute !== 'None') console.log('→ Attribute from HTML category:', preview.attribute);
        }
        
        // Element fallback
        if (!preview.element || preview.element === 'Neutral') {
          if (category.includes('Fire Attribute')) preview.element = 'Fire';
          if (category.includes('Water Attribute')) preview.element = 'Water';
          if (category.includes('Ice Attribute')) preview.element = 'Ice';
          if (category.includes('Land Attribute')) preview.element = 'Land';
          if (category.includes('Wind Attribute')) preview.element = 'Wind';
          if (category.includes('Thunder Attribute')) preview.element = 'Thunder';
          if (category.includes('Light Attribute')) preview.element = 'Light';
          if (category.includes('Pitch Black Attribute')) preview.element = 'Pitch Black';
          if (category.includes('Steel Attribute')) preview.element = 'Steel';
          if (category.includes('Wood Attribute')) preview.element = 'Wood';
          if (preview.element !== 'Neutral') console.log('→ Element from HTML category:', preview.element);
        }
        
        // Attacker Type fallback
        if (!preview.attackerType) {
          if (category.includes('Quick Attacker')) preview.attackerType = 'Quick Attacker';
          if (category.includes('Short Attacker')) preview.attackerType = 'Short Attacker';
          if (category.includes('Near Attacker')) preview.attackerType = 'Near Attacker';
          if (category.includes('Defender')) preview.attackerType = 'Defender';
          if (preview.attackerType) console.log('→ Attacker Type from HTML category:', preview.attackerType);
        }
        
        // Families fallback (accumulate from categories)
        if (category.includes("Dragon's Roar") && !preview.families.includes("Dragon's Roar")) {
          preview.families.push("Dragon's Roar");
          console.log('→ Added family from HTML:', "Dragon's Roar");
        }
        if (category.includes('Nature Spirits') && !preview.families.includes('Nature Spirits')) {
          preview.families.push('Nature Spirits');
          console.log('→ Added family from HTML:', 'Nature Spirits');
        }
        if (category.includes('Deep Savers') && !preview.families.includes('Deep Savers')) {
          preview.families.push('Deep Savers');
          console.log('→ Added family from HTML:', 'Deep Savers');
        }
        if (category.includes('Nightmare Soldiers') && !preview.families.includes('Nightmare Soldiers')) {
          preview.families.push('Nightmare Soldiers');
          console.log('→ Added family from HTML:', 'Nightmare Soldiers');
        }
        if (category.includes('Wind Guardians') && !preview.families.includes('Wind Guardians')) {
          preview.families.push('Wind Guardians');
          console.log('→ Added family from HTML:', 'Wind Guardians');
        }
        if (category.includes('Metal Empire') && !preview.families.includes('Metal Empire')) {
          preview.families.push('Metal Empire');
          console.log('→ Added family from HTML:', 'Metal Empire');
        }
        if (category.includes('Virus Busters') && !preview.families.includes('Virus Busters')) {
          preview.families.push('Virus Busters');
          console.log('→ Added family from HTML:', 'Virus Busters');
        }
        if (category.includes('Jungle Troopers') && !preview.families.includes('Jungle Troopers')) {
          preview.families.push('Jungle Troopers');
          console.log('→ Added family from HTML:', 'Jungle Troopers');
        }
        if (category.includes('Dark Area') && !preview.families.includes('Dark Area')) {
          preview.families.push('Dark Area');
          console.log('→ Added family from HTML:', 'Dark Area');
        }
      });
      
      preview.families = [...new Set(preview.families)];
      
      console.log('Fallback parsing complete. Using wikitext as primary, HTML for missing fields.');
      
      // ============================================
      // Special form indicators from name (AFTER category parsing to avoid loops)
      // ============================================
      
      console.log(`\n🔍 FORM ANALYSIS FOR: ${preview.name}`);
      console.log(`📋 Current form BEFORE special detection: "${preview.form}"`);
      
      // D-Reaper entities
      if (preview.name.includes('D-Reaper')) {
        preview.form = 'D-Reaper';
        console.log('→ D-Reaper entity detected, setting form to D-Reaper');
      }
      
      if (preview.name.includes('(Burst Mode)') && !preview.form.includes('Burst Mode')) {
        preview.form = 'Burst Mode';
      }
      
      // IMPORTANT: Check more specific patterns FIRST before generic ones!
      // "(X-Antibody System)" must be checked BEFORE "(X-Antibody)" 
      // because the former contains the latter
      if (preview.name.includes('(X-Antibody System)')) {
        console.log(`🔍 X-Antibody System detected. Current form: "${preview.form}"`);
        const originalForm = preview.form;
        preview.form = preview.form + ' X';
        console.log(`🔍 X-Antibody System: "${originalForm}" → "${preview.form}"`);
      } else if (preview.name.includes('(X-Antibody)') && !preview.form.includes('X')) {
        // Only add if not already an X form
        preview.form = preview.form + ' (X-Antibody)';
        console.log('→ X-Antibody detected, form set to:', preview.form);
      }
      
      if (preview.name.includes('(Awaken)') && !preview.form.includes('Awaken')) {
        console.log(`🔍 Adding Awaken to form. Original: "${preview.form}"`);
        preview.form = preview.form + ' (Awaken)';
        console.log(`🔍 New form value: "${preview.form}"`);
      }
      
      console.log(`📋 FINAL form AFTER special detection: "${preview.form}"`);
      console.log(`🔍 Form validation check: Is "${preview.form}" in allowed list?`);
      
      // Import DIGIMON_FORMS for validation check
      const { DIGIMON_FORMS } = await import('@dmo-kb/shared');
      const isValidForm = DIGIMON_FORMS.includes(preview.form as any);
      console.log(`${isValidForm ? '✅' : '❌'} Form "${preview.form}" is ${isValidForm ? 'VALID' : 'INVALID'}`);
      
      if (!isValidForm) {
        console.log(`⚠️⚠️⚠️ CRITICAL: Form "${preview.form}" will FAIL validation!`);
        console.log(`📋 Allowed forms:`, DIGIMON_FORMS);
      }
      
      // ============================================
      // STEP 3: Parse Digivolutions from INFOBOX (Primary)
      // ============================================
      console.log('Step 3: Parsing digivolutions from infobox...');
      
      // Try to extract from infobox first (most reliable)
      const infobox = $('.infobox, .digimon-infobox, #scraper-infobox').first();
      if (infobox.length > 0) {
        console.log('📋 Parsing infobox table...');
        infobox.find('tr').each((_, row) => {
          const $row = $(row);
          const cells = $row.find('td');
          
          // Need at least 2 cells (label and value)
          if (cells.length >= 2) {
            const firstCell = $(cells[0]).text().trim().toLowerCase();
            const secondCell = $(cells[1]);
            const dataText = secondCell.text().trim();
            
            console.log(`  Row: "${firstCell}" = "${dataText}"`);
            
            // Parse "Can be ridden"
            if (firstCell.includes('can be') && firstCell.includes('ridden')) {
              preview.canBeRidden = dataText.toLowerCase().includes('yes');
              console.log('    ✓ Can be ridden:', preview.canBeRidden);
            }
            
            // Parse "Can be hatched"  
            if (firstCell.includes('can be') && firstCell.includes('hatched')) {
              preview.canBeHatched = dataText.toLowerCase().includes('yes');
              console.log('    ✓ Can be hatched:', preview.canBeHatched);
            }
            
            // Parse "Available"
            if (firstCell.includes('available')) {
              preview.available = dataText.toLowerCase().includes('yes');
              console.log('    ✓ Available:', preview.available);
            }
            
            // Parse "Unlocked with item" (for digivolution)
            if (firstCell.includes('unlocked with item')) {
              const itemName = secondCell.find('a').last().text().trim();
              if (itemName) {
                preview.unlockedWithItem = itemName; // Top-level field, not in digivolutions!
                console.log('    ✓ Unlocked with item:', itemName);
              }
            }
            
            // Parse "Required to evolve"
            if (firstCell.includes('required to evolve')) {
              const requiredItem = secondCell.find('a').last().text().trim();
              if (requiredItem) {
                preview.requiredToEvolve = requiredItem;
                console.log('    ✓ Required to evolve:', requiredItem);
              }
            }
            
            // Parse "Families" (plural) or "Family" (singular)
            if (firstCell === 'families' || firstCell === 'family') {
              // Split by spaces or common separators
              const familiesText = dataText;
              const familyTokens = familiesText.split(/\s+/);
              
              // Try to match known families
              for (const token of familyTokens) {
                // Check if this token or combination matches any known family
                if (DIGIMON_FAMILIES.includes(token as any)) {
                  if (!preview.families.includes(token)) {
                    preview.families.push(token);
                    console.log('    ✓ Family from infobox:', token);
                  }
                } else {
                  // Try multi-word families like "Dragon's Roar", "Nature Spirits", etc.
                  // Check each known family to see if it's in the text
                  for (const knownFamily of DIGIMON_FAMILIES) {
                    if (familiesText.includes(knownFamily) && !preview.families.includes(knownFamily)) {
                      preview.families.push(knownFamily);
                      console.log('    ✓ Family from infobox:', knownFamily);
                    }
                  }
                }
              }
            }
          }
          
          const headerCell = cells.length >= 2 ? $(cells[0]).text().trim().toLowerCase() : '';
          
          if (headerCell.includes('digivolves from') || headerCell.includes('digivolved from') || headerCell.includes('prior')) {
            const dataCell = cells.length >= 2 ? $(cells[1]) : null;
            if (dataCell) {
              dataCell.find('a').each((_, link) => {
                const href = $(link).attr('href');
                const title = $(link).attr('title') || $(link).text().trim();
                
                if (href && !href.includes(':') && title && title.length > 0) {
                  const normalizedTitle = normalizeDigimonName(title);
                  if (!preview.digivolutions.digivolvesFrom.find((d: any) => d.name === normalizedTitle)) {
                    preview.digivolutions.digivolvesFrom.push({ name: normalizedTitle });
                    console.log('✓ Digivolves From (infobox):', normalizedTitle);
                  }
                }
              });
            }
          }
          
          if (headerCell.includes('digivolves to') || headerCell.includes('next')) {
            const dataCell = cells.length >= 2 ? $(cells[1]) : null;
            if (dataCell) {
              const cellHtml = dataCell.html() || '';
              const _cellText = dataCell.text();
              
              // Split by common delimiters to find separate evolution paths
              const parts = cellHtml.split(/<br\s*\/?>/i);
              
              parts.forEach((part) => {
                const $part = $(`<div>${part}</div>`);
                const link = $part.find('a').first();
                
                if (link.length > 0) {
                  const href = link.attr('href');
                  const title = link.attr('title') || link.text().trim();
                  
                  if (href && !href.includes(':') && title && title.length > 0) {
                    // Clean up title - remove wiki template syntax
                    let cleanTitle = title
                      .replace(/link=\{\{\{[^}]+\}\}\}/g, '') // Remove link={{{X-Antibody System}}}
                      .replace(/\{\{\{[^}]+\}\}\}/g, '')      // Remove any {{{template}}}
                      .trim();
                    
                    // Skip if title is empty after cleanup or contains template syntax
                    if (!cleanTitle || cleanTitle.includes('{{{') || cleanTitle.includes('link=')) {
                      console.log(`Skipping invalid evolution entry: "${title}"`);
                      return;
                    }
                    
                    // Normalize the name (X-Antibody System → X)
                    cleanTitle = normalizeDigimonName(cleanTitle);
                    
                    // Extract "Lv XX" text - look for level before the link
                    let requiredLevel = null;
                    const beforeLinkText = part.substring(0, part.indexOf('<a'));
                    const levelMatch = beforeLinkText.match(/Lv\.?\s*(\d+)/i);
                    
                    if (levelMatch) {
                      requiredLevel = parseInt(levelMatch[1]);
                    }
                    
                    // Extract "(with ...)" text - improved regex
                    let requiredItem = null;
                    // First try to find the text after the digimon link
                    const afterLinkText = part.substring(part.indexOf('</a>') + 4);
                    const withMatch = afterLinkText.match(/\(with\s+([^)]+)\)/i);
                    
                    if (withMatch) {
                      // Extract item names and clean up HTML tags
                      requiredItem = withMatch[1]
                        .replace(/<[^>]+>/g, '') // Remove HTML tags
                        .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
                        .trim();
                    }
                    
                    if (!preview.digivolutions.digivolvesTo.find((d: any) => d.name === cleanTitle)) {
                      preview.digivolutions.digivolvesTo.push({ 
                        name: cleanTitle,
                        requiredLevel: requiredLevel,
                        requiredItem: requiredItem 
                      });
                      console.log('✓ Digivolves To (infobox):', cleanTitle, requiredLevel ? `Lv ${requiredLevel}` : '', requiredItem ? `(with ${requiredItem})` : '');
                    }
                  }
                }
              });
            }
          }
        });
      }
      
      // NEW: Parse "Digivolves" section with level information
      console.log('\n🔍 Searching for "Digivolves" section with level data...');
      $('h2, h3').each((_, heading) => {
        const headingText = $(heading).text().trim();
        if (headingText.toLowerCase().includes('digivolves') && !headingText.toLowerCase().includes('jogress')) {
          console.log(`Found heading: "${headingText}"`);
          
          // Get the content after this heading
          let currentElement = $(heading).next();
          let attempts = 0;
          
          while (currentElement.length > 0 && attempts < 10) {
            const tagName = currentElement.prop('tagName')?.toLowerCase();
            
            // Skip <br> tags and empty elements
            if (tagName === 'br' || !tagName) {
              currentElement = currentElement.next();
              attempts++;
              continue;
            }
            
            // Look for TABLE with digivolve-level spans
            if (tagName === 'table') {
              console.log('Found table element, parsing digivolution data...');
              
              // Find all cells with links and their corresponding level spans
              currentElement.find('tr').each((_, row) => {
                const $row = $(row);
                
                // Get all links and level spans in order
                const links = $row.find('a[title]').toArray();
                const levelSpans = $row.find('.digivolve-level').toArray();
                
                // For each link, pair it with the NEXT digimon at the CURRENT level
                // Pattern: [Agumon] → Lv 11 → [GeoGreymon] → Lv 25 → [RizeGreymon]
                // Means: Agumon digivolves to GeoGreymon at level 11
                for (let i = 0; i < links.length - 1; i++) {
                  const currentDigimon = $(links[i]).attr('title');
                  let nextDigimon = $(links[i + 1]).attr('title');
                  const levelSpan = $(levelSpans[i]);
                  
                  if (!currentDigimon || !nextDigimon || currentDigimon.includes(':') || nextDigimon.includes(':')) continue;
                  
                  // Normalize the next digimon name
                  nextDigimon = normalizeDigimonName(nextDigimon);
                  
                  // Skip if current digimon is not the one we're importing
                  if (currentDigimon !== preview.name) continue;
                  
                  const levelText = levelSpan.text();
                  const levelMatch = levelText.match(/Lv\.?\s*(\d+)/i);
                  
                  if (levelMatch) {
                    const level = parseInt(levelMatch[1]);
                    console.log(`✅ Found evolution: ${currentDigimon} → ${nextDigimon} at Lv ${level}`);
                    
                    const existing = preview.digivolutions.digivolvesTo.find((d: any) => d.name === nextDigimon);
                    if (existing) {
                      existing.requiredLevel = level;
                      console.log(`  Updated ${nextDigimon} with level ${level}`);
                    } else {
                      preview.digivolutions.digivolvesTo.push({
                        name: nextDigimon,
                        requiredLevel: level,
                        requiredItem: null
                      });
                      console.log(`  Added ${nextDigimon} at level ${level}`);
                    }
                  }
                }
              });
            }
            
            // Also look for paragraphs or divs with evolution data
            else if (tagName === 'p' || tagName === 'div') {
              const html = currentElement.html() || '';
              console.log(`Element HTML (first 100 chars): ${html.substring(0, 100)}`);
            }
            
            // Stop if we hit another heading
            if (tagName && tagName.match(/^h[1-6]$/)) {
              break;
            }
            
            currentElement = currentElement.next();
            attempts++;
          }
        }
      });
      
      // Also check for simple table structure: <td><b>Digivolves to:</b></td><td><a>...</a></td>
      $('table').each((_, table) => {
        $(table).find('tr').each((_, row) => {
          const $row = $(row);
          const cells = $row.find('td');
          
          if (cells.length >= 2) {
            const firstCell = $(cells[0]).text().trim().toLowerCase();
            
            if (firstCell.includes('digivolves from')) {
              $(cells[1]).find('a').each((_, link) => {
                const href = $(link).attr('href');
                const title = $(link).attr('title') || $(link).text().trim();
                
                if (href && !href.includes(':') && title && title.length > 0) {
                  const normalizedTitle = normalizeDigimonName(title);
                  if (!preview.digivolutions.digivolvesFrom.find((d: any) => d.name === normalizedTitle)) {
                    preview.digivolutions.digivolvesFrom.push({ name: normalizedTitle });
                    console.log('✓ Digivolves From (table):', normalizedTitle);
                  }
                }
              });
            }
            
            if (firstCell.includes('digivolves to')) {
              $(cells[1]).find('a').each((_, link) => {
                const href = $(link).attr('href');
                const title = $(link).attr('title') || $(link).text().trim();
                
                if (href && !href.includes(':') && title && title.length > 0) {
                  const normalizedTitle = normalizeDigimonName(title);
                  if (!preview.digivolutions.digivolvesTo.find((d: any) => d.name === normalizedTitle)) {
                    preview.digivolutions.digivolvesTo.push({ name: normalizedTitle });
                    console.log('✓ Digivolves To (table):', normalizedTitle);
                  }
                }
              });
            }
          }
        });
      });
      
      // Extract digivolution info from the Digivolves section (if not found in infobox)
      const digivolvesHeading = $('h2:contains("Digivolves"), h3:contains("Digivolves")').first();
      if (digivolvesHeading.length > 0 && preview.digivolutions.digivolvesFrom.length === 0 && preview.digivolutions.digivolvesTo.length === 0) {
        // Find the table after the "Digivolves" heading
        const digiTable = digivolvesHeading.nextAll('table').first();
        
        if (digiTable.length > 0) {
          digiTable.find('tr').each((_, row) => {
            const $row = $(row);
            const cells = $row.find('td');
            
            // First cell usually contains "Digivolves to" or "Digivolves from"
            if (cells.length >= 2) {
              const label = $(cells[0]).text().trim().toLowerCase();
              
              // Extract Digimon names from links in the second cell
              $(cells[1]).find('a').each((_, link) => {
                const href = $(link).attr('href');
                const title = $(link).attr('title') || $(link).text().trim();
                
                // Only add if it's a wiki link to a Digimon page (not category, file, etc.)
                if (href && !href.includes(':') && title && title.length > 0) {
                  const normalizedTitle = normalizeDigimonName(title);
                  if (label.includes('to')) {
                    if (!preview.digivolutions.digivolvesTo.find((d: any) => d.name === normalizedTitle)) {
                      preview.digivolutions.digivolvesTo.push({ name: normalizedTitle });
                    }
                  } else if (label.includes('from')) {
                    if (!preview.digivolutions.digivolvesFrom.find((d: any) => d.name === normalizedTitle)) {
                      preview.digivolutions.digivolvesFrom.push({ name: normalizedTitle });
                    }
                  }
                }
              });
            }
          });
        }
      }
      
      // Backup: Parse digivolutions from HTML if none found
      if (preview.digivolutions.digivolvesFrom.length === 0 && preview.digivolutions.digivolvesTo.length === 0) {
        console.log('Attempting to parse digivolutions from HTML table backup...');
        $('table').each((_, table) => {
          const $table = $(table);
          
          // Look for digivolution table by checking for icon images
          const hasDigimonIcons = $table.find('img[src*="_Icon.png"]').length > 0;
          if (!hasDigimonIcons) return;
          
          // Find the row containing the current Digimon (with .selecteddigivolve class)
          let currentDigimonFound = false;
          
          $table.find('tr').each((rowIdx, row) => {
            const $row = $(row);
            const cells = $row.find('td');
            
            cells.each((cellIdx, cell) => {
              const $cell = $(cell);
              
              // Check if this cell contains the current Digimon
              const isCurrentDigimon = $cell.find('.selecteddigivolve').length > 0 ||
                                       $cell.find(`a[title="${digimonSlug}"]`).length > 0;
              
              if (isCurrentDigimon) {
                currentDigimonFound = true;
                console.log(`Found current Digimon in row ${rowIdx}, cell ${cellIdx}`);
                
                // Get all links in this cell
                const allLinksInCell = $cell.find('a[title]');
                
                allLinksInCell.each((linkIdx, link) => {
                  const title = $(link).attr('title');
                  
                  // Skip if title is current Digimon or invalid
                  if (!title || title === digimonSlug || title.includes(':')) return;
                  
                  // Determine if link is before or after the selected digimon
                  const selectedSpan = $cell.find('.selecteddigivolve');
                  if (selectedSpan.length > 0) {
                    const _selectedParent = selectedSpan.parent();
                    const _linkParent = $(link).parent();
                    
                    // Get all <a> and <span> elements in order
                    const allElements = $cell.find('a, span.selecteddigivolve');
                    const selectedIndex = allElements.index(selectedSpan);
                    const linkElement = allElements.filter((i, el) => $(el).is($(link)) || $(el).find(link).length > 0);
                    const linkIndexInAll = allElements.index(linkElement.first());
                    
                    const normalizedTitle = normalizeDigimonName(title);
                    
                    if (linkIndexInAll < selectedIndex) {
                      // Link comes before selected = Digivolves From
                      if (!preview.digivolutions.digivolvesFrom.find((d: any) => d.name === normalizedTitle)) {
                        preview.digivolutions.digivolvesFrom.push({ name: normalizedTitle });
                        console.log(`Added "${normalizedTitle}" to Digivolves From`);
                      }
                    } else if (linkIndexInAll > selectedIndex) {
                      // Link comes after selected = Digivolves To
                      if (!preview.digivolutions.digivolvesTo.find((d: any) => d.name === normalizedTitle)) {
                        preview.digivolutions.digivolvesTo.push({ name: normalizedTitle });
                        console.log(`Added "${normalizedTitle}" to Digivolves To`);
                      }
                    }
                  }
                });
              }
            });
          });
          
          if (currentDigimonFound) {
            console.log(`Parsed digivolutions - From: ${preview.digivolutions.digivolvesFrom.map((d: any) => d.name).join(', ')}, To: ${preview.digivolutions.digivolvesTo.map((d: any) => d.name).join(', ')}`);
          }
        });
      }

      // Download and upload images
      console.log('Starting image downloads...');
      
      // This check is now done earlier in the initial HTML parsing
      
      // Fallback 1: Try to find the main artwork image in wikitext
      if (!mainImageUrl && wikitext) {
        // Look for image parameter in wikitext: |image=Gizumon_AT.png
        const imageMatch = wikitext.match(/\|\s*image\s*=\s*(?:File:|Image:)?([^|\n]+\.(?:png|jpg|jpeg|gif))/i);
        if (imageMatch) {
          const filename = imageMatch[1].trim();
          // For now, construct a generic URL - the actual hash-based path will be tried by the downloader
          mainImageUrl = `https://dmowiki.com/Special:Redirect/file/${encodeURIComponent(filename)}`;
          console.log('Found main image in wikitext:', mainImageUrl);
        }
      }
      
      // Fallback 2: Look for File: links in the infobox/page
      if (!mainImageUrl) {
        console.log('Fallback 2: Checking File: links...');
        $('a[href*="/File:"]').each((_, link) => {
          const href = $(link).attr('href') || '';
          const filename = href.replace(/^\/File:/, '').trim();
          
          // Look for files matching Digimon name (case insensitive) but NOT icons
          if (filename.toLowerCase().includes(digimonSlug.toLowerCase()) && 
              !filename.includes('_Icon') &&
              /\.(png|jpg|jpeg|gif)$/i.test(filename)) {
            
            // Use MediaWiki's Special:Redirect to get the actual file
            if (!mainImageUrl) {
              mainImageUrl = `https://dmowiki.com/Special:Redirect/file/${encodeURIComponent(filename)}`;
              console.log('Found main image via File: link:', mainImageUrl);
            }
          }
        });
      }
      
      // Fallback 3: Aggressively search for any large image matching the Digimon name
      if (!mainImageUrl) {
        console.log('Fallback 3: Searching for any image matching Digimon name...');
        const foundImages: string[] = [];
        
        $('img').each((_, img) => {
          const src = $(img).attr('src') || '';
          const _alt = $(img).attr('alt') || '';
          
          // Look for images that:
          // 1. Match the Digimon name (case insensitive)
          // 2. Are NOT icons
          // 3. Are likely artwork (in /images/ directory)
          // 4. Are reasonably sized (not tiny thumbnails)
          if (src.toLowerCase().includes(digimonSlug.toLowerCase()) && 
              !src.includes('_Icon') && 
              src.includes('/images/')) {
            
            let imagePath = src;
            if (imagePath.includes('/thumb/')) {
              const thumbMatch = imagePath.match(/\/images\/thumb\/([a-f0-9]\/[a-f0-9]{2}\/.+?\.(?:png|jpg|jpeg|gif))/i);
              if (thumbMatch) {
                imagePath = `/images/${thumbMatch[1]}`;
              } else {
                const simpleMatch = imagePath.match(/\/images\/thumb\/(.*?\.(?:png|jpg|jpeg|gif))/i);
                if (simpleMatch) {
                  imagePath = `/images/${simpleMatch[1]}`;
                }
              }
            }
            
            const fullUrl = imagePath.startsWith('http') ? imagePath : `https://dmowiki.com${imagePath}`;
            foundImages.push(fullUrl);
          }
        });
        
        if (foundImages.length > 0) {
          // Prefer the first one (usually the main artwork)
          mainImageUrl = foundImages[0];
          console.log(`Found ${foundImages.length} potential images, using first:`, mainImageUrl);
          if (foundImages.length > 1) {
            console.log('Other candidates:', foundImages.slice(1));
          }
        }
      }
      
      // Try to get icon URL if not found - avoid TBD.png and match Digimon name
      if (!iconUrl) {
        let selectedIcon: string | undefined = undefined;
        
        // Create name variations (same as infobox search)
        const nameVariations = [
          digimonSlug,
          digimonSlug.replace(/-/g, '_'),
          digimonSlug.replace(/-/g, ' '),
          digimonSlug.replace(/[()]/g, ''),
          digimonSlug.replace(/-/g, '_').replace(/[()]/g, ''),
          digimonSlug.replace(/\(/g, '%28').replace(/\)/g, '%29').replace(/-/g, '_'),
          digimonSlug.replace(/-/g, ' ').replace(/\s+/g, '_').replace(/\(/g, '_%28').replace(/\)/g, '%29'),
        ];
        
        console.log('\n🔍 FALLBACK: Searching all page icons for Digimon name match...');
        
        // First, try to find icon matching the Digimon slug/name  
        $('img[src*="_Icon.png"]').each((idx, img) => {
          const src = $(img).attr('src');
          
          if (src && !src.includes('TBD.png')) {
            console.log(`  [${idx}] ${src}`);
            
            // Check if this icon matches any name variation
            const isMatch = nameVariations.some(variation => 
              src.toLowerCase().includes(variation.toLowerCase().replace(/ /g, '_'))
            );
            
            if (isMatch) {
              selectedIcon = src;
              console.log(`✅ Found exact name match in fallback: ${src}`);
              return false; // break loop
            }
            
            // If no match yet, save as fallback (but prefer name matches)
            if (!selectedIcon) {
              selectedIcon = src;
            }
          }
        });
        
        if (selectedIcon) {
          const iconSrc = String(selectedIcon);
          iconUrl = iconSrc.startsWith('http') ? iconSrc : `https://dmowiki.com${iconSrc}`;
          console.log('Found icon image:', iconUrl);
        } else {
          console.log('⚠️ No icon found, will try direct URL');
        }
      }
      
      // FINAL FALLBACK: If still no main image, try direct MediaWiki Special:Redirect
      if (!mainImageUrl) {
        console.log('⚠️ All detection methods failed, trying direct MediaWiki redirect...');
        // Try: https://dmowiki.com/Special:Redirect/file/Falcomon.png
        const directFilename = `${digimonSlug}.png`;
        mainImageUrl = `https://dmowiki.com/Special:Redirect/file/${encodeURIComponent(directFilename)}`;
        console.log('💡 Trying direct redirect URL:', mainImageUrl);
      }
      
      console.log('\n=== IMAGE URLS DETECTED ===');
      console.log('Icon URL:', iconUrl || '❌ NOT FOUND');
      console.log('Main Image URL:', mainImageUrl || '❌ NOT FOUND');
      console.log('=========================\n');
      
      if (!mainImageUrl) {
        console.log('⚠️ WARNING: Main artwork not found! Only icon will be displayed.');
      }
      if (!iconUrl) {
        console.log('⚠️ WARNING: Icon not found!');
      }
      
      if (iconUrl) {
        console.log('Attempting to download icon...');
        const iconId = await downloadAndUploadImage(
          iconUrl, 
          `${digimonSlug}_Icon.png`,
          {
            imageType: 'digimon-icon',
            belongsTo: { digimon: digimonSlug },
            tags: [preview.form, preview.element, preview.attribute].filter(Boolean),
          }
        );
        if (iconId) {
          preview.icon = iconId;
          preview.iconUrl = iconUrl; // Store original URL for reference
        }
      }
      
      if (mainImageUrl) {
        console.log('📥 Attempting to download main artwork...');
        console.log('📥 URL:', mainImageUrl);
        console.log('📥 Filename:', `${digimonSlug}.png`);
        
        const mainImageId = await downloadAndUploadImage(
          mainImageUrl, 
          `${digimonSlug}.png`,
          {
            imageType: 'digimon-main',
            belongsTo: { digimon: digimonSlug },
            tags: [preview.form, preview.element, preview.attribute].filter(Boolean),
          }
        );
        
        if (mainImageId) {
          preview.mainImage = mainImageId;
          preview.mainImageUrl = mainImageUrl; // Store original URL for reference
          console.log('✅ Main artwork downloaded and set in preview!');
        } else {
          console.log('❌ Main artwork download FAILED!');
        }
      } else {
        console.log('❌ No main artwork URL detected');
      }
      
      // Download skill icons using imageId from wikitext
      for (const skill of preview.skills) {
        let skillIconUrl = null;
        
        // Use imageId from wikitext/HTML if available
        if (skill.imageId) {
          const cleanId = skill.imageId.replace(/^File:/i, '').trim();
          
          // Check if imageId is a full path (starts with /images/) or just a filename
          if (cleanId.startsWith('/images/')) {
            // Full path from HTML: /images/b/bb/Ninja_Blade.png
            let imagePath = cleanId;
            
            // If it's a thumbnail path, extract the actual image path
            if (imagePath.includes('/thumb/')) {
              const thumbMatch = imagePath.match(/\/images\/thumb\/([a-f0-9]\/[a-f0-9]{2}\/.+?\.(?:png|jpg|jpeg|gif))/i);
              if (thumbMatch) {
                imagePath = `/images/${thumbMatch[1]}`;
              } else {
                const simpleMatch = imagePath.match(/\/images\/thumb\/(.*?\.(?:png|jpg|jpeg|gif))/i);
                if (simpleMatch) {
                  imagePath = `/images/${simpleMatch[1]}`;
                }
              }
            }
            
            skillIconUrl = `https://dmowiki.com${imagePath}`;
          } else {
            // Just a filename - use Special:Redirect
            skillIconUrl = `https://dmowiki.com/Special:Redirect/file/${encodeURIComponent(cleanId)}`;
          }
        }
        
        if (skillIconUrl) {
          const skillIconId = await downloadAndUploadImage(
            skillIconUrl, 
            `${skill.name.replace(/\s+/g, '_')}_Icon.png`,
            {
              imageType: 'skill-icon',
              belongsTo: { skill: skill.name },
              tags: ['skill'],
            }
          );
          if (skillIconId) {
            skill.icon = skillIconId;
            skill.iconUrl = skillIconUrl; // Store original URL for reference
          }
        }
      }
      
      console.log('Image downloads complete!');
      
      // Generate data validation summary
      const validation = {
        complete: [] as string[],
        partial: [] as string[],
        missing: [] as string[],
      };
      
      // Check core fields
      if (preview.name) validation.complete.push('Name');
      else validation.missing.push('Name');
      
      if (preview.form && preview.form !== 'Rookie') validation.complete.push('Form');
      else validation.partial.push('Form (defaulted to Rookie)');
      
      if (preview.rank) validation.complete.push('Rank');
      else validation.missing.push('Rank');
      
      if (preview.attribute && preview.attribute !== 'None') validation.complete.push('Attribute');
      else validation.partial.push('Attribute (defaulted to None)');
      
      if (preview.element && preview.element !== 'Neutral') validation.complete.push('Element');
      else validation.partial.push('Element (defaulted to Neutral)');
      
      if (preview.type) validation.complete.push('Type');
      else validation.missing.push('Type');
      
      if (preview.attackerType) validation.complete.push('Attacker Type');
      else validation.missing.push('Attacker Type');
      
      if (preview.families.length > 0) validation.complete.push(`Families (${preview.families.length})`);
      else validation.missing.push('Families');
      
      // Check stats
      if (preview.stats.hp > 0 || preview.maxStats.hp > 0) validation.complete.push('Stats');
      else validation.missing.push('Stats');
      
      // Check skills
      if (preview.skills.length > 0) validation.complete.push(`Skills (${preview.skills.length})`);
      else validation.missing.push('Skills');
      
      // Check digivolutions
      const digiFrom = preview.digivolutions.digivolvesFrom.length;
      const digiTo = preview.digivolutions.digivolvesTo.length;
      if (digiFrom > 0 || digiTo > 0) validation.complete.push(`Digivolutions (From: ${digiFrom}, To: ${digiTo})`);
      else validation.missing.push('Digivolutions');
      
      // Check optional fields
      if (preview.deckBuffs?.length > 0) validation.complete.push(`Deck Buffs (${preview.deckBuffs.length})`);
      if (preview.specialEffects) validation.complete.push('Special Effects (F1-F4)');
      if (preview.uRankPassives) validation.complete.push('U-Rank Passives');
      if (preview.sssPassives) validation.complete.push('SSS+ Passives');
      if (preview.jogressFrom?.length > 0) validation.complete.push('Jogress Components');
      if (preview.rideable) validation.complete.push('Rideable Name');
      if (preview.introduction) validation.complete.push('Introduction');
      if (preview.overview?.pros?.length > 0 || preview.overview?.cons?.length > 0) {
        validation.complete.push(`Overview (Pros: ${preview.overview.pros.length}, Cons: ${preview.overview.cons.length})`);
      }
      if (preview.icon) validation.complete.push('Icon Image');
      if (preview.mainImage) validation.complete.push('Main Image');
      
      console.log('=== DATA VALIDATION SUMMARY ===');
      console.log('✅ COMPLETE:', validation.complete.join(', '));
      if (validation.partial.length > 0) console.log('⚠️  PARTIAL:', validation.partial.join(', '));
      if (validation.missing.length > 0) console.log('❌ MISSING:', validation.missing.join(', '));
      console.log('================================');
      
      console.log('\n=== FINAL PREVIEW IMAGE DATA ===');
      console.log('Icon:', preview.icon || '❌ NOT SET');
      console.log('Main Image:', preview.mainImage || '❌ NOT SET');
      console.log('================================\n');

      // Create a deep copy for display, keeping original preview intact
      const previewForDisplay = JSON.parse(JSON.stringify(preview));
      
      // For preview display: Use localhost URLs if images were successfully downloaded
      // This ensures images actually load in the preview (CORS-safe)
      // The original DMO Wiki URLs are stored in sourceUrl field in the database
      
      if (previewForDisplay.icon) {
        try {
          const iconMedia = await payload.findByID({
            collection: 'media',
            id: previewForDisplay.icon,
          });
          // Use localhost URL for preview display (guaranteed to work)
          previewForDisplay.iconUrl = iconMedia.url || `/media/${iconMedia.filename}`;
          previewForDisplay.iconSourceUrl = iconMedia.sourceUrl; // Keep DMO Wiki URL for reference
          console.log('Preview icon URL (localhost):', previewForDisplay.iconUrl);
        } catch (error) {
          console.warn('Could not fetch icon URL for preview:', error);
        }
      }
      
      if (previewForDisplay.mainImage) {
        try {
          const mainImageMedia = await payload.findByID({
            collection: 'media',
            id: previewForDisplay.mainImage,
          });
          // Use localhost URL for preview display (guaranteed to work)
          previewForDisplay.mainImageUrl = mainImageMedia.url || `/media/${mainImageMedia.filename}`;
          previewForDisplay.mainImageSourceUrl = mainImageMedia.sourceUrl; // Keep DMO Wiki URL for reference
          console.log('Preview main image URL (localhost):', previewForDisplay.mainImageUrl);
        } catch (error) {
          console.warn('Could not fetch main image URL for preview:', error);
        }
      }

      // Transform and add URL fields for skill icons
      if (previewForDisplay.skills && Array.isArray(previewForDisplay.skills)) {
        previewForDisplay.skills = await Promise.all(previewForDisplay.skills.map(async (skill: any) => {
          // Transform damagePerLevel array to string for consistent display
          if (skill.damagePerLevel && Array.isArray(skill.damagePerLevel)) {
            // Extract just the damage values from objects like {level: 1, damage: 100}
            const damageValues = skill.damagePerLevel.map((d: any) => {
              if (typeof d === 'object' && d.damage !== undefined) {
                return d.damage;
              }
              return d;
            });
            skill.damagePerLevel = damageValues.join(', ');
          }
          
          // Set skill icon URL from localhost (guaranteed to work in preview)
          if (skill.icon) {
            try {
              const skillIconMedia = await payload.findByID({
                collection: 'media',
                id: skill.icon,
              });
              skill.iconUrl = skillIconMedia.url || `/media/${skillIconMedia.filename}`;
              skill.iconSourceUrl = skillIconMedia.sourceUrl; // Keep DMO Wiki URL for reference
            } catch (error) {
              console.warn(`Could not fetch skill icon URL for ${skill.name}:`, error);
            }
          }
          return skill;
        }));
      }

      res.json({ success: true, preview: previewForDisplay, validation });
    } catch (error: any) {
      console.error('Import error:', error);
      res.status(500).json({ error: error.message || 'Failed to import from DMO Wiki' });
    }
  });

  // Get popular Digimon list for autocomplete
  app.get('/api/import-digimon/popular', async (req, res) => {
    try {
      // List of popular/commonly imported Digimon
      const popularDigimon = [
        // Starters & Evolutions
        'Agumon', 'Greymon', 'MetalGreymon', 'WarGreymon', 'Omegamon',
        'Gabumon', 'Garurumon', 'WereGarurumon', 'MetalGarurumon',
        'Veemon', 'ExVeemon', 'Paildramon', 'Imperialdramon',
        'Guilmon', 'Growlmon', 'WarGrowlmon', 'Gallantmon',
        
        // Popular Megas
        'Alphamon', 'Alphamon (X-Antibody)', 'Omegamon X', 
        'Imperialdramon (Fighter Mode)', 'Imperialdramon (Paladin Mode)',
        'Susanoomon', 'Lucemon (Satan Mode)', 'Beelzemon',
        'ShineGreymon', 'ShineGreymon (Burst Mode)', 'MirageGaogamon',
        
        // SSS+ & U-Rank
        'ZeedMillenniummon', 'Moon Millenniumon', 'Apocalymon',
        'Crusadermon', 'Leopardmon', 'Examon', 'Gankoomon',
        'Jesmon', 'Jesmon GX', 'Omegamon (Merciful Mode)',
        
        // Burst Modes
        'ShineGreymon (Burst Mode)', 'MirageGaogamon (Burst Mode)',
        'Rosemon (Burst Mode)', 'Ravemon (Burst Mode)',
        
        // X-Antibody
        'Alphamon (X-Antibody)', 'Omegamon X', 'WarGreymon X',
        'MetalGarurumon X', 'Gallantmon X', 'Dukemon X',
      ];
      
      res.json({ success: true, digimon: popularDigimon.sort() });
    } catch (error: any) {
      console.error('Popular list error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Save imported Digimon
  app.post('/api/import-digimon/save', requireEditorAuth, async (req, res) => {
    let digimonData: any = null;
    try {
      digimonData = req.body;

      if (!digimonData || !digimonData.name) {
        return res.status(400).json({ error: 'Invalid Digimon data: missing name' });
      }
      
      if (!digimonData.slug) {
        return res.status(400).json({ error: 'Invalid Digimon data: missing slug' });
      }

      // Check if already exists
      const existing = await payload.find({
        collection: 'digimon',
        where: {
          slug: {
            equals: digimonData.slug,
          },
        },
        limit: 1,
      });

      let isUpdate = false;
      let existingId: string | null = null;

      if (existing.docs.length > 0) {
        isUpdate = true;
        existingId = String(existing.docs[0].id);
        console.log(`✏️ Updating existing Digimon with ID: ${existingId}`);
      } else {
        console.log('✨ Creating new Digimon');
      }
      
      // Debug: Log what we received BEFORE cleanup
      console.log('\n🔍 SAVE ENDPOINT - DATA RECEIVED:');
      console.log('📛 name:', digimonData.name);
      console.log('📋 form:', digimonData.form);
      console.log('📊 rank:', digimonData.rank);
      console.log('icon type:', typeof digimonData.icon);
      console.log('icon value:', digimonData.icon);
      console.log('iconUrl type:', typeof digimonData.iconUrl);
      console.log('iconUrl value:', digimonData.iconUrl);
      console.log('mainImage type:', typeof digimonData.mainImage);
      console.log('mainImage value:', digimonData.mainImage);
      console.log('mainImageUrl type:', typeof digimonData.mainImageUrl);
      console.log('mainImageUrl value:', digimonData.mainImageUrl);
      
      // Remove URL fields that are only for display (not for saving)
      delete digimonData.iconUrl;
      delete digimonData.mainImageUrl;
      delete digimonData.iconSourceUrl;
      delete digimonData.mainImageSourceUrl;
      
      console.log('\n🔍 BEFORE SAVE - Type field:', digimonData.type);
      
      console.log('\n🔍 SAVE ENDPOINT - AFTER CLEANUP:');
      console.log('icon type:', typeof digimonData.icon);
      console.log('icon value:', digimonData.icon);
      console.log('mainImage type:', typeof digimonData.mainImage);
      console.log('mainImage value:', digimonData.mainImage);

      // Keep digivolution names for display (don't clear them!)
      // The frontend can display these names even if they're not proper relationships yet
      console.log('\n🔍 Digivolutions being saved:');
      console.log('From:', JSON.stringify(digimonData.digivolutions?.digivolvesFrom || []));
      console.log('To:', JSON.stringify(digimonData.digivolutions?.digivolvesTo || []));
      console.log('Unlocked with item:', digimonData.digivolutions?.unlockedWithItem || 'None');

      // Transform skills data: convert damagePerLevel arrays to comma-separated strings
      // and ensure numeric fields are numbers not strings
      if (digimonData.skills && Array.isArray(digimonData.skills)) {
        digimonData.skills = digimonData.skills.map((skill: any) => {
          // Remove URL fields (only for display, not for saving)
          delete skill.iconUrl;
          delete skill.iconSourceUrl;
          
          // Convert damagePerLevel array to string
          if (skill.damagePerLevel && Array.isArray(skill.damagePerLevel)) {
            // Extract just the damage values from objects like {level: 1, damage: 100}
            const damageValues = skill.damagePerLevel.map((d: any) => {
              if (typeof d === 'object' && d.damage !== undefined) {
                return d.damage;
              }
              return d;
            });
            skill.damagePerLevel = damageValues.join(', ');
          } else if (typeof skill.damagePerLevel === 'string') {
            // Already a string, keep it as is
          }
          
          // Ensure numeric fields are numbers (convert strings to numbers)
          if (skill.cooldown !== undefined && skill.cooldown !== null && skill.cooldown !== '') {
            const cooldownNum = Number(skill.cooldown);
            skill.cooldown = isNaN(cooldownNum) ? undefined : cooldownNum;
          }
          if (skill.dsConsumption !== undefined && skill.dsConsumption !== null && skill.dsConsumption !== '') {
            const dsNum = Number(skill.dsConsumption);
            skill.dsConsumption = isNaN(dsNum) ? undefined : dsNum;
          }
          if (skill.skillPointsPerUpgrade !== undefined && skill.skillPointsPerUpgrade !== null && skill.skillPointsPerUpgrade !== '') {
            const spNum = Number(skill.skillPointsPerUpgrade);
            skill.skillPointsPerUpgrade = isNaN(spNum) ? undefined : spNum;
          }
          if (skill.animationTime !== undefined && skill.animationTime !== null && skill.animationTime !== '') {
            const animNum = Number(skill.animationTime);
            skill.animationTime = isNaN(animNum) ? undefined : animNum;
          }
          
          return skill;
        });
      }

      // Transform stats: ensure all stat fields are numbers
      const transformStats = (statsObj: any) => {
        if (!statsObj) return statsObj;
        const statFields = ['hp', 'at', 'de', 'as', 'ds', 'ct', 'ht', 'ev'];
        statFields.forEach(field => {
          if (statsObj[field] !== undefined && statsObj[field] !== null && statsObj[field] !== '') {
            const numValue = Number(statsObj[field]);
            statsObj[field] = isNaN(numValue) ? undefined : numValue;
          }
        });
        return statsObj;
      };

      if (digimonData.stats) {
        digimonData.stats = transformStats(digimonData.stats);
      }
      if (digimonData.maxStats) {
        digimonData.maxStats = transformStats(digimonData.maxStats);
      }
      if (digimonData.sizePct !== undefined && digimonData.sizePct !== null && digimonData.sizePct !== '') {
        const sizePctNum = Number(digimonData.sizePct);
        digimonData.sizePct = isNaN(sizePctNum) ? undefined : sizePctNum;
      }
      if (digimonData.defaultLevel !== undefined && digimonData.defaultLevel !== null && digimonData.defaultLevel !== '') {
        const defaultLevelNum = Number(digimonData.defaultLevel);
        digimonData.defaultLevel = isNaN(defaultLevelNum) ? undefined : defaultLevelNum;
      }

      // Auto-publish imported Digimon so they appear on frontend
      digimonData.published = true;

      // Organize nested fields into groups (Payload CMS structure)
      console.log('\n🔍 BEFORE organizing availability fields:');
      console.log('canBeRidden:', digimonData.canBeRidden);
      console.log('canBeHatched:', digimonData.canBeHatched);
      console.log('available:', digimonData.available);
      
      // Move canBeRidden into rideability group
      if (digimonData.canBeRidden !== undefined) {
        if (!digimonData.rideability) digimonData.rideability = {};
        digimonData.rideability.canBeRidden = digimonData.canBeRidden;
        delete digimonData.canBeRidden;
        console.log('✅ Moved canBeRidden to rideability.canBeRidden:', digimonData.rideability.canBeRidden);
      }

      // Move canBeHatched and available into availability group
      if (digimonData.canBeHatched !== undefined || digimonData.available !== undefined) {
        if (!digimonData.availability) digimonData.availability = {};
        if (digimonData.canBeHatched !== undefined) {
          digimonData.availability.canBeHatched = digimonData.canBeHatched;
          delete digimonData.canBeHatched;
          console.log('✅ Moved canBeHatched to availability.canBeHatched:', digimonData.availability.canBeHatched);
        }
        if (digimonData.available !== undefined) {
          digimonData.availability.available = digimonData.available;
          delete digimonData.available;
          console.log('✅ Moved available to availability.available:', digimonData.availability.available);
        }
      }
      
      console.log('\n🔍 AFTER organizing:');
      console.log('rideability:', JSON.stringify(digimonData.rideability));
      console.log('availability:', JSON.stringify(digimonData.availability));

      let result;

      if (isUpdate && existingId) {
        // Update existing Digimon
        console.log(`📝 Updating Digimon ID: ${existingId}`);
        result = await payload.update({
          collection: 'digimon',
          id: existingId,
          data: digimonData,
        });
        console.log('✅ Successfully updated Digimon');
      } else {
        // Create new Digimon
        console.log('📝 Creating new Digimon');
        result = await payload.create({
          collection: 'digimon',
          data: digimonData,
        });
        console.log('✅ Successfully created Digimon');
      }

      console.log('\n🔍 SAVED TO DATABASE:');
      console.log('type:', result.type);
      console.log('rideability:', JSON.stringify(result.rideability));
      console.log('availability:', JSON.stringify(result.availability));
      console.log('digivolutions:', JSON.stringify(result.digivolutions));

      res.json({ 
        success: true, 
        digimon: result,
        isUpdate: isUpdate 
      });
    } catch (error: any) {
      console.error('\n❌❌❌ SAVE ERROR DETAILS ❌❌❌');
      console.error('Error:', error);
      console.error('Error message:', error.message);
      console.error('Error name:', error.name);
      console.error('Error stack:', error.stack);
      
      if (error.data) {
        console.error('Validation errors:', JSON.stringify(error.data, null, 2));
      }
      
      // Log the data we tried to save (without sensitive info)
      if (digimonData) {
        console.error('\n📋 Data structure being saved:');
        console.error('- name:', digimonData.name);
        console.error('- slug:', digimonData.slug);
        console.error('- icon type:', typeof digimonData.icon, '| value:', digimonData.icon);
        console.error('- mainImage type:', typeof digimonData.mainImage, '| value:', digimonData.mainImage);
        console.error('- skills count:', digimonData.skills?.length || 0);
        if (digimonData.skills && digimonData.skills.length > 0) {
          console.error('- first skill icon type:', typeof digimonData.skills[0].icon, '| value:', digimonData.skills[0].icon);
        }
      }
      
      res.status(500).json({ 
        error: error.message || 'Failed to save Digimon',
        details: error.data || null,
      });
    }
  });

  // Get digivolution tree for a specific Digimon (preloads all data for fast in-memory traversal)
  app.get('/api/digimon/:slug/digivolution-tree', async (req, res) => {
    try {
      const { slug } = req.params;
      const maxDepth = parseInt(req.query.depth as string) || 5;

      // Preload ALL Digimon in one go (with icon populated)
      const allDigimon: any[] = [];
      let page = 1;
      while (true) {
        const batch = await payload.find({ collection: 'digimon', limit: 100, page, depth: 1 });
        allDigimon.push(...batch.docs);
        if (!batch.hasNextPage) break;
        page++;
      }

      // Build in-memory indexes
      const bySlug = new Map<string, any>();
      const byName = new Map<string, any>();
      // Reverse indexes: name -> list of Digimon that evolve FROM/TO that name
      const reverseFrom = new Map<string, any[]>(); // name -> Digimon whose digivolvesFrom includes name
      const reverseTo = new Map<string, any[]>();   // name -> Digimon whose digivolvesTo includes name

      for (const d of allDigimon) {
        bySlug.set(d.slug, d);
        byName.set(d.name, d);
        
        const fromArr = (d as any).digivolutions?.digivolvesFrom || [];
        for (const evo of fromArr) {
          if (!evo.name) continue;
          if (!reverseFrom.has(evo.name)) reverseFrom.set(evo.name, []);
          reverseFrom.get(evo.name)!.push(d);
        }
        
        const toArr = (d as any).digivolutions?.digivolvesTo || [];
        for (const evo of toArr) {
          if (!evo.name) continue;
          if (!reverseTo.has(evo.name)) reverseTo.set(evo.name, []);
          reverseTo.get(evo.name)!.push(d);
        }
      }

      const target = bySlug.get(slug);
      if (!target) {
        return res.status(404).json({ error: 'Digimon not found' });
      }

      // Tree building (all in-memory, no more DB queries)
      const nodeMap = new Map<string, any>();
      const edgeSet = new Set<string>();
      const edges: any[] = [];
      const visited = new Set<string>();

      const getIconUrl = (doc: any): string => {
        if (doc.icon) {
          if (typeof doc.icon === 'object' && doc.icon.url) return doc.icon.url;
          if (typeof doc.icon === 'string') return doc.icon;
        }
        return '/placeholder-icon.png';
      };

      const addNode = (doc: any) => {
        if (!nodeMap.has(doc.slug)) {
          nodeMap.set(doc.slug, {
            id: doc.slug,
            name: doc.name,
            icon: getIconUrl(doc),
            form: doc.form,
            slug: doc.slug,
          });
        }
      };

      const addEdge = (source: string, target: string, level?: number, item?: string) => {
        const key = `${source}->${target}`;
        if (!edgeSet.has(key)) {
          edgeSet.add(key);
          edges.push({ source, target, level: level || null, item: item || null });
        }
      };

      const buildTree = (doc: any, depth: number, direction: 'forward' | 'backward' | 'both') => {
        if (depth > maxDepth || visited.has(doc.slug)) return;
        visited.add(doc.slug);
        addNode(doc);

        // Forward direction
        if (direction === 'forward' || direction === 'both') {
          // Direct: this Digimon's digivolvesTo
          const digivolvesTo = doc.digivolutions?.digivolvesTo || [];
          for (const evo of digivolvesTo) {
            if (!evo.name) continue;
            const t = byName.get(evo.name);
            if (t) {
              addEdge(doc.slug, t.slug, evo.requiredLevel, evo.requiredItem);
              buildTree(t, depth + 1, 'forward');
            }
          }
          // Reverse: Digimon whose digivolvesFrom lists this Digimon's name
          const children = reverseFrom.get(doc.name) || [];
          for (const child of children) {
            if (child.slug === doc.slug) continue;
            // Get level/item from the child's digivolvesFrom entry (not usually stored there)
            // or from the parent's digivolvesTo entry for this child
            const parentEvo = doc.digivolutions?.digivolvesTo?.find((e: any) => e.name === child.name);
            addEdge(doc.slug, child.slug, parentEvo?.requiredLevel, parentEvo?.requiredItem);
            buildTree(child, depth + 1, 'forward');
          }
        }

        // Backward direction
        if (direction === 'backward' || direction === 'both') {
          // Direct: this Digimon's digivolvesFrom
          const digivolvesFrom = doc.digivolutions?.digivolvesFrom || [];
          for (const evo of digivolvesFrom) {
            if (!evo.name) continue;
            const s = byName.get(evo.name);
            if (s) {
              const srcEvo = s.digivolutions?.digivolvesTo?.find((e: any) => e.name === doc.name);
              addEdge(s.slug, doc.slug, srcEvo?.requiredLevel, srcEvo?.requiredItem);
              buildTree(s, depth + 1, 'backward');
            }
          }
          // Reverse: Digimon whose digivolvesTo lists this Digimon's name
          const parents = reverseTo.get(doc.name) || [];
          for (const parent of parents) {
            if (parent.slug === doc.slug) continue;
            const pEvo = parent.digivolutions?.digivolvesTo?.find((e: any) => e.name === doc.name);
            addEdge(parent.slug, doc.slug, pEvo?.requiredLevel, pEvo?.requiredItem);
            buildTree(parent, depth + 1, 'backward');
          }
        }
      };

      buildTree(target, 0, 'both');

      res.json({
        success: true,
        targetDigimon: { slug: target.slug, name: target.name },
        nodes: Array.from(nodeMap.values()),
        edges,
      });
    } catch (error: any) {
      console.error('❌ Error fetching digivolution tree:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch digivolution tree' });
    }
  });

  // Global progress tracker
  let currentProgress: any = null;

  // Progress polling endpoint
  app.get('/api/batch-import-progress', (req, res) => {
    res.json(currentProgress || { status: 'idle' });
  });

  // Fix Goddramon image
  app.post('/api/fix-goddramon-image', async (req, res) => {
    try {
      console.log('\n🐉 Fixing Goddramon image...');
      
      // Find Goddramon
      const result = await payload.find({
        collection: 'digimon',
        where: {
          name: {
            equals: 'Goddramon'
          }
        },
        limit: 1,
      });
      
      if (result.docs.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Goddramon not found'
        });
      }
      
      const goddramon = result.docs[0];
      console.log(`Found Goddramon: ${goddramon.id}`);
      
      // Clear icon and mainImage by setting to empty string (removes relationship)
      await payload.update({
        collection: 'digimon',
        id: goddramon.id,
        data: {
          icon: '' as any,
          mainImage: '' as any,
        },
      });
      
      console.log('✅ Cleared Goddramon images - placeholder will be used');
      
      res.json({
        success: true,
        message: 'Goddramon images cleared - placeholder will be displayed'
      });
      
    } catch (error: any) {
      console.error('Error fixing Goddramon:', error);
      res.status(500).json({ 
        success: false,
        error: error.message 
      });
    }
  });

  // Clean up Alphamon variants
  app.post('/api/cleanup-alphamon', async (req, res) => {
    try {
      console.log('\n🦁 ALPHAMON CLEANUP: Starting...');
      
      const deleted: string[] = [];
      const renamed: string[] = [];
      const errors: string[] = [];
      
      // Fetch all Alphamon
      const allDigimon = await payload.find({
        collection: 'digimon',
        where: {
          name: {
            contains: 'Alphamon'
          }
        },
        limit: 100,
      });
      
      for (const digimon of allDigimon.docs) {
        const d = digimon as any;
        
        try {
          // Delete (Jogress) and (Mega) variants
          if (d.name === 'Alphamon (Mega)' || d.name === 'Alphamon Ouryuken (Jogress)') {
            await payload.delete({
              collection: 'digimon',
              id: d.id,
            });
            console.log(`🗑️  Deleted: ${d.name}`);
            deleted.push(d.name);
            continue;
          }
          
          // Rename (Mega X) to X
          if (d.name === 'Alphamon (Mega X)') {
            await payload.update({
              collection: 'digimon',
              id: d.id,
              data: {
                name: 'Alphamon X',
                slug: 'alphamon-x',
              },
            });
            console.log(`✏️  Renamed: ${d.name} → Alphamon X`);
            renamed.push(`${d.name} → Alphamon X`);
            continue;
          }
          
          // Rename (Jogress X) to X if it exists
          if (d.name === 'Alphamon Ouryuken (Jogress X)') {
            await payload.update({
              collection: 'digimon',
              id: d.id,
              data: {
                name: 'Alphamon Ouryuken X',
                slug: 'alphamon-ouryuken-x',
              },
            });
            console.log(`✏️  Renamed: ${d.name} → Alphamon Ouryuken X`);
            renamed.push(`${d.name} → Alphamon Ouryuken X`);
            continue;
          }
          
        } catch (error: any) {
          console.error(`❌ Failed to process ${d.name}:`, error.message);
          errors.push(`${d.name}: ${error.message}`);
        }
      }
      
      console.log(`\n📊 ALPHAMON CLEANUP COMPLETE:`);
      console.log(`🗑️  Deleted: ${deleted.length}`);
      console.log(`✏️  Renamed: ${renamed.length}`);
      console.log(`❌ Errors: ${errors.length}`);
      
      res.json({
        success: true,
        deleted: deleted.length,
        deletedList: deleted,
        renamed: renamed.length,
        renamedList: renamed,
        errors: errors.length,
        errorList: errors,
      });
      
    } catch (error: any) {
      console.error('Error cleaning Alphamon:', error);
      res.status(500).json({ 
        success: false,
        error: error.message 
      });
    }
  });

  // Fix Sovereign Digimon (delete Ruler variants, publish Champion/Mega)
  app.post('/api/fix-sovereign-digimon', async (req, res) => {
    try {
      console.log('\n👑 SOVEREIGN FIX: Cleaning up Sovereign Digimon...');
      
      const deleted: string[] = [];
      const published: string[] = [];
      const errors: string[] = [];
      
      // Fetch all Digimon
      const allDigimon = await payload.find({
        collection: 'digimon',
        limit: 1000,
      });
      
      for (const digimon of allDigimon.docs) {
        const d = digimon as any;
        
        try {
          // Delete "The Ruler of..." variants
          if (d.name.includes('(The Ruler of the ')) {
            await payload.delete({
              collection: 'digimon',
              id: d.id,
            });
            console.log(`🗑️  Deleted: ${d.name}`);
            deleted.push(d.name);
            continue;
          }
          
          // Publish Sovereign Champion/Mega forms
          const sovereigns = ['Baihumon', 'Xuanwumon', 'Zhuqiaomon', 'Qinglongmon', 'Azulongmon'];
          const isSovereign = sovereigns.some(name => d.name.includes(name));
          
          if (isSovereign && d._status !== 'published' && 
              (d.name.includes('(Champion)') || d.name.includes('(Mega)'))) {
            await payload.update({
              collection: 'digimon',
              id: d.id,
              data: {
                _status: 'published',
              },
            });
            console.log(`✅ Published: ${d.name}`);
            published.push(d.name);
          }
        } catch (error: any) {
          console.error(`❌ Failed to process ${d.name}:`, error.message);
          errors.push(`${d.name}: ${error.message}`);
        }
      }
      
      console.log(`\n📊 SOVEREIGN FIX COMPLETE:`);
      console.log(`🗑️  Deleted Ruler variants: ${deleted.length}`);
      console.log(`✅ Published Champion/Mega: ${published.length}`);
      console.log(`❌ Errors: ${errors.length}`);
      
      res.json({
        success: true,
        deleted: deleted.length,
        deletedList: deleted,
        published: published.length,
        publishedList: published,
        errors: errors.length,
        errorList: errors,
      });
      
    } catch (error: any) {
      console.error('Error fixing sovereigns:', error);
      res.status(500).json({ 
        success: false,
        error: error.message 
      });
    }
  });

  // Unpublish "The Ruler of..." Digimon
  app.post('/api/unpublish-ruler-digimon', async (req, res) => {
    try {
      console.log('\n🔒 UNPUBLISH: Hiding "The Ruler of..." Digimon...');
      
      const unpublished: string[] = [];
      const errors: string[] = [];
      
      // Fetch all Digimon
      const allDigimon = await payload.find({
        collection: 'digimon',
        limit: 1000,
      });
      
      for (const digimon of allDigimon.docs) {
        const d = digimon as any;
        
        try {
          // Unpublish "The Ruler of..." variants
          if (d.name.includes('(The Ruler of the ')) {
            await payload.update({
              collection: 'digimon',
              id: d.id,
              data: {
                _status: 'draft',
              },
            });
            console.log(`🔒 Unpublished: ${d.name}`);
            unpublished.push(d.name);
          }
        } catch (error: any) {
          console.error(`❌ Failed to unpublish ${d.name}:`, error.message);
          errors.push(`${d.name}: ${error.message}`);
        }
      }
      
      console.log(`\n📊 UNPUBLISH COMPLETE:`);
      console.log(`🔒 Unpublished: ${unpublished.length}`);
      console.log(`❌ Errors: ${errors.length}`);
      
      res.json({
        success: true,
        unpublished: unpublished.length,
        unpublishedList: unpublished,
        errors: errors.length,
        errorList: errors,
      });
      
    } catch (error: any) {
      console.error('Error unpublishing:', error);
      res.status(500).json({ 
        success: false,
        error: error.message 
      });
    }
  });

  // Clean up Raid variants and X-Antibody System naming
  app.post('/api/cleanup-digimon-variants', async (req, res) => {
    try {
      console.log('\n🧹 CLEANUP: Starting variant cleanup...');
      
      const removed: string[] = [];
      const renamed: string[] = [];
      const errors: string[] = [];
      
      // Fetch all Digimon
      const allDigimon = await payload.find({
        collection: 'digimon',
        limit: 1000,
      });
      
      for (const digimon of allDigimon.docs) {
        const d = digimon as any;
        
        try {
          // Remove Raid variants
          if (d.name.includes('(Raid)')) {
            await payload.delete({
              collection: 'digimon',
              id: d.id,
            });
            console.log(`🗑️  Deleted: ${d.name}`);
            removed.push(d.name);
            continue;
          }
          
          // Rename X-Antibody System to X
          if (d.name.includes('(X-Antibody System)')) {
            const newName = d.name.replace(' (X-Antibody System)', ' X');
            const newSlug = newName.toLowerCase().replace(/\s+/g, '-').replace(/[()]/g, '');
            
            await payload.update({
              collection: 'digimon',
              id: d.id,
              data: {
                name: newName,
                slug: newSlug,
              },
            });
            
            console.log(`✏️  Renamed: "${d.name}" → "${newName}"`);
            renamed.push(`${d.name} → ${newName}`);
          }
        } catch (error: any) {
          console.error(`❌ Failed to process ${d.name}:`, error.message);
          errors.push(`${d.name}: ${error.message}`);
        }
      }
      
      console.log(`\n📊 CLEANUP COMPLETE:`);
      console.log(`🗑️  Removed Raid variants: ${removed.length}`);
      console.log(`✏️  Renamed X-Antibody System: ${renamed.length}`);
      console.log(`❌ Errors: ${errors.length}`);
      
      res.json({
        success: true,
        removed: removed.length,
        removedList: removed,
        renamed: renamed.length,
        renamedList: renamed,
        errors: errors.length,
        errorList: errors,
      });
      
    } catch (error: any) {
      console.error('Error in cleanup:', error);
      res.status(500).json({ 
        success: false,
        error: error.message 
      });
    }
  });

  // Find and fix duplicate Digimon names
  app.post('/api/fix-duplicate-digimon', async (req, res) => {
    try {
      console.log('\n🔍 Finding duplicate Digimon...');
      
      // Fetch all Digimon
      const allDigimon = await payload.find({
        collection: 'digimon',
        limit: 1000,
      });
      
      // Group by base name (without form indicators)
      const nameGroups = new Map<string, any[]>();
      
      for (const digimon of allDigimon.docs) {
        const d = digimon as any;
        const baseName = d.name
          .replace(/ \(Champion\)$/i, '')
          .replace(/ \(Mega\)$/i, '')
          .replace(/ \(Ultimate\)$/i, '')
          .replace(/ \(Raid\)$/i, '')
          .replace(/ \(The Ruler of the [^)]+\)$/i, '');
        
        if (!nameGroups.has(baseName)) {
          nameGroups.set(baseName, []);
        }
        nameGroups.get(baseName)!.push(d);
      }
      
      // Find duplicates (same base name, different forms)
      const duplicates = Array.from(nameGroups.entries())
        .filter(([_, digimons]) => digimons.length > 1)
        .map(([baseName, digimons]) => ({
          baseName,
          count: digimons.length,
          digimons: digimons.map(d => ({
            id: d.id,
            name: d.name,
            form: d.form,
            slug: d.slug,
          }))
        }));
      
      console.log(`Found ${duplicates.length} sets of duplicates`);
      
      const fixed: string[] = [];
      const errors: string[] = [];
      
      // Fix known special cases
      const _specialCases = [
        'Zhuqiaomon', 'Azulongmon', 'Baihumon', 'Ebonwumon',
        'Alphamon', 'Omegamon', 'Magnamon', 'Imperialdramon'
      ];
      
      for (const duplicate of duplicates) {
        const { baseName, digimons } = duplicate;
        
        console.log(`\n📋 Processing: ${baseName} (${digimons.length} entries)`);
        
        for (const digimon of digimons) {
          try {
            // Skip if already has form in name
            if (digimon.name.includes('(Champion)') || 
                digimon.name.includes('(Mega)') ||
                digimon.name.includes('(Ultimate)') ||
                digimon.name.includes('(Raid)') ||
                digimon.name.includes('(The Ruler')) {
              console.log(`  ✓ ${digimon.name} - Already has form indicator`);
              continue;
            }
            
            // Add form to name if it's a duplicate
            const newName = `${baseName} (${digimon.form})`;
            const newSlug = newName.toLowerCase().replace(/\s+/g, '-').replace(/[()]/g, '');
            
            if (newName !== digimon.name) {
              await payload.update({
                collection: 'digimon',
                id: digimon.id,
                data: {
                  name: newName,
                  slug: newSlug,
                },
              });
              
              console.log(`  ✅ Renamed: "${digimon.name}" → "${newName}"`);
              fixed.push(`${digimon.name} → ${newName}`);
            }
          } catch (error: any) {
            console.error(`  ❌ Failed to fix ${digimon.name}:`, error.message);
            errors.push(`${digimon.name}: ${error.message}`);
          }
        }
      }
      
      console.log(`\n📊 DUPLICATE FIX COMPLETE:`);
      console.log(`✅ Fixed: ${fixed.length}`);
      console.log(`❌ Errors: ${errors.length}`);
      
      res.json({
        success: true,
        duplicatesFound: duplicates.length,
        fixed: fixed.length,
        fixedList: fixed,
        errors: errors.length,
        errorList: errors,
        duplicates: duplicates,
      });
      
    } catch (error: any) {
      console.error('Error finding duplicates:', error);
      res.status(500).json({ 
        success: false,
        error: error.message 
      });
    }
  });

  // Bulk publish all Digimon endpoint
  app.post('/api/publish-all-digimon', async (req, res) => {
    try {
      console.log('\n📢 BULK PUBLISH: Starting to publish all Digimon...');
      
      // Find all unpublished Digimon
      const unpublished = await payload.find({
        collection: 'digimon',
        where: {
          _status: {
            not_equals: 'published'
          }
        },
        limit: 1000,
      });
      
      console.log(`Found ${unpublished.docs.length} unpublished Digimon`);
      
      let publishedCount = 0;
      let failedCount = 0;
      const failures: string[] = [];
      
      // Update each one to published status
      for (const digimon of unpublished.docs) {
        try {
          await payload.update({
            collection: 'digimon',
            id: digimon.id,
            data: {
              _status: 'published',
            },
          });
          publishedCount++;
          const name = (digimon as any).name || 'Unknown';
          console.log(`✅ Published: ${name} (${publishedCount}/${unpublished.docs.length})`);
        } catch (error: any) {
          failedCount++;
          const name = (digimon as any).name || 'Unknown';
          failures.push(name);
          console.error(`❌ Failed to publish ${name}:`, error.message);
        }
      }
      
      console.log(`\n📊 BULK PUBLISH COMPLETE:`);
      console.log(`✅ Successfully published: ${publishedCount}`);
      console.log(`❌ Failed: ${failedCount}`);
      
      res.json({
        success: true,
        published: publishedCount,
        failed: failedCount,
        failures: failures,
        message: `Published ${publishedCount} Digimon successfully!`
      });
      
    } catch (error: any) {
      console.error('Error in bulk publish:', error);
      res.status(500).json({ 
        success: false,
        error: error.message 
      });
    }
  });

  // Batch import API endpoint
  app.post('/api/batch-import-digimon', requireEditorAuth, async (req, res) => {
    try {
      const { letters, names } = req.body;
      
      const DMOWIKI_API = 'https://dmowiki.com/api.php';
      const DELAY_BETWEEN_IMPORTS = 3000; // 3 seconds
      
      let digimonList: string[] = [];
      
      // If names provided (retry mode), use them directly
      if (names && Array.isArray(names)) {
        console.log(`\n🔄 Retrying ${names.length} failed Digimon`);
        digimonList = names;
        
        currentProgress = {
          status: 'retrying',
          message: `Retrying ${names.length} failed Digimon...`,
          current: null,
          totalFound: names.length,
          imported: 0,
          skipped: 0,
          failed: 0,
        };
      }
      // Otherwise fetch by letters (normal mode)
      else if (letters && Array.isArray(letters)) {
        console.log(`\n🚀 Starting batch import for letters: ${letters.join(', ')}`);
        
        currentProgress = {
          status: 'fetching',
          message: 'Fetching Digimon list from DMO Wiki...',
          current: null,
          totalFound: 0,
          imported: 0,
          skipped: 0,
          failed: 0,
        };
        
        // Fetch Digimon for these letters
        const allDigimon: string[] = [];
        
        for (const letter of letters) {
          let continueToken: string | undefined;
          
          do {
            const params = new URLSearchParams({
              action: 'query',
              list: 'categorymembers',
              cmtitle: 'Category:Digimon',
              cmstartsortkeyprefix: letter,
              cmendsortkeyprefix: letter + 'Z',
              cmlimit: '500',
              cmtype: 'page',
              format: 'json',
            });
            
            if (continueToken) {
              params.append('cmcontinue', continueToken);
            }
            
            const response = await fetch(`${DMOWIKI_API}?${params.toString()}`);
            const data: any = await response.json();
            
            if (data.query && data.query.categorymembers) {
              data.query.categorymembers.forEach((member: any) => {
                if (!member.title.includes(':') && member.title.startsWith(letter)) {
                  allDigimon.push(member.title);
                }
              });
            }
            
            continueToken = data.continue?.cmcontinue;
            await new Promise(resolve => setTimeout(resolve, 1000));
          } while (continueToken);
        }
        
        digimonList = [...new Set(allDigimon)];
        console.log(`✅ Found ${digimonList.length} Digimon`);
        
        currentProgress.totalFound = digimonList.length;
        currentProgress.message = `Found ${digimonList.length} Digimon`;
      } else {
        return res.status(400).json({ error: 'Either letters or names parameter required' });
      }
      
      if (digimonList.length === 0) {
        currentProgress = null;
        return res.json({
          totalFound: 0,
          imported: 0,
          skipped: 0,
          failed: 0,
          importedList: [],
          failedList: [],
        });
      }
      
      // Filter existing (ONLY skip if this is NOT a retry of failed imports)
      currentProgress.status = 'checking';
      currentProgress.message = 'Checking which Digimon already exist...';
      
      const toImport: string[] = [];
      let skipped = 0;
      
      // If names were explicitly provided (retry mode), import ALL of them even if they exist
      const isRetryMode = !!names && Array.isArray(names);
      
      if (isRetryMode) {
        console.log('🔄 RETRY MODE: Will reimport all specified Digimon (including existing ones)');
        toImport.push(...digimonList);
      } else {
        // Normal mode: skip existing ones
        for (const name of digimonList) {
          const existing = await payload.find({
            collection: 'digimon',
            where: { name: { equals: name } },
            limit: 1,
          });
          
          if (existing.docs.length > 0) {
            skipped++;
          } else {
            toImport.push(name);
          }
        }
      }
      
      currentProgress.skipped = skipped;
      currentProgress.message = `Need to import: ${toImport.length}, Already exist: ${skipped}`;
      console.log(`📥 Need to import: ${toImport.length}`);
      console.log(`⏭️ Already exist: ${skipped}`);
      
      // Import each
      const importedList: string[] = [];
      const failedList: { name: string; error: string }[] = [];
      
      currentProgress.status = 'importing';
      currentProgress.total = toImport.length;
      currentProgress.current = 0;
      
      for (let i = 0; i < toImport.length; i++) {
        const name = toImport[i];
        currentProgress.current = i + 1;
        currentProgress.currentDigimon = name;
        currentProgress.message = `Importing ${i + 1}/${toImport.length}: ${name}`;
        
        console.log(`\n📥 [${ i + 1}/${toImport.length}] Importing: ${name}`);
        
        try {
          const slug = name.replace(/\s+/g, '_');
          console.log(`   → Slug: ${slug}`);
          
          // Call the existing import endpoint (localhost) to get full data
          console.log(`   → Calling /api/import-digimon...`);
          const importResponse = await fetch(`http://localhost:3001/api/import-digimon`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ slug: slug }),
          });
          
          console.log(`   → Import response status: ${importResponse.status}`);
          
          if (!importResponse.ok) {
            const errorText = await importResponse.text();
            console.log(`   ❌ Import failed - Response: ${errorText.substring(0, 200)}`);
            throw new Error(`HTTP ${importResponse.status}: ${errorText.substring(0, 100)}`);
          }
          
          const importResult = await importResponse.json();
          
          if (importResult.error) {
            console.log(`   ❌ Import returned error: ${importResult.error}`);
            throw new Error(importResult.error);
          }
          
          if (!importResult.success || !importResult.preview) {
            console.log(`   ❌ Invalid response structure`);
            throw new Error('Import returned invalid data structure');
          }
          
          console.log(`   ✅ Data extracted successfully`);
          console.log(`   → Calling /api/import-digimon/save...`);
          
          // Save the imported data (need to send the preview data)
          const saveResponse = await fetch(`http://localhost:3001/api/import-digimon/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(importResult.preview),
          });
          
          console.log(`   → Save response status: ${saveResponse.status}`);
          
          if (!saveResponse.ok) {
            const errorText = await saveResponse.text();
            console.log(`   ❌ Save failed - Response: ${errorText.substring(0, 200)}`);
            throw new Error(`Save HTTP ${saveResponse.status}: ${errorText.substring(0, 100)}`);
          }
          
          const saveResult = await saveResponse.json();
          
          if (saveResult.success) {
            importedList.push(name);
            currentProgress.imported++;
            console.log(`   ✅ SUCCESS: ${name} saved to database`);
          } else {
            const errorMsg = saveResult.error || 'Unknown save error';
            failedList.push({ name, error: errorMsg });
            currentProgress.failed++;
            console.log(`   ❌ FAILED: ${name} - ${errorMsg}`);
          }
        } catch (error: any) {
          const errorMsg = error.message || String(error);
          failedList.push({ name, error: errorMsg });
          currentProgress.failed++;
          console.log(`   ❌ FAILED: ${name}`);
          console.log(`   📋 Error: ${errorMsg}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_IMPORTS));
      }
      
      console.log(`\n✅ Batch complete!`);
      console.log(`   Imported: ${importedList.length}`);
      console.log(`   Failed: ${failedList.length}`);
      console.log(`   Skipped: ${skipped}`);
      
      if (failedList.length > 0) {
        console.log(`\n❌ Failed Digimon:`);
        failedList.forEach(f => {
          console.log(`   - ${f.name}: ${f.error}`);
        });
      }
      
      // Clear progress
      currentProgress = null;
      
      res.json({
        totalFound: digimonList.length,
        imported: importedList.length,
        skipped,
        failed: failedList.length,
        importedList,
        failedList,
      });
      
    } catch (error: any) {
      console.error('Batch import error:', error);
      currentProgress = null;
      res.status(500).json({ error: error.message || 'Batch import failed' });
    }
  });

  // Batch import page route
  app.get('/batch-import', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Batch Import Digimon - DMO KB</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0a; color: #fff; min-height: 100vh; padding: 2rem; }
    .container { max-width: 1200px; margin: 0 auto; }
    .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 2rem; }
    h1 { font-size: 2rem; }
    .back-link { color: #0066ff; text-decoration: none; padding: 0.5rem 1rem; border: 1px solid #0066ff; border-radius: 4px; }
    .back-link:hover { background: #0066ff; color: #fff; }
    .info-box { background: #1a1a1a; padding: 1.5rem; border-radius: 8px; margin-bottom: 2rem; border: 1px solid #333; }
    .info-box h2 { color: #0066ff; margin-bottom: 1rem; }
    .info-box ul { list-style: none; color: #ccc; line-height: 1.8; }
    .info-box li { margin-bottom: 0.5rem; }
    .batch-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
    .batch-btn { padding: 2rem 1.5rem; background: linear-gradient(135deg, #0066ff 0%, #0099ff 100%); color: #fff; border: none; border-radius: 12px; cursor: pointer; font-size: 1.2rem; font-weight: bold; transition: all 0.3s; box-shadow: 0 4px 12px rgba(0, 102, 255, 0.3); }
    .batch-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(0, 102, 255, 0.4); }
    .batch-btn:disabled { opacity: 0.4; cursor: not-allowed; background: #2a2a2a; box-shadow: none; }
    .batch-btn.importing { background: linear-gradient(135deg, #ff6600 0%, #ff9933 100%); box-shadow: 0 8px 20px rgba(255, 102, 0, 0.4); transform: scale(1.02); }
    .batch-label { font-size: 2.5rem; margin-bottom: 0.5rem; }
    .batch-sublabel { font-size: 0.85rem; opacity: 0.9; }
    .error-box { background: linear-gradient(135deg, #ff4444 0%, #cc0000 100%); padding: 1.5rem; border-radius: 8px; margin-bottom: 2rem; border: 1px solid #ff6666; }
    .results-box { background: #1a1a1a; padding: 2rem; border-radius: 12px; border: 1px solid #00cc44; margin-bottom: 2rem; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
    .stat-card { background: #2a2a2a; padding: 1.5rem; border-radius: 8px; text-align: center; }
    .stat-icon { font-size: 2.5rem; margin-bottom: 0.5rem; }
    .stat-label { color: #999; font-size: 0.9rem; margin-bottom: 0.3rem; }
    .stat-value { font-size: 2rem; font-weight: bold; }
    .list-box { background: #2a2a2a; padding: 1.5rem; border-radius: 8px; margin-top: 1.5rem; }
    .list-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 0.5rem; list-style: none; padding: 0; max-height: 300px; overflow: auto; }
    .list-item { background: #1a1a1a; padding: 0.5rem; border-radius: 4px; font-size: 0.9rem; }
    .tips-box { background: #1a1a1a; padding: 1rem; border-radius: 8px; border: 1px solid #333; color: #999; font-size: 0.9rem; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚀 Batch Import Digimon</h1>
      <a href="/admin" class="back-link">← Back to Admin</a>
    </div>

    <div class="info-box">
      <h2>How This Works</h2>
      <ul>
        <li><strong>✅ Server-side import:</strong> Runs on CMS server (bypasses Cloudflare)</li>
        <li><strong>📝 Letter batches:</strong> Import Digimon by first letter groups</li>
        <li><strong>⏱️ One at a time:</strong> Click a batch, wait for completion (~5-10 min), then next</li>
        <li><strong>📊 Progress shown:</strong> See detailed results after each batch completes</li>
        <li><strong>⏸️ Can pause:</strong> Do some batches now, rest later - progress is saved!</li>
      </ul>
    </div>

    <div class="batch-grid" id="batchGrid"></div>
    
    <div id="progress" style="display: none; background: #1a1a1a; padding: 1.5rem; border-radius: 8px; margin-bottom: 2rem; border: 1px solid #0066ff;">
      <h3 style="color: #0066ff; margin-top: 0;">⏳ Import Progress</h3>
      <div id="progressBar" style="background: #333; height: 20px; border-radius: 10px; overflow: hidden; margin-bottom: 1rem;">
        <div id="progressFill" style="background: linear-gradient(90deg, #0066ff, #0099ff); height: 100%; width: 0%; transition: width 0.3s;"></div>
      </div>
      <div id="progressText" style="color: #ccc; font-size: 0.9rem; margin-bottom: 0.5rem;"></div>
      <div id="currentDigimon" style="color: #fff; font-weight: bold; font-size: 1.1rem;"></div>
      <div id="progressStats" style="color: #999; font-size: 0.9rem; margin-top: 1rem; display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem;">
        <div>✅ Imported: <span id="importedCount" style="color: #00cc44; font-weight: bold;">0</span></div>
        <div>⏭️ Skipped: <span id="skippedCount" style="color: #0099ff; font-weight: bold;">0</span></div>
        <div>❌ Failed: <span id="failedCount" style="color: #ff4444; font-weight: bold;">0</span></div>
      </div>
    </div>
    
    <div id="error" style="display: none;"></div>
    <div id="results" style="display: none;"></div>

    <div class="tips-box">
      <div style="margin-bottom: 0.5rem;"><strong style="color: #0066ff;">💡 Tips:</strong></div>
      <ul style="padding-left: 1.5rem;">
        <li>Start with <strong>A-C</strong>, wait for completion, then continue with next batches</li>
        <li>Each batch takes ~5-10 minutes depending on number of Digimon</li>
        <li>Total time for all 8 batches: ~40-80 minutes</li>
        <li>You can close this page and come back - progress is saved in database</li>
        <li>If a batch fails, you can retry it anytime</li>
      </ul>
    </div>
  </div>

  <script>
    const letterRanges = [
      { label: 'A-C', letters: ['A', 'B', 'C'] },
      { label: 'D-F', letters: ['D', 'E', 'F'] },
      { label: 'G-I', letters: ['G', 'H', 'I'] },
      { label: 'J-L', letters: ['J', 'K', 'L'] },
      { label: 'M-O', letters: ['M', 'N', 'O'] },
      { label: 'P-R', letters: ['P', 'Q', 'R'] },
      { label: 'S-U', letters: ['S', 'T', 'U'] },
      { label: 'V-Z', letters: ['V', 'W', 'X', 'Y', 'Z'] },
    ];

    let importing = null;

    function renderBatches() {
      const grid = document.getElementById('batchGrid');
      grid.innerHTML = '';
      
      letterRanges.forEach(function(range) {
        const btn = document.createElement('button');
        btn.className = 'batch-btn' + (importing === range.label ? ' importing' : '');
        btn.disabled = importing !== null;
        
        const label = document.createElement('div');
        label.className = 'batch-label';
        label.textContent = importing === range.label ? '⏳' : range.label;
        
        const sublabel = document.createElement('div');
        sublabel.className = 'batch-sublabel';
        sublabel.textContent = importing === range.label ? 'Importing...' : 'Click to Import';
        
        btn.appendChild(label);
        btn.appendChild(sublabel);
        
        btn.onclick = function() {
          handleBatchImport(range.label, range.letters);
        };
        
        grid.appendChild(btn);
      });
    }

    let progressPoll = null;
    
    function startProgressPolling() {
      const progressDiv = document.getElementById('progress');
      progressDiv.style.display = 'block';
      
      progressPoll = setInterval(async function() {
        try {
          const res = await fetch('/api/batch-import-progress');
          
          // Handle rate limiting or other non-JSON responses
          if (!res.ok) {
            console.warn('Progress poll returned status:', res.status);
            return; // Just skip this poll cycle
          }
          
          const contentType = res.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) {
            console.warn('Progress poll returned non-JSON response');
            return; // Skip non-JSON responses
          }
          
          const progress = await res.json();
          
          if (progress.status === 'idle') return;
          
          // Update progress bar
          if (progress.total) {
            const percent = (progress.current / progress.total) * 100;
            document.getElementById('progressFill').style.width = percent + '%';
            document.getElementById('progressText').textContent = progress.message || '';
          } else {
            document.getElementById('progressText').textContent = progress.message || 'Processing...';
          }
          
          // Update current Digimon
          document.getElementById('currentDigimon').textContent = progress.currentDigimon 
            ? '🔄 ' + progress.currentDigimon 
            : '';
          
          // Update stats
          document.getElementById('importedCount').textContent = progress.imported || 0;
          document.getElementById('skippedCount').textContent = progress.skipped || 0;
          document.getElementById('failedCount').textContent = progress.failed || 0;
          
        } catch (error) {
          // Silently skip errors during polling - don't spam console
        }
      }, 2000); // Poll every 2 seconds (reduced from 500ms to avoid rate limiting)
    }
    
    function stopProgressPolling() {
      if (progressPoll) {
        clearInterval(progressPoll);
        progressPoll = null;
      }
      document.getElementById('progress').style.display = 'none';
    }

    async function handleBatchImport(label, letters) {
      importing = label;
      renderBatches();
      document.getElementById('error').style.display = 'none';
      document.getElementById('results').style.display = 'none';
      
      startProgressPolling();

      try {
        const response = await fetch('/api/batch-import-digimon', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ letters }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Batch import failed');
        }

        showResults(data);
      } catch (err) {
        showError(err.message || 'Failed to import batch');
      } finally {
        stopProgressPolling();
        importing = null;
        renderBatches();
      }
    }

    function showError(message) {
      const errorDiv = document.getElementById('error');
      errorDiv.className = 'error-box';
      errorDiv.innerHTML = '<div style="font-size: 1.5rem; margin-bottom: 0.5rem;">❌ Error</div><div>' + message + '</div>';
      errorDiv.style.display = 'block';
    }

    let lastFailedList = [];

    function showResults(data) {
      lastFailedList = data.failedList || [];
      
      const resultsDiv = document.getElementById('results');
      resultsDiv.className = 'results-box';
      
      let html = '<h2 style="color: #00cc44; margin-bottom: 1.5rem;">✅ Batch Complete!</h2>';
      html += '<div class="stats-grid">';
      html += '<div class="stat-card"><div class="stat-icon">📊</div><div class="stat-label">Total Found</div><div class="stat-value">' + data.totalFound + '</div></div>';
      html += '<div class="stat-card"><div class="stat-icon">✅</div><div class="stat-label">Imported</div><div class="stat-value" style="color: #00cc44;">' + data.imported + '</div></div>';
      html += '<div class="stat-card"><div class="stat-icon">⏭️</div><div class="stat-label">Already Existed</div><div class="stat-value" style="color: #0099ff;">' + data.skipped + '</div></div>';
      html += '<div class="stat-card"><div class="stat-icon">❌</div><div class="stat-label">Failed</div><div class="stat-value" style="color: #ff4444;">' + data.failed + '</div></div>';
      html += '</div>';
      
      if (data.importedList && data.importedList.length > 0) {
        html += '<div class="list-box">';
        html += '<strong style="color: #00cc44; font-size: 1.2rem;">✅ Successfully Imported (' + data.importedList.length + ')</strong>';
        html += '<ul class="list-grid" style="margin-top: 1rem;">';
        data.importedList.forEach(function(name) {
          html += '<li class="list-item">• ' + name + '</li>';
        });
        html += '</ul></div>';
      }
      
      if (data.failedList && data.failedList.length > 0) {
        html += '<div class="list-box" style="border: 1px solid #ff4444; background: #2a1a1a;">';
        html += '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">';
        html += '<strong style="color: #ff4444; font-size: 1.2rem;">❌ Failed Digimon (' + data.failedList.length + ')</strong>';
        html += '<button onclick="retryFailed()" style="padding: 0.5rem 1rem; background: #ff6600; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">🔄 Retry Failed</button>';
        html += '</div>';
        html += '<div style="max-height: 400px; overflow-y: auto; padding: 0.5rem;">';
        data.failedList.forEach(function(item) {
          var name = typeof item === 'string' ? item : item.name;
          var error = typeof item === 'object' && item.error ? item.error : 'Unknown error';
          html += '<div style="background: #1a1a1a; padding: 0.75rem; margin-bottom: 0.5rem; border-radius: 4px; border-left: 3px solid #ff4444;">';
          html += '<div style="font-weight: bold; color: #ff6666; margin-bottom: 0.25rem;">' + name + '</div>';
          html += '<div style="color: #999; font-size: 0.85rem;">' + error + '</div>';
          html += '</div>';
        });
        html += '</div></div>';
      }
      
      resultsDiv.innerHTML = html;
      resultsDiv.style.display = 'block';
    }
    
    async function retryFailed() {
      if (lastFailedList.length === 0) {
        alert('No failed imports to retry');
        return;
      }
      
      var failedNames = lastFailedList.map(function(item) {
        return typeof item === 'string' ? item : item.name;
      });
      
      if (!confirm('Retry importing ' + failedNames.length + ' failed Digimon?')) {
        return;
      }
      
      importing = 'retry';
      renderBatches();
      document.getElementById('error').style.display = 'none';
      document.getElementById('results').style.display = 'none';
      
      startProgressPolling();

      try {
        const response = await fetch('/api/batch-import-digimon', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ names: failedNames }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Retry failed');
        }

        showResults(data);
      } catch (err) {
        showError(err.message || 'Failed to retry batch');
      } finally {
        stopProgressPolling();
        importing = null;
        renderBatches();
      }
    }

    renderBatches();
  </script>
</body>
</html>
    `);
  });

  // Batch fix endpoint: fix forms for X-Antibody variants + download missing images
  app.post('/api/batch-fix', requireEditorAuth, async (req, res) => {
    try {
      const fixes: any[] = [];
      const errors: any[] = [];
      
      // 1. Get ALL Digimon
      const allDigimon: any[] = [];
      let page = 1;
      while (true) {
        const batch = await payload.find({
          collection: 'digimon',
          limit: 100,
          page,
          depth: 1,
        });
        allDigimon.push(...batch.docs);
        if (!batch.hasNextPage) break;
        page++;
      }
      console.log(`[batch-fix] Processing ${allDigimon.length} Digimon...`);
      
      // Build name->digimon lookup
      const byName: Record<string, any> = {};
      for (const d of allDigimon) {
        byName[d.name] = d;
      }
      
      // Known stage overrides for Digimon that can't be auto-detected
      const knownStages: Record<string, string> = {
        'Calumon': 'Rookie',
        'Ogudomon': 'Mega',
        'MedievalGallantmon': 'Mega',
        'MagnaGarurumon': 'Mega',
        'KaiserGreymon': 'Mega',
        'Wolfmon': 'Hybrid',
        'Garmmon': 'Hybrid',
        'Löwemon': 'Hybrid',
        'JägerLöwemon': 'Hybrid',
        'Agnimon': 'Hybrid',
        'Mercuremon': 'Hybrid',
        'Ranamon': 'Hybrid',
        'Grumblemon': 'Hybrid',
        'Arbormon': 'Hybrid',
        'Kumamon': 'Hybrid',
        'Kazemon': 'Hybrid',
        'Korikakumon': 'Hybrid',
        'BurningGreymon': 'Hybrid',
        'Dracomon': 'Rookie',
        'Hagurumon': 'Rookie',
        'Keramon': 'Rookie',
        'Wormmon': 'Rookie',
        'Shoutmon': 'Rookie',
        'DemiDevimon': 'Rookie',
        'Calumon (NPC)': 'Rookie',
      };
      
      // 2. Fix forms
      for (const d of allDigimon) {
        let newForm: string | null = null;
        
        // X-Antibody: inherit from base
        if (d.name.endsWith(' X') && d.form === 'Rookie') {
          const baseName = d.name.replace(/ X$/, '');
          const base = byName[baseName];
          if (base && base.form && base.form !== 'Rookie') {
            newForm = base.form;
          } else {
            // Try looking at what it digivolves from
            if (d.digivolutions?.digivolvesFrom?.length > 0) {
              const fromName = d.digivolutions.digivolvesFrom[0].name;
              const fromDigimon = byName[fromName];
              if (fromDigimon) {
                const stageOrder = ['Fresh', 'In-Training', 'Rookie', 'Champion', 'Ultimate', 'Mega'];
                const fromIdx = stageOrder.indexOf(fromDigimon.form);
                if (fromIdx >= 0 && fromIdx < stageOrder.length - 1) {
                  newForm = stageOrder[fromIdx + 1];
                }
              }
            }
          }
        }
        
        // Known overrides
        if (d.form === 'Rookie' && knownStages[d.name]) {
          const expected = knownStages[d.name];
          if (expected !== d.form) {
            newForm = expected;
          }
        }
        
        // Non-X Digimon stuck at Rookie: infer from digivolvesFrom
        if (!newForm && d.form === 'Rookie' && !d.name.endsWith(' X') && !knownStages[d.name]) {
          if (d.digivolutions?.digivolvesFrom?.length > 0) {
            const fromName = d.digivolutions.digivolvesFrom[0].name;
            const fromDigimon = byName[fromName];
            if (fromDigimon && fromDigimon.form) {
              const stageOrder = ['Fresh', 'In-Training', 'Rookie', 'Champion', 'Ultimate', 'Mega'];
              const fromIdx = stageOrder.indexOf(fromDigimon.form);
              if (fromIdx >= 0 && fromIdx < stageOrder.length - 1 && stageOrder[fromIdx + 1] !== 'Rookie') {
                newForm = stageOrder[fromIdx + 1];
              }
            }
          }
        }
        
        if (newForm && newForm !== d.form) {
          try {
            await payload.update({
              collection: 'digimon',
              id: d.id,
              data: { form: newForm },
            });
            fixes.push({ name: d.name, field: 'form', from: d.form, to: newForm });
            console.log(`[batch-fix] ${d.name}: form ${d.form} → ${newForm}`);
          } catch (err: any) {
            errors.push({ name: d.name, field: 'form', error: err.message });
          }
        }
      }
      
      // 3. Fix missing images (4 Digimon with special character names)
      // Map display names to wiki filenames
      const wikiNameMap: Record<string, string> = {
        'JägerLöwemon': 'JagerLoweemon',
        'SunFlowmon': 'Sunflowmon',
        'GinRyumon': 'Ginryumon',
        'FanBeemon': 'Fanbeemon',
        'Löwemon': 'Lowemon',
      };
      
      const missingImages = allDigimon.filter(d => !d.icon?.url || !d.mainImage?.url);
      console.log(`[batch-fix] ${missingImages.length} Digimon missing images`);
      
      for (const d of missingImages) {
        const hasIcon = d.icon && (typeof d.icon === 'object' ? d.icon.url : true);
        const hasMainImage = d.mainImage && (typeof d.mainImage === 'object' ? d.mainImage.url : true);
        
        // Use wiki name mapping or sanitize the name
        const wikiName = wikiNameMap[d.name] || d.name.replace(/[äÄ]/g, 'a').replace(/[öÖ]/g, 'o').replace(/[üÜ]/g, 'u');
        
        // Try to download missing icon
        if (!hasIcon) {
          const iconUrl = `https://dmowiki.com/Special:Redirect/file/${encodeURIComponent(wikiName)}_Icon.png`;
          try {
            console.log(`[batch-fix] Downloading icon for ${d.name} from wiki name: ${wikiName}`);
            const iconResult = await downloadAndUploadImage(iconUrl, `${d.name} Icon`, { imageType: 'digimon-icon', belongsTo: { digimon: d.name }, tags: ['digimon-icon'] });
            if (iconResult) {
              await payload.update({ collection: 'digimon', id: d.id, data: { icon: iconResult } });
              fixes.push({ name: d.name, field: 'icon', status: 'downloaded' });
              console.log(`[batch-fix] ✅ ${d.name}: icon downloaded`);
            } else {
              errors.push({ name: d.name, field: 'icon', error: 'downloadAndUploadImage returned null' });
            }
          } catch (err: any) {
            errors.push({ name: d.name, field: 'icon', error: err.message });
          }
        }
        
        // Try to download missing mainImage
        if (!hasMainImage) {
          const imgUrl = `https://dmowiki.com/Special:Redirect/file/${encodeURIComponent(wikiName)}.png`;
          try {
            console.log(`[batch-fix] Downloading mainImage for ${d.name} from wiki name: ${wikiName}`);
            const imgResult = await downloadAndUploadImage(imgUrl, d.name, { imageType: 'digimon-main', belongsTo: { digimon: d.name }, tags: ['digimon-main'] });
            if (imgResult) {
              await payload.update({ collection: 'digimon', id: d.id, data: { mainImage: imgResult } });
              fixes.push({ name: d.name, field: 'mainImage', status: 'downloaded' });
              console.log(`[batch-fix] ✅ ${d.name}: mainImage downloaded`);
            } else {
              errors.push({ name: d.name, field: 'mainImage', error: 'downloadAndUploadImage returned null' });
            }
          } catch (err: any) {
            errors.push({ name: d.name, field: 'mainImage', error: err.message });
          }
        }
      }
      
      res.json({ 
        success: true, 
        totalProcessed: allDigimon.length,
        fixes: fixes.length, 
        errors: errors.length,
        fixDetails: fixes,
        errorDetails: errors,
      });
    } catch (error: any) {
      console.error('[batch-fix] Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  const server = app.listen(3001, async () => {
    payload.logger.info('CMS Server started on port 3001');
  });

  // Graceful shutdown
  const shutdown = async () => {
    console.log('\nShutting down...');
    await closeBrowser();
    server.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
};

start();
