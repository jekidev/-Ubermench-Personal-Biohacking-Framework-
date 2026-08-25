import type { BiologyBackup } from './biology-backup'
import { parseBiologyBackup, serializeBiologyBackup } from './biology-backup'

export const ENCRYPTED_BIOLOGY_BACKUP_VERSION = 1 as const
const PBKDF2_ITERATIONS = 210_000
const SALT_BYTES = 16
const IV_BYTES = 12
const GCM_TAG_BYTES = 16

export interface EncryptedBiologyBackup {
  format: 'ubermench-encrypted-biology-backup'
  version: typeof ENCRYPTED_BIOLOGY_BACKUP_VERSION
  exportedAt: string
  kdf: 'PBKDF2-SHA-256'
  iterations: number
  cipher: 'AES-256-GCM'
  salt: string
  iv: string
  ciphertext: string
}

export async function encryptBiologyBackup(
  backup: BiologyBackup,
  passphrase: string,
  exportedAt = new Date().toISOString(),
): Promise<EncryptedBiologyBackup> {
  assertPassphrase(passphrase)
  const cryptoApi = getCrypto()
  const salt = cryptoApi.getRandomValues(new Uint8Array(SALT_BYTES))
  const iv = cryptoApi.getRandomValues(new Uint8Array(IV_BYTES))
  const key = await deriveKey(passphrase, salt)
  const plaintext = new TextEncoder().encode(serializeBiologyBackup(backup))
  const encrypted = await cryptoApi.subtle.encrypt(
    { name: 'AES-GCM', iv: asArrayBufferView(iv) },
    key,
    asArrayBufferView(plaintext),
  )

  return {
    format: 'ubermench-encrypted-biology-backup',
    version: ENCRYPTED_BIOLOGY_BACKUP_VERSION,
    exportedAt,
    kdf: 'PBKDF2-SHA-256',
    iterations: PBKDF2_ITERATIONS,
    cipher: 'AES-256-GCM',
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(encrypted)),
  }
}

export async function decryptBiologyBackup(
  envelope: EncryptedBiologyBackup,
  passphrase: string,
): Promise<BiologyBackup> {
  assertPassphrase(passphrase)
  validateEnvelope(envelope)
  const cryptoApi = getCrypto()
  const key = await deriveKey(passphrase, base64ToBytes(envelope.salt))
  let plaintext: ArrayBuffer
  try {
    plaintext = await cryptoApi.subtle.decrypt(
      { name: 'AES-GCM', iv: asArrayBufferView(base64ToBytes(envelope.iv)) },
      key,
      asArrayBufferView(base64ToBytes(envelope.ciphertext)),
    )
  } catch {
    throw new Error('Unable to decrypt biology backup: incorrect passphrase or corrupted data')
  }

  return parseBiologyBackup(new TextDecoder().decode(plaintext))
}

export function serializeEncryptedBiologyBackup(envelope: EncryptedBiologyBackup): string {
  validateEnvelope(envelope)
  return JSON.stringify(envelope, null, 2)
}

export function parseEncryptedBiologyBackup(raw: string): EncryptedBiologyBackup {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('Invalid encrypted Ubermench biology backup JSON')
  }
  if (!isRecord(parsed)) throw new Error('Invalid encrypted Ubermench biology backup')
  validateEnvelope(parsed)
  return parsed as unknown as EncryptedBiologyBackup
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const cryptoApi = getCrypto()
  const material = await cryptoApi.subtle.importKey(
    'raw',
    asArrayBufferView(new TextEncoder().encode(passphrase)),
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  return cryptoApi.subtle.deriveKey(
    { name: 'PBKDF2', salt: asArrayBufferView(salt), iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

function validateEnvelope(value: unknown): asserts value is EncryptedBiologyBackup {
  if (!isRecord(value)) throw new Error('Invalid encrypted Ubermench biology backup')
  if (value.format !== 'ubermench-encrypted-biology-backup' || value.version !== ENCRYPTED_BIOLOGY_BACKUP_VERSION) {
    throw new Error('Unsupported encrypted Ubermench biology backup version')
  }
  if (value.kdf !== 'PBKDF2-SHA-256' || value.cipher !== 'AES-256-GCM') {
    throw new Error('Unsupported encrypted biology backup cryptography')
  }
  if (typeof value.iterations !== 'number' || value.iterations !== PBKDF2_ITERATIONS) {
    throw new Error('Unsupported encrypted biology backup KDF parameters')
  }
  for (const field of ['exportedAt', 'salt', 'iv', 'ciphertext']) {
    if (typeof value[field] !== 'string' || value[field].length === 0) {
      throw new Error(`Encrypted biology backup field is invalid: ${field}`)
    }
  }

  const salt = decodeBase64Field(value.salt, 'salt')
  const iv = decodeBase64Field(value.iv, 'iv')
  const ciphertext = decodeBase64Field(value.ciphertext, 'ciphertext')
  if (salt.byteLength !== SALT_BYTES) throw new Error('Encrypted biology backup salt length is invalid')
  if (iv.byteLength !== IV_BYTES) throw new Error('Encrypted biology backup IV length is invalid')
  if (ciphertext.byteLength < GCM_TAG_BYTES) throw new Error('Encrypted biology backup ciphertext is invalid')
}

function assertPassphrase(passphrase: string): void {
  if (passphrase.length < 12) throw new Error('Backup passphrase must be at least 12 characters')
}

function getCrypto(): Crypto {
  if (!globalThis.crypto?.subtle) throw new Error('Web Crypto API is unavailable in this runtime')
  return globalThis.crypto
}

function asArrayBufferView(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  return new Uint8Array(bytes) as Uint8Array<ArrayBuffer>
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value)
  return Uint8Array.from(binary, character => character.charCodeAt(0))
}

function decodeBase64Field(value: string, field: string): Uint8Array {
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) {
    throw new Error(`Encrypted biology backup field is not valid base64: ${field}`)
  }
  try {
    return base64ToBytes(value)
  } catch {
    throw new Error(`Encrypted biology backup field is not valid base64: ${field}`)
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
