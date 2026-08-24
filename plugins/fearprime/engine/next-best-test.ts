import type { LearningEventForPhenotype, PhenotypeSignal } from "./phenotype";

export type TestRecommendation = {
  testId: "F3_ACQUISITION" | "F4_RETENTION_7D" | "F5_CONTEXT_TRANSFER" | "F6_RETURN_OF_FEAR";
  priority: "high" | "medium" | "low";
  rationale: string;
  requiredData: string[];
};

export function nextBestTest(signals: PhenotypeSignal[], events: LearningEventForPhenotype[]): TestRecommendation {
  const f3 = signals.find((s) => s.id === "F3");
  const f4 = signals.find((s) => s.id === "F4");
  const f5 = signals.find((s) => s.id === "F5");
  const f6 = signals.find((s) => s.id === "F6");

  if (f3?.confidence >= 0.6) {
    return {
      testId: "F3_ACQUISITION",
      priority: "high",
      rationale: "Acquisition ser ud til at være den stærkeste aktuelle kandidat til bottleneck.",
      requiredData: ["pre/post threat expectancy", "safety expectancy", "learning quality"]
    };
  }

  if ((f4?.confidence ?? 0) >= 0.3 || events.some((e) => (e.followUps ?? []).some((f) => f.timepoint === "24h"))) {
    return {
      testId: "F4_RETENTION_7D",
      priority: "high",
      rationale: "Immediate learning kan ikke stå alene; 7-dages retention er nødvendig for at teste consolidation.",
      requiredData: ["same-context 7d retrieval", "sleep around follow-up", "major stress since event"]
    };
  }

  if ((f5?.confidence ?? 0) >= 0.3) {
    return {
      testId: "F5_CONTEXT_TRANSFER",
      priority: "high",
      rationale: "Same-context og new-context retrieval ser ud til at divergere; næste test bør målrette generalisation.",
      requiredData: ["same-context score", "similar-stimulus score", "new-context score"]
    };
  }

  if ((f6?.confidence ?? 0) >= 0.3) {
    return {
      testId: "F6_RETURN_OF_FEAR",
      priority: "medium",
      rationale: "Der er tegn på mulig return-of-fear; de relevante triggerformer skal adskilles.",
      requiredData: ["stress/context change", "fear", "threat expectancy", "recovery"]
    };
  }

  return {
    testId: "F3_ACQUISITION",
    priority: "medium",
    rationale: "Der er endnu for lidt valide data til at vælge en specifik downstream bottleneck; start med en standardiseret acquisition-test.",
    requiredData: ["prediction lock", "pre/post threat", "pre/post safety", "learning quality"]
  };
}
