import "server-only";
import { deviceErrorStatus } from "./http";
import { WiimError } from "@/lib/wiim/client";

/**
 * keithmuller/wiim_proxy returns the bare string "ok" on success so a remote's
 * HTTP-command feature sees a clean 200. We mirror that for drop-in
 * compatibility. If X1S testing later shows it can consume a richer body
 * (state-aware toggles), extend here -- this is the single choke point.
 */
export function ok(body = "ok"): Response {
  return new Response(body, { status: 200, headers: { "content-type": "text/plain" } });
}

export function fail(e: unknown): Response {
  if (e instanceof WiimError) {
    return new Response(`error: ${e.code}`, {
      status: deviceErrorStatus(e.code),
      headers: { "content-type": "text/plain" },
    });
  }
  return new Response("error", { status: 502, headers: { "content-type": "text/plain" } });
}
