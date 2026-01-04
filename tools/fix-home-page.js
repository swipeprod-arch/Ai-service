const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

const FILES = [
  'index.html',
  path.join('files', 'page103804766body.html'),
];

const GARBLE_RE = /Р“Р°Р»РµСЂРµСЏ\s*СЂР°Р±РѕС‚/g;

function fixNav(html) {
  // 1) Поправим кракозябры где угодно
  html = html.replace(GARBLE_RE, 'Галерея работ');

  // 2) Правим nav-links, если нашли
  const navRe = /<nav class="nav-links" aria-label="Навигация">([\s\S]*?)<\/nav>/g;
  html = html.replace(navRe, (m, inner) => {
    let s = inner;

    // Удаляем "Услуги" и "Кейсы"
    s = s.replace(/<a href="\/services\.html">Услуги<\/a>\s*/g, '');
    s = s.replace(/<a href="\/cases\.html">Кейсы<\/a>\s*/g, '');

    // Исправляем ссылки на ключевые разделы
    // Исполнители
    s = s.replace(/<a href="\/[^"]*">Исполнители<\/a>/g, '<a href="/page103811056.html">Исполнители</a>');
    // Как это работает
    s = s.replace(/<a href="\/[^"]*">Как это работает<\/a>/g, '<a href="/page103811576.html">Как это работает</a>');
    // FAQ
    s = s.replace(/<a href="\/[^"]*">FAQ<\/a>/g, '<a href="/page103811816.html">FAQ</a>');

    // Галерея работ: если есть — фиксируем, если нет — вставляем после Исполнителей
    const hasGallery = /Галерея работ/.test(s);
    if (hasGallery) {
      s = s.replace(/<a href="\/[^"]*">Галерея работ<\/a>/g, '<a href="/gallery.html">Галерея работ</a>');
    } else {
      // вставляем после Исполнителей
      s = s.replace(
        /(<a href="\/page103811056\.html">Исполнители<\/a>)/,
        `$1 <a href="/gallery.html">Галерея работ</a>`
      );
      // если вдруг не нашли "Исполнители" — добавим в начало
      if (!/Галерея работ/.test(s)) {
        s = `<a href="/gallery.html">Галерея работ</a> ` + s;
      }
    }

    return `<nav class="nav-links" aria-label="Навигация">${s}</nav>`;
  });

  return html;
}

function fixHero(html) {
  // Меняем заголовок и подзаголовок главной (именно старые тексты, чтобы не трогать другие H1 на странице)
  html = html.replace(
    /<h1 class="h-title">AI-услуги под ключ: видео, дизайн, боты, маркетплейсы, сайты<\/h1>/g,
    '<h1 class="h-title">Каталог ИИ специалистов для вашего бизнеса</h1>'
  );

  html = html.replace(
    /<p class="h-sub">Каталог AI-специалистов\. Смотри портфолио и кейсы\. Оставляй заявку — сведём с исполнителем под твою задачу\.<\/p>/g,
    '<p class="h-sub">Смотри портфолио и кейсы, пиши напрямую исполнителям</p>'
  );

  return html;
}

function run() {
  let changedAny = false;

  for (const rel of FILES) {
    const filePath = path.join(root, rel);
    if (!fs.existsSync(filePath)) {
      console.log('SKIP (not found):', rel);
      continue;
    }
    const before = fs.readFileSync(filePath, 'utf8');
    let after = before;
    after = fixNav(after);
    after = fixHero(after);

    if (after !== before) {
      fs.writeFileSync(filePath, after, 'utf8');
      console.log('UPDATED:', rel);
      changedAny = true;
    } else {
      console.log('NO CHANGE:', rel);
    }
  }

  console.log(changedAny ? 'Done.' : 'Nothing to update.');
}

run();



