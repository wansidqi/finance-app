import aesjs from "aes-js";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";

export const AES_KEY_LENGTH_BYTES = 32; // AES-256
export const IV_LENGTH_BYTES = 16;

const SECURE_STORE_KEY = "finance_backup_encryption_key_v1";

/**
 * Encrypts `data` with AES-256-CTR, prefixing the (unencrypted) 16-byte
 * counter/IV to the output so decryption never needs it passed separately —
 * the IV isn't a secret, only the key is.
 */
export function encryptBytes(data: Uint8Array, key: Uint8Array, iv: Uint8Array): Uint8Array {
  if (key.length !== AES_KEY_LENGTH_BYTES) throw new Error("key must be 32 bytes (AES-256)");
  if (iv.length !== IV_LENGTH_BYTES) throw new Error("iv must be 16 bytes");

  const cipher = new aesjs.ModeOfOperation.ctr(key, new aesjs.Counter(iv));
  const ciphertext = cipher.encrypt(data);

  const out = new Uint8Array(iv.length + ciphertext.length);
  out.set(iv, 0);
  out.set(ciphertext, iv.length);
  return out;
}

/** Reverses {@link encryptBytes} — reads the IV back off the front of `payload`. */
export function decryptBytes(payload: Uint8Array, key: Uint8Array): Uint8Array {
  if (key.length !== AES_KEY_LENGTH_BYTES) throw new Error("key must be 32 bytes (AES-256)");
  if (payload.length < IV_LENGTH_BYTES) throw new Error("payload too short to contain an IV");

  const iv = payload.slice(0, IV_LENGTH_BYTES);
  const ciphertext = payload.slice(IV_LENGTH_BYTES);
  const cipher = new aesjs.ModeOfOperation.ctr(key, new aesjs.Counter(iv));
  return cipher.decrypt(ciphertext);
}

export async function generateIv(): Promise<Uint8Array> {
  return Crypto.getRandomBytesAsync(IV_LENGTH_BYTES);
}

/**
 * Returns this device's backup encryption key, generating and persisting a
 * new random one on first use. The key never leaves the device except
 * through the user explicitly exporting {@link getEncryptionRecoveryKey} —
 * it is not derived from anything recoverable (e.g. a password), so losing
 * it means losing access to encrypted backups. Per plan.md's "Backup
 * Encryption" section, that's why a recovery-key export exists.
 */
export async function getOrCreateEncryptionKey(): Promise<Uint8Array> {
  const existing = await SecureStore.getItemAsync(SECURE_STORE_KEY);
  if (existing) return aesjs.utils.hex.toBytes(existing);

  const randomBytes = await Crypto.getRandomBytesAsync(AES_KEY_LENGTH_BYTES);
  await SecureStore.setItemAsync(SECURE_STORE_KEY, aesjs.utils.hex.fromBytes(randomBytes));
  return randomBytes;
}

/** The current device's encryption key as a hex string, for the user to save as a recovery key. Null if none has been generated yet. */
export async function getEncryptionRecoveryKey(): Promise<string | null> {
  return SecureStore.getItemAsync(SECURE_STORE_KEY);
}

/** Restores a previously-exported recovery key — needed to restore an encrypted backup on a different device, or after reinstalling. */
export async function importEncryptionRecoveryKey(hexKey: string): Promise<void> {
  const trimmed = hexKey.trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(trimmed)) {
    throw new Error("Recovery key must be a 64-character hex string");
  }
  await SecureStore.setItemAsync(SECURE_STORE_KEY, trimmed);
}
