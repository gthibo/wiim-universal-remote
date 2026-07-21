import "server-only";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { config } from "@/lib/config";
import {
  createSession,
  getSessionByToken,
  touchSession,
  deleteSessionByToken,
} from "@/lib/db/sessions";

export const SESSION_COOKIE = "wiim_session";
export const CSRF_COOKIE = "wiim_csrf";
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days, sliding

export interface AuthUser {
  id: string;
  username: string;
  totpEnabled: boolean;
}

function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

const baseCookie = {
  path: "/",
  sameSite: "lax" as const,
  secure: config.cookieSecure,
};

/** Create a session + CSRF token and set both cookies. */
export async function startSession(
  userId: string,
  meta: { ip?: string | null; userAgent?: string | null } = {},
): Promise<void> {
  const token = randomToken();
  const csrf = randomToken(24);
  createSession(userId, token, SESSION_TTL_MS, meta);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    ...baseCookie,
    httpOnly: true,
    maxAge: SESSION_TTL_MS / 1000,
  });
  store.set(CSRF_COOKIE, csrf, {
    ...baseCookie,
    httpOnly: false, // readable by our client JS for the double-submit header
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) deleteSessionByToken(token);
  store.delete(SESSION_COOKIE);
  store.delete(CSRF_COOKIE);
}

/** Validate the session cookie and return the user (sliding-renews expiry). */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const found = getSessionByToken(token);
  if (!found) return null;
  // Sliding renewal, throttled to once per ~hour to limit writes.
  if (Date.now() - found.session.last_seen > 60 * 60 * 1000) {
    touchSession(token, SESSION_TTL_MS);
  }
  return {
    id: found.user.id,
    username: found.user.username,
    totpEnabled: found.user.totp_enabled === 1,
  };
}

export async function requireUser(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  return user;
}
