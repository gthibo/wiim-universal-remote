import "server-only";
import path from "node:path";

/**
 * Server-side runtime configuration, read once from the environment.
 * Never import this from client components.
 */

function bool(v: string | undefined, fallback = false): boolean {
  if (v == null) return fallback;
  return ["1", "true", "yes", "on"].includes(v.toLowerCase());
}

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");

export const config = {
  dataDir: DATA_DIR,
  dbPath: path.join(DATA_DIR, "wiim.db"),

  /** Public origin (https://...) used for strict CSRF origin checks. */
  appOrigin: process.env.APP_ORIGIN?.replace(/\/$/, "") || "",

  /** Honour X-Forwarded-* from the (trusted) Zoraxy reverse proxy. */
  trustProxy: bool(process.env.TRUST_PROXY, true),

  isProduction: process.env.NODE_ENV === "production",

  /**
   * Mark session cookies Secure (https-only). Defaults to true in production.
   * Set COOKIE_SECURE=false ONLY for plain-http testing over a LAN IP — behind
   * https (Zoraxy) leave it on.
   */
  cookieSecure: bool(process.env.COOKIE_SECURE, process.env.NODE_ENV === "production"),

  /** Optional mutual-TLS override for the device connection. */
  wiimClientCertPath: process.env.WIIM_CLIENT_CERT_PATH || "",
  wiimClientKeyPath: process.env.WIIM_CLIENT_KEY_PATH || "",

  /**
   * AUTH_SECRET — HMAC pepper for session-token hashing (see db/sessions.ts).
   * A DB leak alone can't forge sessions without it. Changing it logs everyone
   * out. Falls back in dev; never throws at import so the build can't break.
   */
  authSecret:
    process.env.AUTH_SECRET && process.env.AUTH_SECRET.length >= 16
      ? process.env.AUTH_SECRET
      : "dev-insecure-secret-do-not-use-in-production",

  authSecretIsWeak: !(process.env.AUTH_SECRET && process.env.AUTH_SECRET.length >= 16),
} as const;

/** Turnstile keys may live in env OR be set later via the Settings UI. */
export const envTurnstile = {
  siteKey: process.env.TURNSTILE_SITE_KEY || "",
  secretKey: process.env.TURNSTILE_SECRET_KEY || "",
};
