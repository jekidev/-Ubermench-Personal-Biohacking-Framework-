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
- Explainable evidence-to-decision traces with deterministic disposition and rationale
- Bayesian personal-effect estimation and uncertainty summaries
- N-of-1 experiment analysis with baseline, washout, intervention and follow-up windows
- Experiment adherence tracking with completion rates and optional dose metadata
- Adverse-event capture with severity and relatedness fields
- Automated experiment phase annotation on canonical observations
- Deterministic experiment follow-up checkpoints at phase midpoints
- Due/upcoming follow-up filtering with invalid-timestamp hardening and deterministic tie-breaking
- Next-follow-up selection for dashboard/runtime consumers
- Closed-loop runtime: ingest data -> build HumanState -> rank interventions -> estimate personal signals -> persist the resulting state
- Knowledge-graph foundation and temporal state support

### Health data integration
- Canonical adapters for external health samples
- Provider registry for Android Health Connect, Apple Health, Garmin, Oura, WHOOP, Fitbit, Polar and manual/API sources
- Normalized wearable provenance, quality and confidence metadata
- Provenance-aware observation quality scoring and conflict resolution for overlapping imported measurements
- Source-aware reconciliation policies with configurable provider priorities and duplicate windows
- Missingness-aware daily/weekly aggregation with multiplicative quality/confidence weighting and explicit coverage metrics
- Strict TypeScript-safe aggregation and reconciliation paths for `noUncheckedIndexedAccess`-style checking
- Tauri/native adapter pathways remain available for platform-specific ingestion
- Portable, versioned biology backup format for user-owned export/import workflows
- Browser JSON backup export/import with validation and persistence
- Native Tauri backup export/import through the Tauri filesystem plugin

### Evidence and research integrity
- Europe PMC search integration
- Personalised query builder using goals, recent biomarkers and genomic variants
- Structured research-hit model for later evidence normalization
- Evidence provenance records with retrieval time, source version and claim fingerprint
- Evidence supersession tracking so updated claims can replace older evidence without losing provenance
- Explainable decision traces connect evidence strength, personal fit, priority and safety signals without autonomously prescribing treatment

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
- browser export/import with persistence through the existing local biology store
- native Tauri save/open dialogs backed by the Tauri filesystem plugin

`app/services/encrypted-biology-backup.ts` adds a password-protected snapshot envelope for local recovery:

- PBKDF2-SHA-256 key derivation with 210,000 iterations
- AES-256-GCM authenticated encryption with random salt and IV
- explicit format, cipher and KDF parameter validation
- strict base64 and binary-size validation for salt, IV and authenticated ciphertext
- wrong-passphrase/corruption errors without exposing plaintext
- round-trip, tamper-resistance and malformed-envelope tests

Native encrypted recovery is exposed through `app/services/encrypted-biology-backup-native.ts` and `usePersonalBiology()`:

- Tauri save/open dialogs for encrypted JSON snapshots
- passphrase-based encryption before the file is written
- decryption and validation before an imported profile is persisted
- browser-compatible string import/export remains available through the composable
- Biology Intelligence now exposes encrypted export/import controls directly in the browser dashboard

The encrypted layer is intended for user-controlled local snapshots. It does not replace OS keychain protection for API credentials.

Native desktop backup actions are exposed through `usePersonalBiology()` as `exportBackupToFile()` / `importBackupFromFile()` and `exportEncryptedBackupToFile()` / `importEncryptedBackupFromFile()`. Browser builds use the string/file-picker flow and can use the encrypted counterparts without Tauri.

## Data quality and conflict resolution

`app/services/health-data-quality.ts` provides a deterministic quality layer before canonical observations enter downstream state/intelligence workflows.

- Validates numeric values and timestamps
- Scores provenance, source quality and confidence separately from the raw measurement
- Flags weak or incomplete provenance instead of silently treating every source as equivalent
- Groups near-simultaneous observations by subject, metric and unit
- Selects the highest-quality candidate when imported sources overlap
- Preserves conflict metadata so downstream audit/explainability can show which records were considered and which one was selected
- Accepts source-aware reconciliation policy overrides when a provider has known measurement characteristics

`app/services/health-provider-reconciliation.ts` defines the provider reconciliation policy used by the quality layer:

- explicit provider/source priorities with conservative defaults
- configurable duplicate time window
- deterministic quality/confidence/source ranking
- strict handling of potentially missing array elements under TypeScript's checked-index semantics
- explicit policy overrides for future provider-specific calibration

`app/services/health-data-aggregation.ts` adds a missingness-aware aggregation layer:

- Daily and ISO-week buckets
- Quality/confidence-weighted aggregate values using `max(0.01, quality × confidence)` as the observation weight
- Explicit observation counts
- Coverage, expected-period and missing-period metrics
- Missing periods are never represented as zero-valued measurements
- Group-key parsing is explicit and type-safe rather than relying on unchecked array destructuring

These layers are intentionally conservative: conflict resolution selects the strongest available record according to an explicit policy and aggregation reports data coverage; neither claims that the selected or aggregated measurement is biologically true.

## CI / quality status

The recent strict TypeScript failures in the health-data aggregation, provider-reconciliation and encrypted-backup layers have been addressed. The experiment scheduler is now also hardened against malformed timestamps and exposes deterministic due/upcoming/next checkpoint selection.

The aggregation contract is explicitly documented and covered by tests: quality `1`/`0.5` combined with confidence `1`/`0.5` produces an aggregate of `64` under multiplicative weighting. Strict TypeScript guards are also in place for reconciliation and aggregation selectors.

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

1. Complete health-provider ingestion beyond canonical adapter/registry contracts, prioritising Android Health Connect and Apple Health native bridges.
2. Harden credential storage with the Tauri OS keychain rather than browser local storage.
3. Expand source-specific reconciliation policies and missingness-aware longitudinal analytics; baseline provenance scoring, conflict resolution, provider-aware reconciliation and aggregation are now implemented.
4. Expand the closed-loop experiment layer with automatic follow-up scheduling and richer intervention-event timelines; deterministic phase-midpoint scheduling and due/upcoming/next selection are now implemented.
5. Integrate the new explainable evidence-to-decision trace into the primary dashboard and intervention ranking flow, with explicit safety/review gates.
6. Add richer longitudinal visualisation and temporal evidence-to-state views.
7. Integrate encrypted snapshots into the broader recovery UI; encrypted browser/Tauri export/import, strict envelope validation, persistence integration and dashboard controls are now implemented, while OS-keychain-backed key/passphrase handling remains.

## Security note

Provider keys are currently stored locally in browser storage for the settings UI. This is appropriate for a personal prototype, not a hardened multi-user deployment. A future hardened mode should move secrets to the Tauri OS keychain or a server-side credential proxy. Encrypted biology snapshots protect the snapshot payload but do not by themselves protect provider credentials.
