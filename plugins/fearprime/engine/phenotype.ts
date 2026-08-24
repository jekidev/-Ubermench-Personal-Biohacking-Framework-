export type FollowUpOutcome = {
  timepoint: "24h" | "7d" | "30d";
  sameContext?: number;
  similarStimulus?: number;
  newContext?: number;
  fear?: number;
  threatExpectancy?: number;
  safetyExpectancy?: number;
  majorStressSinceEvent?: boolean;
  sleepQuality?: number;
};

export type LearningEventForPhenotype = {
  learningQuality?: {
    overall: "high_quality" | "acceptable" | "unclear" | "failed" | "safety_flag";
  };
  threatPre?: number;
  threatPost?: number;
  safetyPre?: number;
  safetyPost?: number;
  followUps?: FollowUpOutcome[];
};

export type PhenotypeSignal = {
  id: "F3" | "F4" | "F5" | "F6";
  confidence: number;
  rationale: string[];
  status: "low" | "possible" | "probable";
};

function clamp(value: number) {
  return Math.max(0, Math.min(1, value));
}

export function scorePhenotype(events: LearningEventForPhenotype[]): PhenotypeSignal[] {
  if (!events.length) {
    return [
      { id: "F3", confidence: 0, rationale: ["Ingen learning-events endnu"], status: "low" },
      { id: "F4", confidence: 0, rationale: ["Ingen follow-up data endnu"], status: "low" },
      { id: "F5", confidence: 0, rationale: ["Ingen context-generalisation data endnu"], status: "low" },
      { id: "F6", confidence: 0, rationale: ["Ingen relapse data endnu"], status: "low" }
    ];
  }

  const valid = events.filter((e) => e.learningQuality?.overall === "high_quality" || e.learningQuality?.overall === "acceptable");
  const failedAcquisition = events.filter((e) => e.learningQuality?.overall === "failed").length;

  const f3Confidence = clamp(failedAcquisition / Math.max(1, events.length));
  const sevenDay = valid.flatMap((e) => e.followUps ?? []).filter((f) => f.timepoint === "7d");
  const twentyFourHour = valid.flatMap((e) => e.followUps ?? []).filter((f) => f.timepoint === "24h");

  const f4Poor = sevenDay.filter((f) => typeof f.sameContext === "number" && f.sameContext < 50).length;
  const f4Confidence = clamp(f4Poor / Math.max(1, sevenDay.length));

  const generalisationCandidates = sevenDay.filter((f) => typeof f.sameContext === "number" && typeof f.newContext === "number");
  const f5Poor = generalisationCandidates.filter((f) => (f.sameContext ?? 0) - (f.newContext ?? 0) >= 20).length;
  const f5Confidence = clamp(f5Poor / Math.max(1, generalisationCandidates.length));

  const relapseCandidates = sevenDay.filter((f) => f.majorStressSinceEvent === true);
  const f6Poor = relapseCandidates.filter((f) => typeof f.fear === "number" && f.fear >= 7).length;
  const f6Confidence = clamp(f6Poor / Math.max(1, relapseCandidates.length));

  const signals: PhenotypeSignal[] = [
    { id: "F3", confidence: f3Confidence, rationale: [`${failedAcquisition}/${events.length} events markeret som acquisition failure`], status: f3Confidence >= 0.6 ? "probable" : f3Confidence >= 0.3 ? "possible" : "low" },
    { id: "F4", confidence: f4Confidence, rationale: [`${f4Poor}/${sevenDay.length} gyldige 7d follow-ups viser svag same-context retention`], status: f4Confidence >= 0.6 ? "probable" : f4Confidence >= 0.3 ? "possible" : "low" },
    { id: "F5", confidence: f5Confidence, rationale: [`${f5Poor}/${generalisationCandidates.length} follow-ups viser context-gap`], status: f5Confidence >= 0.6 ? "probable" : f5Confidence >= 0.3 ? "possible" : "low" },
    { id: "F6", confidence: f6Confidence, rationale: [`${f6Poor}/${relapseCandidates.length} stress-eksponerede follow-ups viser mulig return-of-fear`], status: f6Confidence >= 0.6 ? "probable" : f6Confidence >= 0.3 ? "possible" : "low" }
  ];

  if (twentyFourHour.length && !sevenDay.length) {
    const reason = "24h data findes, men der mangler 7d data; F4 må ikke konkluderes endnu.";
    signals[1].rationale.push(reason);
    signals[1].confidence = Math.min(signals[1].confidence, 0.2);
    signals[1].status = "low";
  }

  return signals;
}
