import { NextResponse } from "next/server";
import { z } from "zod";
import { guard, json } from "@/lib/api";
import { parseBody } from "@/lib/validate";
import { resolveDevice } from "@/lib/device-route";
import { setSleep, cancelSleep, getSleep } from "@/lib/sleep/timer";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** Current sleep-timer expiry (epoch ms) for the device, or null. */
export async function GET(req: Request, { params }: Params) {
  const g = await guard(req);
  if (g instanceof NextResponse) return g;
  const r = resolveDevice((await params).id);
  if ("res" in r) return r.res;
  return json({ expiresAt: getSleep(r.device.id) });
}

const Schema = z.object({ minutes: z.number().int().min(0).max(720) });

/** Set (minutes > 0) or cancel (0) the sleep timer; pauses the device on expiry. */
export async function POST(req: Request, { params }: Params) {
  const g = await guard(req, { mutation: true });
  if (g instanceof NextResponse) return g;
  const r = resolveDevice((await params).id);
  if ("res" in r) return r.res;

  const parsed = await parseBody(req, Schema);
  if (!parsed.ok) return parsed.res;

  if (parsed.data.minutes <= 0) {
    cancelSleep(r.device.id);
    return json({ expiresAt: null });
  }
  const expiresAt = setSleep(r.device.id, r.device.host, parsed.data.minutes);
  return json({ expiresAt });
}
