# Agent notes

## GitHub starred repos

Cursor skill: `.cursor/skills/github-starred-repos/SKILL.md`

The portable multi-IDE archive is https://github.com/jekidev/stararchive

- Genres: `genres/INDEX.md` and `genres/<genre>.md` in that repo
- Catalog: `catalog/catalog.json` in that repo
- Local Ubermench snapshot: `app/data/starchive/catalog.json`
- CSV: `app/data/starchive/starred_repos.csv`
- Default GitHub user: `jekidev`
- Refresh here: `npm run starchive -- --snapshot`
- Refresh portable repo: `node scripts/refresh.mjs && node scripts/classify.mjs`

Read the catalog or genre files before answering questions about starred repositories. A token is only required for private or hidden stars (`GITHUB_USERNAME` / `GITHUB_TOKEN`).

## Starred integrations

Approved adapters from `jekidev/stararchive` (not wholesale merges):

- Paper search MCP: `plugins/connectors` + `plugins/llm/mcp/servers.ts` (`paper-search`). Sci-Hub stays off.
- PaperQA: `app/services/paper-qa.ts` — citation RAG contract, local sidecar only.
- Local Deep Research: optional `ldr-mcp` connector and `.cursor/skills/local-deep-research/SKILL.md`
- Exercise catalog: `plugins/longevity/fitness/exercises.catalog.json` (MIT metadata, no Gym visual media)
- Longevity watchlist: `plugins/longevity/evidence/watchlist.ts`
- Garmin-only biometric map: `app/services/health-adapters/garmin-biometric-schema.ts`
- PDF inspector: `plugins/longevity/pdf/pdf-inspector.ts`
