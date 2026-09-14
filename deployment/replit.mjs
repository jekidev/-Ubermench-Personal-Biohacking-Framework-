import { spawnSync } from 'node:child_process';

const result = spawnSync('npm', ['run', 'deployment:bootstrap'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: { ...process.env, DEPLOYMENT_TARGET: 'replit' },
});

process.exit(result.status ?? 1);
