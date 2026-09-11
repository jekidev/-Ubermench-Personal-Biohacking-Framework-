<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">News</p>
        <h1 class="mt-1 text-2xl font-semibold">Public headlines</h1>
        <p class="text-zinc-500">
          RSS/Atom from public agencies. Source name + published time + excerpt — no engagement ranking, no paywall scrape, no Sci-Hub.
          Research papers stay on Settings → Research (Europe PMC).
        </p>
      </div>
      <UButton :loading="news.loading.value" @click="news.refresh()">Refresh feeds</UButton>
    </div>

    <UAlert
      title="How this is sorted"
      description="Items are merged by published timestamp only. Each card shows the agency feed it came from. This is not a newsroom and not personalized."
      color="neutral"
      variant="subtle"
    />

    <UAlert
      v-if="news.error.value"
      title="Feed fetch"
      :description="news.error.value"
      color="warning"
      variant="subtle"
    />

    <UCard>
      <template #header><div class="font-medium">Sources</div></template>
      <ul class="grid gap-2 text-sm sm:grid-cols-2">
        <li v-for="source in news.digest.value.sources" :key="source.id">
          <div class="font-medium">{{ source.name }}</div>
          <div class="text-xs text-zinc-500">{{ source.agency }} · {{ source.topic }}</div>
        </li>
      </ul>
      <p v-if="news.digest.value.fetchedAt" class="mt-3 text-xs text-zinc-500">
        Fetched {{ formatTime(news.digest.value.fetchedAt) }} · ranking {{ news.digest.value.ranking }}
      </p>
    </UCard>

    <UCard v-if="news.digest.value.errors.length">
      <template #header><div class="font-medium">Source errors</div></template>
      <ul class="space-y-1 text-sm text-zinc-400">
        <li v-for="item in news.digest.value.errors" :key="item.sourceId">{{ item.sourceName }}: {{ item.message }}</li>
      </ul>
    </UCard>

    <UCard>
      <template #header>
        <div class="flex items-center justify-between gap-2">
          <span class="font-medium">Headlines</span>
          <span class="text-xs text-zinc-500">{{ news.digest.value.items.length }} items</span>
        </div>
      </template>
      <p v-if="!news.digest.value.items.length && !news.loading.value" class="text-sm text-zinc-500">
        No headlines yet. Refresh uses the Nuxt <code>/api/news/feeds</code> route so Android Chrome is not blocked by RSS CORS.
      </p>
      <ul v-else class="divide-y divide-zinc-800">
        <li v-for="item in news.digest.value.items" :key="item.id" class="py-3">
          <a :href="item.url" target="_blank" rel="noopener noreferrer" class="font-medium text-zinc-100 hover:underline">
            {{ item.title }}
          </a>
          <div class="mt-1 text-xs text-zinc-500">
            {{ item.sourceName }}
            <span v-if="item.publishedAt"> · {{ formatTime(item.publishedAt) }}</span>
          </div>
          <p v-if="item.excerpt" class="mt-1 text-sm text-zinc-400">{{ item.excerpt }}</p>
        </li>
      </ul>
    </UCard>

    <p class="text-xs text-zinc-500">
      Europe PMC / PaperQA are literature tools, not this page.
      <NuxtLink to="/settings?tab=research" class="underline">Open Research</NuxtLink>
    </p>
  </div>
</template>

<script setup lang="ts">
const news = useNewsFeeds()

onMounted(() => {
  void news.refresh()
})

function formatTime(value: string) {
  const time = Date.parse(value)
  return Number.isNaN(time) ? value : new Date(time).toLocaleString()
}
</script>
