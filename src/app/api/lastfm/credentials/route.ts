import { NextResponse } from "next/server";
import { z } from "zod";
import { guard, json } from "@/lib/api";
import { parseBody } from "@/lib/validate";
import { setLastfm } from "@/lib/db/settings";

export const dynamic = "force-dynamic";

const Schema = z.object({
  apiKey: z.string().trim().min(1).max(128),
  // omit/empty secret = keep existing
  apiSecret: z.string().trim().max(128).optional(),
});

/** Store the registered Last.fm app credentials (api key + shared secret). */
export async function POST(req: Request) {
  const g = await guard(req, { mutation: true });
  if (g instanceof NextResponse) return g;

  const parsed = await parseBody(req, Schema);
  if (!parsed.ok) return parsed.res;

  const patch: { apiKey: string; apiSecret?: string } = { apiKey: parsed.data.apiKey };
  if (parsed.data.apiSecret && parsed.data.apiSecret.length > 0) {
    patch.apiSecret = parsed.data.apiSecret;
  }
  setLastfm(patch);
  return json({ ok: true });
}
