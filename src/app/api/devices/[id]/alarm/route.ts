import { NextResponse } from "next/server";
import { z } from "zod";
import { guard, json } from "@/lib/api";
import { parseBody } from "@/lib/validate";
import { resolveDevice } from "@/lib/device-route";
import { setAlarm, cancelAlarm, getAlarm } from "@/lib/alarm/timer";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** Current alarm fire time (epoch ms) for the device, or null. */
export async function GET(req: Request, { params }: Params) {
  const g = await guard(req);
  if (g instanceof NextResponse) return g;
  const r = resolveDevice((await params).id);
  if ("res" in r) return r.res;
  return json({ firesAt: getAlarm(r.device.id) });
}

const Schema = z.object({ epochMs: z.number().int().optional() });

/** Set (a future epoch ms) or cancel (missing/non-positive) the device alarm. */
export async function POST(req: Request, { params }: Params) {
  const g = await guard(req, { mutation: true });
  if (g instanceof NextResponse) return g;
  const r = resolveDevice((await params).id);
  if ("res" in r) return r.res;

  const parsed = await parseBody(req, Schema);
  if (!parsed.ok) return parsed.res;

  if (!parsed.data.epochMs || parsed.data.epochMs <= 0) {
    cancelAlarm(r.device.id);
    return json({ firesAt: null });
  }
  const firesAt = setAlarm(r.device.id, r.device.host, parsed.data.epochMs);
  return json({ firesAt });
}
