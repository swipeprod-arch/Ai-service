const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

function walk(dir) {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) {
      // не трогаем вспомогательные куски Tilda
      if (name === 'files') continue;
      out.push(...walk(full));
    } else if (name.toLowerCase().endsWith('.html')) {
      out.push(full);
    }
  }
  return out;
}

const files = walk(root);
let updated = 0;

files.forEach((filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');
  if (!content.includes('const routes = {')) return;
  if (content.includes("'/gallery':")) return;

  const before = content;

  // Пытаемся вставить после /faq (самое логичное место)
  const anchorFaq = /(\s*'\/faq'\s*:\s*'[^']+'\s*,)/;
  if (anchorFaq.test(content)) {
    content = content.replace(anchorFaq, `$1\n    '/gallery': 'gallery.html',`);
  } else {
    // fallback: после /how или после /experts
    const anchorHow = /(\s*'\/how'\s*:\s*'[^']+'\s*,)/;
    const anchorExperts = /(\s*'\/experts'\s*:\s*'[^']+'\s*,)/;
    if (anchorHow.test(content)) content = content.replace(anchorHow, `$1\n    '/gallery': 'gallery.html',`);
    else if (anchorExperts.test(content)) content = content.replace(anchorExperts, `$1\n    '/gallery': 'gallery.html',`);
  }

  if (content !== before) {
    fs.writeFileSync(filePath, content, 'utf8');
    updated++;
    console.log('UPDATED:', path.relative(root, filePath).replace(/\\/g, '/'));
  }
});

console.log('Done. Updated files:', updated);



