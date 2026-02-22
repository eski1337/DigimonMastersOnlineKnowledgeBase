import type { Request, Response } from 'express';

const DMOWIKI_API = 'https://dmowiki.com/api.php';

// FORCE RELOAD - VERSION 2.0 - TIMESTAMP: 2025-10-16-20:22
console.log('🔥 IMPORT API ROUTE LOADED - NEW VERSION 2.0 🔥');

interface DigimonPreview {
  name: string;
  slug: string;
  form: string;
  rank: string;
  attackerType?: string;
  element: string;
  attribute: string;
  families: string[];
  stats: {
    hp: number;
    at: number;
    de: number;
    as: number;
    ds: number;
    ct: number;
    ht: number;
    ev: number;
  };
  skills: Array<{
    name: string;
    description: string;
    type?: string;
    element?: string;
    cooldown?: number | null;
    dsConsumption?: number | null;
    skillPointsPerUpgrade?: number | null;
    animationTime?: number | null;
  }>;
  digivolutions?: {
    digivolvesFrom: string[];
    digivolvesTo: string[];
  };
  icon?: string;
  images?: string[];
  introduction?: string;
  obtain?: string;
  published: boolean;
}

// Fetch wiki markup via MediaWiki API
async function fetchWikiMarkup(digimonName: string): Promise<string> {
  const url = `${DMOWIKI_API}?action=query&titles=${encodeURIComponent(digimonName)}&prop=revisions&rvprop=content&format=json`;
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'DMO KB Importer/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status}`);
  }

  const data = await response.json();
  const pages = data.query.pages;
  const pageId = Object.keys(pages)[0];
  
  if (pageId === '-1') {
    throw new Error(`Page not found: ${digimonName}`);
  }
  
  const content = pages[pageId].revisions[0]['*'];
  return content;
}

// Fetch images via MediaWiki API with full URLs
async function fetchWikiImages(digimonName: string): Promise<string[]> {
  // First, get the list of images
  const parseUrl = `${DMOWIKI_API}?action=parse&page=${encodeURIComponent(digimonName)}&prop=images&format=json`;
  
  const parseResponse = await fetch(parseUrl, {
    headers: {
      'User-Agent': 'DMO KB Importer/1.0',
    },
  });

  if (!parseResponse.ok) {
    return [];
  }

  const parseData = await parseResponse.json();
  if (!parseData.parse || !parseData.parse.images) {
    return [];
  }
  
  const imageNames = parseData.parse.images as string[];
  
  // Now get full URLs for these images
  const imageUrls: string[] = [];
  
  // Filter for icon first
  const iconName = imageNames.find((img: string) => 
    img.includes('_Icon.png') && 
    !img.includes('TBD.png') &&
    img.toLowerCase().replace(/_/g, ' ').includes(digimonName.toLowerCase())
  );
  
  if (iconName) {
    // Get full URL for this image
    const imageUrl = await getImageUrl(iconName);
    if (imageUrl) {
      imageUrls.push(imageUrl);
    }
  }
  
  // Add other images
  for (const imgName of imageNames) {
    if (
      !imgName.includes('TBD.png') &&
      !imgName.includes('_Icon.png') &&
      !imgName.toLowerCase().includes('element') &&
      !imgName.toLowerCase().includes('attribute') &&
      !imgName.toLowerCase().includes('badge')
    ) {
      const imageUrl = await getImageUrl(imgName);
      if (imageUrl && !imageUrls.includes(imageUrl)) {
        imageUrls.push(imageUrl);
      }
    }
  }
  
  return imageUrls;
}

// Get full URL for an image file
async function getImageUrl(filename: string): Promise<string | null> {
  const url = `${DMOWIKI_API}?action=query&titles=File:${encodeURIComponent(filename)}&prop=imageinfo&iiprop=url&format=json`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'DMO KB Importer/1.0',
      },
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    const pages = data.query.pages;
    const pageId = Object.keys(pages)[0];
    
    if (pageId === '-1' || !pages[pageId].imageinfo) {
      return null;
    }
    
    return pages[pageId].imageinfo[0].url;
  } catch {
    return null;
  }
}

// Parse wiki template - handles nested braces correctly
function parseWikiTemplate(markup: string, templateName: string): Record<string, string> {
  const result: Record<string, string> = {};
  
  // Find the start of the template
  const startPattern = `{{${templateName}`;
  const startIndex = markup.indexOf(startPattern);
  
  if (startIndex === -1) {
    return result;
  }
  
  // Count braces to find the matching closing }}
  let braceCount = 0;
  let endIndex = startIndex;
  
  for (let i = startIndex; i < markup.length - 1; i++) {
    if (markup[i] === '{' && markup[i + 1] === '{') {
      braceCount++;
      i++; // Skip next character
    } else if (markup[i] === '}' && markup[i + 1] === '}') {
      braceCount--;
      if (braceCount === 0) {
        endIndex = i + 2;
        break;
      }
      i++; // Skip next character
    }
  }
  
  if (endIndex === startIndex) {
    return result; // No matching closing braces found
  }
  
  // Extract template content
  const templateContent = markup.substring(startIndex + startPattern.length, endIndex - 2);
  
  // Parse parameters
  const paramRegex = /\|([^=\n]+)=([^\n]*)/g;
  let paramMatch;
  
  while ((paramMatch = paramRegex.exec(templateContent)) !== null) {
    const key = paramMatch[1].trim();
    const value = paramMatch[2].trim();
    if (key && value) {
      result[key] = value;
    }
  }
  
  return result;
}

