# Evidence / Risk Engine

This layer links confirmed observations to versioned evidence without changing the raw measurement.

## Separation of layers

```text
Observed value
    ↓
Evidence record
    ↓
Risk/context interpretation
    ↓
Human-readable statement
```

### Observation
What was actually measured.

### Evidence
What the available literature supports, with grade and source/version.

### Context
Which personal context variables were explicitly applied.

### Interpretation
A bounded statement that preserves uncertainty and distinguishes association from causality.

### Hypothesis
Speculative ideas remain explicitly labelled and cannot be promoted to clinical evidence by the engine.

## Evidence grades

- `A` — highest-confidence evidence in the plugin's evidence registry
- `B` — strong but not highest-confidence evidence
- `C` — moderate/limited evidence
- `D` — weak/inconclusive evidence
- `E` — hypothesis/insufficient evidence

These grades are framework metadata, not a validated medical scoring system. Individual evidence entries must include their own source and review date.

## Safety rules

- Never change the raw observation.
- Never infer a diagnosis from a single biomarker.
- Do not turn missing context into a normal/abnormal assumption.
- Do not treat observational associations as causal evidence.
- Do not generate autonomous treatment or dose changes.
