import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Public liveness probe for Docker healthcheck. */
export function GET() {
  return NextResponse.json({ ok: true });
}
