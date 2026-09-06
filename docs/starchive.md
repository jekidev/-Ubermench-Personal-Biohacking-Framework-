# STARCHIVE

Ubermench vendors [jwardsmith/STARCHIVE](https://github.com/jwardsmith/STARCHIVE) as a read-only GitHub starred-repository exporter.

Pinned upstream commit: `620d8c7b95ae88128c8c692c2156a700228bddea`

## What was installed

- Git submodule at `tools/starchive` (original PowerShell + Python scripts)
- TypeScript client in `app/services/starchive.ts` (no hardcoded credentials)
- Dashboard page at `/starchive`
- CLI at `scripts/starchive.mjs`

STARCHIVE does not modify GitHub stars, lists, or repositories.

## Credentials

Do not put tokens in source files. Use environment variables or the secret vault.

```bash
export GITHUB_USERNAME=your-username
export GITHUB_TOKEN=your-token   # public_repo scope
```

An authenticated GitHub CLI session (`gh auth login`) also works for the CLI.

## Usage

App:

1. Open **STARCHIVE** in the sidebar
2. Enter GitHub username and token
3. Fetch starred repos
4. Download `starred_repos.csv` or `starred_repo_lists.csv`

CLI:

```bash
npm run starchive
npm run starchive -- --upstream
```

`--upstream` runs the vendored Python script from `tools/starchive` with credentials injected at runtime. It writes `.runtime/starchive/starred_repo_lists.csv`.

The default CLI path uses the GitHub REST API and writes `.runtime/starchive/starred_repos.csv`.

## CSV columns

`starred_repos.csv` matches the upstream PowerShell export:

`full_name,description,html_url,language,stargazers_count,forks_count,created_at,updated_at`

`starred_repo_lists.csv` matches the upstream Python export:

`repo_full_name,repo_url,description,stars,list_name`

List detection scrapes the public GitHub Stars HTML, so it can fail in the browser because of CORS. The flat starred-repo export still works through the GitHub API.

## Python extras

```bash
python3 -m pip install -r tools/starchive-requirements.txt
```
