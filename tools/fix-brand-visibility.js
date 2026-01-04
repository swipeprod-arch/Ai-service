const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

// Удаляем скрипт ai-mobile-brand-hide из всех HTML файлов
const scriptPattern = /<script id="ai-mobile-brand-hide">[\s\S]*?<\/script>/g;

// Файлы для обработки
const files = fs.readdirSync(root).filter(f => f.endsWith('.html'));

files.forEach(file => {
  const filePath = path.join(root, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (content.includes('ai-mobile-brand-hide')) {
    content = content.replace(scriptPattern, '');
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`REMOVED ai-mobile-brand-hide: ${file}`);
  }
});

console.log('Done!');


