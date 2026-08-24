<script setup lang="ts">
import { ref } from 'vue'

const selectedFile = ref<File | null>(null)
const imported = ref(false)

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  selectedFile.value = input.files?.[0] ?? null
  imported.value = false
}

function confirmImport() {
  if (selectedFile.value) imported.value = true
}
</script>

<template>
  <section class="page">
    <LongevityNav />

    <header class="header">
      <div>
        <p class="eyebrow">Longevity / Genetics</p>
        <h1>Genetic profile</h1>
        <p>Keep raw genotype data separate from evidence-based interpretation.</p>
      </div>
      <label class="upload">
        Upload DNA
        <input type="file" accept=".vcf,.csv,.tsv,.json,.pdf,.txt,.zip" @change="onFileChange" />
      </label>
    </header>

    <div class="grid">
      <article class="card">
        <span class="muted">Raw variants</span>
        <strong>—</strong>
      </article>
      <article class="card">
        <span class="muted">Evidence-backed findings</span>
        <strong>—</strong>
      </article>
      <article class="card">
        <span class="muted">Evidence coverage</span>
        <strong>—</strong>
      </article>
      <article class="card">
        <span class="muted">Last reviewed</span>
        <strong>—</strong>
      </article>
    </div>

    <article v-if="selectedFile" class="preview">
      <h2>Import review</h2>
      <dl>
        <div><dt>File</dt><dd>{{ selectedFile.name }}</dd></div>
        <div><dt>Size</dt><dd>{{ selectedFile.size.toLocaleString() }} bytes</dd></div>
        <div><dt>Privacy</dt><dd>Local-only by default</dd></div>
        <div><dt>Status</dt><dd>{{ imported ? 'Confirmed' : 'Needs confirmation' }}</dd></div>
      </dl>
      <p class="muted">A future evidence refresh may change an interpretation, but it must never modify the original genotype record.</p>
      <button type="button" :disabled="imported" @click="confirmImport">{{ imported ? 'Imported' : 'Confirm import' }}</button>
    </article>
  </section>
</template>

<style scoped>
.page { max-width: 1100px; margin: 0 auto; padding: 1.5rem; }
.header { display: flex; justify-content: space-between; gap: 1rem; align-items: flex-start; }
.eyebrow { opacity: .65; font-size: .8rem; margin: 0 0 .3rem; }
.upload { display: inline-flex; padding: .65rem .85rem; border: 1px solid #b9c0ca; border-radius: .65rem; cursor: pointer; }
.upload input { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: .9rem; margin: 1.5rem 0; }
.card, .preview { border: 1px solid #d7dce3; border-radius: .85rem; padding: 1rem; }
.card strong { display: block; font-size: 1.7rem; margin-top: .5rem; }
.muted { opacity: .65; }
dl { margin: 1rem 0; }
dl > div { display: flex; gap: 1rem; padding: .35rem 0; }
dt { min-width: 110px; font-weight: 600; } dd { margin: 0; }
button { padding: .55rem .8rem; border-radius: .6rem; border: 1px solid #b9c0ca; }
</style>
