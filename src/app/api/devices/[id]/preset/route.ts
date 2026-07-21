import { NextResponse } from "next/server";
import { z } from "zod";
import { guard } from "@/lib/api";
import { parseBody } from "@/lib/validate";
import { resolveDevice, runDevice } from "@/lib/device-route";
import { playPreset } from "@/lib/wiim/commands";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const Schema = z.object({ index: z.number().int().min(1).max(50) });

/** Play a saved WiiM preset (favourite) by slot number. */
export async function POST(req: Request, { params }: Params) {
  const g = await guard(req, { mutation: true });
  if (g instanceof NextResponse) return g;
  const r = resolveDevice((await params).id);
  if ("res" in r) return r.res;

  const parsed = await parseBody(req, Schema);
  if (!parsed.ok) return parsed.res;

  return runDevice(() => playPreset(r.device.host, parsed.data.index));
}
