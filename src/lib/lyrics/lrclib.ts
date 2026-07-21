import "server-only";
import type { LyricLine } from "@/lib/wiim/types";

/**
 * Lyrics lookup via LRCLIB (https://lrclib.net) — a free, key-less, community
 * lyrics database. Matches by artist/track/album/duration and returns timed
 * (synced) lines when available, plus the plain text as a fallback. Results are
 * cached in-memory (lyrics are static) so we don't re-hit LRCLIB every poll.
 *
 * Two-tier lookup, `/api/get` then `/api/search` fallback: `/api/get` is a
 * STRICT exact match on artist+track+album+duration — confirmed via direct
 * testing that ANY album-name mismatch 404s the whole lookup even when the
 * song exists under a different album title in LRCLIB's database (e.g. a
 * deluxe-edition or single release, or the streaming service reporting a
 * regional/alternate album name). `/api/search` doesn't require an album
 * match at all, so it's used as a fallback when `/get` comes back empty,
 * picking the best candidate by synced-lyrics availability + duration
 * closeness rather than trusting the raw relevance order alone.
 *
 * TIMEOUT: 12s, not the usual few-hundred-ms budget for a JSON API. Measured
 * directly (Node `https`, `fetch`, and `wget` all agreed — this isn't a
 * client-library quirk) that LRCLIB's `/api/get` and `/api/search` routinely
 * take 7–10s to respond to an exact-match query, even though their static
 * root page and DNS/TCP/TLS setup are all fast. It's a small, volunteer-run
 * service — the slowness is real and on their end, not a network problem
 * here. The original 6s timeout was aborting genuine, successful responses
 * before they arrived, which read as "no lyrics found" for real songs. The
 * lyrics panel already shows a loading spinner while this is in flight, and
 * results are cached per track, so the extra latency is an acceptable
 * one-time cost.
 */

const GET_ENDPOINT = "https://lrclib.net/api/get";
const SEARCH_ENDPOINT = "https://lrclib.net/api/search";
const UA = "Wiim-Dashboard (https://github.com/illianoaoi/Wiim-Dashboard)";
const TIMEOUT_MS = 12000;

export interface LyricsResult {
  synced: LyricLine[] | null;
  plain: string | null;
}

interface LrclibTrack {
  duration?: number | null;
  instrumental?: boolean;
  syncedLyrics?: string | null;
  plainLyrics?: string | null;
}

const cache = new Map<string, LyricsResult>();

const TAG = /\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]/g;

function parseLrc(lrc: string): LyricLine[] {
  const lines: LyricLine[] = [];
  for (const raw of lrc.split(/\r?\n/)) {
    const tags = [...raw.matchAll(TAG)];
    if (!tags.length) continue; // skips metadata tags like [ar:] / [ti:]
    const text = raw.replace(TAG, "").trim();
    for (const m of tags) {
      const frac = m[3] ? Number((m[3] + "000").slice(0, 3)) / 1000 : 0;
      lines.push({ t: Number(m[1]) * 60 + Number(m[2]) + frac, text });
    }
  }
  lines.sort((a, b) => a.t - b.t);
  return lines;
}

function toResult(track: LrclibTrack): LyricsResult {
  const synced = track.syncedLyrics ? parseLrc(track.syncedLyrics) : null;
  return {
    synced: synced && synced.length ? synced : null,
    plain: track.plainLyrics?.trim() || null,
  };
}

/** Strict exact-match lookup — fast to parse, cacheable, but 404s on ANY
 *  field mismatch (including album name). Returns null on no-match or error
 *  so the caller can fall back to search, not to be confused with a resolved
 *  "no lyrics" result (an empty LyricsResult). */
async function getExact(
  artist: string,
  track: string,
  album: string,
  durationSec: number,
): Promise<LyricsResult | null> {
  try {
    const url =
      `${GET_ENDPOINT}?artist_name=${encodeURIComponent(artist)}` +
      `&track_name=${encodeURIComponent(track)}` +
      (album ? `&album_name=${encodeURIComponent(album)}` : "") +
      (durationSec > 0 ? `&duration=${Math.round(durationSec)}` : "");
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return null; // 404 — most commonly an album-name mismatch
    const data = (await res.json()) as LrclibTrack;
    return toResult(data);
  } catch {
    return null;
  }
}

/** Fuzzy fallback — no album required, so it survives the album-name
 *  mismatches that break `getExact`. Scores candidates instead of trusting
 *  raw relevance order: synced lyrics beat plain-only, and when a duration is
 *  known, closer duration wins — with anything more than 15s off discarded
 *  outright (almost certainly a different version: live, remix, re-record). */
async function searchFallback(
  artist: string,
  track: string,
  durationSec: number,
): Promise<LyricsResult> {
  const empty: LyricsResult = { synced: null, plain: null };
  try {
    const url =
      `${SEARCH_ENDPOINT}?artist_name=${encodeURIComponent(artist)}` +
      `&track_name=${encodeURIComponent(track)}`;
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return empty;
    const candidates = (await res.json()) as LrclibTrack[];
    if (!Array.isArray(candidates) || !candidates.length) return empty;

    let best: LrclibTrack | null = null;
    let bestScore = Infinity;
    for (const c of candidates) {
      if (c.instrumental) continue;
      const durDiff =
        durationSec > 0 && c.duration != null ? Math.abs(c.duration - durationSec) : 0;
      if (durationSec > 0 && c.duration != null && durDiff > 15) continue; // likely wrong version
      const score = durDiff - (c.syncedLyrics ? 1000 : 0); // synced strongly preferred, then closest duration
      if (score < bestScore) {
        bestScore = score;
        best = c;
      }
    }
    // Nothing survived the duration/instrumental filter — fall back to the
    // API's own top relevance result rather than returning nothing.
    if (!best) best = candidates.find((c) => !c.instrumental) ?? null;
    if (!best) return empty;
    return toResult(best);
  } catch {
    return empty;
  }
}

export async function fetchLyrics(
  artist: string,
  track: string,
  album: string,
  durationSec: number,
): Promise<LyricsResult> {
  const key = `${artist}|${track}|${album}|${Math.round(durationSec)}`.toLowerCase();
  const cached = cache.get(key);
  if (cached) return cached;

  let result = await getExact(artist, track, album, durationSec);
  if (!result) result = await searchFallback(artist, track, durationSec);

  if (cache.size > 200) cache.clear();
  cache.set(key, result);
  return result;
}
