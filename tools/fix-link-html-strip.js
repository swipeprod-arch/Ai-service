const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

// Ищем и исправляем старый авто-фикс:
// if (href.endsWith('.html') ...) href = href.slice(0, -5);
// Проблема: он ломает переходы на /pageXXXXXXXX.html и /gallery.html
const RE = /if\s*\(\s*href\.endsWith\(\s*(['"])\.html\1\s*\)\s*(?:&&[^)]*)?\)\s*href\s*=\s*href\.slice\(\s*0\s*,\s*-5\s*\)\s*;/g;

const REPLACEMENT =
  "if (href.endsWith('.html') && !/\\/page\\d+\\.html$/i.test(href) && href !== '/gallery.html') href = href.slice(0, -5);";

function walk(dir) {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

const files = walk(root).filter((p) => p.toLowerCase().endsWith('.html'));

let changed = 0;
for (const filePath of files) {
  // не лезем в node_modules (на всякий)
  if (filePath.includes(`${path.sep}node_modules${path.sep}`)) continue;

  const before = fs.readFileSync(filePath, 'utf8');
  if (!before.includes('endsWith') || !before.includes('slice(0, -5')) continue;

  const after = before.replace(RE, REPLACEMENT);
  if (after !== before) {
    fs.writeFileSync(filePath, after, 'utf8');
    changed++;
    console.log('UPDATED:', path.relative(root, filePath));
  }
}

console.log('Done. Files updated:', changed);


