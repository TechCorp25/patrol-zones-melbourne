import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scrypt = promisify(scryptCallback);
const SCRYPT_KEYLEN = 64;
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derivedKey = (await scrypt(password, salt, SCRYPT_KEYLEN)) as Buffer;

  return ["scrypt", salt.toString("hex"), derivedKey.toString("hex")].join("$");
}

export async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  const [algorithm, saltHex, keyHex] = storedHash.split("$");
  if (!algorithm || !saltHex || !keyHex) {
    return false;
  }

  if (algorithm !== "scrypt") {
    return false;
  }

  const salt = Buffer.from(saltHex, "hex");
  const expectedKey = Buffer.from(keyHex, "hex");

  const derivedKey = (await scrypt(password, salt, expectedKey.length)) as Buffer;

  return timingSafeEqual(expectedKey, derivedKey);
}

export function generateSessionToken(): string {
  return randomBytes(32).toString("hex");
}
