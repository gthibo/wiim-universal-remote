import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, guard, json } from "@/lib/api";
import { parseBody } from "@/lib/validate";
import { isPrivateHost } from "@/lib/wiim/client";
import { detectCapabilities } from "@/lib/wiim/capabilities";
import { listDevices, createDevice, getDeviceByHost } from "@/lib/db/devices";
import { getSourceLabels } from "@/lib/db/settings";

export const dynamic = "force-dynamic";

const AddSchema = z.object({
  host: z.string().trim().min(3).max(255),
  name: z.string().trim().min(1).max(64).optional(),
});

/** List configured devices (with cached capabilities + last-known info). */
export async function GET(req: Request) {
  const g = await guard(req);
  if (g instanceof NextResponse) return g;
  const devices = listDevices().map((d) => ({ ...d, sourceLabels: getSourceLabels(d.id) }));
  return json({ devices });
}

/** Add a device by LAN host/IP — probes capabilities before saving. */
export async function POST(req: Request) {
  const g = await guard(req, { mutation: true });
  if (g instanceof NextResponse) return g;

  const parsed = await parseBody(req, AddSchema);
  if (!parsed.ok) return parsed.res;
  const host = parsed.data.host.toLowerCase();

  if (!isPrivateHost(host)) {
    return apiError(400, "Host must be a private/LAN address.", "FORBIDDEN_HOST");
  }
  if (getDeviceByHost(host)) {
    return apiError(409, "A device with this address already exists.", "DUPLICATE");
  }

  let probe;
  try {
    probe = await detectCapabilities(host);
  } catch {
    return apiError(502, `Could not reach a WiiM device at ${host}.`, "UNREACHABLE");
  }

  const device = createDevice({
    host,
    name: parsed.data.name || probe.info.name,
    capabilities: probe.capabilities,
    info: probe.info,
  });
  return json({ ok: true, device });
}
