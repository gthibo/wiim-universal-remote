import { NextRequest } from "next/server";
import { setLed } from "@/lib/wiim/commands";
import { remoteGuard } from "@/lib/remote/auth";
import { resolveHost } from "@/lib/remote/resolve";
import { ok, fail } from "@/lib/remote/respond";

export const dynamic = "force-dynamic";

/**
 * Set the WiiM LED indicator on or off.
 *
 * Vocabulary: on | off
 *
 * Command: LED_SWITCH_SET:1 (on) / LED_SWITCH_SET:0 (off)
 * Source: DanBrezeanu/wiim-extended-http-api (community-documented, not in official PDF).
 * Hardware-verified: NOT YET — confirm against real device after first deploy.
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
    return new Response(`error: unknown led state '${state}'`, { status: 404 });
  }
  try {
    await setLed(resolveHost(deviceId), s === "on");
    return ok();
  } catch (e) {
    return fail(e);
  }
}