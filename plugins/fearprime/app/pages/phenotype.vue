<script setup lang="ts">
import { scoreAllPhenotypes } from "../../engine/phenotype-all";
import { nextBestTest } from "../../engine/next-best-test";
import { assessPTSDStatePhenotypes } from "../../engine/ptsd-state-engine";
import type { LearningEventForPhenotype } from "../../engine/phenotype";
import type { ClinicalStateSnapshot, DailyStateSnapshot, SleepSnapshot } from "../../domain/state";

const { loadEvents } = useFearprimeStore();
const signals = ref<ReturnType<typeof scoreAllPhenotypes>>([]);
const recommendation = ref<ReturnType<typeof nextBestTest> | null>(null);

function buildLearningInputs(events: Awaited<ReturnType<typeof loadEvents>>): LearningEventForPhenotype[] {
  return events.filter((event) => event.type === "learning_event").map((event) => {
    const payload = event.payload as Record<string, unknown>;
    const learningQuality = payload.learningQuality as LearningEventForPhenotype["learningQuality"];
    return {
      learningQuality,
      threatPre: typeof payload.threatPre === "number" ? payload.threatPre : undefined,
      threatPost: typeof payload.threatPost === "number" ? payload.threatPost : undefined,
      safetyPre: typeof payload.safetyPre === "number" ? payload.safetyPre : undefined,
      safetyPost: typeof payload.safetyPost === "number" ? payload.safetyPost : undefined,
      eventType: typeof payload.eventType === "string" ? payload.eventType : undefined,
      followUps: events
        .filter((followUp) => followUp.type === "follow_up" && String((followUp.payload as Record<string, unknown>).sourceEventId ?? "") === event.id && (followUp.payload as Record<string, unknown>).status === "completed")
        .map((followUp) => {
          const f = followUp.payload as Record<string, unknown>;
          return {
            timepoint: String(f.timepoint) as "24h" | "7d" | "30d",
            sameContext: typeof f.sameContextResponse === "number" ? f.sameContextResponse : undefined,
            similarStimulus: typeof f.similarStimulusResponse === "number" ? f.similarStimulusResponse : undefined,
            newContext: typeof f.newContextResponse === "number" ? f.newContextResponse : undefined,
            fear: typeof f.fear === "number" ? f.fear : undefined,
            threatExpectancy: typeof f.threatExpectancy === "number" ? f.threatExpectancy : undefined,
            safetyExpectancy: typeof f.safetyExpectancy === "number" ? f.safetyExpectancy : undefined,
            spontaneousRecovery: typeof f.spontaneousRecovery === "number" ? f.spontaneousRecovery : undefined,
            renewal: typeof f.renewal === "number" ? f.renewal : undefined,
            reinstatement: typeof f.reinstatement === "number" ? f.reinstatement : undefined,
            majorStressSinceEvent: f.majorStressSinceEvent === true,
            sleepQuality: typeof f.sleepQuality === "number" ? f.sleepQuality : undefined,
            confounded: f.confounded === true
          };
        })
    };
  });
}

