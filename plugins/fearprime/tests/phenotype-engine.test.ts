import { describe, expect, it } from "vitest";
import { nextBestTest } from "../engine/next-best-test";
import { scorePhenotype, type LearningEventForPhenotype } from "../engine/phenotype";

const high = { learningQuality: { overall: "high_quality" as const } };

function extinctionEvent(overrides: Partial<LearningEventForPhenotype> = {}): LearningEventForPhenotype {
  return {
    ...high,
    eventType: "extinction",
    threatPre: 80,
    threatPost: 20,
    safetyPre: 20,
    safetyPost: 80,
    ...overrides
  };
}

describe("Fearprime PTSD phenotype engine", () => {
  it("does not infer F4 from 24h alone", () => {
    const signals = scorePhenotype([
      extinctionEvent({ followUps: [{ timepoint: "24h", sameContext: 70, sleepQuality: 8 }] })
    ]);

    expect(signals.find((signal) => signal.phenotype === "F4")?.status).toBe("insufficient_data");
  });

  it("marks poor acquisition as a possible/probable F3 bottleneck", () => {
    const signals = scorePhenotype([
      extinctionEvent({ threatPre: 80, threatPost: 82, safetyPre: 20, safetyPost: 18 }),
      extinctionEvent({ threatPre: 75, threatPost: 80, safetyPre: 25, safetyPost: 20 })
    ]);

    expect(signals.find((signal) => signal.phenotype === "F3")?.status).toBe("probable");
  });

  it("does not classify strong acquisition as an F3 bottleneck", () => {
    const signals = scorePhenotype([
      extinctionEvent(),
      extinctionEvent()
    ]);

    expect(signals.find((signal) => signal.phenotype === "F3")?.status).toBe("resolved");
  });

  it("recognises repeated poor 7d same-context retention as F4", () => {
    const signals = scorePhenotype([
      extinctionEvent({ followUps: [{ timepoint: "7d", sameContext: 35, sleepQuality: 8 }] }),
      extinctionEvent({ followUps: [{ timepoint: "7d", sameContext: 40, sleepQuality: 8 }] })
    ]);

    expect(signals.find((signal) => signal.phenotype === "F4")?.status).toBe("probable");
  });

  it("separates context transfer from stimulus generalisation", () => {
    const signals = scorePhenotype([
      extinctionEvent({ followUps: [{ timepoint: "7d", sameContext: 90, similarStimulus: 85, newContext: 30 }] }),
      extinctionEvent({ followUps: [{ timepoint: "7d", sameContext: 88, similarStimulus: 84, newContext: 25 }] })
    ]);

    expect(signals.find((signal) => signal.phenotype === "F5")?.status).toBe("probable");
    expect(signals.find((signal) => signal.phenotype === "F5")?.observedSignals).toContain("same-context");
  });

  it("preserves separate return-of-fear types", () => {
    const signals = scorePhenotype([
      extinctionEvent({
        eventType: "retention_7d",
        followUps: [
          { timepoint: "7d", sameContext: 85, spontaneousRecovery: 4 },
          { timepoint: "7d", sameContext: 82, renewal: 6 },
          { timepoint: "7d", sameContext: 80, reinstatement: 5 }
        ]
      })
    ]);

    const f6 = signals.find((signal) => signal.phenotype === "F6");
    expect(f6?.validEvents).toBe(3);
    expect(f6?.rationale.join(" ")).toContain("spontaneous-recovery");
    expect(f6?.rationale.join(" ")).toContain("renewal");
    expect(f6?.rationale.join(" ")).toContain("reinstatement");
  });

  it("prioritises replication when F4 already has repeated 7d data", () => {
    const events = [
      extinctionEvent({ followUps: [{ timepoint: "7d", sameContext: 35, sleepQuality: 8 }] }),
      extinctionEvent({ followUps: [{ timepoint: "7d", sameContext: 40, sleepQuality: 8 }] })
    ];
    const signals = scorePhenotype(events);
    const recommendation = nextBestTest(signals, events);

    expect(recommendation.testId).toBe("F4_RETENTION_7D");
    expect(recommendation.priority).toBe("high");
  });
});
