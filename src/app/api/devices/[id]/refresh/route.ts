import { NextResponse } from "next/server";
import { apiError, guard, json } from "@/lib/api";
import { resolveDevice } from "@/lib/device-route";
import { detectCapabilities } from "@/lib/wiim/capabilities";
import { updateDevice } from "@/lib/db/devices";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** Re-probe a device and refresh its cached capabilities + info. */
export async function POST(req: Request, { params }: Params) {
  const g = await guard(req, { mutation: true });
  if (g instanceof NextResponse) return g;
  const r = resolveDevice((await params).id);
  if ("res" in r) return r.res;

  try {
    const probe = await detectCapabilities(r.device.host);
    const updated = updateDevice(r.device.id, {
      capabilities: probe.capabilities,
      info: probe.info,
    });
    return json({ ok: true, device: updated });
  } catch {
    return apiError(502, `Could not reach device at ${r.device.host}.`, "UNREACHABLE");
  }
}
