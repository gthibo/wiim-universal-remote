import { z } from "zod";
import { apiError, json } from "@/lib/api";
import { parseBody } from "@/lib/validate";
import { assertSameOrigin, CsrfError } from "@/lib/auth/csrf";
import { hashPassword, validatePasswordStrength } from "@/lib/auth/password";
import { startSession } from "@/lib/auth/session";
import { getClientIp } from "@/lib/auth/request";
import { hasAnyUser, createUser } from "@/lib/db/users";

export const dynamic = "force-dynamic";

const Schema = z.object({
  username: z.string().trim().min(3).max(64).regex(/^[a-zA-Z0-9_.-]+$/),
  password: z.string().min(1).max(200),
});

/** First-run only: create the single admin account. */
export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
  } catch (e) {
    if (e instanceof CsrfError) return apiError(403, "Bad origin", "CSRF");
    throw e;
  }

  // Hard gate: setup is allowed exactly once, when no users exist.
  if (hasAnyUser()) return apiError(409, "Setup already completed", "ALREADY_SETUP");

  const parsed = await parseBody(req, Schema);
  if (!parsed.ok) return parsed.res;

  const pwError = validatePasswordStrength(parsed.data.password);
  if (pwError) return apiError(400, pwError, "WEAK_PASSWORD");

  const hash = await hashPassword(parsed.data.password);
  const user = createUser(parsed.data.username, hash);

  await startSession(user.id, {
    ip: getClientIp(req.headers),
    userAgent: req.headers.get("user-agent"),
  });

  return json({ ok: true, user: { id: user.id, username: user.username } });
}
