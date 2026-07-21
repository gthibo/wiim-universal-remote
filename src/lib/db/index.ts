import "server-only";
import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { config } from "@/lib/config";

/**
 * Single SQLite connection (WAL). Cached on globalThis so Next.js dev hot-reload
 * doesn't open a new handle on every module reload.
 */

type DB = Database.Database;

const globalForDb = globalThis as unknown as { __wiimDb?: DB };

function open(): DB {
  if (config.authSecretIsWeak && config.isProduction) {
    console.warn(
      "[wiim] WARNING: AUTH_SECRET is unset or weak. Set a strong value " +
        "(openssl rand -base64 48) — it peppers session tokens.",
    );
  }
  mkdirSync(config.dataDir, { recursive: true });
  const db = new Database(config.dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");
  migrate(db);
  return db;
}

function migrate(db: DB): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            TEXT PRIMARY KEY,
      username      TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      totp_secret   TEXT,
      totp_enabled  INTEGER NOT NULL DEFAULT 0,
      created_at    INTEGER NOT NULL,
      updated_at    INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id         TEXT PRIMARY KEY,          -- sha256(token)
      user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      last_seen  INTEGER NOT NULL,
      ip         TEXT,
      user_agent TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

    CREATE TABLE IF NOT EXISTS devices (
      id           TEXT PRIMARY KEY,
      name         TEXT NOT NULL,
      host         TEXT NOT NULL,
      port         INTEGER NOT NULL DEFAULT 443,
      capabilities TEXT,                    -- JSON
      info         TEXT,                    -- JSON (last known DeviceInfo)
      sort_order   INTEGER NOT NULL DEFAULT 0,
      created_at   INTEGER NOT NULL,
      updated_at   INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS login_attempts (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      ip       TEXT NOT NULL,
      username TEXT,
      ts       INTEGER NOT NULL,
      success  INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_login_ip_ts ON login_attempts(ip, ts);
  `);
}

export function getDb(): DB {
  if (!globalForDb.__wiimDb) {
    globalForDb.__wiimDb = open();
  }
  return globalForDb.__wiimDb;
}

export function now(): number {
  return Date.now();
}
