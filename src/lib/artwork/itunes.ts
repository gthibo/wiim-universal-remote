import "server-only";

/**
 * Album-art fallback via the iTunes Search API (keyless, public).
 *
 * The WiiM serves no embedded cover art for many local / NAS / USB files (the
 * `albumArtURI` comes back empty), so the Now Playing card shows a blank cover.
 * When that happens we look a cover up by artist + album. Results are cached in
 * memory so we don't hammer the API on every poll.
 *
 * On by default. Set `WIIM_ARTWORK_FALLBACK=false` (or `0`/`off`/`no`) to
 * disable all external artwork lookups — e.g. for a fully offline setup.
 */

const ENABLED = !/^(0|false|off|no)$/i.test(process.env.WIIM_ARTWORK_FALLBACK ?? "");

interface CacheEntry {
  at: number;
  url: string | null;
}

const cache = new Map<string, CacheEntry>();
const HIT_TTL_MS = 24 * 60 * 60 * 1000; // remember a found cover for a day
const MISS_TTL_MS = 60 * 60 * 1000; // re-try a miss after an hour (cover may appear later)
const MAX_ENTRIES = 500;

/**
 * Look up a cover-art URL for `artist` + `album`, or null if none is found
 * (or the feature is disabled / inputs are empty). Returns a public Apple CDN
 * URL — fetched server-side through the SSRF-guarded art proxy, never by the browser.
 */
export async function lookupAlbumArt(artist: string, album: string): Promise<string | null> {
  if (!ENABLED) return null;
  const a = artist.trim();
  const al = album.trim();
  if (!a || !al) return null;

  const key = `${a.toLowerCase()}|${al.toLowerCase()}`;
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && now - cached.at < (cached.url ? HIT_TTL_MS : MISS_TTL_MS)) {
    return cached.url;
  }

  let url: string | null = null;
  try {
    const term = encodeURIComponent(`${a} ${al}`);
    const api = `https://itunes.apple.com/search?term=${term}&entity=album&limit=5`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    let res: Response;
    try {
      res = await fetch(api, {
        signal: controller.signal,
        headers: { "User-Agent": "wiim-dashboard" },
      });
    } finally {
      clearTimeout(timer);
    }
    if (res.ok) {
      const data = (await res.json()) as {
        results?: { collectionName?: string; artworkUrl100?: string }[];
      };
      const results = data.results ?? [];
      // Match the album by name so we never show a *different* album's cover.
      // Normalise away "(Deluxe)/(Remastered)" suffixes and punctuation.
      const norm = (s: string) => s.toLowerCase().replace(/\([^)]*\)/g, "").replace(/[^a-z0-9]+/g, "");
      const want = norm(al);
      const match =
        results.find((r) => norm(r.collectionName ?? "") === want) ??
        results.find((r) => {
          const c = norm(r.collectionName ?? "");
          return !!c && !!want && (c.includes(want) || want.includes(c));
        });
      const art = match?.artworkUrl100;
      // artworkUrl100 ends in `…/100x100bb.jpg`; bump to a display-worthy size.
      if (art) url = art.replace(/\/\d+x\d+bb\.(jpg|png)/i, "/600x600bb.$1");
    }
  } catch {
    url = null; // network/timeout/parse error → treat as a miss
  }

  if (cache.size >= MAX_ENTRIES) cache.clear(); // cheap unbounded-growth guard
  cache.set(key, { at: now, url });
  return url;
}
