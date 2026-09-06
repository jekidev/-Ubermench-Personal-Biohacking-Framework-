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
