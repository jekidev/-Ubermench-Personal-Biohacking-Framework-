<script setup lang="ts">
import { ref } from 'vue'

interface BloodCard {
  name: string
  latest: string
  unit: string
  trend: 'up' | 'down' | 'stable' | 'unknown'
  date: string
}

const selectedFile = ref<File | null>(null)
const previewVisible = ref(false)

const cards: BloodCard[] = [
  { name: 'ApoB', latest: '—', unit: 'g/L', trend: 'unknown', date: 'No data' },
  { name: 'LDL-C', latest: '—', unit: 'mmol/L', trend: 'unknown', date: 'No data' },
  { name: 'HbA1c', latest: '—', unit: 'mmol/mol', trend: 'unknown', date: 'No data' },
  { name: 'CRP', latest: '—', unit: 'mg/L', trend: 'unknown', date: 'No data' },
  { name: 'Creatinine', latest: '—', unit: 'µmol/L', trend: 'unknown', date: 'No data' },
  { name: 'eGFR', latest: '—', unit: 'mL/min/1.73m²', trend: 'unknown', date: 'No data' },
]

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  selectedFile.value = input.files?.[0] ?? null
  previewVisible.value = Boolean(selectedFile.value)
}
</script>

<template>
  <section class="page">
    <LongevityNav />

    <header class="header">
      <div>
        <p class="eyebrow">Longevity / Bloods</p>
        <h1>Blood biomarker timeline</h1>
        <p>Import new laboratory reports without overwriting historical observations.</p>
      </div>
      <label class="upload">
        Add blood test
        <input type="file" accept=".pdf,.csv,.tsv,.json" @change="onFileChange" />
      </label>
    </header>

    <div class="grid">
      <article v-for="card in cards" :key="card.name" class="card">
        <div class="card-head">
          <strong>{{ card.name }}</strong>
          <span>{{ card.unit }}</span>
        </div>
        <div class="value">{{ card.latest }}</div>
        <div class="muted">{{ card.date }}</div>
      </article>
    </div>

    <article v-if="previewVisible" class="preview">
      <h2>Import preview</h2>
      <p><strong>Source:</strong> {{ selectedFile?.name }}</p>
      <p class="muted">The parser must show collection date, laboratory, units, reference intervals, confidence and source location before confirmation.</p>
      <div class="actions">
        <button type="button" @click="previewVisible = false">Cancel</button>
        <button type="button" disabled>Confirm after extraction</button>
      </div>
    </article>
  </section>
</template>

<style scoped>
.page { max-width: 1100px; margin: 0 auto; padding: 1.5rem; }
.header { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; }
.eyebrow { font-size: 0.8rem; opacity: 0.65; margin: 0 0 .3rem; }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: .9rem; margin-top: 1.5rem; }
.card, .preview { border: 1px solid #d7dce3; border-radius: .85rem; padding: 1rem; }
.card-head { display: flex; justify-content: space-between; gap: .5rem; }
.card-head span, .muted { opacity: .65; }
.value { font-size: 2rem; font-weight: 650; margin: .75rem 0 .2rem; }
.upload { display: inline-flex; align-items: center; cursor: pointer; padding: .65rem .85rem; border: 1px solid #b9c0ca; border-radius: .65rem; }
.upload input { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
.preview { margin-top: 1.25rem; }
.actions { display: flex; gap: .6rem; margin-top: 1rem; }
button { padding: .55rem .8rem; border-radius: .6rem; border: 1px solid #b9c0ca; }
</style>
