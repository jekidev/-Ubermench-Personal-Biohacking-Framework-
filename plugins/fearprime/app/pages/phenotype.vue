<script setup lang="ts">
import { scoreAllPhenotypes } from "../../engine/phenotype-all";
import { nextBestTest } from "../../engine/next-best-test";
import type { LearningEventForPhenotype } from "../../engine/phenotype";

const { loadEvents } = useFearprimeStore();
const signals = ref<ReturnType<typeof scoreAllPhenotypes>>([]);
const recommendation = ref<ReturnType<typeof nextBestTest> | null>(null);

function buildInputs(events: Awaited<ReturnType<typeof loadEvents>>): LearningEventForPhenotype[] {
  return events
    .filter((event) => event.type === "learning_event")
    .map((event) => {
      const payload = event.payload as Record<string, unknown>;
      const learningQuality = payload.learningQuality as { overall?: string } | undefined;
      const preState = payload.preState as Record<string, number> | undefined;
      const postState = payload.postState as Record<string, number> | undefined;
      return {
        learningQuality: learningQuality?.overall ? { overall: learningQuality.overall as LearningEventForPhenotype["learningQuality"]["overall"] } : undefined,
        threatPre: typeof payload.threatPre === "number" ? payload.threatPre : preState?.threatExpectancy,
        threatPost: typeof payload.threatPost === "number" ? payload.threatPost : postState?.threatExpectancy,
        safetyPre: typeof payload.safetyPre === "number" ? payload.safetyPre : preState?.safetyExpectancy,
        safetyPost: typeof payload.safetyPost === "number" ? payload.safetyPost : postState?.safetyExpectancy,
        eventType: typeof payload.eventType === "string" ? payload.eventType : undefined,
        followUps: events
          .filter((followUp) => followUp.type === "follow_up" && (followUp.payload as Record<string, unknown>).sourceEventId === event.id && (followUp.payload as Record<string, unknown>).status === "completed")
          .map((followUp) => {
            const f = followUp.payload as Record<string, unknown>;
            return {
              timepoint: f.timepoint as "24h" | "7d" | "30d",
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

async function refresh() {
  const events = await loadEvents();
  const inputs = buildInputs(events);
  signals.value = scoreAllPhenotypes(inputs);
  recommendation.value = nextBestTest(signals.value, inputs);
}

onMounted(refresh);

const statusLabel: Record<string, string> = {
  not_assessed: "Ikke målt",
  insufficient_data: "For lidt data",
  possible: "Mulig",
  probable: "Sandsynlig",
  supported: "Understøttet",
  resolved: "Ingen aktuel bottleneck-indikation"
};
</script>

<template>
  <div class="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="text-sm text-muted">Fearprime / PTSD</p>
        <h1 class="text-2xl font-semibold">Komplet phenotype-overblik</h1>
        <p class="mt-1 text-sm text-muted">F3–F6 har aktiv, deterministisk scoring. Øvrige domæner vises eksplicit som ikke målt, indtil der findes dedikerede valide data.</p>
      </div>
      <UButton icon="i-lucide-refresh-cw" variant="soft" @click="refresh">Opdater</UButton>
    </div>

    <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <UCard v-for="signal in signals" :key="signal.phenotype">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="font-semibold">{{ signal.phenotype }}</p>
            <p class="text-xs text-muted">{{ statusLabel[signal.status] ?? signal.status }}</p>
          </div>
          <span class="text-lg font-semibold">{{ Math.round(signal.confidence * 100) }}%</span>
        </div>
        <p class="mt-3 text-xs leading-5 text-muted">{{ signal.rationale[0] }}</p>
      </UCard>
    </section>

    <UCard v-if="recommendation">
      <template #header>
        <div class="flex items-center justify-between"><h2 class="font-semibold">Næste bedste test</h2><UBadge :color="recommendation.priority === 'high' ? 'primary' : 'neutral'" variant="subtle">{{ recommendation.priority }}</UBadge></div>
      </template>
      <p class="text-lg font-semibold">{{ recommendation.testId }}</p>
      <p class="mt-1 text-sm text-muted">{{ recommendation.rationale }}</p>
      <div class="mt-4 flex flex-wrap gap-2">
        <UBadge v-for="item in recommendation.requiredData" :key="item" variant="subtle">{{ item }}</UBadge>
      </div>
    </UCard>
  </div>
</template>
