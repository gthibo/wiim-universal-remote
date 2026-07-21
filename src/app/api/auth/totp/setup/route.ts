import { NextResponse } from "next/server";
import { guard, apiError, json } from "@/lib/api";
import { generateTotpSecret, totpKeyUri, totpQrDataUrl } from "@/lib/auth/totp";
import { getUserById, setTotp } from "@/lib/db/users";

export const dynamic = "force-dynamic";

/** Generate (but do NOT yet enable) a TOTP secret; returns a QR to scan. */
export async function POST(req: Request) {
  const g = await guard(req, { mutation: true });
  if (g instanceof NextResponse) return g;

  const row = getUserById(g.user.id);
  if (!row) return apiError(401, "Account not found", "NO_USER");

  const secret = generateTotpSecret();
  // Store the pending secret with enabled=0 until the user verifies a code.
  setTotp(row.id, secret, false);

  return json({
    ok: true,
    secret,
    otpauthUrl: totpKeyUri(row.username, secret),
    qr: await totpQrDataUrl(row.username, secret),
  });
}
