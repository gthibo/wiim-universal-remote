import { NextResponse } from "next/server";
import { z } from "zod";
import { guard, json } from "@/lib/api";
import { parseBody } from "@/lib/validate";
import { getLastfm, setLastfm } from "@/lib/db/settings";

export const dynamic = "force-dynamic";

const Schema = z.object({
  deviceId: z.string().min(1).max(64),
  enabled: z.boolean(),
});

/** Toggle scrobbling for a single device. */
export async function PATCH(req: Request) {
  const g = await guard(req, { mutation: true });
  if (g instanceof NextResponse) return g;

  const parsed = await parseBody(req, Schema);
  if (!parsed.ok) return parsed.res;

  const lf = getLastfm();
  const scrobbleDevices = { ...lf.scrobbleDevices, [parsed.data.deviceId]: parsed.data.enabled };
  setLastfm({ scrobbleDevices });
  return json({ ok: true });
}
