import { NextResponse } from "next/server";
import { z } from "zod";
import { guard, json, apiError } from "@/lib/api";
import { parseBody } from "@/lib/validate";
import { getLastfm } from "@/lib/db/settings";
import { love, getTrackLoved, LastfmError } from "@/lib/lastfm/client";

export const dynamic = "force-dynamic";

const Schema = z.object({
  artist: z.string().trim().min(1).max(512),
  track: z.string().trim().min(1).max(512),
  love: z.boolean(),
});

/** Read whether the current track is already loved by the connected account. */
export async function GET(req: Request) {
  const g = await guard(req);
  if (g instanceof NextResponse) return g;

  const { searchParams } = new URL(req.url);
  const artist = (searchParams.get("artist") ?? "").trim();
  const track = (searchParams.get("track") ?? "").trim();
  const lf = getLastfm();
  if (!artist || !track || !lf.apiKey || !lf.username) return json({ loved: false });
  try {
    const loved = await getTrackLoved(
      { apiKey: lf.apiKey, apiSecret: lf.apiSecret },
      artist,
      track,
      lf.username,
    );
    return json({ loved });
  } catch {
    return json({ loved: false });
  }
}

/** Love / unlove the given track on the connected Last.fm account. */
export async function POST(req: Request) {
  const g = await guard(req, { mutation: true });
  if (g instanceof NextResponse) return g;

  const parsed = await parseBody(req, Schema);
  if (!parsed.ok) return parsed.res;

  const lf = getLastfm();
  if (!lf.apiKey || !lf.apiSecret || !lf.sessionKey) {
    return apiError(400, "Connect Last.fm first", "NOT_CONNECTED");
  }
  try {
    await love(
      { apiKey: lf.apiKey, apiSecret: lf.apiSecret, sessionKey: lf.sessionKey },
      parsed.data.artist,
      parsed.data.track,
      parsed.data.love,
    );
    return json({ ok: true });
  } catch (e) {
    const msg = e instanceof LastfmError ? e.message : "Last.fm request failed";
    return apiError(502, msg, "LASTFM");
  }
}
