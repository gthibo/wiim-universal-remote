import { NextResponse } from "next/server";
import { z } from "zod";
import { guard, apiError, json } from "@/lib/api";
import { parseBody } from "@/lib/validate";
import { verifyTotp } from "@/lib/auth/totp";
import { getUserById, setTotp } from "@/lib/db/users";

export const dynamic = "force-dynamic";

const Schema = z.object({ token: z.string().min(6).max(8) });

export async function POST(req: Request) {
  const g = await guard(req, { mutation: true });
  if (g instanceof NextResponse) return g;

  const parsed = await parseBody(req, Schema);
  if (!parsed.ok) return parsed.res;

  const row = getUserById(g.user.id);
  if (!row || !row.totp_secret) {
    return apiError(400, "No pending TOTP secret. Start setup first.", "NO_SECRET");
  }
  if (!verifyTotp(parsed.data.token, row.totp_secret)) {
    return apiError(400, "Incorrect code. Try again.", "TOTP_INVALID");
  }
  setTotp(row.id, row.totp_secret, true);
  return json({ ok: true });
}
