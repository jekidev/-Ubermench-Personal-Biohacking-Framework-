# Longevity technical architecture v0.1

The plugin follows the same domain/application/persistence/sync separation used by Fearprime.

```text
Longevity UI
  ↓
Application services
  ↓
Deterministic scoring + safety rules
  ↓
Domain event store
  ↓
Local persistence
  ↓
Sync API
  ↓
PostgreSQL
```

## Core principles

- Offline-first by default.
- Raw measurements are immutable events; corrections are append-only audit events.
- Every derived score stores algorithm version, protocol version and evidence version.
- No clinical recommendation is generated without displaying the underlying metric, evidence grade and uncertainty.
- Medication and supplement items are tracked as interventions, not prescriptions.
- Experimental longevity interventions remain visibly separated from guideline-backed prevention.

## Calculation layers

### Layer 1 — raw metrics

Blood pressure, heart rate, weight, waist, activity, sleep, HRV, laboratory values and screening events.

### Layer 2 — derived metrics

7-day BP average, resting-HR trend, training volume, estimated fitness trend, lipid-risk trend, glycemic trend and organ-health trend.

### Layer 3 — decision support

Priority flags are generated from changes, persistent out-of-range values, missing measurements and safety conditions.

### Layer 4 — research watchlist

Emerging interventions are tracked separately with evidence class, trial phase, known risks and human-outcome status.
