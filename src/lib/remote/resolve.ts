import "server-only";
import { getDevice } from "@/lib/db/devices";
import { isPrivateHost, WiimError } from "@/lib/wiim/client";

/**
 * Resolve a [deviceId] path segment to a device host (IP). Accepts either a
 * stored device UUID or, as a convenience for the standalone, a bare LAN
 * host/IP. Multi-device is native here -- this is the mechanism that removes
 * keithmuller/wiim_proxy's "one server per device" limitation.
 */
export function resolveHost(deviceId: string): string {
  const id = decodeURIComponent(deviceId).trim();
  const dev = getDevice(id);
  if (dev) return dev.host;
  // Fall back to treating the segment as a literal LAN host.
  if (isPrivateHost(id)) return id;
  throw new WiimError(`Unknown device: ${id}`, "UNKNOWN_DEVICE");
}
