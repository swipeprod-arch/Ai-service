const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

// Gallery link to add after experts (proper UTF-8)
const galleryLink = '<a href="/gallery.html">Галерея работ</a>';

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  
  // Remove old JS injection script with bad encoding
  if (content.includes('id="ai-gallery-menu"')) {
    content = content.replace(/<script id="ai-gallery-menu">[\s\S]*?<\/script>\s*/gi, '');
    changed = true;
    console.log('  - Removed old ai-gallery-menu script');
  }
  
  // Remove services and cases links
  const servicesPattern = /<a href="\/services[^"]*">[^<]+<\/a>\s*/gi;
  const casesPattern = /<a href="\/cases[^"]*">[^<]+<\/a>\s*/gi;
  
  if (servicesPattern.test(content)) {
    content = content.replace(servicesPattern, '');
    changed = true;
  }
  if (casesPattern.test(content)) {
    content = content.replace(casesPattern, '');
    changed = true;
  }
  
  // Add gallery link after experts if not present
  if (!content.includes('/gallery.html') && !content.includes('/gallery"')) {
    // Pattern to find experts link and add gallery after it
    const expertsPattern = /(<a href="[^"]*experts[^"]*">[^<]+<\/a>)(\s*)(<a href="[^"]*(?:how|faq|cases)[^"]*">)/gi;
    if (expertsPattern.test(content)) {
      content = content.replace(expertsPattern, `$1 ${galleryLink}$2$3`);
      changed = true;
      console.log('  - Added gallery link after experts');
    } else {
      // Try simpler pattern
      const simplePattern = /(<a href="[^"]*experts[^"]*">Исполнители<\/a>)/gi;
      if (simplePattern.test(content)) {
        content = content.replace(simplePattern, `$1 ${galleryLink}`);
        changed = true;
        console.log('  - Added gallery link (simple pattern)');
      }
    }
  }
  
  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('UPDATED:', path.basename(filePath));
  }
}

// Process files directory
const filesDir = path.join(root, 'files');
if (fs.existsSync(filesDir)) {
  fs.readdirSync(filesDir)
    .filter(f => f.endsWith('body.html'))
    .forEach(f => processFile(path.join(filesDir, f)));
}

// Process main HTML files
fs.readdirSync(root)
  .filter(f => f.endsWith('.html') && !f.startsWith('gallery') && !f.startsWith('seed') && !f.startsWith('test'))
  .forEach(f => processFile(path.join(root, f)));

console.log('Done!');
