<template>
  <Layout>
    <div class="space-y-2">
      <div class="flex gap-2">
        <select
          @change="selectParasha"
          class="px-2 py-1 border outline-none border-gray-200 focus:border-gray-600 flex-1 bg-white"
        >
          <option value="">בחר פרשה...</option>
          <option v-for="p in PARASHAS" :key="p.ref" :value="p.ref">{{ p.he }}</option>
        </select>
        <button
          type="button"
          @click="setCurrentParasha"
          :disabled="loading"
          class="bg-amber-600 disabled:opacity-50 text-white px-3 py-1 text-sm whitespace-nowrap"
        >
          פרשת השבוע
        </button>
      </div>
      <form @submit.prevent="submit" class="flex">
        <input
          v-model="form.ref"
          type="text"
          placeholder="הכנס כתובת מקור"
          class="px-2 py-1 me-2 border outline-none border-gray-200 focus:border-gray-600 flex-1"
        />
        <button type="submit" class="bg-gray-800 text-white px-4 py-1">
          <span v-if="!loading">חפש</span>
          <Loader v-else />
        </button>
      </form>
    </div>

    <section v-if="kabbalahLinks.length" class="my-8">
      <nav class="flex items-center">
        <p class="text-gray-500 me-4">{{ kabbalahLinks.length }} תוצאות</p>
        <button
          class="bg-gray-500 text-white px-3 flex items-center py-1"
          @click="copyAll"
        >
          <svg class="w-5 me-2" viewBox="0 0 24 24">
            <g
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
            >
              <path d="M8 10a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2z" />
              <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
            </g>
          </svg>
          <span>העתק הכל</span>
        </button>
      </nav>
      <ul id="results" class="space-y-8 mt-6">
        <template v-for="(link, i) in kabbalahLinks" :key="link._id">
          <div
            v-if="i === 0 || link.anchorRef !== kabbalahLinks[i - 1].anchorRef"
            class="bg-yellow-50 p-4 border border-yellow-300 font-siddur font-black text-3xl"
          >
            <span class="me-2 text-yellow-700 font-normal text-xl">
              {{ hebrewRef(link.anchorRef) }}
            </span>
            <span v-html="textByRef[baseRef(link.anchorRef)]" class="text-gray-900" />
          </div>
          <LinkResult
            :index="i + 1"
            :link="link"
            :commentaries="commentariesByRef[link.ref] ?? []"
            :translation="translationByRef[link.ref] ?? ''"
            :originalText="originalByRef[link.ref] ?? ''"
            @delete="links = links.filter((l) => l._id !== link._id)"
          />
        </template>
      </ul>
    </section>
  </Layout>
</template>

<script setup lang="ts">
import { reactive, ref, computed } from "vue";
import Layout from "./components/Layout.vue";
import Loader from "./components/Loader.vue";
import LinkResult from "./components/LinkResult.vue";

