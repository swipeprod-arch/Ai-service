const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

// Старый и новый текст
const oldText = 'маркетплейс ИИ специалистов';
const newText = 'Маркетплейс ИИ услуг';

// Все HTML файлы
const files = fs.readdirSync(root).filter(f => f.endsWith('.html'));

// Также body файлы
const bodyDir = path.join(root, 'files');
if (fs.existsSync(bodyDir)) {
  fs.readdirSync(bodyDir).filter(f => f.endsWith('.html')).forEach(f => {
    files.push('files/' + f);
  });
}

files.forEach(file => {
  const filePath = path.join(root, file);
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (content.includes(oldText)) {
    content = content.replace(new RegExp(oldText, 'g'), newText);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`UPDATED: ${file}`);
  }
});

console.log('Done!');


