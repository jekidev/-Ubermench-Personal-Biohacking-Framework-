#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import { mkdtempSync } from 'node:fs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const runtimeDir = join(root, '.runtime', 'starchive')
const snapshotDir = join(root, 'app', 'data', 'starchive')
const upstreamDir = join(root, 'tools', 'starchive')
const DEFAULT_USERNAME = 'jekidev'

function parseArgs(argv) {
  const flags = new Set(argv.filter((arg) => arg.startsWith('--')))
  return {
    upstream: flags.has('--upstream'),
    snapshot: flags.has('--snapshot'),
    help: flags.has('--help') || flags.has('-h'),
  }
}

async function resolveIdentity() {
  const username = process.env.GITHUB_USERNAME?.trim()
    || await runCommand('gh', ['api', 'user', '--jq', '.login']).catch(() => '')
    || DEFAULT_USERNAME
  const token = process.env.GITHUB_TOKEN?.trim() || process.env.GH_TOKEN?.trim()
    || await runCommand('gh', ['auth', 'token']).catch(() => '')
  return { username, token: token || undefined }
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'], ...options })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => { stdout += chunk })
    child.stderr.on('data', (chunk) => { stderr += chunk })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) resolve(stdout.trim())
      else reject(new Error(stderr.trim() || `${command} exited with ${code}`))
    })
  })
}

async function runUpstreamPython(username, token, outputDir) {
  if (!token) throw new Error('The upstream Python script requires GITHUB_TOKEN')
  const sourcePath = join(upstreamDir, 'StarredRepoLists.py')
  const source = await readFile(sourcePath, 'utf8')
  const patched = source
    .replace('GITHUB_USERNAME = "<your_username>"', `GITHUB_USERNAME = ${JSON.stringify(username)}`)
    .replace('GITHUB_TOKEN = "<your_personal_access_token>"', `GITHUB_TOKEN = ${JSON.stringify(token)}`)
    .replace('OUTPUT_CSV = "starred_repo_lists.csv"', `OUTPUT_CSV = ${JSON.stringify(join(outputDir, 'starred_repo_lists.csv'))}`)
  const workDir = mkdtempSync(join(tmpdir(), 'starchive-'))
  const scriptPath = join(workDir, 'StarredRepoLists.py')
  await writeFile(scriptPath, patched, 'utf8')
  await runCommand('python3', [scriptPath], { cwd: workDir })
  console.log(`Wrote ${join(outputDir, 'starred_repo_lists.csv')} via upstream STARCHIVE Python script`)
}

async function fetchJson(url, token) {
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'Ubermench-STARCHIVE',
  }
  if (token) headers.Authorization = `Bearer ${token}`
  const response = await fetch(url, { headers })
  if (response.status === 401 || response.status === 403) {
    throw new Error('GitHub authentication failed. Check the token and public_repo scope.')
  }
  if (!response.ok) throw new Error(`GitHub request failed (${response.status}) for ${url}`)
  return { payload: await response.json(), link: response.headers.get('link') }
}

function parseNext(link) {
  const match = link?.match(/<([^>]+)>\s*;\s*rel="next"/i)
  return match?.[1] ?? null
}

function csvField(value) {
  const text = value == null ? '' : String(value)
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

async function exportWithApi(username, token, outputDir, snapshot) {
  const repos = []
  let url = `https://api.github.com/users/${encodeURIComponent(username)}/starred?per_page=100`
  while (url) {
    const { payload, link } = await fetchJson(url, token)
    if (!Array.isArray(payload)) throw new Error('GitHub starred response must be an array')
    for (const repo of payload) {
      repos.push({
        fullName: repo.full_name,
        description: (repo.description || '').replace(/\n/g, ' ').replace(/\t/g, ' '),
        htmlUrl: repo.html_url,
        language: repo.language || null,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        createdAt: repo.created_at,
        updatedAt: repo.updated_at,
        listed: false,
      })
    }
    url = parseNext(link)
  }

  const header = 'full_name,description,html_url,language,stargazers_count,forks_count,created_at,updated_at'
  const rows = repos.map((repo) => [
    csvField(repo.fullName),
    csvField(repo.description),
    csvField(repo.htmlUrl),
    csvField(repo.language),
    csvField(repo.stars),
    csvField(repo.forks),
    csvField(repo.createdAt),
    csvField(repo.updatedAt),
  ].join(','))
  const csv = [header, ...rows].join('\n') + '\n'
  const reposPath = join(outputDir, 'starred_repos.csv')
  await writeFile(reposPath, csv, 'utf8')
  if (snapshot) {
    const catalog = {
      username,
      exportedAt: new Date().toISOString(),
      repos,
      lists: [],
    }
    await writeFile(join(outputDir, 'catalog.json'), `${JSON.stringify(catalog, null, 2)}\n`, 'utf8')
  }
  console.log(`Fetched ${repos.length} starred repositories for ${username}`)
  console.log(`Wrote ${reposPath}`)
  if (snapshot) console.log(`Wrote ${join(outputDir, 'catalog.json')} for Cursor agents`)
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help) {
    console.log(`Usage: node scripts/starchive.mjs [--snapshot] [--upstream]

Exports GitHub starred repositories in STARCHIVE CSV format for Ubermench agents.

Credentials:
  GITHUB_USERNAME       defaults to jekidev
  GITHUB_TOKEN          optional for public stars; needed for private/hidden stars

Options:
  --snapshot   Write the agent catalog to app/data/starchive/
  --upstream   Run the vendored Python script from tools/starchive
  --help       Show this message
`)
    return
  }

  const { username, token } = await resolveIdentity()
  const outputDir = args.snapshot ? snapshotDir : runtimeDir
  await mkdir(outputDir, { recursive: true })
  if (args.upstream) await runUpstreamPython(username, token, outputDir)
  else await exportWithApi(username, token, outputDir, args.snapshot)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
