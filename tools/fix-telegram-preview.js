const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const file = path.join(root, 'index.html');

const TITLE = 'Каталог ИИ специалистов';
const DESC = 'Каталог ИИ специалистов: видео, дизайн, боты, WB/Ozon, сайты.';
const CANONICAL = 'http://ииспециалисты.рф/';
const IMAGE = 'http://ииспециалисты.рф/images/ai-logo.png';

const metaBlockRe = /<!--metatextblock-->[\s\S]*?<!--\/metatextblock-->/;

function buildMetaBlock() {
  return `<!--metatextblock--> <title>${TITLE}</title> <meta name="description" content="${DESC}" /> <meta property="og:url" content="${CANONICAL}" /> <meta property="og:title" content="${TITLE}" /> <meta property="og:description" content="${DESC}" /> <meta property="og:type" content="website" /> <meta property="og:image" content="${IMAGE}" /> <link rel="canonical" href="${CANONICAL}"> <!--/metatextblock-->`;
}

if (!fs.existsSync(file)) {
  console.error('index.html not found');
  process.exit(1);
}

const before = fs.readFileSync(file, 'utf8');
if (!metaBlockRe.test(before)) {
  console.error('metatextblock not found in index.html');
  process.exit(2);
}

const after = before.replace(metaBlockRe, buildMetaBlock());

if (after === before) {
  console.log('NO CHANGE: index.html');
  process.exit(0);
}

fs.writeFileSync(file, after, 'utf8');
console.log('UPDATED: index.html (Telegram preview meta)');



