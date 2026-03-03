const fs = require('fs');
const cheerio = require('cheerio');

const BASE = 'C:\\Users\\Luk\\Desktop\\DMOKB\\Game Systems\\Monster Cards';

function parseFile(name) {
  const path = BASE + '\\' + name;
  if (!fs.existsSync(path)) { console.log('SKIP:', name); return; }
  const html = fs.readFileSync(path, 'utf8');
  const $ = cheerio.load(html);
  
  console.log('\n\n######## ' + name.replace(/ - Digimon.*/, '') + ' ########');
  
  const content = $('#mw-content-text .mw-parser-output');
  
  // Walk through all direct children to preserve order
  content.children().each((_, el) => {
    const tag = el.tagName;
    
    if (tag === 'p') {
      const txt = $(el).text().trim();
      if (txt && txt.length > 2) console.log('[P] ' + txt.substring(0, 500));
    }
    
    if (tag === 'h2' || tag === 'h3' || tag === 'h4') {
      const txt = $(el).find('.mw-headline').text().trim() || $(el).text().trim();
      if (txt) console.log('\n[' + tag.toUpperCase() + '] ' + txt);
    }
    
    if (tag === 'ul' || tag === 'ol') {
      $(el).find('li').each((_, li) => {
        console.log('  - ' + $(li).text().trim().substring(0, 200));
      });
    }
    
    if (tag === 'table') {
      const cap = $(el).find('caption').text().trim();
      console.log('\n[TABLE' + (cap ? ': ' + cap : '') + ']');
      $(el).find('tr').each((_, r) => {
        const cells = $(r).find('th, td').map((__, c) => {
          return $(c).text().trim().replace(/\s+/g, ' ').substring(0, 120);
        }).get();
        if (cells.length && cells.some(c => c.length > 0)) {
          console.log('  ' + cells.join(' | '));
        }
      });
    }
    
    if (tag === 'div' && $(el).hasClass('mw-heading')) {
      const txt = $(el).find('.mw-headline').text().trim();
      if (txt) console.log('\n[HEADING] ' + txt);
    }
  });
}

parseFile('Monster Card - Digimon Masters Online Wiki - DMO Wiki.html');
for (let i = 1; i <= 7; i++) parseFile('Monster Card Lv' + i + ' - Digimon Masters Online Wiki - DMO Wiki.html');
for (let i = 1; i <= 6; i++) parseFile('High Rank Monster Card Lv' + i + ' - Digimon Masters Online Wiki - DMO Wiki.html');
for (let i = 1; i <= 3; i++) parseFile('Highest Monster Card Lv' + i + ' - Digimon Masters Online Wiki - DMO Wiki.html');
parseFile('Random Monster Card - Digimon Masters Online Wiki - DMO Wiki.html');
