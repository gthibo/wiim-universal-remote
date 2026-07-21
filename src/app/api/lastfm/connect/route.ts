import { NextResponse } from "next/server";
import { guard, json, apiError } from "@/lib/api";
import { getLastfm, setLastfm } from "@/lib/db/settings";
import { getToken, authorizeUrl, LastfmError } from "@/lib/lastfm/client";

export const dynamic = "force-dynamic";

/** Begin the auth flow: fetch a request token and return the authorize URL. */
export async function POST(req: Request) {
  const g = await guard(req, { mutation: true });
  if (g instanceof NextResponse) return g;

  const lf = getLastfm();
  if (!lf.apiKey || !lf.apiSecret) {
    return apiError(400, "Save your Last.fm API key and secret first", "NO_CREDS");
  }
  try {
    const token = await getToken({ apiKey: lf.apiKey, apiSecret: lf.apiSecret });
    setLastfm({ pendingToken: token });
    return json({ authUrl: authorizeUrl(lf.apiKey, token) });
  } catch (e) {
    const msg = e instanceof LastfmError ? e.message : "Last.fm request failed";
    return apiError(502, msg, "LASTFM");
  }
}