function parseState(events: Awaited<ReturnType<typeof loadEvents>>) {
  const daily: DailyStateSnapshot[] = events.filter((event) => event.type === "daily_state").map((event) => {
    const p = event.payload as Record<string, unknown>;
    return {
      timestamp: event.timestamp,
      fear: Number(p.fear ?? 0), hypervigilance: Number(p.hypervigilance ?? 0), intrusion: Number(p.intrusion ?? 0), dissociation: Number(p.dissociation ?? 0),
      interoceptiveThreat: Number(p.interoceptiveThreat ?? p.interoceptive ?? 0), socialThreat: Number(p.socialThreat ?? p.social ?? 0), cognitiveClarity: Number(p.cognitiveClarity ?? 0), stress: Number(p.stress ?? 0), energy: Number(p.energy ?? 0),
      sleepQuality: typeof p.sleepQuality === "number" ? p.sleepQuality : undefined, nightmareBurden: typeof p.nightmareBurden === "number" ? p.nightmareBurden : undefined, function: typeof p.function === "number" ? p.function : undefined,
      confounded: p.confounded === true
    };
  });
  const sleep: SleepSnapshot[] = events.filter((event) => event.type === "sleep_record").map((event) => { const p = event.payload as Record<string, unknown>; return { date: String(p.date ?? event.timestamp.slice(0, 10)), durationHours: typeof p.durationHours === "number" ? p.durationHours : undefined, awakenings: typeof p.awakenings === "number" ? p.awakenings : undefined, nightmareBurden: typeof p.nightmareBurden === "number" ? p.nightmareBurden : undefined, subjectiveQuality: typeof p.subjectiveQuality === "number" ? p.subjectiveQuality : undefined, restoration: typeof p.restoration === "number" ? p.restoration : undefined, source: p.source === "wearable" ? "wearable" : p.source === "combined" ? "combined" : "manual" }; });
  const clinical: ClinicalStateSnapshot[] = events.filter((event) => event.type === "clinical_assessment").map((event) => { const p = event.payload as Record<string, unknown>; return { timestamp: event.timestamp, pcl5Total: p.instrument === "PCL5" ? Number(p.totalScore) : undefined, function: typeof p.function === "number" ? p.function : undefined, intrusionBurden: typeof p.intrusionBurden === "number" ? p.intrusionBurden : undefined, avoidance: typeof p.avoidance === "number" ? p.avoidance : undefined, hyperarousal: typeof p.hyperarousal === "number" ? p.hyperarousal : undefined }; });
  return { daily, sleep, clinical };
}

async function refresh() {
  const events = await loadEvents();
  const learning = buildLearningInputs(events);
  const base = scoreAllPhenotypes(learning);
  const state = parseState(events);
  const stateSignals = assessPTSDStatePhenotypes(state.daily, state.sleep, state.clinical);
  const merged = new Map(base.map((signal) => [signal.phenotype, signal]));
  for (const signal of stateSignals) merged.set(signal.phenotype, signal);
  signals.value = Array.from(merged.values()).sort((a, b) => a.phenotype.localeCompare(b.phenotype, undefined, { numeric: true }));
  recommendation.value = nextBestTest(signals.value, learning);
}

onMounted(refresh);

const statusLabel: Record<string, string> = { not_assessed: "Ikke målt", insufficient_data: "For lidt data", possible: "Mulig", probable: "Sandsynlig", supported: "Understøttet", resolved: "Ingen aktuel bottleneck-indikation" };
</script>

<template>
  <div class="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div><p class="text-sm text-muted">Fearprime / PTSD</p><h1 class="text-2xl font-semibold">Komplet phenotype-overblik</h1><p class="mt-1 text-sm text-muted">Learning, clinical state og søvn samles i én model. Et signal er en hypotese med usikkerhed — ikke en diagnose.</p></div>
      <UButton icon="i-lucide-refresh-cw" variant="soft" @click="refresh">Opdater</UButton>
    </div>

    <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <UCard v-for="signal in signals" :key="signal.phenotype">
        <div class="flex items-start justify-between gap-3"><div><p class="font-semibold">{{ signal.phenotype }}</p><p class="text-xs text-muted">{{ statusLabel[signal.status] ?? signal.status }}</p></div><span class="text-lg font-semibold">{{ Math.round(signal.confidence * 100) }}%</span></div>
        <p class="mt-3 text-xs leading-5 text-muted">{{ signal.rationale[0] }}</p>
      </UCard>
    </section>

    <UCard v-if="recommendation">
      <template #header><div class="flex items-center justify-between"><h2 class="font-semibold">Næste bedste test</h2><UBadge :color="recommendation.priority === 'high' ? 'primary' : 'neutral'" variant="subtle">{{ recommendation.priority }}</UBadge></div></template>
      <p class="text-lg font-semibold">{{ recommendation.testId }}</p><p class="mt-1 text-sm text-muted">{{ recommendation.rationale }}</p>
      <div class="mt-4 flex flex-wrap gap-2"><UBadge v-for="item in recommendation.requiredData" :key="item" variant="subtle">{{ item }}</UBadge></div>
    </UCard>
  </div>
</template>
