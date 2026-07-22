import "server-only";
import { NextResponse } from "next/server";
import { apiError } from "./http";

/**
 * Remote-control auth. UNLIKE the dashboard's guard(), these routes are hit by
 * a hardware remote (Sofabaton X1S) that fires bare GETs -- no session, no CSRF.
 * So the trust model here is LAN-trust, like keithmuller/wiim_proxy.
 *
 * Optional hardening: set REMOTE_TOKEN in the environment and configure the
 * remote to send it as ?token=... (the X1S lets you set arbitrary URLs). When
 * REMOTE_TOKEN is unset, the routes are open on the LAN -- the default, so the
 * service works out of the box the way the community expects.
 */
export function remoteGuard(req: Request): NextResponse | null {
  const required = process.env.REMOTE_TOKEN?.trim();
  if (!required) return null; // open mode (LAN-trust) -- default
  const url = new URL(req.url);
  const supplied =
    url.searchParams.get("token") ?? req.headers.get("x-remote-token")?.trim() ?? "";
  if (supplied !== required) return apiError(401, "Invalid or missing remote token", "REMOTE_AUTH");
  return null;
}
