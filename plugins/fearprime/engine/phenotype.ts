import type { FearPhenotypeId, PhenotypeAssessment, PhenotypeStatus } from "../domain/ptsd";

export type FollowUpOutcome = {
  timepoint: "24h" | "7d" | "30d";
  sameContext?: number;
  similarStimulus?: number;
  newContext?: number;
  fear?: number;
  threatExpectancy?: number;
  safetyExpectancy?: number;
  spontaneousRecovery?: number;
  renewal?: number;
  reinstatement?: number;
  majorStressSinceEvent?: boolean;
  sleepQuality?: number;
  confounded?: boolean;
};

export type LearningEventForPhenotype = {
  learningQuality?: {
    overall: "high_quality" | "acceptable" | "unclear" | "failed" | "safety_flag";
  };
  threatPre?: number;
  threatPost?: number;
  safetyPre?: number;
  safetyPost?: number;
  eventType?: string;
  followUps?: FollowUpOutcome[];
};

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function validEvent(event: LearningEventForPhenotype): boolean {
  return event.learningQuality?.overall === "high_quality" || event.learningQuality?.overall === "acceptable";
}

function mean(values: number[]): number | undefined {
  if (!values.length) return undefined;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function assessment(
  phenotype: FearPhenotypeId,
  status: PhenotypeStatus,
  confidence: number,
  validEvents: number,
  confoundedEvents: number,
  rationale: string[],
  observedSignals: string[]
): PhenotypeAssessment {
  return {
    phenotype,
    status,
    confidence: clamp(confidence),
    validEvents,
    confoundedEvents,
    rationale,
    observedSignals,
    evaluatedAt: new Date().toISOString(),
    engineVersion: "2.0.2"
  };
}

export function scorePhenotype(events: LearningEventForPhenotype[]): PhenotypeAssessment[] {
  const valid = events.filter(validEvent);
  const confounded = valid.filter((event) => (event.followUps ?? []).some((followUp) => followUp.confounded)).length;

  if (!valid.length) {
    return ["F3", "F4", "F5", "F6"].map((id) => assessment(
      id as FearPhenotypeId,
      "insufficient_data",
      0,
      0,
      0,
      ["Ingen valide learning-events endnu."],
      []
    ));
  }

  const acquisitionEvents = valid.filter((event) => !event.eventType || ["acquisition", "extinction", "safety_discrimination", "counterconditioning"].includes(event.eventType));
  const acquisitionStrengths = acquisitionEvents.map((event) => {
    const threatDelta = typeof event.threatPre === "number" && typeof event.threatPost === "number"
      ? clamp((event.threatPre - event.threatPost) / 100)
      : undefined;
    const safetyDelta = typeof event.safetyPre === "number" && typeof event.safetyPost === "number"
      ? clamp((event.safetyPost - event.safetyPre) / 100)
      : undefined;

    if (threatDelta === undefined && safetyDelta === undefined) return undefined;
    if (threatDelta === undefined) return safetyDelta;
    if (safetyDelta === undefined) return threatDelta;
    return (threatDelta + safetyDelta) / 2;
  }).filter((value): value is number => value !== undefined);

  const meanAcquisitionStrength = mean(acquisitionStrengths) ?? 0;
  const f3Confidence = acquisitionStrengths.length >= 2 ? clamp(1 - meanAcquisitionStrength) : 0;
  const f3Status: PhenotypeStatus = acquisitionStrengths.length < 2
    ? "insufficient_data"
    : f3Confidence >= 0.6 ? "probable" : f3Confidence >= 0.3 ? "possible" : "resolved";

  const allFollowUps = valid.flatMap((event) => event.followUps ?? []);
  const follow24 = allFollowUps.filter((followUp) => followUp.timepoint === "24h");
  const follow7 = allFollowUps.filter((followUp) => followUp.timepoint === "7d");
  const valid7 = follow7.filter((followUp) => !followUp.confounded);

  const retention7Values = valid7.map((followUp) => followUp.sameContext).filter((value): value is number => typeof value === "number");
  const retention7Mean = mean(retention7Values);
  const poorRetention7 = retention7Values.filter((value) => value < 50).length;
  const f4Confidence = retention7Values.length >= 2 ? poorRetention7 / retention7Values.length : 0;
  const f4Status: PhenotypeStatus = retention7Values.length < 2
    ? "insufficient_data"
    : f4Confidence >= 0.6 ? "probable" : f4Confidence >= 0.3 ? "possible" : "resolved";

  const stimulusCandidates = valid7.filter((followUp) => typeof followUp.sameContext === "number" && typeof followUp.similarStimulus === "number");
  const stimulusGaps = stimulusCandidates.map((followUp) => Math.max(0, (followUp.sameContext ?? 0) - (followUp.similarStimulus ?? 0)));
  const contextCandidates = valid7.filter((followUp) => typeof followUp.sameContext === "number" && typeof followUp.newContext === "number");
  const contextGaps = contextCandidates.map((followUp) => Math.max(0, (followUp.sameContext ?? 0) - (followUp.newContext ?? 0)));

  const meaningfulStimulusGap = stimulusGaps.filter((gap) => gap >= 20).length;
  const meaningfulContextGap = contextGaps.filter((gap) => gap >= 20).length;
  const f5CandidateCount = stimulusGaps.length + contextGaps.length;
  const f5Poor = meaningfulStimulusGap + meaningfulContextGap;
  const f5Confidence = f5CandidateCount >= 2 ? f5Poor / f5CandidateCount : 0;
  const f5Status: PhenotypeStatus = f5CandidateCount < 2
    ? "insufficient_data"
    : f5Confidence >= 0.6 ? "probable" : f5Confidence >= 0.3 ? "possible" : "resolved";

  const spontaneous = valid7.filter((followUp) => typeof followUp.spontaneousRecovery === "number");
  const renewal = valid7.filter((followUp) => typeof followUp.renewal === "number");
  const reinstatement = valid7.filter((followUp) => typeof followUp.reinstatement === "number");
  const relapseSignals = [
    ...spontaneous.map((followUp) => followUp.spontaneousRecovery ?? 0),
    ...renewal.map((followUp) => followUp.renewal ?? 0),
    ...reinstatement.map((followUp) => followUp.reinstatement ?? 0)
  ];
  const f6Positive = relapseSignals.filter((value) => value > 0).length;
  const f6Confidence = relapseSignals.length >= 2 ? f6Positive / relapseSignals.length : 0;
  const f6Status: PhenotypeStatus = relapseSignals.length < 2
    ? "insufficient_data"
    : f6Confidence >= 0.6 ? "probable" : f6Confidence >= 0.3 ? "possible" : "resolved";

  const retentionRationale = retention7Values.length
    ? [`${poorRetention7}/${retention7Values.length} ukonfunderede 7d same-context observationer ligger under 50/100 som intern research-markør.`]
    : ["Der mangler tilstrækkelige 7d same-context observationer."];
  if (follow24.length && !follow7.length) retentionRationale.push("24h-data alene bruges ikke til at konkludere en F4-bottleneck.");
  if (confounded > 0) retentionRationale.push(`${confounded} event(s) har confound-markering og vægtes ikke i 7d-hovedsignalet.`);

  return [
    assessment(
      "F3",
      f3Status,
      f3Confidence,
      acquisitionEvents.length,
      confounded,
      [`Gennemsnitlig acquisition strength: ${(meanAcquisitionStrength * 100).toFixed(1)}%. Højere F3-confidence betyder svagere observeret sikkerhedslæring.`],
      ["pre/post threat expectancy", "pre/post safety expectancy"]
    ),
    assessment(
      "F4",
      f4Status,
      f4Confidence,
      retention7Values.length,
      valid7.length - retention7Values.length,
      retentionRationale,
      retention7Mean === undefined ? [] : [`Gennemsnitlig 7d same-context score: ${retention7Mean.toFixed(1)}.`]
    ),
    assessment(
      "F5",
      f5Status,
      f5Confidence,
      f5CandidateCount,
      valid7.length - f5CandidateCount,
      [
        `${meaningfulStimulusGap} stimulus-generalisation gaps og ${meaningfulContextGap} context-transfer gaps overstiger 20-point research-markøren.`,
        "Stimulusgeneralisering og konteksto­verførsel analyseres separat."
      ],
      ["same-context", "similar-stimulus", "new-context"]
    ),
    assessment(
      "F6",
      f6Status,
      f6Confidence,
      relapseSignals.length,
      valid7.length - relapseSignals.length,
      [
        `${spontaneous.length} spontaneous-recovery, ${renewal.length} renewal og ${reinstatement.length} reinstatement observationer registreret.`,
        "Return-of-fear-subtyper må ikke slås sammen i rådata."
      ],
      ["spontaneous recovery", "renewal", "reinstatement"]
    )
  ];
}
