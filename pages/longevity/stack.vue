<template>
  <div class="space-y-6">
    <div>
      <p class="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Longevity</p>
      <h1 class="mt-1 text-2xl font-semibold">Stack</h1>
      <p class="text-zinc-500">Enter the supplements and medications you actually take. Stored on this phone. Safety screening uses this list.</p>
    </div>

    <div class="flex flex-wrap gap-2">
      <UButton to="/longevity/diet" variant="outline" size="sm">Diet protocol</UButton>
      <UButton to="/safety" variant="outline" size="sm">Safety screening</UButton>
      <UButton to="/biology" variant="outline" size="sm">Biology profile</UButton>
      <UButton to="/longevity/interventions" variant="outline" size="sm">Interventions</UButton>
    </div>

    <UCard>
      <template #header>
        <div class="flex flex-wrap items-center justify-between gap-2">
          <span class="font-medium">Add a supplement</span>
          <span class="text-xs text-zinc-500">{{ activeSupplementCount }} active</span>
        </div>
      </template>
      <div :key="supplementFormKey" class="grid gap-3 sm:grid-cols-2">
        <UFormField label="Name">
          <UInput v-model="supplementDraft.name" placeholder="e.g. Magnesium glycinate" />
        </UFormField>
        <UFormField label="Dose">
          <UInput v-model="supplementDraft.dose" placeholder="e.g. 200 mg" />
        </UFormField>
        <UFormField label="Frequency">
          <UInput v-model="supplementDraft.frequency" placeholder="e.g. nightly" />
        </UFormField>
        <UFormField label="Timing">
          <UInput v-model="supplementDraft.timing" placeholder="e.g. bedtime, with meals" />
        </UFormField>
        <UFormField label="Notes" class="sm:col-span-2">
          <UInput v-model="supplementDraft.notes" placeholder="Optional" />
        </UFormField>
      </div>
      <div class="mt-3 flex flex-wrap items-center gap-3">
        <UButton :disabled="!supplementDraft.name.trim()" @click="saveSupplement">Save supplement</UButton>
        <span v-if="savedKind === 'supplement'" class="text-sm text-zinc-400">Saved on this phone.</span>
      </div>
    </UCard>

    <UCard>
      <template #header>
        <div class="flex items-center justify-between gap-2">
          <span class="font-medium">Current stack</span>
          <span class="text-xs text-zinc-500">{{ profile.supplements.length }} items</span>
        </div>
      </template>
      <p v-if="!profile.supplements.length" class="text-sm text-zinc-500">No supplements yet. This is the standing stack used by chat, safety, and interventions.</p>
      <ul v-else class="divide-y divide-zinc-800 text-sm">
        <li v-for="item in profile.supplements" :key="item.id" class="flex flex-wrap items-center justify-between gap-2 py-3">
          <div>
            <div class="font-medium">{{ item.name }} <span v-if="!item.active" class="text-xs text-zinc-500">· paused</span></div>
            <div class="text-xs text-zinc-500">
              <span v-if="item.dose">{{ item.dose }}</span>
              <span v-if="item.frequency"> · {{ item.frequency }}</span>
              <span v-if="item.timing"> · {{ item.timing }}</span>
              <span v-if="item.notes"> · {{ item.notes }}</span>
            </div>
          </div>
          <div class="flex flex-wrap gap-2">
            <UButton size="xs" variant="outline" @click="toggleSupplement(item)">{{ item.active ? 'Pause' : 'Resume' }}</UButton>
            <UButton size="xs" color="neutral" variant="ghost" @click="biology.removeSupplement(item.id)">Remove</UButton>
          </div>
        </li>
      </ul>
    </UCard>

    <UCard>
      <template #header><div class="font-medium">Add a medication</div></template>
      <p class="text-sm text-zinc-500">Medications stay on the same local profile so interaction checks can see them.</p>
      <div :key="medicationFormKey" class="mt-3 grid gap-3 sm:grid-cols-2">
        <UFormField label="Name">
          <UInput v-model="medicationDraft.name" placeholder="e.g. Levothyroxine" />
        </UFormField>
        <UFormField label="Dose">
          <UInput v-model="medicationDraft.dose" placeholder="e.g. 50 mcg" />
        </UFormField>
        <UFormField label="Frequency">
          <UInput v-model="medicationDraft.frequency" placeholder="e.g. morning" />
        </UFormField>
        <UFormField label="Notes">
          <UInput v-model="medicationDraft.notes" placeholder="Optional" />
        </UFormField>
      </div>
      <div class="mt-3 flex flex-wrap items-center gap-3">
        <UButton :disabled="!medicationDraft.name.trim()" @click="saveMedication">Save medication</UButton>
        <span v-if="savedKind === 'medication'" class="text-sm text-zinc-400">Saved on this phone.</span>
      </div>
    </UCard>

    <UCard>
      <template #header>
        <div class="flex items-center justify-between gap-2">
          <span class="font-medium">Medications</span>
          <span class="text-xs text-zinc-500">{{ profile.medications.length }} items</span>
        </div>
      </template>
      <p v-if="!profile.medications.length" class="text-sm text-zinc-500">No medications recorded.</p>
      <ul v-else class="divide-y divide-zinc-800 text-sm">
        <li v-for="item in profile.medications" :key="item.id" class="flex flex-wrap items-center justify-between gap-2 py-3">
          <div>
            <div class="font-medium">{{ item.name }} <span v-if="!item.active" class="text-xs text-zinc-500">· paused</span></div>
            <div class="text-xs text-zinc-500">
              <span v-if="item.dose">{{ item.dose }}</span>
              <span v-if="item.frequency"> · {{ item.frequency }}</span>
              <span v-if="item.notes"> · {{ item.notes }}</span>
            </div>
          </div>
          <div class="flex flex-wrap gap-2">
            <UButton size="xs" variant="outline" @click="toggleMedication(item)">{{ item.active ? 'Pause' : 'Resume' }}</UButton>
            <UButton size="xs" color="neutral" variant="ghost" @click="biology.removeMedication(item.id)">Remove</UButton>
          </div>
        </li>
      </ul>
    </UCard>

    <UCard>
      <template #header>
        <div class="flex items-center justify-between gap-2">
          <span class="font-medium">Safety from this stack</span>
          <UButton to="/safety" size="xs" variant="outline">Open safety</UButton>
        </div>
      </template>
      <p v-if="!safetyFlags.length" class="text-sm text-zinc-500">No built-in flags yet. Adding a stack does not approve it.</p>
      <ul v-else class="space-y-2 text-sm">
        <li v-for="(flag, index) in safetyFlags" :key="`${flag.code}-${index}`" class="flex flex-wrap justify-between gap-2 border-b border-zinc-800 py-2">
          <span>{{ flag.title }}</span>
          <span class="text-xs text-zinc-500">{{ flag.severity }}</span>
        </li>
      </ul>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { MedicationRecord, SupplementRecord } from '~/types/biology'