// Extract skills from wiki markup
function extractSkills(markup: string): any[] {
  let attacks = parseWikiTemplate(markup, 'Digimon Attacks 2');
  if (Object.keys(attacks).length === 0) {
    attacks = parseWikiTemplate(markup, 'Digimon Attacks');
  }
  
  const skills: any[] = [];
  
  let attackNum = 1;
  while (attacks[`attack${attackNum}`]) {
    const skillName = attacks[`attack${attackNum}`];
    const skillDesc = attacks[`atk${attackNum}desc`] || '';
    const element = attacks[`attribute${attackNum}`];
    const cooldown = attacks[`cooldown${attackNum}`];
    const ds = attacks[`atk${attackNum}ds`];
    const sp = attacks[`skillpoint${attackNum}`];
    const anim = attacks[`anim${attackNum}`];
    
    const skill: any = {
      name: skillName,
      description: skillDesc,
      type: 'Attack',
    };
    
    if (element) skill.element = element;
    if (cooldown) skill.cooldown = cooldown === '?' ? null : parseFloat(cooldown);
    if (ds) skill.dsConsumption = ds === '?' ? null : parseInt(ds);
    if (sp) skill.skillPointsPerUpgrade = sp === '?' ? null : parseInt(sp);
    if (anim) skill.animationTime = anim === '?' ? null : parseFloat(anim);
    
    skills.push(skill);
    attackNum++;
  }
  
  return skills;
}

// Parse Digimon data from wiki markup
async function fetchDigimonFromWiki(slug: string): Promise<DigimonPreview> {
  // Fetch wiki markup
  const markup = await fetchWikiMarkup(slug);
  
  // Parse Digimon Infobox
  const infobox = parseWikiTemplate(markup, 'Digimon Infobox');
  
  // Extract basic info
  const data: DigimonPreview = {
    name: slug,
    slug: slug.toLowerCase().replace(/\s+/g, '-'),
    form: infobox.form || 'Rookie',
    rank: infobox.rank || 'A',
    element: infobox.naturalattribute || infobox.element || 'Neutral',
    attribute: infobox.attribute || 'Unknown',
    families: infobox.family ? [infobox.family] : [],
    attackerType: infobox.atttype,
    stats: {
      hp: parseInt(infobox['base hp'] || '0'),
      at: parseInt(infobox['base at'] || '0'),
      de: parseInt(infobox['base de'] || '0'),
      as: parseFloat(infobox['base as'] || infobox.as || '0'),
      ds: parseInt(infobox['base ds'] || '0'),
      ct: parseFloat(infobox['base ct'] || infobox.ct || '0'),
      ht: parseInt(infobox['base ht'] || infobox.ht || '0'),
      ev: parseFloat(infobox['base ev'] || infobox.ev || '0'),
    },
    skills: [],
    published: false,
  };
  
  // Map attacker type codes
  const attackerTypeMap: Record<string, string> = {
    'SA': 'Short Attacker',
    'QA': 'Quick Attacker',
    'NA': 'Near Attacker',
    'DE': 'Defender',
  };
  if (data.attackerType) {
    data.attackerType = attackerTypeMap[data.attackerType] || data.attackerType;
  }
  
  // Extract skills
  data.skills = extractSkills(markup);
  
  // Extract digivolutions
  const digivolvesFrom = infobox.from ? [infobox.from] : [];
  const digivolvesTo = infobox.to ? [infobox.to] : [];
  
  if (digivolvesFrom.length > 0 || digivolvesTo.length > 0) {
    data.digivolutions = {
      digivolvesFrom,
      digivolvesTo,
    };
  }
  
  // Fetch images
  const images = await fetchWikiImages(slug);
  if (images.length > 0) {
    data.icon = images[0]; // First image is the icon
    data.images = images;
  }
  
  return data;
}

export async function POST(request: Request, response: Response) {
  try {
    const { slug } = request.body;

    if (!slug) {
      return response.status(400).json({
        error: 'Digimon name or URL is required'
      });
    }

    // Fetch and parse from wiki using MediaWiki API
    const preview = await fetchDigimonFromWiki(slug);

    return response.json({ success: true, preview });
  } catch (error: any) {
    console.error('Import error:', error);
    return response.status(500).json({
      error: error.message || 'Failed to import from DMO Wiki'
    });
  }
}
