const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

// Delete old built JS/CSS assets (keep fonts)
const assetsDir = path.join(root, 'assets');
try {
  fs.readdirSync(assetsDir).forEach(f => {
    if (/^index-.*\.(js|css)$/.test(f)) fs.unlinkSync(path.join(assetsDir, f));
  });
} catch (e) {}

// Restore index.html: נקה הפניות build ישנות (hash) והחזר נקודת כניסה ל-Vite.
// חשוב עם outDir נקודה '.' — הקובץ בדיסק מתעדכן אחרי build ל-hash ולכן לפני כל build חוזר ל-main.ts.
const indexPath = path.join(root, 'index.html');
const entryScript = /<script\b[^>]*\bsrc="\.\/src\/main\.ts"[^>]*><\/script>/;
try {
  let html = fs.readFileSync(indexPath, 'utf8');
  html = html.replace(
    /\s*<script\b[^>]*\bsrc="\.\/assets\/index-[^"]+\.js"[^>]*><\/script>/g,
    ''
  );
  html = html.replace(
    /\s*<link\b[^>]*\bhref="\.\/assets\/index-[^"]+\.css"[^>]*>/g,
    ''
  );
  if (!entryScript.test(html)) {
    html = html.replace('</head>', '    <script type="module" src="./src/main.ts"></script>\n  </head>');
  }
  fs.writeFileSync(indexPath, html);
} catch (e) {
  console.error('prebuild failed:', e);
}
