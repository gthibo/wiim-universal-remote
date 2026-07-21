import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, guard, json } from "@/lib/api";
import { parseBody } from "@/lib/validate";
import { isPrivateHost } from "@/lib/wiim/client";
import { resolveDevice } from "@/lib/device-route";
import { updateDevice, deleteDevice, getDeviceByHost } from "@/lib/db/devices";
import { setSourceLabels, deleteSourceLabels } from "@/lib/db/settings";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const PatchSchema = z.object({
  name: z.string().trim().min(1).max(64).optional(),
  host: z.string().trim().min(3).max(255).optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
  sourceLabels: z.record(z.string().max(40)).optional(),
});

export async function GET(req: Request, { params }: Params) {
  const g = await guard(req);
  if (g instanceof NextResponse) return g;
  const r = resolveDevice((await params).id);
  if ("res" in r) return r.res;
  return json({ device: r.device });
}

export async function PATCH(req: Request, { params }: Params) {
  const g = await guard(req, { mutation: true });
  if (g instanceof NextResponse) return g;
  const r = resolveDevice((await params).id);
  if ("res" in r) return r.res;

  const parsed = await parseBody(req, PatchSchema);
  if (!parsed.ok) return parsed.res;
  const patch = parsed.data;

  if (patch.host) {
    const host = patch.host.toLowerCase();
    if (!isPrivateHost(host)) {
      return apiError(400, "Host must be a private/LAN address.", "FORBIDDEN_HOST");
    }
    const clash = getDeviceByHost(host);
    if (clash && clash.id !== r.device.id) {
      return apiError(409, "Another device already uses this address.", "DUPLICATE");
    }
    patch.host = host;
  }

  if (patch.sourceLabels) setSourceLabels(r.device.id, patch.sourceLabels);

  const updated = updateDevice(r.device.id, patch);
  return json({ ok: true, device: updated });
}

export async function DELETE(req: Request, { params }: Params) {
  const g = await guard(req, { mutation: true });
  if (g instanceof NextResponse) return g;
  const r = resolveDevice((await params).id);
  if ("res" in r) return r.res;
  deleteDevice(r.device.id);
  deleteSourceLabels(r.device.id);
  return json({ ok: true });
}
