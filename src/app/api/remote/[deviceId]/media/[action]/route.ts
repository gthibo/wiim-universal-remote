import { NextRequest } from "next/server";
import { control, type ControlAction } from "@/lib/wiim/commands";
import { remoteGuard } from "@/lib/remote/auth";
import { resolveHost } from "@/lib/remote/resolve";
import { ok, fail } from "@/lib/remote/respond";

export const dynamic = "force-dynamic";

// Keith's /media/* vocabulary -> your control() actions.
const MEDIA: Record<string, ControlAction> = {
  play: "play",
  resume: "play", // Keith exposes both; resume == play (setPlayerCmd:resume)
  pause: "pause",
  toggle: "toggle",
  stop: "stop",
  prev: "prev",
  next: "next",
};

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ deviceId: string; action: string }> },
) {
  const denied = remoteGuard(req);
  if (denied) return denied;
  const { deviceId, action } = await ctx.params;
  const mapped = MEDIA[action.toLowerCase()];
  if (!mapped) return new Response(`error: unknown media action '${action}'`, { status: 404 });
  try {
    await control(resolveHost(deviceId), mapped);
    return ok();
  } catch (e) {
    return fail(e);
  }
}
