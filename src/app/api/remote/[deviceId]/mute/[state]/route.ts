import { NextRequest } from "next/server";
import { control, fetchPlayerStatus } from "@/lib/wiim/commands";
import { remoteGuard } from "@/lib/remote/auth";
import { resolveHost } from "@/lib/remote/resolve";
import { ok, fail } from "@/lib/remote/respond";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ deviceId: string; state: string }> },
) {
  const denied = remoteGuard(req);
  if (denied) return denied;
  const { deviceId, state } = await ctx.params;
  try {
    const host = resolveHost(deviceId);
    const s = state.toLowerCase();
    if (s === "on") await control(host, "mute");
    else if (s === "off") await control(host, "unmute");
    else if (s === "toggle") {
      const muted = (await fetchPlayerStatus(host)).muted ?? false;
      await control(host, muted ? "unmute" : "mute");
    } else {
      return new Response(`error: unknown mute state '${state}'`, { status: 404 });
    }
    return ok();
  } catch (e) {
    return fail(e);
  }
}
