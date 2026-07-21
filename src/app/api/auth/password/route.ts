import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, guard, json } from "@/lib/api";
import { parseBody } from "@/lib/validate";
import { verifyPassword, hashPassword, validatePasswordStrength } from "@/lib/auth/password";
import { startSession } from "@/lib/auth/session";
import { getClientIp } from "@/lib/auth/request";
import { getUserById, updatePassword } from "@/lib/db/users";
import { deleteAllSessionsForUser } from "@/lib/db/sessions";

export const dynamic = "force-dynamic";

const Schema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(1).max(200),
});

export async function POST(req: Request) {
  const g = await guard(req, { mutation: true });
  if (g instanceof NextResponse) return g;

  const parsed = await parseBody(req, Schema);
  if (!parsed.ok) return parsed.res;

  const row = getUserById(g.user.id);
  if (!row) return apiError(401, "Account not found", "NO_USER");

  if (!(await verifyPassword(row.password_hash, parsed.data.currentPassword))) {
    return apiError(403, "Current password is incorrect", "BAD_CURRENT");
  }

  const pwError = validatePasswordStrength(parsed.data.newPassword);
  if (pwError) return apiError(400, pwError, "WEAK_PASSWORD");

  await updatePassword(row.id, await hashPassword(parsed.data.newPassword));

  // Invalidate every existing session, then re-issue one for this client.
  deleteAllSessionsForUser(row.id);
  await startSession(row.id, {
    ip: getClientIp(req.headers),
    userAgent: req.headers.get("user-agent"),
  });

  return json({ ok: true });
}
