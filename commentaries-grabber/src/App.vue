<template>
  <Layout>
    <form @submit.prevent="submit" class="flex">
      <input
        v-model="form.ref"
        type="text"
        placeholder="הכנס כתובת מקור"
        class="px-2 py-1 me-2 border outline-none border-gray-200 focus:border-gray-600"
      />
      <button type="submit" class="bg-gray-800 text-white px-4 py-1">
        <span v-if="!loading">חפש</span>
        <Loader v-else />
      </button>
    </form>

    <section v-if="kabbalahLinks.length" class="my-8">
      <!-- <nav class="flex">
        <button v-for="category in linkCategories" :key="category" class="">
          {{ category }}
        </button>
      </nav> -->
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
              <path
                d="M8 10a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2z"
              />
              <path
                d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"
              />
            </g>
          </svg>
          <span>העתק הכל</span>
        </button>
      </nav>
      <ul id="results" class="space-y-8 mt-6">
        <template v-for="(link, i) in kabbalahLinks" :key="link._id">
          <div
            v-if="
              i == 0 || link.anchorVerse != kabbalahLinks[i - 1].anchorVerse
            "
            class="bg-yellow-50 p-4 border border-yellow-300 font-siddur font-black text-3xl"
          >
            <span class="me-2 text-yellow-700 font-normal">
              {{ arabicToHebrew(String(link.anchorVerse)) }}
            </span>
            <span v-html="text[link.anchorVerse - 1]" class="text-gray-900" />
          </div>
          <LinkResult
            :index="i + 1"
            :link="link"
            :commentaries="commentariesByRef[link.ref] ?? []"
            :translation="translationByRef[link.ref] ?? ''"
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

const form = reactive({
  ref: "במדבר א",
});

const loading = ref(false);
const text = ref<string[]>([]);
const links = ref<Link[]>([]);
const commentariesByRef = ref<Record<string, Link[]>>({});
const translationByRef = ref<Record<string, string>>({});
let abortController: AbortController | null = null;
const kabbalahLinks = computed(() => {
  return links.value
    .filter(
      (link) =>
        link.category === "Kabbalah" &&
        /(זו?הר|אדרא)/.test(link.collectiveTitle.he) &&
        !/(מגלה עמוקות|ראשית חכמה)/.test(link.collectiveTitle.he)
    )
    .sort(
      (a, b) =>
        a.anchorVerse - b.anchorVerse || a.commentaryNum - b.commentaryNum
    );
});
function getZoharSection(ref: string): string {
  // עוצר לפני המספר הראשון (פרק) — עובד גם עם טווחים כמו "Zohar, Bamidbar 1:1-5"
  const m = ref.match(/^(Zohar,\s+[^\d]+?)\s*\d/);
  return m ? m[1].trim() : ref;
}

async function prefetchSectionData(zoharLinks: Link[], signal: AbortSignal) {
  const sections = [...new Set(zoharLinks.map((l) => getZoharSection(l.ref)))];
  const newCommentaries: Record<string, Link[]> = {};
  const newTranslations: Record<string, string> = {};

  await Promise.all(
    sections.map(async (section) => {
      try {
        const opts = { headers: { accept: "application/json" }, signal };
        const [linksRes, textRes] = await Promise.all([
          fetch(`https://www.sefaria.org/api/links/${encodeURIComponent(section)}?with_text=1&with_sheet_links=0`, opts),
          fetch(`https://www.sefaria.org/api/v3/texts/${encodeURIComponent(section)}?version=translation%7Call&fill_in_missing_segments=0&return_format=default`, opts),
        ]);
        const [sectionLinks, sectionText] = await Promise.all([linksRes.json(), textRes.json()]);

        for (const link of sectionLinks) {
          if (link.category !== "Commentary") continue;
          (newCommentaries[link.anchorRef] ??= []).push(link);
        }

        const heVersion = sectionText.versions?.find((v: any) => v.language === "he");
        const raw = heVersion?.text;
        if (!raw) return;
        const chapters: any[][] = Array.isArray(raw[0]) ? raw : [raw];
        chapters.forEach((chapter, chIdx) => {
          (Array.isArray(chapter) ? chapter : [chapter]).forEach((t: string, paraIdx) => {
            if (t) newTranslations[`${section} ${chIdx + 1}:${paraIdx + 1}`] = t;
          });
        });
      } catch (e) {
        if ((e as Error).name !== "AbortError") console.error(e);
      }
    })
  );

  // לא להחיל תוצאות אם החיפוש בוטל בינתיים
  if (signal.aborted) return;
  commentariesByRef.value = newCommentaries;
  translationByRef.value = newTranslations;
}

const submit = async () => {
  abortController?.abort();
  abortController = new AbortController();
  const signal = abortController.signal;

  links.value = [];
  text.value = [];
  commentariesByRef.value = {};
  translationByRef.value = {};
  loading.value = true;

  const options = { method: "GET", headers: { accept: "application/json" }, signal };

  try {
    const [linksResponse, textResponse] = await Promise.all([
      fetch(`https://www.sefaria.org/api/links/${form.ref}?with_text=1&with_sheet_links=0`, options),
      fetch(`https://www.sefaria.org/api/v3/texts/${form.ref}?version=hebrew&fill_in_missing_segments=0&return_format=default`, options),
    ]);
    const [linksJson, textJson] = await Promise.all([linksResponse.json(), textResponse.json()]);

    const rawText = textJson.versions[0]?.text;
    text.value = Array.isArray(rawText) ? rawText : [rawText];
    links.value = linksJson;

    await prefetchSectionData(kabbalahLinks.value, signal);
  } catch (e) {
    if ((e as Error).name !== "AbortError") console.error(e);
  } finally {
    loading.value = false;
  }
};

const copyAll = () => {
  const container = document.getElementById("results")!;
  // copy element styled text to clipboard
  const range = document.createRange();
  range.selectNode(container);
  window.getSelection()!.removeAllRanges();
  window.getSelection()!.addRange(range);
  document.execCommand("copy");
};

function arabicToHebrew(sNumber: string) {
  var hebrewThousands = [
    "",
    "א׳",
    "ב׳",
    "ג׳",
    "ד׳",
    "ה׳",
    "ו׳",
    "ז׳",
    "ח׳",
    "ט׳",
  ];
  var hebrewHundreds = ["", "ק", "ר", "ש", "ת", "תק", "תר", "תש", "תת", "תתק"];
  var hebrewTens = ["", "י", "כ", "ל", "מ", "נ", "ס", "ע", "פ", "צ"];
  var hebrewUnits = ["", "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט"];

  var numberLength = sNumber.length;
  var sTens = 0;
  var sHundreds = 0;
  var sThousands = 0;
  var sUnits = sNumber[numberLength - 1];
  if (+sNumber > 9) sTens = sNumber[numberLength - 2];
  if (+sNumber > 99) sHundreds = sNumber[numberLength - 3];
  if (+sNumber > 999) sThousands = sNumber[numberLength - 4];
  var myHebrewNumber =
    hebrewThousands[sThousands] +
    hebrewHundreds[sHundreds] +
    hebrewTens[sTens] +
    hebrewUnits[sUnits] +
    "*";
  myHebrewNumber = myHebrewNumber.replace("יו*", "טז*");
  myHebrewNumber = myHebrewNumber.replace("יה*", "טו*");
  myHebrewNumber = myHebrewNumber.slice(0, myHebrewNumber.length - 1);

  return myHebrewNumber;
}
</script>
