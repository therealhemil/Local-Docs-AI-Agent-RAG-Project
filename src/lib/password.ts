import { randomBytes, scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

/**
 * Hashes a plaintext password securely using scrypt with a random salt.
 * Returns format: "salt:derivedKeyHex"
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${derivedKey.toString("hex")}`;
}

/**
 * Verifies a plaintext password against a stored "salt:derivedKeyHex" hash.
 * Uses timingSafeEqual to protect against timing attacks.
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    const [salt, keyHex] = storedHash.split(":");
    if (!salt || !keyHex) return false;

    const keyBuffer = Buffer.from(keyHex, "hex");
    const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;

    return timingSafeEqual(keyBuffer, derivedKey);
  } catch (err) {
    console.error("[Password] Verification error:", err);
    return false;
  }
}
