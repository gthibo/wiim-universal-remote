import "server-only";
import { isPrivateHost, WiimError } from "@/lib/wiim/client";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resolve a [deviceId] path segment to a device host (IP).
 *
 * Headless build: bare LAN IP only. The dashboard's device DB is not part of
 * this service, so stored-UUID addressing is gone; multi-device works by
 * putting the IP in the URL.
 *
 * NOTE: isPrivateHost() is now the only SSRF guard on this path -- a
 * user-supplied segment reaches a fetch target through it.
 */
export function resolveHost(deviceId: string): string {
  const id = decodeURIComponent(deviceId).trim();
  if (isPrivateHost(id)) return id;
  if (UUID_RE.test(id))
    throw new WiimError(
      `UUID addressing is not available in the headless build; use a LAN IP: ${id}`,
      "UNKNOWN_DEVICE",
    );
  throw new WiimError(`Unknown device: ${id}`, "UNKNOWN_DEVICE");
}
