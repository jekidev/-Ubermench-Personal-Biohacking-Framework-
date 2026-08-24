# -Ubermench-Personal-Biohacking-Framework-

A local-first web/desktop framework for personal biology, evidence-driven experimentation and health optimisation.

## Current architecture

### Core
- Personal biology profile and local persistence
- Biomarker trend engine
- Genomics parsing and phenotype-oriented routing
- Digital-twin foundation
- Evidence scoring and intervention ranking
- N-of-1 experiment analysis with baseline windows and standardised effect size
- Knowledge-graph foundation

### AI orchestration
- Multi-provider LLM layer for OpenRouter, OpenAI and Anthropic
- OpenRouter free-first routing with automatic provider/model fallback
- Manual provider API keys and model selection in Settings
- Model/provider/latency/attempt provenance displayed after each run
- Hugging Face remains available through the dedicated inference/model registry path
- Explicit researcher, biohacker, clinician, coach, scientist, auditor and safety modes at the orchestration contract level

### Research
- Europe PMC search integration
- Personalised query builder using goals, recent biomarkers and genomic variants
- Structured research-hit model for later evidence normalization

### Safety
- Explicit intervention safety screen
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

## Replit / Manus deployment bridge

The deployment pattern is based on the working `jekidev/T1` pattern: one canonical GitHub repository, a platform-specific launcher, setup/validation before launch, and Google Drive kept outside GitHub credentials. T1 documents direct Replit/Manus import and Google Drive connections as part of its deployment flow.

```bash
pnpm deployment:replit
# or
pnpm deployment:manus
```

Both launchers call the same validation bootstrap:

1. install dependencies
2. run Nuxt typecheck
3. run the Vitest suite
4. generate the production web bundle
5. detect the Google Drive connection
6. write non-secret deployment state to `.runtime/deployment-state.json`

Google Drive OAuth tokens are **never** committed to GitHub. Replit/Manus should provide the authenticated connection through their connection/secret systems. For local development, `GOOGLE_DRIVE_RAG_PATH` can point to a locally synchronized Drive directory.

The current bridge validates the connection and prepares the application; it does not pretend to perform OAuth or silently copy Drive data. A future RAG adapter can consume the authenticated connection without changing the deployment contract.

## Development and quality

```bash
npm install
npm test
npm run typecheck
npm run build
```

For the deployment validation path:

```bash
pnpm deployment:bootstrap
```

GitHub Actions runs the repository's quality checks on pushes and pull requests to `main`.

## Security note

Provider keys are currently stored locally in browser storage for the settings UI. This is appropriate for a personal prototype, not a hardened multi-user deployment. A future hardened mode should move secrets to the Tauri OS keychain or a server-side credential proxy.
