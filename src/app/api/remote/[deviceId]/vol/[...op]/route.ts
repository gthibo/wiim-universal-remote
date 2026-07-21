import { NextRequest } from "next/server";
import { control, fetchPlayerStatus } from "@/lib/wiim/commands";
import { remoteGuard } from "@/lib/remote/auth";
import { resolveHost } from "@/lib/remote/resolve";
import { ok, fail } from "@/lib/remote/respond";
import { WiimError } from "@/lib/wiim/client";

export const dynamic = "force-dynamic";

const clampVol = (n: number) => Math.min(100, Math.max(0, Math.round(n)));

/**
 * Volume vocabulary (keithmuller/wiim_proxy compatible):
 *   /vol/<int>        set absolute
 *   /vol/up           up by 1        /vol/up/<int>   up by int
 *   /vol/down         down by 1      /vol/down/<int> down by int
 *   /vol/++           up by 1 (alias)   /vol/--       down by 1 (alias)
 * Relative forms read current volume first (your fetchPlayerStatus), matching
 * the proxy's getPlayerStatus-then-set behaviour.
 */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ deviceId: string; op: string[] }> },
) {
  const denied = remoteGuard(req);
  if (denied) return denied;
  const { deviceId, op } = await ctx.params;

  try {
    const host = resolveHost(deviceId);
    const seg = (op[0] ?? "").toLowerCase();
    const arg = op[1] != null ? parseInt(op[1], 10) : 1;

    let target: number;
    if (seg === "up" || seg === "++") {
      const cur = (await fetchPlayerStatus(host)).volume ?? 0;
      target = clampVol(cur + (seg === "++" ? 1 : (Number.isFinite(arg) ? arg : 1)));
    } else if (seg === "down" || seg === "--") {
      const cur = (await fetchPlayerStatus(host)).volume ?? 0;
      target = clampVol(cur - (seg === "--" ? 1 : (Number.isFinite(arg) ? arg : 1)));
    } else {
      const abs = parseInt(seg, 10);
      if (!Number.isFinite(abs)) {
        return new Response(`error: bad volume op '${seg}'`, { status: 404 });
      }
      target = clampVol(abs);
    }

    await control(host, "volume", { value: target });
    return ok();
  } catch (e) {
    return fail(e instanceof WiimError ? e : new WiimError("volume failed"));
  }
}