const PARASHAS: { he: string; ref: string }[] = [
  { he: 'בְּרֵאשִׁית', ref: 'Genesis 1:1-6:8' },
  { he: 'נֹחַ', ref: 'Genesis 6:9-11:32' },
  { he: 'לֶךְ לְךָ', ref: 'Genesis 12:1-17:27' },
  { he: 'וַיֵּרָא', ref: 'Genesis 18:1-22:24' },
  { he: 'חַיֵּי שָׂרָה', ref: 'Genesis 23:1-25:18' },
  { he: 'תּוֹלְדוֹת', ref: 'Genesis 25:19-28:9' },
  { he: 'וַיֵּצֵא', ref: 'Genesis 28:10-32:3' },
  { he: 'וַיִּשְׁלַח', ref: 'Genesis 32:4-36:43' },
  { he: 'וַיֵּשֶׁב', ref: 'Genesis 37:1-40:23' },
  { he: 'מִקֵּץ', ref: 'Genesis 41:1-44:17' },
  { he: 'וַיִּגַּשׁ', ref: 'Genesis 44:18-47:27' },
  { he: 'וַיְחִי', ref: 'Genesis 47:28-50:26' },
  { he: 'שְׁמוֹת', ref: 'Exodus 1:1-6:1' },
  { he: 'וָאֵרָא', ref: 'Exodus 6:2-9:35' },
  { he: 'בֹּא', ref: 'Exodus 10:1-13:16' },
  { he: 'בְּשַׁלַּח', ref: 'Exodus 13:17-17:16' },
  { he: 'יִתְרוֹ', ref: 'Exodus 18:1-20:23' },
  { he: 'מִשְׁפָּטִים', ref: 'Exodus 21:1-24:18' },
  { he: 'תְּרוּמָה', ref: 'Exodus 25:1-27:19' },
  { he: 'תְּצַוֶּה', ref: 'Exodus 27:20-30:10' },
  { he: 'כִּי תִשָּׂא', ref: 'Exodus 30:11-34:35' },
  { he: 'וַיַּקְהֵל', ref: 'Exodus 35:1-38:20' },
  { he: 'פְקוּדֵי', ref: 'Exodus 38:21-40:38' },
  { he: 'וַיִּקְרָא', ref: 'Leviticus 1:1-5:26' },
  { he: 'צַו', ref: 'Leviticus 6:1-8:36' },
  { he: 'שְׁמִינִי', ref: 'Leviticus 9:1-11:47' },
  { he: 'תַּזְרִיעַ', ref: 'Leviticus 12:1-13:59' },
  { he: 'מְצֹרָע', ref: 'Leviticus 14:1-15:33' },
  { he: 'אַחֲרֵי מוֹת', ref: 'Leviticus 16:1-18:30' },
  { he: 'קְדֹשִׁים', ref: 'Leviticus 19:1-20:27' },
  { he: 'אֱמֹר', ref: 'Leviticus 21:1-24:23' },
  { he: 'בְּהַר', ref: 'Leviticus 25:1-26:2' },
  { he: 'בְּחֻקֹּתַי', ref: 'Leviticus 26:3-27:34' },
  { he: 'בְּמִדְבַּר', ref: 'Numbers 1:1-4:20' },
  { he: 'נָשֹׂא', ref: 'Numbers 4:21-7:89' },
  { he: 'בְּהַעֲלֹתְךָ', ref: 'Numbers 8:1-12:16' },
  { he: 'שְׁלַח לְךָ', ref: 'Numbers 13:1-15:41' },
  { he: 'קֹרַח', ref: 'Numbers 16:1-18:32' },
  { he: 'חֻקַּת', ref: 'Numbers 19:1-22:1' },
  { he: 'בָּלָק', ref: 'Numbers 22:2-25:9' },
  { he: 'פִּינְחָס', ref: 'Numbers 25:10-30:1' },
  { he: 'מַטּוֹת', ref: 'Numbers 30:2-32:42' },
  { he: 'מַסְעֵי', ref: 'Numbers 33:1-36:13' },
  { he: 'דְּבָרִים', ref: 'Deuteronomy 1:1-3:22' },
  { he: 'וָאֶתְחַנַּן', ref: 'Deuteronomy 3:23-7:11' },
  { he: 'עֵקֶב', ref: 'Deuteronomy 7:12-11:25' },
  { he: 'רְאֵה', ref: 'Deuteronomy 11:26-16:17' },
  { he: 'שֹׁפְטִים', ref: 'Deuteronomy 16:18-21:9' },
  { he: 'כִּי תֵצֵא', ref: 'Deuteronomy 21:10-25:19' },
  { he: 'כִּי תָבוֹא', ref: 'Deuteronomy 26:1-29:8' },
  { he: 'נִצָּבִים', ref: 'Deuteronomy 29:9-30:20' },
  { he: 'וַיֵּלֶךְ', ref: 'Deuteronomy 31:1-31:30' },
  { he: 'הַאֲזִינוּ', ref: 'Deuteronomy 32:1-32:52' },
  { he: 'וְזֹאת הַבְּרָכָה', ref: 'Deuteronomy 33:1-34:12' },
];

const SECTION_CACHE_VERSION = 'v3';

const form = reactive({ ref: "במדבר א" });
const loading = ref(false);
const textByRef = ref<Record<string, string>>({});
const links = ref<Link[]>([]);
const commentariesByRef = ref<Record<string, Link[]>>({});
const translationByRef = ref<Record<string, string>>({});
const originalByRef = ref<Record<string, string>>({});
let abortController: AbortController | null = null;

const kabbalahLinks = computed(() =>
  links.value
    .filter(
      (link) =>
        link.category === "Kabbalah" &&
        /(זו?הר|אדרא)/.test(link.collectiveTitle.he) &&
        !/(מגלה עמוקות|ראשית חכמה)/.test(link.collectiveTitle.he)
    )
    .sort((a, b) => {
      const ra = parseAnchorRef(a.anchorRef), rb = parseAnchorRef(b.anchorRef);
      return ra.chapter - rb.chapter || ra.verse - rb.verse || a.commentaryNum - b.commentaryNum;
    })
);

const showChapterInRef = computed(() => {
  if (!kabbalahLinks.value.length) return false;
  const firstChapter = parseAnchorRef(kabbalahLinks.value[0].anchorRef).chapter;
  return kabbalahLinks.value.some((l) => parseAnchorRef(l.anchorRef).chapter !== firstChapter);
});

