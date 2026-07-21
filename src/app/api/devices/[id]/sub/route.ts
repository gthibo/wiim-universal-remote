import { NextResponse } from "next/server";
import { z } from "zod";
import { guard } from "@/lib/api";
import { parseBody } from "@/lib/validate";
import { resolveDevice, runDevice } from "@/lib/device-route";
import { setSubwoofer } from "@/lib/wiim/commands";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const Schema = z.object({
  param: z.enum(["level", "cross", "phase", "sub_delay", "status", "main_filter", "sub_filter"]),
  value: z.number().int().min(-300).max(300),
});

/** Subwoofer / sub-out control (level, crossover, phase, delay, enable). */
export async function POST(req: Request, { params }: Params) {
  const g = await guard(req, { mutation: true });
  if (g instanceof NextResponse) return g;
  const r = resolveDevice((await params).id);
  if ("res" in r) return r.res;

  const parsed = await parseBody(req, Schema);
  if (!parsed.ok) return parsed.res;

  return runDevice(() => setSubwoofer(r.device.host, parsed.data.param, parsed.data.value));
}
