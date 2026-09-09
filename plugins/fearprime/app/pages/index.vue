<script setup lang="ts">
import { nextBestTest } from "../../engine/next-best-test";
import { scoreAllPhenotypes } from "../../engine/phenotype-all";
import type { LearningEventForPhenotype } from "../../engine/phenotype";

const { listMemoryTargets, listPendingFollowUps, loadEvents } = useFearprimeStore();
const memoryCount = ref(0);
const followUpCount = ref(0);
const learningEvents = ref<LearningEventForPhenotype[]>([]);

const phenotypeSignals = computed(() => scoreAllPhenotypes(learningEvents.value));
const nextTest = computed(() => nextBestTest(phenotypeSignals.value, learningEvents.value));

const modules = computed(() => [
  { title: "Klinisk", value: "→", description: "PCL-5 / funktion", to: "/clinical", icon: "i-lucide-clipboard-check" },
  { title: "Memory targets", value: String(memoryCount.value), description: "Threat / safety targets", to: "/memory", icon: "i-lucide-brain" },
  { title: "Learning events", value: String(learningEvents.value.length), description: "Prediction → outcome", to: "/learning", icon: "i-lucide-flask-conical" },
  { title: "Follow-ups", value: String(followUpCount.value), description: "24h / 7d retention", to: "/followups", icon: "i-lucide-clock-3" }
]);

function followUpsForEvent(events: Awaited<ReturnType<typeof loadEvents>>, eventId: string) {
  return events
    .filter((event) => event.type === "follow_up")
    .filter((event) => String((event.payload as Record<string, unknown>).sourceEventId ?? "") === eventId)
    .filter((event) => (event.payload as Record<string, unknown>).status === "completed")
    .map((event) => {
      const payload = event.payload as Record<string, unknown>;
      return {
        timepoint: String(payload.timepoint) as "24h" | "7d" | "30d",
        sameContext: typeof payload.sameContextResponse === "number" ? payload.sameContextResponse : undefined,
        similarStimulus: typeof payload.similarStimulusResponse === "number" ? payload.similarStimulusResponse : undefined,
        newContext: typeof payload.newContextResponse === "number" ? payload.newContextResponse : undefined,
        fear: typeof payload.fear === "number" ? payload.fear : undefined,
        threatExpectancy: typeof payload.threatExpectancy === "number" ? payload.threatExpectancy : undefined,
        safetyExpectancy: typeof payload.safetyExpectancy === "number" ? payload.safetyExpectancy : undefined,
        spontaneousRecovery: typeof payload.spontaneousRecovery === "number" ? payload.spontaneousRecovery : undefined,
        renewal: typeof payload.renewal === "number" ? payload.renewal : undefined,
        reinstatement: typeof payload.reinstatement === "number" ? payload.reinstatement : undefined,
        majorStressSinceEvent: payload.majorStressSinceEvent === true,
        sleepQuality: typeof payload.sleepQuality === "number" ? payload.sleepQuality : undefined,
        confounded: payload.confounded === true
      };
    });
}

onMounted(async () => {
  memoryCount.value = (await listMemoryTargets()).length;
  followUpCount.value = (await listPendingFollowUps()).length;
  const events = await loadEvents();

  learningEvents.value = events
    .filter((event) => event.type === "learning_event")
    .map((event) => {
      const payload = event.payload as Record<string, unknown>;
      const learningQuality = payload.learningQuality as LearningEventForPhenotype["learningQuality"];
      return {
        learningQuality,
        threatPre: typeof payload.threatPre === "number" ? payload.threatPre : undefined,
        threatPost: typeof payload.threatPost === "number" ? payload.threatPost : undefined,
        safetyPre: typeof payload.safetyPre === "number" ? payload.safetyPre : undefined,
        safetyPost: typeof payload.safetyPost === "number" ? payload.safetyPost : undefined,
        eventType: typeof payload.eventType === "string" ? payload.eventType : undefined,
        followUps: followUpsForEvent(events, event.id)
      } satisfies LearningEventForPhenotype;
    });
});
</script>

