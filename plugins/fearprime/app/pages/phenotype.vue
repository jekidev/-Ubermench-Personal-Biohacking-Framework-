<script setup lang="ts">
import { scorePhenotype } from "../../engine/phenotype";
import { nextBestTest } from "../../engine/next-best-test";

const { loadEvents } = useFearprimeStore();
const signals = ref<ReturnType<typeof scorePhenotype>>([]);
const recommendation = ref<ReturnType<typeof nextBestTest> | null>(null);

function buildInputs(events: Awaited<ReturnType<typeof loadEvents>>) {
  return events
    .filter((event) => event.type === "learning_event")
    .map((event) => {
      const payload = event.payload as Record<string, any>;
      const derived = (payload.derived ?? {}) as Record<string, any>;
      const learningQuality = payload.learningQuality as { overall?: string } | undefined;
      const preState = payload.preState as Record<string, number> | undefined;
      const postState = payload.postState as Record<string, number> | undefined;
      return {
        learningQuality: learningQuality?.overall ? { overall: learningQuality.overall as any } : undefined,
        threatPre: typeof payload.threatPre === "number" ? payload.threatPre : preState?.threatExpectancy,
        threatPost: typeof payload.threatPost === "number" ? payload.threatPost : postState?.threatExpectancy,
        safetyPre: typeof payload.safetyPre === "number" ? payload.safetyPre : preState?.safetyExpectancy,
        safetyPost: typeof payload.safetyPost === "number" ? payload.safetyPost : postState?.safetyExpectancy,
        eventType: typeof payload.eventType === "string" ? payload.eventType : undefined,
        followUps: events
          .filter((followUp) => followUp.type === "follow_up" && (followUp.payload as any).sourceEventId === event.id && (followUp.payload as any).status === "completed")
          .map((followUp) => {
            const f = followUp.payload as Record<string, any>;
            return {
              timepoint: f.timepoint,
              sameContext: f.sameContextResponse,
              similarStimulus: f.similarStimulusResponse,
              newContext: f.newContextResponse,
              fear: f.fear,
              threatExpectancy: f.threatExpectancy,
              safetyExpectancy: f.safetyExpectancy,
              spontaneousRecovery: f.spontaneousRecovery,
              renewal: f.renewal,
              reinstatement: f.reinstatement,
              majorStressSinceEvent: f.majorStressSinceEvent,
              sleepQuality: f.sleepQuality,
              confounded: f.confounded
            };
          })
      };
    });
}

async function refresh() {
  const events = await loadEvents();
  const inputs = buildInputs(events);
  signals.value = scorePhenotype(inputs);
  recommendation.value = nextBestTest(signals.value, inputs);
}

onMounted(refresh);
</script>

<template>
  <div class="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="text-sm text-muted">Fearprime / PTSD</p>
        <h1 class="text-2xl font-semibold">Phenotype-motor</h1>
        <p class="mt-1 text-sm text-muted">F3–F6 beregnes fra de faktiske lokale learning-events. Ingen klinisk diagnose eller autonom behandlingsbeslutning.</p>
      </div>
      <UButton icon="i-lucide-refresh-cw" variant="soft" @click="refresh">Opdater</UButton>
    </div>

    <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <UCard v-for="signal in signals" :key="signal.phenotype">
        <div class="flex items-center justify-between">
          <div>
            <p class="font-semibold">{{ signal.phenotype }}</p>
            <p class="text-xs text-muted">{{ signal.status }}</p>
          </div>
          <span class="text-xl font-semibold">{{ Math.round(signal.confidence * 100) }}%</span>
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
