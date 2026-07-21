import "server-only";
import { getDb, now } from "./index";

/** Brute-force protection: track failed logins per IP. */

export function recordAttempt(ip: string, username: string | null, success: boolean): void {
  getDb()
    .prepare("INSERT INTO login_attempts (ip, username, ts, success) VALUES (?, ?, ?, ?)")
    .run(ip, username, now(), success ? 1 : 0);
}

export function countRecentFailures(ip: string, windowMs: number): number {
  const since = now() - windowMs;
  const row = getDb()
    .prepare(
      "SELECT COUNT(*) AS n FROM login_attempts WHERE ip = ? AND success = 0 AND ts >= ?",
    )
    .get(ip, since) as { n: number };
  return row.n;
}

/** Total failures across all IPs — defends against X-Forwarded-For rotation. */
export function countRecentFailuresGlobal(windowMs: number): number {
  const since = now() - windowMs;
  const row = getDb()
    .prepare("SELECT COUNT(*) AS n FROM login_attempts WHERE success = 0 AND ts >= ?")
    .get(since) as { n: number };
  return row.n;
}

export function clearFailures(ip: string): void {
  getDb().prepare("DELETE FROM login_attempts WHERE ip = ? AND success = 0").run(ip);
}

/** Housekeeping: drop attempts older than the window. */
export function purgeOldAttempts(windowMs: number): void {
  getDb().prepare("DELETE FROM login_attempts WHERE ts < ?").run(now() - windowMs);
}
