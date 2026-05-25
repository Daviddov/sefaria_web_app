// בדיקה מלאה של כל האופטימיזציות

const BASE = 'https://www.sefaria.org/api';

// -- עזרים שמשקפים את הלוגיקה ב-App.vue --

function toChapterRange(ref) {
  const m = ref.match(/^([A-Za-z]+)\s+(\d+):\d+-(\d+):\d+$/);
  if (!m) return ref;
  return m[2] === m[3] ? `${m[1]} ${m[2]}` : `${m[1]} ${m[2]}-${m[3]}`;
}

function getParashaChapters(ref) {
  const m = ref.match(/^([A-Za-z]+)\s+(\d+)(?::\d+)?-(\d+)(?::\d+)?$/);
  if (m) {
    const start = parseInt(m[2]), end = parseInt(m[3]);
    if (end >= start) return Array.from({ length: end - start + 1 }, (_, i) => `${m[1]} ${start + i}`);
  }
  return [ref];
}

function getZoharSection(ref) {
  const m = ref.match(/^(Zohar,\s+[^\d]+?)\s*\d/);
  return m ? m[1].trim() : ref;
}

function isKabbalahZohar(link) {
  return link.category === 'Kabbalah' &&
    /(זו?הר|אדרא)/.test(link.collectiveTitle?.he ?? '') &&
    !/(מגלה עמוקות|ראשית חכמה)/.test(link.collectiveTitle?.he ?? '');
}

function buildTextByRef(textJson) {
  const rawText = textJson.versions?.[0]?.text;
  if (!rawText || !textJson.book) return {};
  const book = textJson.book;
  const rawSections = textJson.sections;
  const startChapter = Array.isArray(rawSections) ? +(rawSections[0] ?? 1) : +(rawSections ?? 1);
  const chapters = Array.isArray(rawText[0]) ? rawText : [rawText];
  const result = {};
  chapters.forEach((ch, chIdx) => {
    (Array.isArray(ch) ? ch : [ch]).forEach((v, vIdx) => {
      if (v) result[`${book} ${startChapter + chIdx}:${vIdx + 1}`] = v;
    });
  });
  return result;
}

let totalFailures = 0;

function check(label, condition, details = '') {
  if (condition) {
    process.stdout.write(`  ✓ ${label}\n`);
  } else {
    process.stdout.write(`  ✗ ${label}${details ? ` — ${details}` : ''}\n`);
    totalFailures++;
  }
}

// ════════════════════════════════════════════════════
// בדיקה 1: getParashaChapters + toChapterRange
// ════════════════════════════════════════════════════
function testHelpers() {
  console.log('\n═══ בדיקה 1: פונקציות עזר ═══');

  const chapterCases = [
    ['Numbers 1:1-4:20', ['Numbers 1','Numbers 2','Numbers 3','Numbers 4']],
    ['Numbers 4:21-7:89', ['Numbers 4','Numbers 5','Numbers 6','Numbers 7']],
    ['Deuteronomy 31:1-31:30', ['Deuteronomy 31']],
    ['Numbers 1',  ['Numbers 1']],
    ['Numbers 1-4', ['Numbers 1','Numbers 2','Numbers 3','Numbers 4']],
    ['במדבר א',  ['במדבר א']],
  ];
  for (const [input, expected] of chapterCases) {
    const got = getParashaChapters(input);
    check(`getParashaChapters("${input}")`, JSON.stringify(got) === JSON.stringify(expected),
      `got ${JSON.stringify(got)}`);
  }

  const rangeCases = [
    ['Numbers 1:1-4:20', 'Numbers 1-4'],
    ['Numbers 4:21-7:89', 'Numbers 4-7'],
    ['Deuteronomy 31:1-31:30', 'Deuteronomy 31'],
    ['Numbers 1', 'Numbers 1'],
    ['Numbers 1-4', 'Numbers 1-4'],
  ];
  for (const [input, expected] of rangeCases) {
    const got = toChapterRange(input);
    check(`toChapterRange("${input}")`, got === expected, `got "${got}"`);
  }
}

