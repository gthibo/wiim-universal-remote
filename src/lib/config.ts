import "server-only";

/**
 * Server-side runtime configuration, read once from the environment.
 *
 * Headless build: this file is deliberately tiny. The dashboard's config
 * (data dir, SQLite path, session/CSRF origin, cookie flags, AUTH_SECRET,
 * Turnstile keys) was removed with the database and auth stack -- keeping
 * dead keys here would imply this service has a DB, which it does not.
 *
 * REMOTE_TOKEN is intentionally NOT here: lib/remote/auth.ts reads it from
 * process.env at request time so the token can be changed without a rebuild.
 */
export const config = {
  /**
   * Optional mutual-TLS override for the device connection. Most WiiM units
   * accept plain TLS with verification disabled (the default in client.ts);
   * a few newer firmwares require the LinkPlay client certificate.
   */
  wiimClientCertPath: process.env.WIIM_CLIENT_CERT_PATH || "",
  wiimClientKeyPath: process.env.WIIM_CLIENT_KEY_PATH || "",
} as const;
