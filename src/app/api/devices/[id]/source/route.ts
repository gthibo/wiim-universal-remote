import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, guard } from "@/lib/api";
import { parseBody } from "@/lib/validate";
import { resolveDevice, runDevice } from "@/lib/device-route";
import { switchSource } from "@/lib/wiim/commands";
import { SOURCES } from "@/lib/wiim/constants";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const VALID_VALUES = new Set(SOURCES.map((s) => s.value));

const Schema = z.object({ value: z.string().trim().min(1).max(32) });

/** Input source switching (switchmode). Only known source values are allowed. */
export async function POST(req: Request, { params }: Params) {
  const g = await guard(req, { mutation: true });
  if (g instanceof NextResponse) return g;
  const r = resolveDevice((await params).id);
  if ("res" in r) return r.res;

  const parsed = await parseBody(req, Schema);
  if (!parsed.ok) return parsed.res;
  if (!VALID_VALUES.has(parsed.data.value)) {
    return apiError(400, "Unknown source", "BAD_SOURCE");
  }

  return runDevice(() => switchSource(r.device.host, parsed.data.value));
}