// ════════════════════════════════════════════════════
// בדיקה 2: קריאת links עם with_text=0 לפרק בודד
// ════════════════════════════════════════════════════
async function testLinksNoText() {
  console.log('\n═══ בדיקה 2: links עם with_text=0 ═══');
  const ref = 'Numbers 1';
  const res = await fetch(`${BASE}/links/${encodeURIComponent(ref)}?with_text=0&with_sheet_links=0`);
  check('status 200', res.status === 200, `got ${res.status}`);
  const data = await res.json();
  check('תגובה כמערך', Array.isArray(data));
  const zohar = data.filter(isKabbalahZohar);
  check(`17 קישורי זוהר`, zohar.length === 17, `got ${zohar.length}`);
  check('link.he ריק (with_text=0)', !zohar[0]?.he, `link.he="${zohar[0]?.he?.slice(0,20)}"`);
  return zohar;
}

// ════════════════════════════════════════════════════
// בדיקה 3: קריאות מקבילות לפרקים — פרשת במדבר
// ════════════════════════════════════════════════════
async function testParallelChapters() {
  console.log('\n═══ בדיקה 3: קריאות מקבילות לפרשת במדבר (Numbers 1-4) ═══');
  const parashaRef = 'Numbers 1:1-4:20';
  const chapters = getParashaChapters(parashaRef);
  check('4 פרקים', chapters.length === 4, `got ${chapters.length}`);

  const allArrays = await Promise.all(
    chapters.map(ch =>
      fetch(`${BASE}/links/${encodeURIComponent(ch)}?with_text=0&with_sheet_links=0`).then(r => r.json())
    )
  );
  const allLinks = allArrays.flat();
  const zohar = allLinks.filter(isKabbalahZohar);
  console.log(`  קישורים: ${allLinks.length} | זוהר: ${zohar.length}`);
  check('47 קישורי זוהר (כמו "Numbers 1-4")', zohar.length === 47, `got ${zohar.length}`);

  const chapterNums = [...new Set(zohar.map(l => l.anchorRef?.match(/(\d+):/)?.[1]))].sort();
  check('קישורים מ-4 פרקים', chapterNums.length === 4, `פרקים: [${chapterNums}]`);
  console.log(`  פרקים בתוצאות: [${chapterNums.join(', ')}]`);
  return zohar;
}

// ════════════════════════════════════════════════════
// בדיקה 4: texts API עם toChapterRange — textByRef נכון
// ════════════════════════════════════════════════════
async function testTextByRef() {
  console.log('\n═══ בדיקה 4: textByRef עבור פרשת במדבר ═══');
  const textRef = toChapterRange('Numbers 1:1-4:20'); // "Numbers 1-4"
  const res = await fetch(`${BASE}/v3/texts/${encodeURIComponent(textRef)}?version=hebrew&fill_in_missing_segments=0&return_format=default`);
  const textJson = await res.json();
  const textByRef = buildTextByRef(textJson);

  check(`book="Numbers"`, textJson.book === 'Numbers', `got "${textJson.book}"`);
  const rawSections = textJson.sections;
  const startCh = Array.isArray(rawSections) ? +(rawSections[0] ?? 1) : +(rawSections ?? 1);
  check(`startChapter=1`, startCh === 1, `got ${JSON.stringify(rawSections)}`);
  check(`רב-פרקי`, Array.isArray(textJson.versions?.[0]?.text?.[0]));

  const testKeys = ['Numbers 1:1','Numbers 2:1','Numbers 3:1','Numbers 4:1'];
  for (const key of testKeys) {
    const val = textByRef[key];
    check(`"${key}" קיים`, !!val, 'חסר');
    if (val) console.log(`    "${key}": "${val.replace(/<[^>]+>/g,'').slice(0,50)}..."`);
  }
  check(`≥188 פסוקים`, Object.keys(textByRef).length >= 188, `got ${Object.keys(textByRef).length}`);
}

