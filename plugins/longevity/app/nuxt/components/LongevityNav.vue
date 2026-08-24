<script setup lang="ts">
const links = [
  ['Overview', '/longevity'],
  ['Bloods', '/longevity/bloods'],
  ['Genetics', '/longevity/genetics'],
  ['Cardiovascular', '/longevity/cardiovascular'],
  ['Metabolic', '/longevity/metabolic'],
  ['Fitness', '/longevity/fitness'],
  ['Recovery', '/longevity/recovery'],
  ['Organ Health', '/longevity/organ-health'],
  ['Prevention', '/longevity/prevention'],
  ['Interventions', '/longevity/interventions'],
  ['Evidence', '/longevity/evidence'],
] as const
</script>

<template>
  <nav aria-label="Longevity navigation" class="longevity-nav">
    <NuxtLink v-for="([label, to]) in links" :key="to" :to="to">
      {{ label }}
    </NuxtLink>
  </nav>
</template>

<style scoped>
.longevity-nav {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  padding: 0.75rem 0;
}
.longevity-nav a {
  padding: 0.45rem 0.7rem;
  border: 1px solid #d7dce3;
  border-radius: 0.6rem;
  text-decoration: none;
}
</style>
