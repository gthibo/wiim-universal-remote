import { NextResponse } from "next/server";
import { guard, json } from "@/lib/api";
import { ssdpDiscover, scanSubnet } from "@/lib/wiim/discovery";
import { fetchDeviceInfo } from "@/lib/wiim/commands";
import { listDevices } from "@/lib/db/devices";
import type { DeviceInfo } from "@/lib/wiim/types";

export const dynamic = "force-dynamic";

/**
 * Discover WiiM devices: SSDP multicast (host networking only) + a direct
 * IP-range probe of the given /24 (works inside Docker bridge networking).
 */
export async function POST(req: Request) {
  const g = await guard(req, { mutation: true });
  if (g instanceof NextResponse) return g;

  let subnet: string | undefined;
  try {
    const body = (await req.json()) as { subnet?: unknown };
    if (typeof body?.subnet === "string" && body.subnet.trim()) subnet = body.subnet.trim();
  } catch {
    /* no body */
  }

  const existing = new Set(listDevices().map((d) => d.host));
  const candidates = new Map<string, DeviceInfo | null>();

  // Direct range scan (already returns parsed info).
  if (subnet) {
    const scanned = await scanSubnet(subnet);
    for (const s of scanned) candidates.set(s.host, s.info);
  }

  // SSDP (bonus; only effective with host networking).
  const ssdp = await ssdpDiscover(2500);
  for (const h of ssdp) if (!candidates.has(h)) candidates.set(h, null);

  // Resolve any SSDP-only hosts that weren't already probed.
  const found: {
    host: string;
    name: string;
    model: string;
    firmware: string;
    alreadyAdded: boolean;
  }[] = [];
  for (const [host, info] of candidates) {
    let di = info;
    if (!di) {
      try {
        di = await fetchDeviceInfo(host);
      } catch {
        continue;
      }
    }
    found.push({
      host,
      name: di.name,
      model: di.model,
      firmware: di.firmware,
      alreadyAdded: existing.has(host),
    });
  }

  return json({ found });
}
