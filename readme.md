# sefaria-web-app

אפליקציית ווב לעיון בזוהר ופירושיו, בנויה על גבי [Sefaria API](https://www.sefaria.org/developers).

הפרויקט מכיל שני כלים עצמאיים שיושבים תחת אותו שרת:

---

## מבנה הפרויקט

```
sefaria_web_app/
├── index.html              ← כלי 1: עיון בזוהר (Vanilla JS)
├── styles.css
├── fonts/
└── commentaries-grabber/   ← כלי 2: חיפוש פירושים (Vue 3 + Vite)
    ├── src/
    │   ├── App.vue
    │   ├── components/
    │   │   ├── Layout.vue
    │   │   ├── LinkResult.vue
    │   │   └── Loader.vue
    │   ├── types/types.d.ts
    │   └── assets/main.css
    ├── test-api.mjs         ← סקריפט בדיקות API
    ├── vite.config.ts
    └── package.json
```

---

## כלי 1 — עיון בזוהר (`index.html`)

מנקודת הזוהר פנימה: בוחרים פרק זוהר ורואים את הטקסט עם פירושיו.

**מאפיינים:**
- Vanilla JS, ללא build — ניתן לפתוח ישירות בדפדפן
- בחירת פרק מתוך dropdown (פרשות הזוהר)
- הצגת טקסט ארמי + תרגום עברי זה לצד זה
- כותרות דף וילנא (ע"א / ע"ב) לפי מיפוי `alt_structs.Daf`
- פירושים מוצגים תחת כל פיסקה
- ייצוא ל-`.doc` (HTML עם Word namespace, לא docx אמיתי)

**קריאות API:**
```
GET /api/v2/raw/index/Zohar               ← מבנה הספר (פעם אחת בטעינה)
GET /api/v3/texts/{פרק}?version=...       ← ארמית + תרגום עברי
GET /api/links/{פרק}?with_text=1          ← פירושים לכל הפרק
```

---

## כלי 2 — חיפוש פירושים (`commentaries-grabber/`)

מנקודת התורה פנימה: בוחרים פרשה ורואים את כל מקומות הזוהר שמפרשים אותה.

**מאפיינים:**
- Vue 3 + TypeScript + Tailwind CSS, requires build
- חיפוש לפי פרשה (dropdown) או ref חופשי
- כפתור "פרשת השבוע" שמושך מ-Sefaria calendars API
- הצגה מקובצת לפי פסוק תורה
- לכל קישור זוהר: טקסט + תרגום + פירושים
- ייצוא ל-`.docx` אמיתי עם הערות שוליים (ספריית `docx`)
- progress bar עם אחוזים

**זרימת טעינה:**
```
1. GET /api/links/{טווח-פרקים}?category=Kabbalah&with_text=1   ← בקשה אחת
2. GET /api/v3/texts/{טווח}?version=hebrew                      ← טקסט פסוקים
   (שתי הבקשות רצות במקביל)

לכל ref זוהר ייחודי (במקביל, עד 6 בו-זמנית):
3. GET /api/links/{ref}?category=Commentary&with_text=1         ← פירושים
4. GET /api/v3/texts/{ref}?version=translation|all              ← תרגום עברי
```

---

## הרצה

### כלי 1
```bash
# פתח ישירות בדפדפן — אין צורך בשרת
start index.html
```

### כלי 2 — פיתוח
```bash
cd commentaries-grabber
npm install
npm run dev
# → http://localhost:5173/commentaries-grabber/
```

### כלי 2 — build לייצור
```bash
cd commentaries-grabber
npm run build
# מוציא קבצים ישירות ל-commentaries-grabber/ (לא ל-dist/)
# אחרי ה-build אפשר לפתוח את commentaries-grabber/index.html ישירות
```

---

## בדיקות API

סקריפט `test-api.mjs` משווה גישות שונות לשליפת פירושים:

```bash
cd commentaries-grabber
node test-api.mjs "Numbers 1"     # ברירת מחדל
node test-api.mjs "Genesis 1"
node test-api.mjs "Exodus 12"
```

---

## השוואה בין שני הכלים

| | כלי 1 (`index.html`) | כלי 2 (`commentaries-grabber`) |
|---|---|---|
| **נקודת מוצא** | פרק זוהר | פרשת תורה |
| **מה מוצג** | זוהר + פירושיו | פסוקי תורה + קישורי זוהר |
| **טכנולוגיה** | Vanilla JS | Vue 3 + TypeScript |
| **Build** | לא נדרש | `npm run build` |
| **ייצוא** | `.doc` (HTML) | `.docx` (אמיתי) |
| **Caching** | אין | sessionStorage |
| **בקשות לפרק** | 3 (מבנה, טקסט, פירושים) | 2 + N×2 לrefs ייחודיים |
