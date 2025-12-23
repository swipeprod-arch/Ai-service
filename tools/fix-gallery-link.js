const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

// Pattern to find and fix the .html stripping script
const oldPattern = /\/\/ режем \.html\s*\n\s*if \(href\.endsWith\('\.html'\)\) href = href\.slice\(0, -5\);/g;
const newCode = `// режем .html (кроме gallery.html - новая страница)
    if (href.endsWith('.html') && !href.includes('gallery')) href = href.slice(0, -5);`;

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (oldPattern.test(content) && !content.includes("!href.includes('gallery')")) {
    content = content.replace(oldPattern, newCode);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('UPDATED:', path.basename(filePath));
    return true;
  }
  return false;
}

// Process all HTML files
const processDir = (dir) => {
  fs.readdirSync(dir).forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && file !== 'node_modules' && file !== '.git') {
      processDir(filePath);
    } else if (file.endsWith('.html')) {
      processFile(filePath);
    }
  });
};

processDir(root);
console.log('Done!');

