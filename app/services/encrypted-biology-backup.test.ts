import { describe, expect, it } from 'vitest'
import { createBiologyBackup } from './biology-backup'
import {
  decryptBiologyBackup,
  encryptBiologyBackup,
  parseEncryptedBiologyBackup,
  serializeEncryptedBiologyBackup,
} from './encrypted-biology-backup'
import { emptyBiologyProfile } from './biology-store'

describe('encrypted biology backup', () => {
  it('encrypts and decrypts a biology backup without changing its contents', async () => {
    const profile = emptyBiologyProfile()
    profile.goals = ['healthspan']
    const backup = createBiologyBackup(profile, '2026-08-25T09:00:00.000Z')

    const encrypted = await encryptBiologyBackup(backup, 'correct horse battery staple')
    const parsedEnvelope = parseEncryptedBiologyBackup(serializeEncryptedBiologyBackup(encrypted))
    const decrypted = await decryptBiologyBackup(parsedEnvelope, 'correct horse battery staple')

    expect(decrypted).toEqual(backup)
    expect(encrypted.cipher).toBe('AES-256-GCM')
    expect(encrypted.kdf).toBe('PBKDF2-SHA-256')
  })

  it('rejects short passphrases', async () => {
    const backup = createBiologyBackup(emptyBiologyProfile())
    await expect(encryptBiologyBackup(backup, 'too-short')).rejects.toThrow(/12 characters/)
  })

  it('rejects an incorrect passphrase and tampered ciphertext', async () => {
    const backup = createBiologyBackup(emptyBiologyProfile())
    const encrypted = await encryptBiologyBackup(backup, 'correct horse battery staple')

    await expect(decryptBiologyBackup(encrypted, 'wrong horse battery staple')).rejects.toThrow(/incorrect passphrase/)

    const tampered = { ...encrypted, ciphertext: `${encrypted.ciphertext.slice(0, -2)}AA` }
    await expect(decryptBiologyBackup(tampered, 'correct horse battery staple')).rejects.toThrow()
  })

  it('rejects unsupported encrypted formats and invalid binary fields', () => {
    expect(() => parseEncryptedBiologyBackup(JSON.stringify({ format: 'other', version: 1 }))).toThrow()
    expect(() => parseEncryptedBiologyBackup(JSON.stringify({
      format: 'ubermench-encrypted-biology-backup',
      version: 1,
      exportedAt: '2026-08-25T09:00:00.000Z',
      kdf: 'PBKDF2-SHA-256',
      iterations: 1,
      cipher: 'AES-256-GCM',
      salt: 'AA==',
      iv: 'AA==',
      ciphertext: 'AA==',
    }))).toThrow(/KDF parameters/)

    const base = {
      format: 'ubermench-encrypted-biology-backup',
      version: 1,
      exportedAt: '2026-08-25T09:00:00.000Z',
      kdf: 'PBKDF2-SHA-256',
      iterations: 210_000,
      cipher: 'AES-256-GCM',
      salt: 'AA==',
      iv: 'AA==',
      ciphertext: 'AA==',
    }
    expect(() => parseEncryptedBiologyBackup(JSON.stringify(base))).toThrow(/salt length is invalid/)
    expect(() => parseEncryptedBiologyBackup(JSON.stringify({ ...base, salt: 'AAAAAAAAAAAAAAAAAAAAAA==' }))).toThrow(
      /IV length is invalid/,
    )
    expect(() => parseEncryptedBiologyBackup(JSON.stringify({ ...base, salt: 'AAAAAAAAAAAAAAAAAAAAAA==', iv: 'not-base64' }))).toThrow(
      /not valid base64/,
    )
  })
})
