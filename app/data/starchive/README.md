# Agent star archive

This folder is the committed STARCHIVE snapshot that Cursor agents should read.

- `catalog.json` — structured starred repositories for `jekidev`
- `starred_repos.csv` — STARCHIVE CSV export

The portable multi-IDE copy with genre files is https://github.com/jekidev/stararchive

Cursor skill: `.cursor/skills/github-starred-repos/SKILL.md`

Refresh:

```bash
GITHUB_USERNAME=jekidev npm run starchive -- --snapshot
```
