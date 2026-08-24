<script setup lang="ts">
const metrics = [
  ['Blood pressure', 'No baseline', 'cardiovascular'],
  ['Resting heart rate', 'No baseline', 'cardiovascular'],
  ['ApoB', 'No baseline', 'metabolic'],
  ['HbA1c', 'No baseline', 'metabolic'],
  ['eGFR / ACR', 'No baseline', 'organ health'],
  ['Fitness', 'No baseline', 'fitness'],
  ['Sleep / HRV', 'No baseline', 'recovery'],
  ['Safety flags', '0', 'safety'],
] as const
</script>

<template>
  <section class="page">
    <LongevityNav />

    <header>
      <p class="eyebrow">Personal Biohacking Framework</p>
      <h1>Longevity</h1>
      <p>Evidence-weighted monitoring for healthspan, disease prevention and long-term resilience.</p>
    </header>

    <div class="grid">
      <NuxtLink v-for="([label, value, category]) in metrics" :key="label" class="card" :to="category === 'safety' ? '/longevity' : `/longevity/${category.replace(' ', '-')}`">
        <span class="muted">{{ label }}</span>
        <strong>{{ value }}</strong>
      </NuxtLink>
    </div>

    <section class="next-data">
      <h2>Next-best data</h2>
      <p>Prioritize measurement quality before adding another intervention.</p>
      <div class="actions">
        <NuxtLink to="/longevity/bloods">Add blood test</NuxtLink>
        <NuxtLink to="/longevity/genetics">Upload DNA</NuxtLink>
      </div>
    </section>
  </section>
</template>

<style scoped>
.page { max-width: 1100px; margin: 0 auto; padding: 1.5rem; }
.eyebrow { opacity: .65; font-size: .8rem; margin: 0 0 .3rem; }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: .9rem; margin: 1.5rem 0; }
.card, .next-data { border: 1px solid #d7dce3; border-radius: .85rem; padding: 1rem; text-decoration: none; color: inherit; }
.card:hover { border-color: #9aa4b2; }
.card strong { display: block; margin-top: .55rem; font-size: 1.5rem; }
.muted { opacity: .65; }
.next-data { margin-top: 1rem; }
.actions { display: flex; gap: .7rem; flex-wrap: wrap; }
.actions a { padding: .55rem .8rem; border: 1px solid #b9c0ca; border-radius: .6rem; text-decoration: none; }
</style>