// ════════════════════════════════════════════════════
// בדיקה 5: section prefetch — שתי גרסאות בקריאה אחת
// ════════════════════════════════════════════════════
async function testSectionTwoVersions(section) {
  console.log(`\n═══ בדיקה 5: section "${section}" — שתי גרסאות ═══`);
  const origV = encodeURIComponent('hebrew|Vocalized Zohar, Israel 2013');
  const transV = encodeURIComponent('translation|all');
  const res = await fetch(`${BASE}/v3/texts/${encodeURIComponent(section)}?version=${origV}&version=${transV}&fill_in_missing_segments=0&return_format=default`);
  const data = await res.json();

  const versions = data.versions ?? [];
  check(`≥1 גרסאות`, versions.length >= 1, `got ${versions.length}`);
  console.log(`  גרסאות: ${versions.map(v => `"${v.versionTitle}" (${v.language})`).join(', ')}`);

  const origVersion = versions.find(v => (v.versionTitle ?? '').includes('Vocalized Zohar'));
  const transVersion = versions.find(v => !(v.versionTitle ?? '').includes('Vocalized Zohar'));

  check('גרסה מקורית (Vocalized Zohar)', !!origVersion, 'לא נמצאה');
  check('גרסת תרגום', !!transVersion, 'לא נמצאה');

  // בדוק שהגרסה המקורית מכילה טקסט ארמי/עברי
  const rawOrig = origVersion?.text;
  let origCount = 0;
  if (rawOrig) {
    const chapters = Array.isArray(rawOrig[0]) ? rawOrig : [rawOrig];
    chapters.forEach(ch => (Array.isArray(ch) ? ch : [ch]).forEach(t => { if (t) origCount++; }));
  }
  check(`טקסט מקורי: ${origCount} קטעים`, origCount > 0, 'ריק');

  const rawTrans = transVersion?.text;
  let transCount = 0;
  if (rawTrans) {
    const chapters = Array.isArray(rawTrans[0]) ? rawTrans : [rawTrans];
    chapters.forEach(ch => (Array.isArray(ch) ? ch : [ch]).forEach(t => { if (t) transCount++; }));
  }
  check(`תרגום: ${transCount} קטעים`, transCount > 0, 'ריק');
  check('טקסטים שונים', origVersion?.versionTitle !== transVersion?.versionTitle);
}

// ════════════════════════════════════════════════════
// בדיקה 6: פרשת השבוע → getParashaChapters עובד
// ════════════════════════════════════════════════════
async function testCurrentParashaFull() {
  console.log('\n═══ בדיקה 6: פרשת השבוע מלאה ═══');
  const calRes = await fetch('https://www.sefaria.org/api/calendars?timezone=Asia/Jerusalem');
  const calData = await calRes.json();
  const item = calData.calendar_items?.find(
    i => i.title?.en?.startsWith('Parashat ') || i.category === 'Parashat Hashavua'
  );
  check('נמצאה פרשת השבוע', !!item?.ref, 'לא נמצאה');
  if (!item?.ref) return;

  console.log(`  פרשת השבוע: "${item.title?.he}" | ref: "${item.ref}"`);
  const chapters = getParashaChapters(item.ref);
  const textRef = toChapterRange(item.ref);
  console.log(`  פרקים: [${chapters.join(', ')}] | textRef: "${textRef}"`);
  check('לפחות פרק אחד', chapters.length >= 1);

  // בדוק שקריאות links עובדות לפרק הראשון
  const firstChapterRes = await fetch(`${BASE}/links/${encodeURIComponent(chapters[0])}?with_text=0&with_sheet_links=0`);
  const firstChapterLinks = await firstChapterRes.json();
  check(`links לפרק ראשון (${chapters[0]})`, Array.isArray(firstChapterLinks), `got ${typeof firstChapterLinks}`);
  const zohar = firstChapterLinks.filter(isKabbalahZohar);
  console.log(`  זוהר בפרק ראשון: ${zohar.length}`);

  // בדוק שtext API עובד עם textRef
  const textRes = await fetch(`${BASE}/v3/texts/${encodeURIComponent(textRef)}?version=hebrew&fill_in_missing_segments=0&return_format=default`);
  const textJson = await textRes.json();
  const textByRef = buildTextByRef(textJson);
  check(`texts API עובד עם "${textRef}"`, !!textJson.book, `שגיאה: ${textJson.error ?? 'לא ידוע'}`);
  console.log(`  פסוקים בטקסט: ${Object.keys(textByRef).length}`);
}

// ════════════════════════════════════════════════════
// ════════════════════════════════════════════════════

(async () => {
  testHelpers();
  const zoharLinks = await testLinksNoText();
  await testParallelChapters();
  await testTextByRef();
  if (zoharLinks.length > 0) {
    const section = getZoharSection(zoharLinks[0].ref);
    await testSectionTwoVersions(section);
  }
  await testCurrentParashaFull();

  console.log(totalFailures === 0
    ? '\n✅ כל הבדיקות עברו\n'
    : `\n❌ ${totalFailures} כשלים\n`);
  if (totalFailures > 0) process.exit(1);
})();