<template>
  <div class="min-h-screen bg-default text-default">
    <header class="border-b border-default/60 bg-elevated/80 backdrop-blur">
      <div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <div><p class="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Ubermench Framework</p><h1 class="text-xl font-semibold">Fearprime</h1></div>
        <div class="flex items-center gap-2"><UBadge color="primary" variant="subtle">Nuxt 4</UBadge><UBadge color="neutral" variant="subtle">Tauri 2</UBadge></div>
      </div>
    </header>

    <main class="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <section class="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <UCard><div class="space-y-4"><div><p class="text-sm text-muted">PTSD / fear-learning workspace</p><h2 class="mt-1 text-2xl font-semibold">Måling → hypotese → test → outcome</h2></div><p class="max-w-3xl text-sm leading-6 text-muted">Kliniske outcomes, memory learning, søvn, intrusioner og interventioner holdes adskilt, så hvert resultat kan fortolkes ud fra sin egen tidsskala.</p><div class="flex flex-wrap gap-2"><UButton to="/phenotype" icon="i-lucide-chart-no-axes-combined">Phenotype</UButton><UButton to="/clinical" color="neutral" variant="soft" icon="i-lucide-clipboard-check">Klinisk</UButton><UButton to="/intrusions" color="neutral" variant="soft" icon="i-lucide-eye">Intrusion</UButton><UButton to="/sleep" color="neutral" variant="soft" icon="i-lucide-moon">Søvn</UButton></div></div></UCard>
        <UCard><div class="space-y-3"><p class="text-sm text-muted">Næste bedste test</p><p class="text-lg font-semibold">{{ nextTest.testId }}</p><p class="text-sm text-muted">{{ nextTest.rationale }}</p><UBadge :color="nextTest.priority === 'high' ? 'primary' : 'neutral'" variant="subtle">{{ nextTest.priority }}</UBadge></div></UCard>
      </section>

      <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><NuxtLink v-for="item in modules" :key="item.title" :to="item.to" class="block"><UCard class="h-full transition hover:-translate-y-0.5 hover:shadow-md"><div class="flex items-start justify-between"><div><p class="text-sm text-muted">{{ item.title }}</p><p class="mt-2 text-3xl font-semibold">{{ item.value }}</p><p class="mt-1 text-xs text-muted">{{ item.description }}</p></div><UIcon :name="item.icon" class="size-5 text-muted" /></div></UCard></NuxtLink></section>

      <section class="grid gap-4 lg:grid-cols-2">
        <UCard><template #header><div class="flex items-center justify-between"><h2 class="font-semibold">PTSD phenotype</h2><UButton to="/phenotype" size="xs" variant="ghost">Åbn</UButton></div></template><div class="grid gap-2 sm:grid-cols-2"><NuxtLink v-for="item in [['F3','Acquisition'],['F4','Consolidation'],['F5','Generalisation'],['F6','Return-of-fear'],['F10','Intrusion'],['F15','Sleep']]" :key="item[0]" to="/phenotype" class="rounded-lg border border-default p-3 text-sm transition hover:bg-elevated"><span class="font-semibold">{{ item[0] }}</span><span class="ml-2 text-muted">{{ item[1] }}</span></NuxtLink></div></UCard>
        <UCard><template #header><h2 class="font-semibold">Safety boundary</h2></template><div class="space-y-2 text-sm text-muted"><p>Eksperimentelle flows kan sættes på pause ved sikkerhedssignaler.</p><p>Fearprime ordinerer, doserer, kombinerer eller eskalerer ikke medicin autonomt.</p><p>Wearables er støttedata; kliniske outcomes og funktion vægtes højere.</p></div></UCard>
      </section>
    </main>
  </div>
</template>
