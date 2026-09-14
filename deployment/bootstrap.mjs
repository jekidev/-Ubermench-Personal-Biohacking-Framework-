import { spawnSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const stateDir = path.join(root, '.runtime');
const stateFile = path.join(stateDir, 'deployment-state.json');

function run(command, args, env = process.env) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env,
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const platform = process.env.DEPLOYMENT_TARGET
  ?? (process.env.REPL_ID ? 'replit' : process.env.MANUS_PROJECT_ID || process.env.MANUS_ENV ? 'manus' : 'local');

console.log(`Ubermench deployment bootstrap: ${platform}`);

run('npm', ['ci', '--no-audit', '--no-fund']);
run('npm', ['run', 'typecheck']);
run('npm', ['test']);
run('npm', ['run', 'build']);

const googleDriveConnected = process.env.GOOGLE_DRIVE_CONNECTED === 'true'
  || Boolean(
    process.env.GOOGLE_DRIVE_CONNECTION_ID
      || process.env.GOOGLE_DRIVE_ACCESS_TOKEN
      || process.env.GOOGLE_DRIVE_RAG_PATH,
  );

await mkdir(stateDir, { recursive: true });
await writeFile(
  stateFile,
  `${JSON.stringify({
    platform,
    googleDriveConnected,
    checkedAt: new Date().toISOString(),
  }, null, 2)}\n`,
);

if (!googleDriveConnected) {
  console.log('\nGoogle Drive is not connected. OAuth credentials must remain in platform connections/secrets.');
  if (platform === 'replit') console.log('Connect Google Drive in Replit Connections, then set GOOGLE_DRIVE_CONNECTED=true and rerun: npm run deployment:replit');
  else if (platform === 'manus') console.log('Connect Google Drive in Manus, then set GOOGLE_DRIVE_CONNECTED=true and rerun: npm run deployment:manus');
  else console.log('For local use, set GOOGLE_DRIVE_RAG_PATH to a synchronized local Drive folder.');
  process.exit(2);
}

console.log('\nGoogle Drive connection detected. Starting application server...');
run(process.execPath, ['.output/server/index.mjs'], {
  ...process.env,
  NODE_ENV: 'production',
});
