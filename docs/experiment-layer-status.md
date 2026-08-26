# Experiment layer status

The experiment foundation is now implemented as a deterministic, auditable analysis layer.

## Implemented

- baseline / washout / intervention / follow-up windows
- deterministic midpoint follow-up checkpoints
- due / upcoming / next checkpoint selection
- adherence and optional dose metadata
- adverse-event capture with severity and relatedness
- protocol validation for single-subject crossover, AB/BA and randomized N-of-1 designs
- structured confounder capture across sleep, training, nutrition, medication, illness, stress and other factors
- explicit invalid/missing observation exclusion
- leave-one-out sensitivity analysis
- missingness-rate reporting
- deterministic test coverage for protocol, confounder and sensitivity paths

## Interpretation contract

The experiment layer reports descriptive within-person signals and uncertainty. It does not silently convert association into causal proof, does not replace a pre-declared protocol with an adaptive stopping rule, and never treats missing observations as zero-valued measurements.

High-impact confounders and sensitivity instability should remain visible to downstream evidence and safety views rather than being hidden by aggregation.
