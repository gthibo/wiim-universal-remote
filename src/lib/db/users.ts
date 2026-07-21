import "server-only";
import { randomUUID } from "node:crypto";
import { getDb, now } from "./index";

export interface UserRow {
  id: string;
  username: string;
  password_hash: string;
  totp_secret: string | null;
  totp_enabled: number;
  created_at: number;
  updated_at: number;
}

export function countUsers(): number {
  const row = getDb().prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number };
  return row.n;
}

export function hasAnyUser(): boolean {
  return countUsers() > 0;
}

export function getUserByUsername(username: string): UserRow | undefined {
  return getDb()
    .prepare("SELECT * FROM users WHERE username = ? COLLATE NOCASE")
    .get(username) as UserRow | undefined;
}

export function getUserById(id: string): UserRow | undefined {
  return getDb().prepare("SELECT * FROM users WHERE id = ?").get(id) as UserRow | undefined;
}

export function createUser(username: string, passwordHash: string): UserRow {
  const ts = now();
  const id = randomUUID();
  getDb()
    .prepare(
      `INSERT INTO users (id, username, password_hash, totp_enabled, created_at, updated_at)
       VALUES (?, ?, ?, 0, ?, ?)`,
    )
    .run(id, username, passwordHash, ts, ts);
  return getUserById(id)!;
}

export function updatePassword(id: string, passwordHash: string): void {
  getDb()
    .prepare("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?")
    .run(passwordHash, now(), id);
}

export function setTotp(id: string, secret: string | null, enabled: boolean): void {
  getDb()
    .prepare("UPDATE users SET totp_secret = ?, totp_enabled = ?, updated_at = ? WHERE id = ?")
    .run(secret, enabled ? 1 : 0, now(), id);
}
