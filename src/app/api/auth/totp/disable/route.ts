import { NextResponse } from "next/server";
import { z } from "zod";
import { guard, apiError, json } from "@/lib/api";
import { parseBody } from "@/lib/validate";
import { verifyPassword } from "@/lib/auth/password";
import { getUserById, setTotp } from "@/lib/db/users";

export const dynamic = "force-dynamic";

const Schema = z.object({ password: z.string().min(1).max(200) });

/** Disabling 2FA requires re-entering the password. */
export async function POST(req: Request) {
  const g = await guard(req, { mutation: true });
  if (g instanceof NextResponse) return g;

  const parsed = await parseBody(req, Schema);
  if (!parsed.ok) return parsed.res;

  const row = getUserById(g.user.id);
  if (!row) return apiError(401, "Account not found", "NO_USER");
  if (!(await verifyPassword(row.password_hash, parsed.data.password))) {
    return apiError(403, "Password is incorrect", "BAD_PASSWORD");
  }
  setTotp(row.id, null, false);
  return json({ ok: true });
}
