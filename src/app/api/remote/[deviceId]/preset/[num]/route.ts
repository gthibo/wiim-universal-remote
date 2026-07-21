import { NextRequest } from "next/server";
import { playPreset } from "@/lib/wiim/commands";
import { remoteGuard } from "@/lib/remote/auth";
import { resolveHost } from "@/lib/remote/resolve";
import { ok, fail } from "@/lib/remote/respond";

export const dynamic = "force-dynamic";

/**
 * Play a preset (keithmuller/wiim_proxy compatible: /preset/<int>).
 *
 * Keith constrains 1-12. We only require a positive integer and let the
 * device reject out-of-range slots -- different WiiM models expose different
 * preset counts (getStatusEx preset_key), so hardcoding 12 would be wrong
 * for the community build.
 */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ deviceId: string; num: string }> },
) {
  const denied = remoteGuard(req);
  if (denied) return denied;
  const { deviceId, num } = await ctx.params;
  const n = parseInt(num, 10);
  if (!Number.isFinite(n) || n < 1) {
    return new Response(`error: bad preset '${num}'`, { status: 404 });
  }
  try {
    await playPreset(resolveHost(deviceId), n);
    return ok();
  } catch (e) {
    return fail(e);
  }
}
