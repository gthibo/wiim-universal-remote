import "server-only";
import { countRecentFailures, countRecentFailuresGlobal } from "@/lib/db/login-attempts";

export const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
export const MAX_FAILURES = 8; // per IP
export const MAX_FAILURES_GLOBAL = 40; // across all IPs (XFF-rotation defence)

export interface RateState {
  allowed: boolean;
  failures: number;
  remaining: number;
  retryAfterMs: number;
}

/**
 * Login throttling. Blocks when EITHER the per-IP limit OR a global limit is
 * exceeded. The global cap means spoofing X-Forwarded-For to rotate the
 * apparent IP cannot grant unlimited brute-force attempts.
 */
export function checkLoginRateLimit(ip: string): RateState {
  const failures = countRecentFailures(ip, LOGIN_WINDOW_MS);
  const global = countRecentFailuresGlobal(LOGIN_WINDOW_MS);
  const allowed = failures < MAX_FAILURES && global < MAX_FAILURES_GLOBAL;
  return {
    allowed,
    failures,
    remaining: Math.max(0, MAX_FAILURES - failures),
    retryAfterMs: allowed ? 0 : LOGIN_WINDOW_MS,
  };
}
