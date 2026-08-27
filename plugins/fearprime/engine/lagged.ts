export interface LaggedPair {
  priorTimestamp: string;
  outcomeTimestamp: string;
  priorSleep?: number;
  outcomeLearning?: number;
  priorStress?: number;
  outcomeRetention?: number;
  confounded: boolean;
}

export interface LaggedAssociation {
  n: number;
  meanPriorSleep?: number;
  meanOutcomeLearning?: number;
  meanPriorStress?: number;
  meanOutcomeRetention?: number;
  interpretation: "insufficient_data" | "descriptive_association_only";
}

function mean(values: number[]): number | undefined {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : undefined;
}

/**
 * Descriptive lagged summaries only. This must not be presented as causal inference.
 */
export function summarizeLaggedSleepLearning(pairs: LaggedPair[]): LaggedAssociation {
  const valid = pairs.filter((pair) => !pair.confounded);
  if (valid.length < 3) return { n: valid.length, interpretation: "insufficient_data" };

  const sleep = valid.map((pair) => pair.priorSleep).filter((value): value is number => typeof value === "number");
  const learning = valid.map((pair) => pair.outcomeLearning).filter((value): value is number => typeof value === "number");
  const stress = valid.map((pair) => pair.priorStress).filter((value): value is number => typeof value === "number");
  const retention = valid.map((pair) => pair.outcomeRetention).filter((value): value is number => typeof value === "number");

  return {
    n: valid.length,
    meanPriorSleep: mean(sleep),
    meanOutcomeLearning: mean(learning),
    meanPriorStress: mean(stress),
    meanOutcomeRetention: mean(retention),
    interpretation: "descriptive_association_only"
  };
}
