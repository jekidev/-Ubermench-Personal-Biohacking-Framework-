<script setup lang="ts">
import { confirmHighRiskFlags, requiresHighRiskConfirmation, screenProfileSafety } from '~/services/profile-safety'
import { screenInterventionSafety, type SafetySeverity } from '~/services/safety-engine'

const biology = usePersonalBiology()
const profile = biology.profile
const proposedIntervention = ref('')
const confirmed = ref(false)
const acknowledgement = ref('')

await biology.initialize()

const regimenFlags = computed(() => screenProfileSafety(profile.value))
const interventionFlags = computed(() => {
  if (!proposedIntervention.value.trim()) return []
  return screenInterventionSafety(proposedIntervention.value, profile.value.medications, profile.value.supplements)
    .filter((flag) => flag.code !== 'NO_KNOWN_RULE_TRIGGERED')
})
const needsConfirmation = computed(() => requiresHighRiskConfirmation(regimenFlags.value) || requiresHighRiskConfirmation(interventionFlags.value))

function badgeColor(severity: SafetySeverity) {
  if (severity === 'red') return 'error'
  if (severity === 'orange' || severity === 'yellow') return 'warning'
  return 'success'
}

function acknowledge() {
  const result = confirmHighRiskFlags([...regimenFlags.value, ...interventionFlags.value], confirmed.value)
  acknowledgement.value = result.reason
}
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-6">
    <div>
      <p class="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Safety</p>
      <h1 class="mt-2 text-3xl font-semibold">Safety screening</h1>
      <p class="mt-2 text-muted">Local interaction, duplicate-ingredient, cumulative-dose, contraindication and monitoring checks. This output is kept separate from efficacy ranking and is not a treatment approval.</p>
    </div>

    <UCard>
      <template #header><div class="font-medium">Current regimen</div></template>
      <div v-if="regimenFlags.length" class="space-y-3">
        <div v-for="(flag, index) in regimenFlags" :key="`${flag.code}-${index}`" class="rounded-lg border border-zinc-800 p-3">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="font-medium">{{ flag.title }}</div>
            <div class="flex flex-wrap gap-2">
              <UBadge v-if="flag.kind" variant="subtle">{{ flag.kind }}</UBadge>
              <UBadge :color="badgeColor(flag.severity)" variant="subtle">{{ flag.severity }}</UBadge>
            </div>
          </div>
          <p class="mt-2 text-sm text-muted">{{ flag.detail }}</p>
          <p v-if="flag.monitoringMetrics?.length" class="mt-1 text-xs text-zinc-400">Monitor: {{ flag.monitoringMetrics.join(', ') }}</p>
          <p class="mt-1 text-xs text-zinc-500">{{ flag.code }}{{ flag.requiresReview ? ' · review required' : '' }}{{ flag.provenance ? ` · ${flag.provenance}` : '' }}</p>
        </div>
      </div>
    </UCard>

    <UCard>
      <template #header><div class="font-medium">Proposed intervention check</div></template>
      <p class="text-sm text-muted">Screen a candidate against the current medication and supplement list. Safety stays outside intervention ranking.</p>
      <div class="mt-4 flex flex-wrap gap-2">
        <UInput v-model="proposedIntervention" class="min-w-64 flex-1" aria-label="Proposed intervention" placeholder="e.g. sleep aid, vitamin D3, vasodilator" />
      </div>
      <div v-if="interventionFlags.length" class="mt-4 space-y-3">
        <div v-for="(flag, index) in interventionFlags" :key="`${flag.code}-${index}`" class="rounded-lg border border-zinc-800 p-3 text-sm">
          <div class="flex items-center justify-between gap-2">
            <span class="font-medium">{{ flag.title }}</span>
            <UBadge :color="badgeColor(flag.severity)" variant="subtle">{{ flag.severity }}</UBadge>
          </div>
          <p class="mt-2 text-muted">{{ flag.detail }}</p>
        </div>
      </div>
      <p v-else-if="proposedIntervention.trim()" class="mt-4 text-sm text-muted">No built-in intervention rule triggered. This is not proof of safety.</p>
    </UCard>

    <UCard v-if="needsConfirmation">
      <template #header><div class="font-medium">High-risk confirmation</div></template>
      <p class="text-sm text-muted">Orange and red flags require an explicit acknowledgement. Confirming does not start, stop or titrate treatment.</p>
      <label class="mt-4 flex items-start gap-3 text-sm">
        <input v-model="confirmed" type="checkbox" class="mt-1">
        <span>I have reviewed these high-risk flags and will not change medication or supplement use without a qualified clinician.</span>
      </label>
      <UButton class="mt-4" :disabled="!confirmed" @click="acknowledge">Acknowledge safety review</UButton>
      <p v-if="acknowledgement" class="mt-3 text-sm text-muted">{{ acknowledgement }}</p>
    </UCard>

    <div class="flex flex-wrap gap-3">
      <NuxtLink to="/biology"><UButton variant="outline">Biology profile</UButton></NuxtLink>
      <NuxtLink to="/experiments"><UButton variant="outline">Experiments</UButton></NuxtLink>
    </div>
  </div>
</template>
