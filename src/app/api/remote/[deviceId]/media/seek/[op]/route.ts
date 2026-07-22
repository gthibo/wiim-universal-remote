import { NextRequest } from "next/server";
import { control, fetchPlayerStatus } from "@/lib/wiim/commands";
import { remoteGuard } from "@/lib/remote/auth";
import { resolveHost } from "@/lib/remote/resolve";
import { ok, fail } from "@/lib/remote/respond";

export const dynamic = "force-dynamic";

const clampSeek = (n: number, duration: number) =>
  Math.max(0, Math.min(Math.round(n), duration > 0 ? duration : 86400));

/**
 * Seek vocabulary:
 *   /seek/N    absolute seek to N seconds (no status read required)
 *   /seek/+N   seek forward N seconds (reads current position first)
 *   /seek/-N   seek back N seconds (reads current position first)
 *
 * Relative forms clamp to [0, duration]. Absolute passes N directly;
 * Cmd.seek already caps at 86400. parseInt handles the leading +/- sign.
 *
 * X1S example buttons: media/seek/+30  media/seek/-10
 */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ deviceId: string; op: string }> },
) {
  const denied = remoteGuard(req);
  if (denied) return denied;
  const { deviceId, op } = await ctx.params;

  try {
    const host = resolveHost(deviceId);
    const seg = op.trim();

    let target: number;
    if (seg.startsWith("+") || seg.startsWith("-")) {
      const delta = parseInt(seg, 10);
      if (!Number.isFinite(delta)) {
        return new Response(`error: bad seek op '${op}'`, { status: 404 });
      }
      const { position, duration } = await fetchPlayerStatus(host);
      target = clampSeek(position + delta, duration);
    } else {
      const abs = parseInt(seg, 10);
      if (!Number.isFinite(abs) || abs < 0) {
        return new Response(`error: bad seek op '${op}'`, { status: 404 });
      }
      target = abs;
    }

    await control(host, "seek", { value: target });
    return ok();
  } catch (e) {
    return fail(e);
  }
}