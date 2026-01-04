const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

function walk(dir) {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) {
      // не трогаем Tilda-body файлы — это не “страницы сайта”, а вспомогательные куски
      if (name === 'files') continue;
      out.push(...walk(full));
    } else {
      out.push(full);
    }
  }
  return out;
}

const files = walk(root)
  .filter((p) => p.toLowerCase().endsWith('.html'))
  .map((p) => path.relative(root, p).replace(/\\/g, '/'));

// CSS и JS для добавления (c cache-busting, чтобы на телефонах не тянулся старый кеш)
const VERSION = '20260104a1';
const cssLink = `<link rel="stylesheet" href="/css/mobile-menu.css?v=${VERSION}">`;
const jsScript = `<script src="/js/mobile-menu.js?v=${VERSION}"></script>`;

files.forEach(file => {
  const filePath = path.join(root, file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`SKIP (not found): ${file}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  
  // Добавляем CSS если его нет
  if (!content.includes('mobile-menu.css')) {
    // Ищем </head> или первый </style> или </script> в head
    if (content.includes('</head>')) {
      content = content.replace('</head>', `${cssLink}\n</head>`);
      changed = true;
      console.log(`  + Added CSS link`);
    }
  } else {
    // Если ссылка есть, но без версии/с другой версией — обновляем
    const before2 = content;
    content = content.replace(/href="\/css\/mobile-menu\.css(?:\?[^"]*)?"/g, `href="/css/mobile-menu.css?v=${VERSION}"`);
    if (content !== before2) {
      changed = true;
      console.log(`  ~ Updated CSS version`);
    }
  }
  
  // Добавляем JS если его нет
  if (!content.includes('mobile-menu.js')) {
    // Ищем </body>
    if (content.includes('</body>')) {
      content = content.replace('</body>', `${jsScript}\n</body>`);
      changed = true;
      console.log(`  + Added JS script`);
    }
  } else {
    // Если скрипт есть, но без версии/с другой версией — обновляем
    const before3 = content;
    content = content.replace(/src="\/js\/mobile-menu\.js(?:\?[^"]*)?"/g, `src="/js/mobile-menu.js?v=${VERSION}"`);
    if (content !== before3) {
      changed = true;
      console.log(`  ~ Updated JS version`);
    }
  }
  
  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`UPDATED: ${file}`);
  } else {
    console.log(`NO CHANGE: ${file}`);
  }
});

console.log('\nDone!');

