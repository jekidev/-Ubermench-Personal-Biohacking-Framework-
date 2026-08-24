# Longevity integration audit

## Verified on 2026-08-24

- Repository default branch: `main`.
- No open pull requests were present when the audit started.
- The recent Longevity work is present in the main branch history, including the live PubMed/DOI metadata review merge and the subsequent observation/variant deduplication fix.
- The root package remains Nuxt 4 + Vue 3 + Tauri 2 and exposes `test`, `build`, `typecheck`, `tauri:dev` and `tauri:build` scripts.
- The Longevity plugin remains explicitly documented in the root README.
- Local-first persistence and review-first import remain architectural requirements.
- Evidence records remain separate from observations; evidence strength must not be inferred merely from metadata lookup.

## Gaps identified

1. The root package does not currently declare a dedicated HTTP client dependency. The metadata lookup layer should therefore keep network access behind a replaceable adapter rather than leaking provider-specific code into UI components.
2. The current README describes Europe PMC research integration, while the newest evidence workflow adds PubMed/Crossref lookup. These should share one normalized research-source contract instead of becoming parallel data models.
3. Evidence ingestion needs deterministic source identity and cache semantics so repeated lookups do not create duplicate records.
4. Network failure must degrade to a reviewable error state; it must never create a partial evidence record.
5. Tests should cover normalization, deduplication, provider fallback, stale-cache handling and malformed responses before the live search UI is expanded.

## Design decision

The next implementation should introduce a provider-neutral `ResearchSourceAdapter` contract with PubMed, Crossref and existing Europe PMC adapters behind it. The UI consumes normalized candidates only. No personal biomarker, genetic, medication or other health data is included in external literature queries unless a future feature explicitly requests and documents that behavior.
