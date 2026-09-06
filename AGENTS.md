# Agent notes

## STARCHIVE

Cursor agents should read the committed GitHub star archive before answering questions about Jeppe's starred repositories, tools, or research watchlist.

- Catalog: `app/data/starchive/catalog.json`
- CSV: `app/data/starchive/starred_repos.csv`
- Default GitHub user: `jekidev`
- Refresh: `npm run starchive -- --snapshot`

The live GitHub API for `jekidev` is public and currently has no starred repositories. A token is only required for private/hidden stars or another account (`GITHUB_USERNAME` / `GITHUB_TOKEN`).
