import { decryptBytes, encryptBytes } from "../backup-encryption";

function bytesFrom(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function textFrom(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

const KEY = new Uint8Array(32).map((_, i) => i);
const IV = new Uint8Array(16).map((_, i) => 15 - i);

describe("encryptBytes / decryptBytes", () => {
  test("round-trips arbitrary content", () => {
    const plaintext = bytesFrom("SQLite format 3\0 — pretend this is a database file");
    const encrypted = encryptBytes(plaintext, KEY, IV);
    const decrypted = decryptBytes(encrypted, KEY);
    expect(textFrom(decrypted)).toBe(textFrom(plaintext));
  });

  test("ciphertext differs from plaintext and carries the IV prefix", () => {
    const plaintext = bytesFrom("some content");
    const encrypted = encryptBytes(plaintext, KEY, IV);
    expect(encrypted.slice(0, 16)).toEqual(IV);
    expect(encrypted.slice(16)).not.toEqual(plaintext);
  });

  test("decrypting with the wrong key produces different bytes", () => {
    const plaintext = bytesFrom("sensitive financial data");
    const encrypted = encryptBytes(plaintext, KEY, IV);
    const wrongKey = new Uint8Array(32).fill(1);
    const decrypted = decryptBytes(encrypted, wrongKey);
    expect(textFrom(decrypted)).not.toBe(textFrom(plaintext));
  });

  test("rejects a key of the wrong length", () => {
    expect(() => encryptBytes(bytesFrom("x"), new Uint8Array(16), IV)).toThrow();
  });

  test("rejects an IV of the wrong length", () => {
    expect(() => encryptBytes(bytesFrom("x"), KEY, new Uint8Array(8))).toThrow();
  });

  test("rejects a payload too short to contain an IV on decrypt", () => {
    expect(() => decryptBytes(new Uint8Array(4), KEY)).toThrow();
  });
});
