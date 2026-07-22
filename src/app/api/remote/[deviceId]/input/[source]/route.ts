import { NextRequest } from "next/server";
import { switchSource, nextInputSource } from "@/lib/wiim/commands";
import { SOURCES } from "@/lib/wiim/constants";
import { remoteGuard } from "@/lib/remote/auth";
import { resolveHost } from "@/lib/remote/resolve";
import { ok, fail } from "@/lib/remote/respond";

export const dynamic = "force-dynamic";

/**
 * Input/source switching (keithmuller/wiim_proxy compatible).
 *
 * Keith's input words map onto our SOURCES table by its case-sensitive
 * `value` (the switchmode argument). We accept Keith's lowercase aliases
 * (e.g. /input/hdmi) AND any SOURCES.key / value directly, so both the
 * proxy vocabulary and the full WiiM input set work.
 */

// Normalise a url word to match against SOURCES keys/values.
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

// Build a lookup: normalised word -> canonical switchmode value.
const INPUT_VALUE = (() => {
  const m: Record<string, string> = {};
  for (const s of SOURCES) {
    m[norm(s.key)] = s.value;
    m[norm(s.value)] = s.value;
  }
  return m;
})();

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ deviceId: string; source: string }> },
) {
  const denied = remoteGuard(req);
  if (denied) return denied;
  const { deviceId, source } = await ctx.params;

  // Keith exposes /input/next-input. Implemented: fetches enabled inputs from
  // the device, finds the current source in SOURCES order, advances one step
  // (wrapping). See nextInputSource() in commands.ts.
  if (norm(source) === "nextinput") {
    try {
      await nextInputSource(resolveHost(deviceId));
      return ok();
    } catch (e) {
      return fail(e);
    }
  }

  const value = INPUT_VALUE[norm(source)];
  if (!value) return new Response(`error: unknown input '${source}'`, { status: 404 });
  try {
    await switchSource(resolveHost(deviceId), value);
    return ok();
  } catch (e) {
    return fail(e);
  }
}
