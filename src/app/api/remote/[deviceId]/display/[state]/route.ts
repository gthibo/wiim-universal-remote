import { NextRequest } from "next/server";
import { setDisplay } from "@/lib/wiim/commands";
import { remoteGuard } from "@/lib/remote/auth";
import { resolveHost } from "@/lib/remote/resolve";
import { ok, fail } from "@/lib/remote/respond";

export const dynamic = "force-dynamic";

/**
 * Turn the front-panel display on or off.
 *
 * Vocabulary: on | off
 *
 * Command: setLightOperationBrightConfig:{"disable":1} (off) / {"disable":0} (on)
 * Ultra-only — the WiiM Pro has no display; this command will error on it.
 * Hardware-verified on WiiM Ultra (returns "Ok" in both directions).
 */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ deviceId: string; state: string }> },
) {
  const denied = remoteGuard(req);
  if (denied) return denied;
  const { deviceId, state } = await ctx.params;
  const s = state.toLowerCase();
  if (s !== "on" && s !== "off") {
    return new Response(`error: unknown display state '${state}'`, { status: 404 });
  }
  try {
    await setDisplay(resolveHost(deviceId), s === "on");
    return ok();
  } catch (e) {
    return fail(e);
  }
}