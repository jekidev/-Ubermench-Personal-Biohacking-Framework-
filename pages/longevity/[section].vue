<template>
  <div class="space-y-6">
    <div><h1 class="text-2xl font-semibold">{{ title }}</h1><p class="text-zinc-500">Longevity module workspace.</p></div>
    <UCard><p class="text-sm text-zinc-500">This module is wired to the shared Longevity domain. Data views and evidence adapters can be added without changing the desktop shell.</p></UCard>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const title = computed(() => String(route.params.section).replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()))
</script>