import { createMedicationRecord, createSupplementRecord } from '~/services/regimen-editor'
import { screenProfileSafety } from '~/services/profile-safety'

const biology = usePersonalBiology()
const profile = biology.profile
await biology.initialize()

const savedKind = ref<'supplement' | 'medication' | ''>('')
const supplementFormKey = ref(0)
const medicationFormKey = ref(0)
const supplementDraft = reactive({
  name: '',
  dose: '',
  frequency: '',
  timing: '',
  notes: '',
})
const medicationDraft = reactive({
  name: '',
  dose: '',
  frequency: '',
  notes: '',
})

const activeSupplementCount = computed(() => profile.value.supplements.filter((item) => item.active).length)
const safetyFlags = computed(() => screenProfileSafety(profile.value))

function flash(kind: 'supplement' | 'medication') {
  savedKind.value = kind
  window.setTimeout(() => {
    if (savedKind.value === kind) savedKind.value = ''
  }, 1800)
}

async function saveSupplement() {
  const record = createSupplementRecord({ ...supplementDraft })
  await biology.saveSupplement(record)
  supplementDraft.name = ''
  supplementDraft.dose = ''
  supplementDraft.frequency = ''
  supplementDraft.timing = ''
  supplementDraft.notes = ''
  supplementFormKey.value += 1
  flash('supplement')
}

async function saveMedication() {
  const record = createMedicationRecord({ ...medicationDraft })
  await biology.saveMedication(record)
  medicationDraft.name = ''
  medicationDraft.dose = ''
  medicationDraft.frequency = ''
  medicationDraft.notes = ''
  medicationFormKey.value += 1
  flash('medication')
}

async function toggleSupplement(item: SupplementRecord) {
  await biology.saveSupplement({ ...item, active: !item.active })
}

async function toggleMedication(item: MedicationRecord) {
  await biology.saveMedication({ ...item, active: !item.active })
}
</script>
