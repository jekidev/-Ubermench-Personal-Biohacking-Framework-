import { spawnSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'path';

const root = path.resolve(import.meta.dirname, '..');
const stateDir = path.join(root, '.runtime');
const stateFile = path.join(stateDir, 'deployment-state.json');

function run(command, args, env = process.env) {
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit', shell: process.platform === 'win32', env });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const platform = process.env.REPL_ID ? 'replit' : process.env.MANUS_PROJECT_ID || process.env.MANUS_ENV ? 'manus' : 'local';
console.log(`Ubermench deployment bootstrap: ${platform}`);

// T1 has a lockfile; Ubermench currently does not, so do not require --frozen-lockfile here.
run('pnpm', ['install']);
run('pnpm', ['typecheck']);
run('pnpm', ['test']);
run('pnpm', ['generate']);

const googleDriveConnected = Boolean(process.env.GOOGLE_DRIVE_CONNECTION_ID || process.env.GOOGLE_DRIVE_ACCESS_TOKEN || process.env.GOOGLE_DRIVE_RAG_PATH);
await mkdir(stateDir, { recursive: true });
await writeFile(stateFile, `${JSON.stringify({ platform, googleDriveConnected, checkedAt: new Date().toISOString() }, null, 2)}\n`);

if (!googleDriveConnected) {
  console.log('\nGoogle Drive is not connected. OAuth credentials must remain in platform connections/secrets.');
  if (platform === 'replit') console.log('Connect Google Drive in Replit Connections, then rerun: pnpm deployment:replit');
  else if (platform === 'manus') console.log('Connect Google Drive in Manus, then rerun: pnpm deployment:manus');
  else console.log('For local use, set GOOGLE_DRIVE_RAG_PATH to a synchronized local Drive folder.');
  process.exit(2);
}

console.log('Google Drive connection detected. Deployment validation completed.');
