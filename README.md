# -Ubermench-Personal-Biohacking-Framework-

A local-first web/desktop framework for personal biology, evidence-driven experimentation and health optimisation.

## Current architecture

### Core data and state
- Versioned personal biology profile and local persistence
- Canonical longitudinal observation model for labs, genomics, wearables and training
- Personal state vector across cardiovascular, metabolic, inflammatory, hormonal, neurological, immune, sleep, stress, fitness, nutrition, cognitive and recovery domains
- Versioned personal-state store with observation, intervention-event and HumanState history
- Subject-scoped selectors and latest-state retrieval
- Digital-twin foundation

### Intelligence and experimentation
- Biomarker trend and interpretation engine
- Evidence scoring and intervention ranking
- Bayesian personal-effect estimation and uncertainty summaries
- N-of-1 experiment analysis with baseline, washout, intervention and follow-up windows
- Automated experiment phase annotation on canonical observations
- Closed-loop runtime: ingest data -> build HumanState -> rank interventions -> estimate personal signals -> persist the resulting state
- Knowledge-graph foundation and temporal state support

### Health data integration
- Canonical adapters for external health samples
- Provider registry for Android Health Connect, Apple Health, Garmin, Oura, WHOOP, Fitbit, Polar and manual/API sources
- Normalized wearable provenance, quality and confidence metadata
- Tauri/native adapter pathways remain available for platform-specific ingestion
- Portable, versioned biology backup format for user-owned export/import workflows
- Biology UI now exposes JSON backup export/import with validation and persistence

### Evidence and research integrity
- Europe PMC search integration
- Personalised query builder using goals, recent biomarkers and genomic variants
- Structured research-hit model for later evidence normalization
- Evidence provenance records with retrieval time, source version and claim fingerprint
- Evidence supersession tracking so updated claims can replace older evidence without losing provenance

### AI orchestration
- Multi-provider LLM layer for OpenRouter, OpenAI and Anthropic
- OpenRouter free-first routing with automatic provider/model fallback
- Manual provider API keys and model selection in Settings
- Model/provider/latency/attempt provenance displayed after each run
- Hugging Face remains available through the dedicated inference/model registry path
- Explicit researcher, biohacker, clinician, coach, scientist, auditor and safety modes at the orchestration contract level

### Safety
- Explicit intervention safety screen
- Medication/supplement interaction graph with aggregate risk scoring
- CNS-depressant stacking, blood-pressure stacking and duplicate-mechanism checks
- Severity levels and clinician-review flags
- Safety rules are conservative and do not constitute proof of safety

### Plugins

#### Fearprime
PTSD / fear-learning / memory / psychophysiology research and decision-support plugin.

Location: `plugins/fearprime/`

Core areas:
- PTSD clinical outcomes and symptom tracking
- Fear learning, extinction, safety discrimination and memory updating
- Consolidation, retrieval, generalisation and relapse
- Sleep, intrusions, interoception and physiology
- Intervention and evidence registries
- Clinician review, adverse-event tracking and reproducible N-of-1 analysis
- Offline-first cross-platform web architecture

Fearprime is a modular research/decision-support layer and does not autonomously prescribe or modify medical treatment.

#### Longevity
Healthspan/lifespan decision-support and monitoring plugin.

Location: `plugins/longevity/`

Core areas:
- Cardiovascular risk dashboard
- Metabolic health and laboratory trends
- Fitness, running, strength and body-composition tracking
- Sleep, recovery and wearable metrics
- Kidney, liver and other organ-health monitoring
- Prevention and screening tracking
- Intervention and evidence registry
- Geroscience research watchlist
- Reproducible N-of-1 tracking
- Safety flags and clinician-review handoffs

## Data portability

`app/services/biology-backup.ts` defines a versioned `ubermench-biology-backup` envelope around the canonical `PersonalBiologyProfile`.

The backup layer currently provides:

- deterministic JSON serialization
- explicit backup format/version validation
- deep-copy semantics so exported data cannot mutate the live profile
- forward-compatible rejection of unsupported backup versions
- UI export/import with persistence through the existing local biology store

The remaining portability step is wiring the same validated service into native Tauri file-dialog flows so desktop builds can use OS-native file selection rather than the browser file picker.

## Replit / Manus deployment bridge

The deployment pattern is based on the working `jekidev/T1` pattern: one canonical GitHub repository, a platform-specific launcher, setup/validation before launch, and Google Drive kept outside GitHub credentials.

```bash
pnpm deployment:replit
# or
pnpm deployment:manus
```

The deployment bootstrap:

1. installs dependencies
2. runs Nuxt typecheck
3. runs Vitest
4. generates the production web bundle
5. validates that a Google Drive connection has been supplied
6. records non-secret deployment state in `.runtime/deployment-state.json`
7. serves `.output/public` on `PORT` (default `3000`)

Google Drive OAuth tokens are **never** committed to GitHub. Replit/Manus should provide the authenticated connection through platform connections/secrets. The current bridge validates the connection signal but does not itself perform OAuth or silently copy Drive data; the future Drive RAG adapter should consume the authenticated platform connection.

For the deployment bridge, set `GOOGLE_DRIVE_CONNECTED=true` after the platform connection is authorized. For local development, `GOOGLE_DRIVE_RAG_PATH` can point to a locally synchronized Drive directory.

## Development and quality

```bash
npm install
npm test
npm run typecheck
npm run build
```

For deployment validation and launch:

```bash
pnpm deployment:bootstrap
```

GitHub Actions runs the repository's quality checks on pushes and pull requests to `main`, including JavaScript tests/typecheck/build and the Rust/Tauri validation path.

## Near-term roadmap

1. Native Tauri file-dialog integration for the validated biology backup service.
2. Complete health-provider ingestion beyond canonical adapter/registry contracts, prioritising Android Health Connect and Apple Health native bridges.
3. Harden credential storage with the Tauri OS keychain rather than browser local storage.
4. Add explicit data-quality scoring, missingness handling and provenance-aware conflict resolution across imported sources.
5. Expand the closed-loop experiment layer with intervention adherence, adverse-event capture and automatic follow-up scheduling.
6. Add richer longitudinal visualisation and explainable evidence-to-decision traces to the primary dashboard.

## Security note

Provider keys are currently stored locally in browser storage for the settings UI. This is appropriate for a personal prototype, not a hardened multi-user deployment. A future hardened mode should move secrets to the Tauri OS keychain or a server-side credential proxy.
