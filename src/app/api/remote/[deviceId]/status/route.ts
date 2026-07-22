import { fetchPlayerStatus } from "@/lib/wiim/commands";
import { remoteGuard } from "@/lib/remote/auth";
import { resolveHost } from "@/lib/remote/resolve";
import { okJson, fail } from "@/lib/remote/respond";

/**
 * Read-only player state. Unlike every other remote route (which returns the
 * bare string "ok" for X1S compatibility), this returns JSON -- it exists for
 * debugging and for the setup console, not for a hardware remote button.
 *
 * NOTE: `audio` and `service` are filled from getMetaInfo, which this route
 * does not call -- they will be null here. That is expected, not a fault.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ deviceId: string }> },
): Promise<Response> {
  const denied = remoteGuard(req);
  if (denied) return denied;
  try {
    const { deviceId } = await params;
    const host = resolveHost(deviceId);
    const status = await fetchPlayerStatus(host);
    return okJson({ host, ...status });
  } catch (e) {
    return fail(e);
  }
}
