import "server-only";
import dgram from "node:dgram";
import { wiimRequest } from "./client";
import { safeJson, parseDeviceInfo } from "./parse";
import type { DeviceInfo } from "./types";

/**
 * SSDP/UPnP discovery of LinkPlay MediaRenderers on the LAN. Best-effort: only
 * works when the container can send/receive UDP multicast (host networking).
 * Returns candidate host IPs; the caller confirms each via getStatusEx.
 */
export function ssdpDiscover(timeoutMs = 3000): Promise<string[]> {
  return new Promise((resolve) => {
    const found = new Set<string>();
    let socket: dgram.Socket;
    try {
      socket = dgram.createSocket({ type: "udp4", reuseAddr: true });
    } catch {
      resolve([]);
      return;
    }

    const search = (st: string) =>
      Buffer.from(
        [
          "M-SEARCH * HTTP/1.1",
          "HOST: 239.255.255.250:1900",
          'MAN: "ssdp:discover"',
          "MX: 2",
          `ST: ${st}`,
          "",
          "",
        ].join("\r\n"),
      );

    const done = () => {
      try {
        socket.close();
      } catch {
        /* ignore */
      }
      resolve([...found]);
    };

    socket.on("message", (_data, rinfo) => {
      if (rinfo?.address) found.add(rinfo.address);
    });
    socket.on("error", () => done());

    socket.bind(() => {
      try {
        socket.send(search("urn:schemas-upnp-org:device:MediaRenderer:1"), 1900, "239.255.255.250");
        socket.send(search("urn:schemas-wiimu-com:service:PlayQueue:1"), 1900, "239.255.255.250");
      } catch {
        /* ignore */
      }
    });

    setTimeout(done, timeoutMs);
  });
}

/** Expand a /24 (or "a.b.c" prefix) into host IPs .1–.254. Always ≤254 hosts. */
function expandHosts(input: string): string[] {
  const s = input.trim().replace(/\/\d{1,2}$/, "");
  const m = s.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})(?:\.\d{1,3})?$/);
  if (!m) return [];
  const a = Number(m[1]);
  const b = Number(m[2]);
  const c = Number(m[3]);
  if ([a, b, c].some((n) => n > 255)) return [];
  const hosts: string[] = [];
  for (let i = 1; i <= 254; i++) hosts.push(`${a}.${b}.${c}.${i}`);
  return hosts;
}

/**
 * Direct-probe scan of a LAN /24 — works inside Docker (bridge NAT) where SSDP
 * multicast cannot reach the LAN. Probes getStatusEx on each host concurrently;
 * non-LAN ranges are rejected by the client, so this can't scan the internet.
 */
export async function scanSubnet(
  input: string,
  opts: { timeoutMs?: number; concurrency?: number } = {},
): Promise<{ host: string; info: DeviceInfo }[]> {
  const hosts = expandHosts(input);
  if (hosts.length === 0) return [];
  const timeoutMs = opts.timeoutMs ?? 1200;
  const concurrency = Math.min(opts.concurrency ?? 40, hosts.length);
  const found: { host: string; info: DeviceInfo }[] = [];
  let idx = 0;

  async function worker() {
    while (idx < hosts.length) {
      const ip = hosts[idx++]!;
      try {
        const r = await wiimRequest(ip, "getStatusEx", { timeoutMs });
        const raw = safeJson<Record<string, unknown>>(r.text);
        if (raw && (raw.uuid || raw.MAC || raw.project)) {
          found.push({ host: ip, info: parseDeviceInfo(raw) });
        }
      } catch {
        /* not a WiiM / unreachable / non-LAN */
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return found;
}
