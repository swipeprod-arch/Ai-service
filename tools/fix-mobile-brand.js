const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

// Старое правило которое скрывает текст
const oldRule = `.nav a.brand span:not(.logo){
      display:none !important;
    }`;

// Новое правило - показываем текст
const newRule = `.nav a.brand span:not(.logo){
      display:block !important;
      font-size:12px !important;
      font-weight:700 !important;
      white-space:nowrap !important;
    }`;

// Файлы для обработки
const files = fs.readdirSync(root).filter(f => f.endsWith('.html'));

files.forEach(file => {
  const filePath = path.join(root, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (content.includes('display:none !important') && content.includes('span:not(.logo)')) {
    // Заменяем правило
    content = content.replace(
      /\.nav a\.brand span:not\(\.logo\)\{\s*display:none !important;\s*\}/g,
      `.nav a.brand span:not(.logo){display:block !important;font-size:12px !important;font-weight:700 !important;white-space:nowrap !important;}`
    );
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`UPDATED: ${file}`);
  }
});

console.log('Done!');


