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
 * Order matters: isPrivateHost() treats any dot-less string as a single-label
 * LAN name, so a bare UUID would pass it and fail later at DNS. Check the
 * UUID shape first so the caller gets a useful message.
 */
export function resolveHost(deviceId: string): string {
  const id = decodeURIComponent(deviceId).trim();
  if (!id) throw new WiimError("Missing device id", "UNKNOWN_DEVICE");
  if (UUID_RE.test(id))
    throw new WiimError(
      `UUID addressing is not available in the headless build; use a LAN IP: ${id}`,
      "UNKNOWN_DEVICE",
    );
  if (isPrivateHost(id)) return id;
  throw new WiimError(`Refusing to contact non-LAN host: ${id}`, "FORBIDDEN_HOST");
}
