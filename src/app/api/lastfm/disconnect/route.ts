import { NextResponse } from "next/server";
import { guard, json } from "@/lib/api";
import { setLastfm } from "@/lib/db/settings";

export const dynamic = "force-dynamic";

/** Clear the connected Last.fm account (keeps the app credentials). */
export async function POST(req: Request) {
  const g = await guard(req, { mutation: true });
  if (g instanceof NextResponse) return g;
  setLastfm({ sessionKey: "", username: "", pendingToken: "" });
  return json({ ok: true });
}
