import { NextRequest } from "next/server";
import { setOutput, fetchBtSinks, connectBtSink } from "@/lib/wiim/commands";
import { remoteGuard } from "@/lib/remote/auth";
import { resolveHost } from "@/lib/remote/resolve";
import { ok, fail } from "@/lib/remote/respond";

export const dynamic = "force-dynamic";

/**
 * Audio OUTPUT switching (keithmuller/wiim_proxy compatible, extended).
 *
 * The WiiM has THREE independent output axes:
 *   1. HARDWARE (line-out / optical / coax / headphone) -- setAudioOutputHardwareMode
 *   2. BLUETOOTH sink -- connectbta2dpsynk:<mac> (this is a SEPARATE axis;
 *      connecting a sink routes audio to it without changing the hardware mode)
 *   3. AUDIOCAST / DLNA -- not yet implemented (no confirmed command)
 *
 * Routes (catch-all, so bluetooth can take an optional trailing MAC):
 *   /output/line-out | optical | coax | headphone  --> hardware mode
 *   /output/bt-devices                            --> list paired BT sinks + MACs
 *   /output/bluetooth                             --> connect the SOLE paired sink
 *   /output/bluetooth/<mac>                       --> connect that specific sink
 */
const HARDWARE_ID: Record<string, number> = {
  "line-out": 2,
  lineout: 2,
  optical: 1,
  coax: 3,
  coaxial: 3,
  headphone: 4,
  headphones: 4,
};

function text(body: string, status: number): Response {
  return new Response(body, { status, headers: { "content-type": "text/plain" } });
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ deviceId: string; target: string[] }> },
) {
  const denied = remoteGuard(req);
  if (denied) return denied;
  const { deviceId, target } = await ctx.params;
  const key = (target[0] ?? "").toLowerCase();

  let host: string;
  try {
    host = resolveHost(deviceId);
  } catch (e) {
    return fail(e);
  }

  // --- Discovery helper: list paired BT sinks + MACs ---
  if (key === "bt-devices" || key === "btdevices") {
    try {
      const sinks = await fetchBtSinks(host);
      if (sinks.length === 0) return text("no paired bluetooth sinks", 200);
      const body = sinks.map((s) => `${s.mac}  ${s.name}`).join("\n");
      return text(body, 200);
    } catch (e) {
      return fail(e);
    }
  }

  // --- Bluetooth output: connect a sink (optional trailing MAC) ---
  if (key === "bluetooth" || key === "bt") {
    // MAC may be split across segments if it contained slashes; it uses
    // colons, so the remainder is just target[1] when present.
    const macArg = target.slice(1).join("/").trim();
    try {
      let mac = macArg;
      if (!mac) {
        // No MAC given -- connect the sole paired sink (simplest remote button).
        const sinks = await fetchBtSinks(host);
        if (sinks.length === 0) {
          return text("error: no paired bluetooth sinks to connect", 404);
        }
        if (sinks.length > 1) {
          const list = sinks.map((s) => `${s.mac} (${s.name})`).join(", ");
          return text(
            `error: multiple sinks -- specify /output/bluetooth/<mac>: ${list}`,
            409,
          );
        }
        mac = sinks[0].mac;
      }
      await connectBtSink(host, mac);
      return ok();
    } catch (e) {
      return fail(e);
    }
  }

  // --- DLNA / Audiocast: third output axis, no confirmed command yet ---
  if (key === "dlna" || key === "audiocast") {
    return text(
      "error: dlna/audiocast output not yet implemented (separate output axis, no confirmed command)",
      501,
    );
  }

  // --- Wired hardware output modes ---
  const id = HARDWARE_ID[key];
  if (id == null) {
    return text(`error: unknown output '${key}'`, 404);
  }
  try {
    await setOutput(host, id);
    return ok();
  } catch (e) {
    return fail(e);
  }
}
