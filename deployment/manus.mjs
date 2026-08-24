import { spawnSync } from 'node:child_process';

const result = spawnSync('pnpm', ['deployment:bootstrap'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: { ...process.env, DEPLOYMENT_TARGET: 'manus', MANUS_ENV: process.env.MANUS_ENV ?? '1' },
});

process.exit(result.status ?? 1);
