import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, guard } from "@/lib/api";
import { parseBody } from "@/lib/validate";
import { resolveDevice, runDevice } from "@/lib/device-route";
import { setOutput } from "@/lib/wiim/commands";
import { OUTPUTS } from "@/lib/wiim/constants";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const VALID_MODES = new Set(OUTPUTS.map((o) => o.id));

const Schema = z.object({ mode: z.number().int() });

/** Audio output selection (optical / line-out / coax / headphones). */
export async function POST(req: Request, { params }: Params) {
  const g = await guard(req, { mutation: true });
  if (g instanceof NextResponse) return g;
  const r = resolveDevice((await params).id);
  if ("res" in r) return r.res;

  const parsed = await parseBody(req, Schema);
  if (!parsed.ok) return parsed.res;
  if (!VALID_MODES.has(parsed.data.mode)) {
    return apiError(400, "Unknown output mode", "BAD_MODE");
  }

  return runDevice(() => setOutput(r.device.host, parsed.data.mode));
}
