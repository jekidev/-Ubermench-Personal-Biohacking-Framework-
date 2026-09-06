# Agent star archive

This folder is the committed STARCHIVE snapshot that Cursor agents should read.

- `catalog.json` — structured starred repositories for `jekidev`
- `starred_repos.csv` — STARCHIVE CSV export

Refresh:

```bash
GITHUB_USERNAME=jekidev npm run starchive -- --snapshot
```
