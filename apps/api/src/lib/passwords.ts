import crypto from "crypto";

/**
 * Standard Scrypt Password Hasher with 16-byte random salt
 */
export async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString("hex");
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`${salt}:${derivedKey.toString("hex")}`);
    });
  });
}

/**
 * Universal Password Verifier:
 * - Scrypt format: salt:derivedKey
 * - SHA-256 format: 64-char hex string
 * - Better-Auth internal verify fallback
 * - Plaintext format fallback
 */
export async function verifyPassword({
  hash,
  password,
}: {
  hash: string;
  password?: string;
}): Promise<boolean> {
  if (!hash || typeof hash !== "string" || !password || typeof password !== "string") {
    return false;
  }

  // 1. Scrypt format (salt:key)
  if (hash.includes(":")) {
    const parts = hash.split(":");
    if (parts.length === 2 && parts[0] && parts[1]) {
      const [salt, key] = parts;
      const isScryptMatch = await new Promise<boolean>((resolve) => {
        crypto.scrypt(password, salt, 64, (err, derivedKey) => {
          if (err) return resolve(false);
          try {
            const keyBuffer = Buffer.from(key, "hex");
            if (keyBuffer.length !== derivedKey.length) return resolve(false);
            resolve(crypto.timingSafeEqual(keyBuffer, derivedKey));
          } catch {
            resolve(false);
          }
        });
      });
      if (isScryptMatch) return true;
    }
  }

  // 2. SHA-256 hex string (64 chars)
  if (hash.length === 64) {
    const shaHash = crypto.createHash("sha256").update(password).digest("hex");
    if (shaHash.toLowerCase() === hash.toLowerCase()) {
      return true;
    }
  }

  // 3. Better-Auth crypto verifier fallback
  try {
    const betterCrypto = await import("better-auth/crypto");
    if (betterCrypto && typeof (betterCrypto as any).verifyPassword === "function") {
      const res = await (betterCrypto as any).verifyPassword({ hash, password }).catch(() => false);
      if (res) return true;
    }
  } catch {}

  // 4. Plaintext comparison fallback
  return hash === password;
}
