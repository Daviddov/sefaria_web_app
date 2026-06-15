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
      <div v-if="loading" class="rounded border border-amber-200 bg-amber-50/90 px-3 py-2.5 space-y-2 shadow-sm">
        <div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <p class="text-sm font-medium text-gray-900 leading-snug flex-1 min-w-0 break-words order-2 sm:order-1" dir="auto">
            {{ progressLabel }}
          </p>
          <span class="shrink-0 text-sm tabular-nums font-semibold text-amber-800 order-1 sm:order-2">{{ progressPercentRounded }}%</span>
        </div>
        <div
          class="h-2.5 rounded-full bg-amber-100 overflow-hidden ring-1 ring-amber-200/80"
          role="progressbar"
          :aria-valuenow="progressPercentRounded"
          aria-valuemin="0"
          aria-valuemax="100"
          :aria-label="progressLabel"
        >
          <div
            class="h-full rounded-full bg-amber-600 transition-[width] duration-200 ease-out"
            :style="{ width: `${progressPercent}%` }"
          />
        </div>
      </div>
    </div>

    <section v-if="kabbalahLinks.length" class="my-8">
      <nav class="flex flex-wrap items-center gap-2 gap-y-2">
        <p class="text-gray-500 me-2">{{ kabbalahLinks.length }} תוצאות</p>
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
        <button
          type="button"
          :disabled="loading"
          class="bg-blue-800 hover:bg-blue-900 disabled:opacity-50 text-white px-3 flex items-center py-1"
          @click="exportResultsToWord"
        >
          <svg class="w-5 me-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="8" y1="13" x2="16" y2="13" />
            <line x1="8" y1="17" x2="14" y2="17" />
          </svg>
          <span>ייצא ל־Word</span>
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
import { Document, Packer, Paragraph, TextRun, HeadingLevel, FootnoteReferenceRun, AlignmentType, SectionType, ExternalHyperlink } from "docx";

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

const SECTION_CACHE_VERSION = 'v6';

/** מגביל בקשות מקבילות ל־Sefaria כדי למנוע timeouts (504) ועומס */
const SEFARIA_FETCH_CONCURRENCY = 6;

/** משקלי שלב טעינה (סוכמים ל־100) */
const PROGRESS_W = {
  kabbalahChapters: 26,
  verseText: 14,
  zoharPrefetch: 55,
  originalFallback: 5,
};

const form = reactive({ ref: "במדבר א" });
const loading = ref(false);
const progressPercent = ref(0);
const progressLabel = ref("");
const progressPercentRounded = computed(() => Math.min(100, Math.round(progressPercent.value)));
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

// ממיר טווח צלב-פרק לטווח פרקים לצורך ה-texts API: "Numbers 4:21-7:89" → "Numbers 4-7"
function toChapterRange(ref: string): string {
  const m = ref.match(/^([A-Za-z]+)\s+(\d+):\d+-(\d+):\d+$/);
  if (!m) return ref;
  return m[2] === m[3] ? `${m[1]} ${m[2]}` : `${m[1]} ${m[2]}-${m[3]}`;
}


/** מאזן עומס: מריצה את fn על כל פריט בסדר עם לכל היותר `concurrency` טאסקים במקביל */
async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
  signal: AbortSignal,
  onEachDone?: () => void
): Promise<R[]> {
  const results = new Array<R>(items.length);
  if (items.length === 0) return results;
  const workers = Math.min(Math.max(1, concurrency), items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      if (signal.aborted) return;
      const index = cursor++;
      results[index] = await fn(items[index], index);
      onEachDone?.();
    }
  }

  await Promise.all(Array.from({ length: workers }, () => worker()));
  return results;
}

async function fetchWithRetry(url: string, opts: RequestInit, maxAttempts = 3): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      if (opts.signal?.aborted) throw new DOMException("", "AbortError");
      const delay = 1000 * 2 ** (attempt - 1); // 1s, 2s
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, delay);
        opts.signal?.addEventListener("abort", () => {
          clearTimeout(timer);
          reject(new DOMException("", "AbortError"));
        }, { once: true });
      });
    }
    try {
      const resp = await fetch(url, opts);
      if (resp.status < 500) return resp;
      lastError = new Error(`HTTP ${resp.status}`);
    } catch (e) {
      if ((e as Error).name === "AbortError") throw e;
      lastError = e;
    }
  }
  throw lastError;
}

