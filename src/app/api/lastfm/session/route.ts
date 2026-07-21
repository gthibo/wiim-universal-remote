import { NextResponse } from "next/server";
import { guard, json, apiError } from "@/lib/api";
import { getLastfm, setLastfm } from "@/lib/db/settings";
import { getSession, LastfmError } from "@/lib/lastfm/client";

export const dynamic = "force-dynamic";

/** Finish the auth flow: exchange the authorized token for a session key. */
export async function POST(req: Request) {
  const g = await guard(req, { mutation: true });
  if (g instanceof NextResponse) return g;

  const lf = getLastfm();
  if (!lf.apiKey || !lf.apiSecret) {
    return apiError(400, "Save your Last.fm API key and secret first", "NO_CREDS");
  }
  if (!lf.pendingToken) {
    return apiError(400, "Start the connection first", "NO_TOKEN");
  }
  try {
    const { sessionKey, username } = await getSession(
      { apiKey: lf.apiKey, apiSecret: lf.apiSecret },
      lf.pendingToken,
    );
    if (!sessionKey) {
      return apiError(502, "Last.fm did not return a session", "LASTFM");
    }
    setLastfm({ sessionKey, username, pendingToken: "" });
    return json({ ok: true, username });
  } catch (e) {
    const msg =
      e instanceof LastfmError
        ? `${e.message}. Make sure you authorized the app on Last.fm, then try again.`
        : "Last.fm request failed";
    return apiError(502, msg, "LASTFM");
  }
}
