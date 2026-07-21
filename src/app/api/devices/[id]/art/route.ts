import { NextResponse } from "next/server";
import { guard } from "@/lib/api";
import { resolveDevice } from "@/lib/device-route";
import { fetchDeviceInfo, fetchMetaInfo } from "@/lib/wiim/commands";
import { wiimFetchRaw } from "@/lib/wiim/client";
import { lookupAlbumArt } from "@/lib/artwork/itunes";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// 1x1 transparent PNG fallback.
const TRANSPARENT = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

function fallback(): Response {
  return new Response(TRANSPARENT, {
    headers: { "content-type": "image/png", "cache-control": "private, max-age=30" },
  });
}

/** Proxy the current track's album art (device art is often http / mixed-content). */
export async function GET(req: Request, { params }: Params) {
  const g = await guard(req);
  if (g instanceof NextResponse) return g;
  const r = resolveDevice((await params).id);
  if ("res" in r) return r.res;

  try {
    // A confirmed multiroom slave's own getMetaInfo doesn't carry the master's
    // art (same gap the Now Playing mirroring fix in snapshot.ts addresses for
    // title/artist/state) — read art from the master's own host instead, same
    // as the snapshot poll does. Falls back to the slave's own host if the
    // device-info lookup fails or it isn't actually a slave.
    let artHost = r.device.host;
    const info = await fetchDeviceInfo(r.device.host).catch(() => null);
    if (info?.multiroomRole === "slave" && info.multiroomMasterIp) {
      artHost = info.multiroomMasterIp;
    }

    const meta = await fetchMetaInfo(artHost);
    // Use the device's own art if present; otherwise fall back to an external
    // lookup by artist + album — local/NAS files often expose no embedded cover.
    let artSrc = meta.albumArt;
    if (!artSrc && meta.artist && meta.album) {
      artSrc = await lookupAlbumArt(meta.artist, meta.album);
    }
    if (!artSrc) return fallback();

    let url: URL;
    try {
      url = new URL(artSrc);
    } catch {
      url = new URL(artSrc, `https://${artHost}`);
    }

    // SSRF-guarded: private targets must be the device itself (the master's
    // host when mirroring); public targets are fetched with normal TLS
    // verification; connection pinned to checked IP.
    const res = await wiimFetchRaw(url.toString(), {
      deviceHost: artHost,
      timeoutMs: 7000,
    });
    if (res.status >= 400 || !res.contentType.startsWith("image/")) return fallback();

    return new Response(new Uint8Array(res.body), {
      headers: { "content-type": res.contentType, "cache-control": "private, max-age=60" },
    });
  } catch {
    return fallback();
  }
}