async function prefetchSectionData(
  zoharLinks: Link[],
  signal: AbortSignal,
  onEachRefDone?: () => void
) {
  const uniqueRefs = [...new Set(zoharLinks.map(l => l.ref))];
  const newCommentaries: Record<string, Link[]> = {};
  const newTranslations: Record<string, string> = {};

  await mapWithConcurrency(
    uniqueRefs,
    SEFARIA_FETCH_CONCURRENCY,
    async (ref) => {
      const cacheCommentaryKey = `sefaria_${SECTION_CACHE_VERSION}_ref_${ref}`;
      const cacheTranslationKey = `sefaria_${SECTION_CACHE_VERSION}_tr_${ref}`;

      const cachedCommentaries = sessionStorage.getItem(cacheCommentaryKey);
      let commentaryLinks: Link[] | null = null;
      let translationText: string | null = null;

      if (cachedCommentaries) {
        try {
          commentaryLinks = JSON.parse(cachedCommentaries) as Link[];
        } catch {}
      }
      const translationFromCache = sessionStorage.getItem(cacheTranslationKey);
      if (translationFromCache !== null) {
        translationText = translationFromCache;
      }

      const opts = { headers: { accept: "application/json" }, signal };

      try {
        const tasks: Promise<void>[] = [];

        if (!commentaryLinks) {
          tasks.push(
            (async () => {
              const refLinks: unknown = await fetchWithRetry(
                `https://www.sefaria.org/api/links/${encodeURIComponent(ref)}?with_text=1&with_sheet_links=0&category=Commentary`,
                opts
              ).then((r) => r.json());
              if (!Array.isArray(refLinks)) return;
              const filtered = refLinks.filter((l: unknown) => (l as { category?: string }).category === "Commentary") as Link[];
              commentaryLinks = filtered;
              try {
                sessionStorage.setItem(cacheCommentaryKey, JSON.stringify(filtered));
              } catch {}
            })()
          );
        }

        if (translationText === null) {
          tasks.push(
            (async () => {
              try {
                const data = await fetchWithRetry(
                  `https://www.sefaria.org/api/v3/texts/${encodeURIComponent(ref)}?version=translation%7Call&fill_in_missing_segments=0&return_format=default`,
                  opts
                ).then((r) => r.json());
                const versions = data.versions as { language?: string; text?: unknown }[] | undefined;
                const rawTr = versions?.find((v) => v.language === "he")?.text;
                translationText =
                  Array.isArray(rawTr) ? (rawTr as string[]).join("") : (typeof rawTr === "string" ? rawTr : "");
                try {
                  sessionStorage.setItem(cacheTranslationKey, translationText);
                } catch {}
              } catch (e) {
                if ((e as Error).name !== "AbortError") console.error(e);
              }
            })()
          );
        }

        await Promise.all(tasks);
      } catch (e) {
        if ((e as Error).name !== "AbortError") console.error(e);
      }

      const list = commentaryLinks ?? [];
      (newCommentaries[ref] ??= []).push(...list);
      if (translationText !== null) newTranslations[ref] = translationText;

      return ref;
    },
    signal,
    onEachRefDone
  );

  if (signal.aborted) return;
  commentariesByRef.value = newCommentaries;
  translationByRef.value = newTranslations;
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
  progressPercent.value = 0;
  progressLabel.value = "טוען קישורי זוהר וטקסט התורה...";

  const options = { method: "GET", headers: { accept: "application/json" }, signal };
  // שני ה-APIs תומכים בטווח פרקים: "Numbers 1-4" — בקשה אחת במקום בקשה לכל פרק
  const textRef = toChapterRange(form.ref);

  try {
    const [rawLinks, textJson] = await Promise.all([
      fetchWithRetry(
        `https://www.sefaria.org/api/links/${encodeURIComponent(textRef)}?with_text=1&with_sheet_links=0&category=Kabbalah`,
        options
      ).then((r) => {
        progressPercent.value = Math.min(99, progressPercent.value + PROGRESS_W.kabbalahChapters);
        return r.json();
      }),
      (async () => {
        const j = await fetchWithRetry(
          `https://www.sefaria.org/api/v3/texts/${encodeURIComponent(textRef)}?version=hebrew&fill_in_missing_segments=0&return_format=default`,
          options
        ).then((r) => r.json());
        progressPercent.value = Math.min(99, progressPercent.value + PROGRESS_W.verseText);
        return j;
      })(),
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

    links.value = Array.isArray(rawLinks) ? rawLinks as Link[] : [];

    const zohUnique = [...new Set(kabbalahLinks.value.map((l) => l.ref))];
    if (zohUnique.length === 0) {
      progressPercent.value = Math.min(99, progressPercent.value + PROGRESS_W.zoharPrefetch);
    } else {
      progressLabel.value = `טוען פירושים ותרגומים לזוהר (${zohUnique.length})…`;
      const zBump = PROGRESS_W.zoharPrefetch / zohUnique.length;
      await prefetchSectionData(kabbalahLinks.value, signal, () => {
        progressPercent.value = Math.min(99, progressPercent.value + zBump);
      });
    }

    // Fallback: fetch text individually for Zohar links where link.he was not returned by the API
    if (!signal.aborted) {
      const emptyRefs = [...new Set(kabbalahLinks.value.filter((l) => !l.he).map((l) => l.ref))];
      if (emptyRefs.length === 0) {
        progressPercent.value = Math.min(99, progressPercent.value + PROGRESS_W.originalFallback);
      } else {
        progressLabel.value = `טוען טקסט מקורי לזהר החסר (${emptyRefs.length})…`;
        const oBump = PROGRESS_W.originalFallback / emptyRefs.length;
        const newOriginals: Record<string, string> = {};
        await mapWithConcurrency(
          emptyRefs,
          SEFARIA_FETCH_CONCURRENCY,
          async (ref) => {
            const cacheKey = `sefaria_${SECTION_CACHE_VERSION}_text_${ref}`;
            const cached = sessionStorage.getItem(cacheKey);
            if (cached) {
              newOriginals[ref] = cached;
              return ref;
            }
            try {
              const data = await fetchWithRetry(
                `https://www.sefaria.org/api/v3/texts/${encodeURIComponent(ref)}?version=primary&fill_in_missing_segments=0&return_format=default`,
                { headers: { accept: "application/json" }, signal }
              ).then((r) => r.json());
              const ver = (data.versions ?? []).find((v: { language?: string }) => v.language === "he" || v.language === "arc")
                ?? (data.versions ?? [])[0] as { text?: unknown } | undefined;
              if (ver?.text) {
                const t = Array.isArray(ver.text) ? (ver.text as string[]).join("") : String(ver.text);
                if (t) {
                  newOriginals[ref] = t;
                  try {
                    sessionStorage.setItem(cacheKey, t);
                  } catch {}
                }
              }
            } catch (e) {
              if ((e as Error).name !== "AbortError") console.error(e);
            }
            return ref;
          },
          signal,
          () => {
            progressPercent.value = Math.min(99, progressPercent.value + oBump);
          }
        );
        if (!signal.aborted) originalByRef.value = newOriginals;
      }
    }

    progressLabel.value = "סיים";
  } catch (e) {
    const name = (e as Error)?.name;
    if (name !== "AbortError") {
      console.error(e);
      progressLabel.value = "שגיאה בטעינה";
    }
  } finally {
    progressPercent.value = 100;
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

function stripHtmlToText(raw: string): string {
  if (!raw) return "";
  try {
    const el = document.createElement("div");
    el.innerHTML = raw;
    return (el.textContent || "").replace(/\r\n/g, "\n").trim();
  } catch {
    return raw.replace(/<[^>]*>/g, "").trim();
  }
}

function asPlainSegment(text: string | string[] | undefined): string {
  if (text == null) return "";
  const joined = Array.isArray(text) ? text.join("") : String(text);
  return stripHtmlToText(joined).replace(/\n{3,}/g, "\n\n").trim();
}


function safeExportFilenameBase(raw: string): string {
  const s = raw.slice(0, 96).replace(/[/\\?%*:|"<>#\s]+/g, "_").replace(/^_+|_+$/g, "");
  return s || "export";
}

function textToRuns(text: string, bold = false): TextRun[] {
  const runs: TextRun[] = [];
  text.split("\n").forEach((line, idx) => {
    if (idx > 0) runs.push(new TextRun({ break: 1 }));
    if (line) runs.push(new TextRun({ text: line, bold, rightToLeft: true }));
  });
  return runs;
}

async function exportResultsToWord() {
  const list = kabbalahLinks.value;
  if (!list.length) return;

  const footnotes: Record<number, { children: Paragraph[] }> = {};
  let fnId = 0;

  function rtlPara(children: (TextRun | FootnoteReferenceRun)[], heading?: HeadingLevel): Paragraph {
    return new Paragraph({
      children,
      ...(heading !== undefined ? { heading } : {}),
      bidirectional: true,
      alignment: AlignmentType.LEFT,
    });
  }

  const bodyChildren: Paragraph[] = [
    rtlPara([new TextRun({ text: "חיפוש פירושים — ספריא", rightToLeft: true })], HeadingLevel.HEADING_1),
    rtlPara([new TextRun({ text: "מקור: " + form.ref, rightToLeft: true })]),
    rtlPara([new TextRun({ text: "תאריך: " + new Date().toLocaleString("he-IL", { hour12: false }), rightToLeft: true })]),
    new Paragraph({ text: "" }),
  ];

  list.forEach((link, i) => {
    if (i === 0 || link.anchorRef !== list[i - 1].anchorRef) {
      const verseLabel = hebrewRef(link.anchorRef);
      const verseText = asPlainSegment(textByRef.value[baseRef(link.anchorRef)]);
      bodyChildren.push(rtlPara(
        [new TextRun({ text: "★ פסוק " + verseLabel, rightToLeft: true })],
        HeadingLevel.HEADING_2
      ));
      if (verseText) {
        bodyChildren.push(rtlPara(textToRuns(verseText)));
      }
    }

    const sefariaUrl = "https://www.sefaria.org/" + encodeURIComponent(link.ref).replace(/%20/g, "_");
    bodyChildren.push(new Paragraph({
      heading: HeadingLevel.HEADING_3,
      bidirectional: true,
      alignment: AlignmentType.LEFT,
      children: [new ExternalHyperlink({
        link: sefariaUrl,
        children: [new TextRun({ text: (i + 1) + ". " + link.collectiveTitle.he + " — " + link.sourceHeRef, rightToLeft: true, style: "Hyperlink" })],
      })],
    }));

    const zoharText = asPlainSegment(originalByRef.value[link.ref] || link.he);
    const coms = commentariesByRef.value[link.ref] ?? [];
    const zoharRuns: (TextRun | FootnoteReferenceRun)[] = textToRuns(zoharText, true);

    for (const c of coms) {
      fnId++;
      const comBody = asPlainSegment(c.he);
      footnotes[fnId] = {
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: c.collectiveTitle.he + " · " + c.sourceHeRef, bold: true, rightToLeft: true }),
              ...(comBody ? [new TextRun({ break: 1 }), ...textToRuns(comBody)] : []),
            ],
            bidirectional: true,
            alignment: AlignmentType.LEFT,
          }),
        ],
      };
      zoharRuns.push(new FootnoteReferenceRun(fnId));
    }

    if (zoharRuns.length) {
      bodyChildren.push(rtlPara(zoharRuns));
    }

    const tr = asPlainSegment(translationByRef.value[link.ref]);
    if (tr) {
      bodyChildren.push(rtlPara([
        new TextRun({ text: "תרגום: ", bold: true, rightToLeft: true }),
        ...textToRuns(tr),
      ]));
    }
  });

  try {
    const doc = new Document({
      footnotes,
      styles: {
        default: {
          document: {
            run: { language: { bidi: "he-IL" } },
            paragraph: { bidirectional: true, alignment: AlignmentType.LEFT },
          },
          heading1: { paragraph: { bidirectional: true, alignment: AlignmentType.LEFT } },
          heading2: { paragraph: { bidirectional: true, alignment: AlignmentType.LEFT } },
          heading3: { paragraph: { bidirectional: true, alignment: AlignmentType.LEFT } },
        },
      },
      sections: [{
        properties: { bidi: true, type: SectionType.CONTINUOUS },
        children: bodyChildren,
      }],
    });
    const blob = await Packer.toBlob(doc);
    const stamp = new Date().toISOString().slice(0, 16).replace(/[T:]/g, "-");
    const name = safeExportFilenameBase(form.ref) + "_" + stamp + ".docx";
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error("exportResultsToWord failed:", e);
    alert("שגיאה ביצוא: " + (e instanceof Error ? e.message : String(e)));
  }
}

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
