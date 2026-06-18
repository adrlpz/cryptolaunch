import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const SALT_LENGTH = 32;
const TAG_LENGTH = 16;

function getKey(salt: Buffer): Buffer {
  const secret = process.env.ENCRYPTION_KEY;
  if (!secret) {
    throw new Error("ENCRYPTION_KEY environment variable is required");
  }
  if (secret.length < 32) {
    throw new Error("ENCRYPTION_KEY must be at least 32 characters");
  }
  return crypto.scryptSync(secret, salt, 32);
}

/**
 * Encrypt a string (e.g., private key).
 * Format: salt(hex):iv(hex):authTag(hex):ciphertext(hex)
 */
export function encrypt(text: string): string {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = getKey(salt);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");

  return [
    salt.toString("hex"),
    iv.toString("hex"),
    authTag,
    encrypted,
  ].join(":");
}

/**
 * Decrypt an encrypted string.
 * Expects format: salt(hex):iv(hex):authTag(hex):ciphertext(hex)
 */
export function decrypt(encryptedText: string): string {
  const parts = encryptedText.split(":");

  if (parts.length !== 4) {
    throw new Error(
      "Invalid encrypted format. Expected salt:iv:authTag:ciphertext (4 parts). " +
      "If upgrading from legacy format, re-encrypt affected data."
    );
  }

  const [saltHex, ivHex, authTagHex, ciphertext] = parts;
  const salt = Buffer.from(saltHex, "hex");
  const key = getKey(salt);
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
