import type { NextBestTestCandidate, FearPhenotypeId } from "../domain/ptsd";
import type { LearningEventForPhenotype, PhenotypeSignal } from "./phenotype";

export type TestRecommendation = NextBestTestCandidate & {
  testId:
  | "F3_ACQUISITION"
  | "F4_RETENTION_24H"
  | "F4_RETENTION_7D"
  | "F5_STIMULUS_GENERALISATION"
  | "F5_CONTEXT_TRANSFER"
  | "F6_SPONTANEOUS_RECOVERY"
  | "F6_RENEWAL"
  | "F6_REINSTATEMENT"
  | "F10_INTRUSION"
  | "F15_SLEEP_LEARNING";
  priority: "high" | "medium" | "low";
};

function candidate(
  testId: TestRecommendation["testId"],
  targets: FearPhenotypeId[],
  informationValue: number,
  rationale: string,
  requiredData: string[],
  priority: TestRecommendation["priority"]
): TestRecommendation {
  return { testId, targetPhenotypes: targets, informationValue, rationale, requiredData, clinicianReviewRequired: false, priority };
}

export function nextBestTest(signals: PhenotypeSignal[], events: LearningEventForPhenotype[]): TestRecommendation {
  const f3 = signals.find((signal) => signal.id === "F3");
  const f4 = signals.find((signal) => signal.id === "F4");
  const f5 = signals.find((signal) => signal.id === "F5");
  const f6 = signals.find((signal) => signal.id === "F6");

  const valid = events.filter((event) => event.learningQuality?.overall === "high_quality" || event.learningQuality?.overall === "acceptable");
  const followUps = valid.flatMap((event) => event.followUps ?? []);

  const count24 = followUps.filter((followUp) => followUp.timepoint === "24h" && !followUp.confounded).length;
  const count7 = followUps.filter((followUp) => followUp.timepoint === "7d" && !followUp.confounded).length;
  const stimulusData = followUps.filter((followUp) => followUp.timepoint === "7d" && !followUp.confounded && typeof followUp.sameContext === "number" && typeof followUp.similarStimulus === "number").length;
  const contextData = followUps.filter((followUp) => followUp.timepoint === "7d" && !followUp.confounded && typeof followUp.sameContext === "number" && typeof followUp.newContext === "number").length;

  if ((f3?.confidence ?? 0) >= 0.6) {
    return candidate(
      "F3_ACQUISITION",
      ["F3"],
      0.95,
      "Gentagne acquisition-events peger på F3; næste test skal reproducere acquisition under en standardiseret læringsbetingelse.",
      ["prediction lock", "pre/post threat", "pre/post safety", "learning quality"],
      "high"
    );
  }

  if (count24 > 0 && count7 < 2) {
    return candidate(
      "F4_RETENTION_7D",
      ["F4"],
      0.92,
      "24h-data findes, men 7d-datasættet er endnu utilstrækkeligt. Først skal langtidshukommelsen måles, før F4 kan styrkes.",
      ["7d same-context retrieval", "sleep around follow-up", "confound status"],
      "high"
    );
  }

  if ((f4?.confidence ?? 0) >= 0.3 && count7 >= 2) {
    return candidate(
      "F4_RETENTION_7D",
      ["F4"],
      0.88,
      "Der er gentagne 7d-data; en ny 7d retention måling er mest informativ for replication af F4-signalet.",
      ["7d same-context retrieval", "sleep", "confound status"],
      "high"
    );
  }

  if ((f5?.confidence ?? 0) >= 0.3 && stimulusData < 2) {
    return candidate(
      "F5_STIMULUS_GENERALISATION",
      ["F5"],
      0.84,
      "Der mangler tilstrækkelige stimulus-generalisation observationer; mål target → similar stimulus før en bredere konklusion.",
      ["same-context response", "similar-stimulus response"],
      "high"
    );
  }

  if ((f5?.confidence ?? 0) >= 0.3 && contextData < 2) {
    return candidate(
      "F5_CONTEXT_TRANSFER",
      ["F5"],
      0.82,
      "F5 er mulig; næste test skal skelne sikkerhedsretrieval i ny kontekst fra den oprindelige kontekst.",
      ["same-context response", "new-context response", "context similarity"],
      "high"
    );
  }

  if ((f6?.confidence ?? 0) >= 0.3) {
    const hasSpontaneous = followUps.some((followUp) => typeof followUp.spontaneousRecovery === "number");
    const hasRenewal = followUps.some((followUp) => typeof followUp.renewal === "number");
    const hasReinstatement = followUps.some((followUp) => typeof followUp.reinstatement === "number");

    if (!hasSpontaneous) return candidate("F6_SPONTANEOUS_RECOVERY", ["F6"], 0.78, "Return-of-fear er mulig, men spontaneous recovery er ikke separat målt.", ["time-delayed retrieval", "fear", "threat expectancy"], "medium");
    if (!hasRenewal) return candidate("F6_RENEWAL", ["F6"], 0.76, "Spontaneous recovery er dækket; næste informationsgivende test er context-specific renewal.", ["same cue", "new context", "safety expectancy"], "medium");
    if (!hasReinstatement) return candidate("F6_REINSTATEMENT", ["F6"], 0.68, "Reinstatement er endnu ikke karakteriseret. Fearprime registrerer kun naturligt forekommende relevant stressor-events.", ["naturalistic stressor", "post-event response", "recovery"], "medium");
  }

  return candidate(
    "F3_ACQUISITION",
    ["F3"],
    0.55,
    "Der er endnu ikke nok data til en specifik downstream-bottleneck. Start med en standardiseret acquisition-test og låst prediction.",
    ["prediction lock", "pre/post threat", "pre/post safety", "learning quality"],
    "medium"
  );
}
