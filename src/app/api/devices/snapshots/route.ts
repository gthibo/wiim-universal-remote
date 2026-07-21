import { NextResponse } from "next/server";
import { guard, json } from "@/lib/api";
import { listDevices } from "@/lib/db/devices";
import { getDeviceSnapshot } from "@/lib/wiim/snapshot";

export const dynamic = "force-dynamic";

/** One poll for every configured device (used by the dashboard). */
export async function GET(req: Request) {
  const g = await guard(req);
  if (g instanceof NextResponse) return g;

  const devices = listDevices();
  const snapshots = await Promise.all(
    devices.map((d) =>
      getDeviceSnapshot({ id: d.id, ip: d.host, capabilities: d.capabilities }),
    ),
  );
  return json({ snapshots });
}
