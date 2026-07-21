import { NextResponse } from "next/server";
import { z } from "zod";
import { guard } from "@/lib/api";
import { parseBody } from "@/lib/validate";
import { resolveDevice, runDevice } from "@/lib/device-route";
import { control } from "@/lib/wiim/commands";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const Schema = z.object({
  action: z.enum([
    "play", "pause", "toggle", "next", "prev", "stop",
    "seek", "volume", "mute", "unmute", "repeat", "shuffle",
  ]),
  value: z.number().finite().min(-1).max(86400).optional(),
  repeat: z.enum(["off", "one", "all"]).optional(),
  shuffle: z.boolean().optional(),
});

/** Transport control: play/pause/next/prev/seek/volume/mute/repeat/shuffle. */
export async function POST(req: Request, { params }: Params) {
  const g = await guard(req, { mutation: true });
  if (g instanceof NextResponse) return g;
  const r = resolveDevice((await params).id);
  if ("res" in r) return r.res;

  const parsed = await parseBody(req, Schema);
  if (!parsed.ok) return parsed.res;
  const { action, value, repeat, shuffle } = parsed.data;

  return runDevice(() => control(r.device.host, action, { value, repeat, shuffle }));
}
