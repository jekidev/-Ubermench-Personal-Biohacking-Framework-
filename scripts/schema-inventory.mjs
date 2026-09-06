#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function read(path) {
  return readFileSync(join(root, path), 'utf8')
}

function extractConst(source, name) {
  const match = source.match(new RegExp(`export const ${name}\\s*=\\s*(\\d+)`))
  return match ? Number(match[1]) : null
}

const biologyBackup = read('app/services/biology-backup.ts')
const personalState = read('app/services/personal-state-store.ts')
const biologyTypes = read('app/types/biology.ts')

const inventory = {
  biologyBackupVersion: extractConst(biologyBackup, 'BIOLOGY_BACKUP_VERSION'),
  personalStateSchemaVersion: extractConst(personalState, 'PERSONAL_STATE_SCHEMA_VERSION'),
  biologyProfileVersion: biologyTypes.includes('version: 1') ? 1 : null,
  generatedAt: new Date().toISOString(),
}

const missing = Object.entries(inventory).filter(([key, value]) => key !== 'generatedAt' && value == null)
if (missing.length) {
  console.error('Schema inventory incomplete:', missing.map(([key]) => key).join(', '))
  process.exit(1)
}

console.log(JSON.stringify(inventory, null, 2))
