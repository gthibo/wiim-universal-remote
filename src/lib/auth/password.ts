import "server-only";
import { hash, verify } from "@node-rs/argon2";

// Argon2id is @node-rs/argon2's default variant. OWASP-recommended cost.
const OPTS = {
  memoryCost: 19456, // 19 MiB
  timeCost: 2,
  parallelism: 1,
};

export function hashPassword(password: string): Promise<string> {
  return hash(password, OPTS);
}

export async function verifyPassword(hashStr: string, password: string): Promise<boolean> {
  try {
    // Cost params are embedded in the hash string; verify reads them from there.
    return await verify(hashStr, password);
  } catch {
    return false;
  }
}

/** Basic password policy for the first-run setup. */
export function validatePasswordStrength(pw: string): string | null {
  if (pw.length < 10) return "Password must be at least 10 characters.";
  if (pw.length > 200) return "Password is too long.";
  if (!/[a-z]/.test(pw) || !/[A-Z]/.test(pw) || !/[0-9]/.test(pw)) {
    return "Use upper- and lower-case letters and at least one number.";
  }
  return null;
}
