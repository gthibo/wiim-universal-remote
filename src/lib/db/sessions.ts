import "server-only";
import { createHmac } from "node:crypto";
import { getDb, now } from "./index";
import { config } from "@/lib/config";
import type { UserRow } from "./users";

export interface SessionRow {
  id: string;
  user_id: string;
  created_at: number;
  expires_at: number;
  last_seen: number;
  ip: string | null;
  user_agent: string | null;
}

/**
 * Sessions are stored by an HMAC of the opaque token (keyed by AUTH_SECRET),
 * never the token itself. The secret acts as a pepper: a DB leak alone cannot
 * be used to look up or forge sessions without also knowing AUTH_SECRET.
 */
function hashToken(token: string): string {
  return createHmac("sha256", config.authSecret).update(token).digest("hex");
}

export function createSession(
  userId: string,
  token: string,
  ttlMs: number,
  meta: { ip?: string | null; userAgent?: string | null } = {},
): void {
  const ts = now();
  getDb()
    .prepare(
      `INSERT INTO sessions (id, user_id, created_at, expires_at, last_seen, ip, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(hashToken(token), userId, ts, ts + ttlMs, ts, meta.ip ?? null, meta.userAgent ?? null);
}

export interface SessionWithUser {
  session: SessionRow;
  user: UserRow;
}

export function getSessionByToken(token: string): SessionWithUser | null {
  const id = hashToken(token);
  const row = getDb()
    .prepare(
      `SELECT s.id AS s_id, s.user_id, s.created_at AS s_created, s.expires_at, s.last_seen, s.ip, s.user_agent,
              u.id AS u_id, u.username, u.password_hash, u.totp_secret, u.totp_enabled,
              u.created_at AS u_created, u.updated_at AS u_updated
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.id = ?`,
    )
    .get(id) as Record<string, unknown> | undefined;
  if (!row) return null;
  if ((row.expires_at as number) < now()) {
    deleteSessionById(id);
    return null;
  }
  return {
    session: {
      id: row.s_id as string,
      user_id: row.user_id as string,
      created_at: row.s_created as number,
      expires_at: row.expires_at as number,
      last_seen: row.last_seen as number,
      ip: (row.ip as string) ?? null,
      user_agent: (row.user_agent as string) ?? null,
    },
    user: {
      id: row.u_id as string,
      username: row.username as string,
      password_hash: row.password_hash as string,
      totp_secret: (row.totp_secret as string) ?? null,
      totp_enabled: row.totp_enabled as number,
      created_at: row.u_created as number,
      updated_at: row.u_updated as number,
    },
  };
}

/** Sliding renewal: bump last_seen and extend expiry. */
export function touchSession(token: string, ttlMs: number): void {
  const ts = now();
  getDb()
    .prepare("UPDATE sessions SET last_seen = ?, expires_at = ? WHERE id = ?")
    .run(ts, ts + ttlMs, hashToken(token));
}

export function deleteSessionByToken(token: string): void {
  deleteSessionById(hashToken(token));
}

function deleteSessionById(id: string): void {
  getDb().prepare("DELETE FROM sessions WHERE id = ?").run(id);
}

export function deleteAllSessionsForUser(userId: string): void {
  getDb().prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
}

export function purgeExpiredSessions(): void {
  getDb().prepare("DELETE FROM sessions WHERE expires_at < ?").run(now());
}
