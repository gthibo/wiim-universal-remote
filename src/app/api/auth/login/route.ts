import { z } from "zod";
import { apiError, json } from "@/lib/api";
import { parseBody } from "@/lib/validate";
import { assertSameOrigin, CsrfError } from "@/lib/auth/csrf";
import { verifyPassword, hashPassword } from "@/lib/auth/password";
import { verifyTotp } from "@/lib/auth/totp";
import { verifyTurnstile } from "@/lib/auth/turnstile";
import { startSession } from "@/lib/auth/session";
import { checkLoginRateLimit } from "@/lib/auth/rate-limit";
import { getClientIp } from "@/lib/auth/request";
import { getUserByUsername } from "@/lib/db/users";
import { recordAttempt, clearFailures } from "@/lib/db/login-attempts";

export const dynamic = "force-dynamic";

const Schema = z.object({
  username: z.string().trim().min(1).max(64),
  password: z.string().min(1).max(200),
  turnstileToken: z.string().max(4096).optional(),
  totp: z.string().max(16).optional(),
});

// Cached dummy hash so a non-existent username takes the same time as a real one.
let dummyHash: string | null = null;
async function getDummyHash(): Promise<string> {
  if (!dummyHash) dummyHash = await hashPassword("x".repeat(24));
  return dummyHash;
}

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
  } catch (e) {
    if (e instanceof CsrfError) return apiError(403, "Bad origin", "CSRF");
    throw e;
  }

  const ip = getClientIp(req.headers);

  const rate = checkLoginRateLimit(ip);
  if (!rate.allowed) {
    return apiError(429, "Too many attempts. Try again later.", "RATE_LIMITED");
  }

  const parsed = await parseBody(req, Schema);
  if (!parsed.ok) return parsed.res;
  const { username, password, turnstileToken, totp } = parsed.data;

  // Bot protection (no-op if Turnstile isn't configured).
  const turnstileOk = await verifyTurnstile(turnstileToken ?? null, ip);
  if (!turnstileOk) {
    recordAttempt(ip, username, false);
    return apiError(403, "Verification failed. Please retry.", "TURNSTILE_FAILED");
  }

  const user = getUserByUsername(username);
  if (!user) {
    await verifyPassword(await getDummyHash(), password); // equalise timing
    recordAttempt(ip, username, false);
    return apiError(401, "Invalid username or password", "BAD_CREDENTIALS");
  }

  const passwordOk = await verifyPassword(user.password_hash, password);
  if (!passwordOk) {
    recordAttempt(ip, username, false);
    return apiError(401, "Invalid username or password", "BAD_CREDENTIALS");
  }

  // Second factor, if enabled.
  if (user.totp_enabled === 1 && user.totp_secret) {
    if (!totp) {
      // Count toward rate-limiting so the TOTP step can't be skipped to dodge it.
      recordAttempt(ip, username, false);
      return apiError(401, "Two-factor code required", "TOTP_REQUIRED");
    }
    if (!verifyTotp(totp, user.totp_secret)) {
      recordAttempt(ip, username, false);
      return apiError(401, "Invalid two-factor code", "TOTP_INVALID");
    }
  }

  clearFailures(ip);
  recordAttempt(ip, username, true);
  await startSession(user.id, { ip, userAgent: req.headers.get("user-agent") });

  return json({ ok: true, user: { id: user.id, username: user.username } });
}
