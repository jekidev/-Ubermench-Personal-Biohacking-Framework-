# Ubermench completion roadmap

This document tracks the gap between the current research-grade framework foundation and a robust daily-use biohacking platform.

## Completed foundation

- Canonical personal biology model and longitudinal observations
- Versioned personal-state persistence
- Closed-loop ingest -> HumanState -> intervention ranking -> personal signal pipeline
- Bayesian personalisation and N-of-1 experiment support
- Evidence search, provenance and supersession tracking
- Health-provider adapter contracts and provenance metadata
- LLM provider routing, fallback and execution provenance
- Agent runtime approvals, audit, checkpoints, recovery and tool validation
- Fearprime and Longevity plugin foundations
- Tauri/Nuxt desktop shell and deployment bootstrap
- Portable, versioned biology backup envelope

## Remaining implementation priorities

### P0 — data ownership and correctness

1. Wire biology backup export/import into the Biology UI and Tauri file dialogs.
2. Add migration tests for every persisted profile version.
3. Add transactional validation before replacing an existing profile from an import.
4. Add a user-visible backup checksum and export metadata.
5. Add end-to-end tests for create -> export -> clear -> import -> verify.

### P0 — credential security

1. Move provider secrets from browser storage to Tauri Stronghold/OS-backed secret storage.
2. Keep browser builds on an explicit, clearly labelled development credential path.
3. Add secret-redaction tests around settings, logs, agent audit events and model errors.
4. Ensure no provider key is serialised into experiment, evidence or backup records.

### P1 — real health-data ingestion

1. Implement the Health Connect native adapter path on Android.
2. Implement Apple Health native ingestion for the macOS/iOS-compatible Tauri strategy where platform APIs permit it.
3. Promote Garmin/Oura/WHOOP/Fitbit/Polar from registry contracts to authenticated import adapters.
4. Add deduplication using provider + source record ID + timestamp + measurement identity.
5. Add sync cursors, retry/backoff and partial-failure reporting.
6. Preserve source payload hashes for reproducibility without storing unnecessary raw payloads.

### P1 — evidence engine maturity

1. Normalize Europe PMC results into durable evidence records automatically.
2. Add DOI/PMID identity resolution and duplicate detection.
3. Add citation-level claim extraction with explicit uncertainty.
4. Separate mechanistic plausibility from human outcome evidence in intervention ranking.
5. Add evidence freshness/retraction checks and an auditable research snapshot.

### P1 — experiment engine maturity

1. Add protocol templates for single-subject crossover, AB/BA and randomized N-of-1 designs.
2. Add adherence and confounder capture.
3. Add missing-data handling and sensitivity analysis.
4. Add stopping-rule support without silently changing a protocol.
5. Make experiment conclusions distinguish association, within-person effect and causal evidence.

### P1 — safety layer

1. Expand medication/supplement interaction coverage with provenance.
2. Add contraindication and monitoring requirements as structured rules.
3. Add duplicate-ingredient and cumulative-dose detection.
4. Require explicit user confirmation for high-risk interventions.
5. Keep safety output separate from efficacy ranking.

### P2 — product completeness

1. Complete Biology, Experiments, Evidence, Fearprime, Longevity and Agent dashboards.
2. Add import/export UX and visible data-health diagnostics.
3. Add offline/online sync state and conflict resolution.
4. Add accessibility and keyboard navigation pass.
5. Add desktop packaging smoke tests and platform-specific release checks.

### P2 — observability and maintenance

1. Add structured application diagnostics without sensitive payloads.
2. Add performance budgets for startup, state hydration and model execution.
3. Add schema/version inventory generation during CI.
4. Add dependency and licence audits.
5. Add a release checklist tied to green tests, typecheck, build and Tauri validation.

## Definition of done

The framework should not be considered complete merely because CI is green. Completion requires:

- data can be imported, exported and recovered without cloud dependence;
- provider credentials are stored securely on supported desktop platforms;
- health data has provenance, deduplication and migration guarantees;
- evidence claims are traceable to durable sources;
- experiments preserve protocol integrity and quantify uncertainty;
- safety checks are conservative, explainable and auditable;
- all major workflows are reachable from the UI and covered by automated tests;
- Nuxt typecheck, Vitest, production build and Tauri validation remain green.
