<template>
  <li class="px-4 pt-2 pb-4 border bg-white relative">
    <!-- <p>{{ link.category }}</p> -->
    <a
      target="_blank"
      :href="`https://www.sefaria.org/${link.ref}`"
      class="bg-white px-4 rounded-full border flex hover:bg-blue-100 transition-colors items-center absolute -top-3 right-4"
    >
      <span
        class="bg-pink-600 rounded-full px-2 text-pink-100 me-2 text-sm font-bold select-none"
        >{{ index }}</span
      >
      <button
        class="text-gray-500 p-0.5 hover:text-red-600 me-2"
        @click.prevent="$emit('delete')"
      >
        <svg class="w-5" viewBox="0 0 24 24">
          <g
            fill="none"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
          >
            <path d="M0 0h24v24H0z" />
            <path
              fill="currentColor"
              d="M17 3.34a10 10 0 1 1-14.995 8.984L2 12l.005-.324A10 10 0 0 1 17 3.34zm-6.489 5.8a1 1 0 0 0-1.218 1.567L10.585 12l-1.292 1.293l-.083.094a1 1 0 0 0 1.497 1.32L12 13.415l1.293 1.292l.094.083a1 1 0 0 0 1.32-1.497L13.415 12l1.292-1.293l.083-.094a1 1 0 0 0-1.497-1.32L12 10.585l-1.293-1.292l-.094-.083z"
            />
          </g>
        </svg>
      </button>
      <h3 class="font-bold me-2">{{ link.collectiveTitle.he }}</h3>
      <p class="text-sm text-gray-600">{{ link.sourceHeRef }}</p>
    </a>
    <p
      v-html="shrinkParenthesis(originalText || link.he)"
      class="mt-4 text-2xl/none font-bold font-siddur"
    />
    <!-- <pre
      dir="ltr"
      class="text-xs p-4 overflow-auto whitespace-pre bg-gray-100"
      >{{ link }}</pre
    > -->
    <ul class="space-y-6 mt-6">
      <li v-if="translation" class="bg-gray-50 font-bold p-2 relative border">
        <div class="bg-white px-4 rounded-full border absolute -top-3 right-4">
          תרגום
        </div>
        <p
          class="mt-3 text-2xl/none font-siddur"
          v-html="shrinkParenthesis(translation)"
        />
      </li>
      <li
        v-for="commentary in commentaries"
        :key="commentary._id"
        class="bg-gray-50 p-2 relative border"
      >
        <a
          target="_blank"
          :href="`https://www.sefaria.org/${commentary.ref}`"
          class="bg-white px-4 rounded-full border flex hover:bg-blue-100 transition-colors items-center absolute -top-3 right-4"
        >
          <h3 class="font-bold text-sm me-2">
            {{ commentary.collectiveTitle.he }}
          </h3>
          <p class="text-xs text-gray-600">{{ commentary.sourceHeRef }}</p>
        </a>
        <p
          v-html="shrinkParenthesis(commentary.he)"
          class="mt-3 text-lg/none text-blue-900 font-siddur"
        />
      </li>
    </ul>
  </li>
</template>

<script setup lang="ts">
const props = defineProps<{
  link: Link;
  index: number;
  commentaries: Link[];
  translation: string;
  originalText: string;
}>();

defineEmits(["delete"]);

const shrinkParenthesis = (text: string | string[]) => {
  const str = Array.isArray(text) ? text.join('') : (text || '');
  return str.replace(/(\(.+?\))/g, '<span class="mekor">$1</span>');
};
</script>

<style>
.mekor {
  @apply text-gray-500 font-normal;
  font-size: 0.8em;
}
</style>
