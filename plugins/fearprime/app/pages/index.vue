<script setup lang="ts">
import { nextBestTest } from "../../engine/next-best-test";
import { scorePhenotype, type LearningEventForPhenotype } from "../../engine/phenotype";

const { listMemoryTargets, listPendingFollowUps, loadEvents } = useFearprimeStore();
const memoryCount = ref(0);
const followUpCount = ref(0);
const learningEvents = ref<LearningEventForPhenotype[]>([]);

const phenotypeSignals = computed(() => scorePhenotype(learningEvents.value));
const nextTest = computed(() => nextBestTest(phenotypeSignals.value, learningEvents.value));

const modules = computed(() => [
  { title: "Daglig state", value: "—", description: "Baseline og løbende state", to: "/state" },
  { title: "Memory targets", value: String(memoryCount.value), description: "Aktive targets", to: "/memory" },
  { title: "Learning events", value: String(learningEvents.value.length), description: "Prediction → outcome", to: "/learning" },
  { title: "Follow-ups", value: String(followUpCount.value), description: "Afventer måling", to: "/followups" }
]);

function phenotypeLabel(status: "low" | "possible" | "probable") {
  if (status === "probable") return "Sandsynlig";
  if (status === "possible") return "Mulig";
  return "Ingen tilstrækkelige data";
}

onMounted(async () => {
  memoryCount.value = (await listMemoryTargets()).length;
  followUpCount.value = (await listPendingFollowUps()).length;

  const events = await loadEvents();
  learningEvents.value = events
    .filter((event) => event.type === "learning_event")
    .map((event) => {
      const payload = event.payload as Record<string, unknown>;
      const derived = (payload.derived ?? {}) as Record<string, unknown>;
      const learningQuality = (payload.learningQuality ?? {}) as LearningEventForPhenotype["learningQuality"];
      return {
        learningQuality,
        threatPre: Number(payload.threatPre ?? 0),
        threatPost: Number(payload.threatPost ?? 0),
        safetyPre: Number(payload.safetyPre ?? 0),
        safetyPost: Number(payload.safetyPost ?? 0),
        followUps: events
          .filter((followUp) => followUp.type === "follow_up" && (followUp.payload as Record<string, unknown>).sourceEventId === event.id && (followUp.payload as Record<string, unknown>).status === "completed")
          .map((followUp) => (followUp.payload as Record<string, unknown>).outcome as Record<string, unknown> | undefined)
          .filter((outcome): outcome is Record<string, unknown> => Boolean(outcome))
          .map((outcome) => ({
            timepoint: String(outcome.timepoint) as "24h" | "7d" | "30d",
            sameContext: typeof outcome.sameContext === "number" ? outcome.sameContext : undefined,
            similarStimulus: typeof outcome.similarStimulus === "number" ? outcome.similarStimulus : undefined,
            newContext: typeof outcome.newContext === "number" ? outcome.newContext : undefined,
            fear: typeof outcome.fear === "number" ? outcome.fear : undefined,
            threatExpectancy: typeof outcome.threatExpectancy === "number" ? outcome.threatExpectancy : undefined,
            safetyExpectancy: typeof outcome.safetyExpectancy === "number" ? outcome.safetyExpectancy : undefined,
            majorStressSinceEvent: outcome.majorStressSinceEvent === true,
            sleepQuality: typeof outcome.sleepQuality === "number" ? outcome.sleepQuality : undefined
          }))
      } satisfies LearningEventForPhenotype;
    });
});
</script>

<template>
  <div class="min-h-screen bg-default text-default">
    <header class="border-b border-default/60 bg-elevated/80 backdrop-blur"><div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8"><div><p class="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Ubermench Framework</p><h1 class="text-xl font-semibold">Fearprime</h1></div><UBadge color="primary" variant="subtle">Nuxt 4 · Tauri 2</UBadge></div></header>
    <main class="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <section class="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <UCard><div class="space-y-4"><div><p class="text-sm text-muted">Nuværende fokus</p><h2 class="mt-1 text-2xl font-semibold">Fear learning &amp; retention</h2></div><p class="max-w-2xl text-sm leading-6 text-muted">Fearprime modellerer acquisition, extinction, consolidation, retrieval, generalisation og relapse som målbare learning-events. Interventioner holdes adskilt fra hypoteser.</p><div class="flex flex-wrap gap-2"><UButton to="/memory" icon="i-lucide-brain">Memory target</UButton><UButton to="/learning" color="neutral" variant="soft" icon="i-lucide-flask-conical">Learning event</UButton><UButton to="/state" color="neutral" variant="soft" icon="i-lucide-activity">Daglig state</UButton></div></div></UCard>
        <UCard><div class="space-y-3"><p class="text-sm text-muted">Next-best-test</p><p class="text-lg font-semibold">{{ nextTest.testId }}</p><p class="text-sm text-muted">{{ nextTest.rationale }}</p><UBadge :color="nextTest.priority === 'high' ? 'primary' : 'neutral'" variant="subtle">{{ nextTest.priority }}</UBadge></div></UCard>
      </section>
      <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><NuxtLink v-for="item in modules" :key="item.title" :to="item.to" class="block"><UCard class="h-full transition hover:-translate-y-0.5 hover:shadow-md"><p class="text-sm text-muted">{{ item.title }}</p><p class="mt-2 text-3xl font-semibold">{{ item.value }}</p><p class="mt-1 text-xs text-muted">{{ item.description }}</p></UCard></NuxtLink></section>
      <section class="grid gap-4 lg:grid-cols-2">
        <UCard><template #header><div class="flex items-center justify-between"><h2 class="font-semibold">State machine</h2><UBadge variant="subtle">offline-first</UBadge></div></template><div class="grid gap-2 sm:grid-cols-3"><NuxtLink v-for="step in [['Memory','/memory'],['Learning','/learning'],['Follow-up','/followups']]" :key="step[0]" :to="step[1]" class="rounded-lg border border-default p-3 text-sm transition hover:bg-elevated">{{ step[0] }}</NuxtLink></div></UCard>
        <UCard><template #header><h2 class="font-semibold">Phenotype-status</h2></template><div class="space-y-3 text-sm"><div v-for="signal in phenotypeSignals" :key="signal.id" class="flex items-center justify-between gap-3"><div><span>{{ signal.id }}</span><span class="ml-2 text-muted">{{ signal.rationale[0] }}</span></div><UBadge :color="signal.status === 'probable' ? 'primary' : 'neutral'" variant="subtle">{{ phenotypeLabel(signal.status) }} · {{ signal.confidence.toFixed(2) }}</UBadge></div></div></UCard>
      </section>
    </main>
  </div>
</template>