function parseAnchorRef(anchorRef: string): { chapter: number; verse: number } {
  const m = anchorRef.match(/(\d+):(\d+)/);
  return m ? { chapter: parseInt(m[1]), verse: parseInt(m[2]) } : { chapter: 0, verse: 0 };
}

function baseRef(anchorRef: string): string {
  return anchorRef.split("-")[0].trim();
}

function getZoharSection(ref: string): string {
  const m = ref.match(/^(Zohar,\s+[^\d]+?)\s*\d/);
  return m ? m[1].trim() : ref;
}

// ממיר טווח צלב-פרק לטווח פרקים לצורך ה-texts API: "Numbers 4:21-7:89" → "Numbers 4-7"
function toChapterRange(ref: string): string {
  const m = ref.match(/^([A-Za-z]+)\s+(\d+):\d+-(\d+):\d+$/);
  if (!m) return ref;
  return m[2] === m[3] ? `${m[1]} ${m[2]}` : `${m[1]} ${m[2]}-${m[3]}`;
}

// מפרק ref לרשימת פרקים בודדים לקריאות links מקבילות
// "Numbers 1:1-4:20" → ["Numbers 1","Numbers 2","Numbers 3","Numbers 4"]
function getParashaChapters(ref: string): string[] {
  const m = ref.match(/^([A-Za-z]+)\s+(\d+)(?::\d+)?-(\d+)(?::\d+)?$/);
  if (m) {
    const start = parseInt(m[2]), end = parseInt(m[3]);
    if (end >= start) return Array.from({ length: end - start + 1 }, (_, i) => `${m[1]} ${start + i}`);
  }
  return [ref];
}

async function prefetchSectionData(zoharLinks: Link[], signal: AbortSignal) {
  const sections = [...new Set(zoharLinks.map((l) => getZoharSection(l.ref)))];
  const newCommentaries: Record<string, Link[]> = {};
  const newTranslations: Record<string, string> = {};
  const newOriginals: Record<string, string> = {};

  await Promise.all(
    sections.map(async (section) => {
      const cacheKey = `sefaria_${SECTION_CACHE_VERSION}_${section}`;
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        try {
          const { commentaries, translations, originals } = JSON.parse(cached);
          Object.assign(newCommentaries, commentaries);
          Object.assign(newTranslations, translations);
          Object.assign(newOriginals, originals ?? {});
          return;
        } catch {}
      }

      try {
        const opts = { headers: { accept: "application/json" }, signal };
        // קריאה אחת לשתי גרסאות: טקסט מקורי + תרגום עברי
        const origV = encodeURIComponent("hebrew|Vocalized Zohar, Israel 2013");
        const transV = encodeURIComponent("hebrew|Hebrew Translation");
        const [linksRes, textRes] = await Promise.all([
          fetch(`https://www.sefaria.org/api/links/${encodeURIComponent(section)}?with_text=1&with_sheet_links=0&category=Commentary`, opts),
          fetch(`https://www.sefaria.org/api/v3/texts/${encodeURIComponent(section)}?version=${origV}&version=${transV}&fill_in_missing_segments=1&return_format=default`, opts),
        ]);
        const [sectionLinks, sectionText] = await Promise.all([linksRes.json(), textRes.json()]);

        const sectionCommentaries: Record<string, Link[]> = {};
        for (const link of sectionLinks) {
          if (link.category !== "Commentary") continue;
          (sectionCommentaries[link.anchorRef] ??= []).push(link);
          (newCommentaries[link.anchorRef] ??= []).push(link);
        }

        const sectionOriginals: Record<string, string> = {};
        const sectionTranslations: Record<string, string> = {};
        const versions: any[] = sectionText.versions ?? [];
        const origVersion = versions.find((v) => (v.versionTitle ?? "").includes("Vocalized Zohar")) ?? versions[0];
        const transVersion = versions.find((v) => (v.versionTitle ?? "") === "Hebrew Translation") ?? versions[1];

        const populateMap = (version: any, map: Record<string, string>) => {
          const raw = version?.text;
          if (!raw) return;
          const chapters: any[][] = Array.isArray(raw[0]) ? raw : [raw];
          chapters.forEach((chapter, chIdx) => {
            (Array.isArray(chapter) ? chapter : [chapter]).forEach((t: string, paraIdx) => {
              if (t) map[`${section} ${chIdx + 1}:${paraIdx + 1}`] = t;
            });
          });
        };

        populateMap(origVersion, sectionOriginals);
        populateMap(transVersion, sectionTranslations);
        Object.assign(newOriginals, sectionOriginals);
        Object.assign(newTranslations, sectionTranslations);

        try {
          sessionStorage.setItem(
            cacheKey,
            JSON.stringify({ commentaries: sectionCommentaries, translations: sectionTranslations, originals: sectionOriginals })
          );
        } catch {}
      } catch (e) {
        if ((e as Error).name !== "AbortError") console.error(e);
      }
    })
  );

  if (signal.aborted) return;
  commentariesByRef.value = newCommentaries;
  translationByRef.value = newTranslations;
  originalByRef.value = newOriginals;
}

