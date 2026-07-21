import "server-only";
import { envTurnstile } from "@/lib/config";
import { getSetting, SettingKeys, type TurnstileSettings } from "@/lib/db/settings";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** Effective Turnstile config: DB settings take precedence, else env. */
export function getTurnstileConfig(): TurnstileSettings {
  const fromDb = getSetting<TurnstileSettings | null>(SettingKeys.turnstile, null);
  if (fromDb && (fromDb.siteKey || fromDb.secretKey)) {
    return {
      enabled: fromDb.enabled && !!fromDb.siteKey && !!fromDb.secretKey,
      siteKey: fromDb.siteKey,
      secretKey: fromDb.secretKey,
    };
  }
  const enabled = !!envTurnstile.siteKey && !!envTurnstile.secretKey;
  return { enabled, siteKey: envTurnstile.siteKey, secretKey: envTurnstile.secretKey };
}

/** The site key is safe to expose to the browser (publishable). */
export function getPublicTurnstile(): { enabled: boolean; siteKey: string } {
  const c = getTurnstileConfig();
  return { enabled: c.enabled, siteKey: c.siteKey };
}

/**
 * Verify a Turnstile response token with Cloudflare. Returns true when
 * Turnstile is disabled (not configured) so login still works without it.
 */
export async function verifyTurnstile(token: string | null, ip: string): Promise<boolean> {
  const cfg = getTurnstileConfig();
  if (!cfg.enabled) return true;
  if (!token) return false;
  try {
    const body = new URLSearchParams();
    body.set("secret", cfg.secretKey);
    body.set("response", token);
    if (ip && ip !== "0.0.0.0") body.set("remoteip", ip);
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(8000),
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