const submit = async () => {
  abortController?.abort();
  abortController = new AbortController();
  const signal = abortController.signal;

  links.value = [];
  textByRef.value = {};
  commentariesByRef.value = {};
  translationByRef.value = {};
  originalByRef.value = {};
  loading.value = true;

  const options = { method: "GET", headers: { accept: "application/json" }, signal };
  // לינקים: קריאה נפרדת לכל פרק, ללא טקסט (חוסך ~80% bandwidth בקריאה הראשית)
  const chapterRefs = getParashaChapters(form.ref);
  // טקסטים: טווח פרקים (texts API תומך בפורמט זה)
  const textRef = toChapterRange(form.ref);

  try {
    const [allLinksArrays, textJson] = await Promise.all([
      Promise.all(
        chapterRefs.map((ch) =>
          fetch(`https://www.sefaria.org/api/links/${encodeURIComponent(ch)}?with_text=0&with_sheet_links=0&category=Kabbalah`, options)
            .then((r) => r.json())
        )
      ),
      fetch(`https://www.sefaria.org/api/v3/texts/${encodeURIComponent(textRef)}?version=hebrew&fill_in_missing_segments=0&return_format=default`, options)
        .then((r) => r.json()),
    ]);

    const rawText = textJson.versions?.[0]?.text;
    if (rawText && textJson.book) {
      const book = textJson.book as string;
      const rawSections = textJson.sections;
      const startChapter: number = Array.isArray(rawSections) ? +(rawSections[0] ?? 1) : +(rawSections ?? 1);
      const isMultiChapter = Array.isArray(rawText[0]);
      const chapters: any[][] = isMultiChapter ? rawText : [rawText];
      const newTextByRef: Record<string, string> = {};
      chapters.forEach((chapter, chIdx) => {
        (Array.isArray(chapter) ? chapter : [chapter]).forEach((verse: string, verseIdx) => {
          if (verse) newTextByRef[`${book} ${startChapter + chIdx}:${verseIdx + 1}`] = verse;
        });
      });
      textByRef.value = newTextByRef;
    }

    links.value = (allLinksArrays as Link[][]).flat();
    await prefetchSectionData(kabbalahLinks.value, signal);
  } catch (e) {
    if ((e as Error).name !== "AbortError") console.error(e);
  } finally {
    loading.value = false;
  }
};

function selectParasha(event: Event) {
  const val = (event.target as HTMLSelectElement).value;
  if (val) {
    form.ref = val;
    submit();
  }
}

async function setCurrentParasha() {
  try {
    const res = await fetch("https://www.sefaria.org/api/calendars?timezone=Asia/Jerusalem");
    const data = await res.json();
    const item = data.calendar_items?.find(
      (i: any) => i.title?.en?.startsWith("Parashat ") || i.category === "Parashat Hashavua"
    );
    if (item?.ref) {
      form.ref = item.ref;
      submit();
    }
  } catch (e) {
    console.error(e);
  }
}

const copyAll = () => {
  const container = document.getElementById("results")!;
  const range = document.createRange();
  range.selectNode(container);
  window.getSelection()!.removeAllRanges();
  window.getSelection()!.addRange(range);
  document.execCommand("copy");
};

function hebrewRef(anchorRef: string): string {
  const m = anchorRef.match(/(\d+):(\d+)/);
  if (!m) return "";
  return showChapterInRef.value
    ? arabicToHebrew(m[1]) + ":" + arabicToHebrew(m[2])
    : arabicToHebrew(m[2]);
}

function arabicToHebrew(sNumber: string): string {
  const hebrewThousands = ["", "א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ז׳", "ח׳", "ט׳"];
  const hebrewHundreds = ["", "ק", "ר", "ש", "ת", "תק", "תר", "תש", "תת", "תתק"];
  const hebrewTens = ["", "י", "כ", "ל", "מ", "נ", "ס", "ע", "פ", "צ"];
  const hebrewUnits = ["", "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט"];

  const n = +sNumber;
  const sThousands = Math.floor(n / 1000);
  const sHundreds = Math.floor((n % 1000) / 100);
  const sTens = Math.floor((n % 100) / 10);
  const sUnitsVal = n % 10;

  let result =
    hebrewThousands[sThousands] +
    hebrewHundreds[sHundreds] +
    hebrewTens[sTens] +
    hebrewUnits[sUnitsVal] +
    "*";
  result = result.replace("יו*", "טז*").replace("יה*", "טו*");
  return result.slice(0, -1);
}
</script>
