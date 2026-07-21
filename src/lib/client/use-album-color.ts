"use client";

export type RGB = [number, number, number];

/**
 * Extract a prominent, reasonably-vibrant colour from the *displayed* album-art
 * <img>. Call it from the image's `onLoad`: the browser has already decoded the
 * bitmap (it's on screen), so `drawImage`/`getImageData` are reliable — no
 * separate load, no decode race. The art is same-origin (device-art proxy), so
 * the canvas stays origin-clean. Returns null when no vibrant colour is found.
 */
export function extractColor(img: HTMLImageElement): RGB | null {
  try {
    const size = 24;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, size, size);
    const { data } = ctx.getImageData(0, 0, size, size);

    // Quantise into colour buckets, skipping near-black and near-white pixels
    // (so white/black backgrounds don't win over the actual subject), then pick
    // the bucket with the best (prominence × vibrancy) score.
    const buckets = new Map<string, { r: number; g: number; b: number; count: number }>();
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]!;
      const g = data[i + 1]!;
      const b = data[i + 2]!;
      const a = data[i + 3]!;
      if (a < 200) continue;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const lum = (max + min) / 2;
      if (lum < 28 || lum > 220) continue;
      const key = `${r >> 5}-${g >> 5}-${b >> 5}`;
      const e = buckets.get(key) ?? { r: 0, g: 0, b: 0, count: 0 };
      e.r += r;
      e.g += g;
      e.b += b;
      e.count++;
      buckets.set(key, e);
    }

    let best: RGB | null = null;
    let bestScore = -1;
    for (const e of buckets.values()) {
      const r = e.r / e.count;
      const g = e.g / e.count;
      const b = e.b / e.count;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const sat = max === 0 ? 0 : (max - min) / max;
      const score = e.count * (0.25 + sat * 1.3); // favour vibrant colours
      if (score > bestScore) {
        bestScore = score;
        best = [Math.round(r), Math.round(g), Math.round(b)];
      }
    }
    if (!best) return null;

    // Normalise for display: a too-dark or washed-out dominant colour is
    // invisible as a tint over the dark card, so keep the hue but push the
    // colour into a visible, vivid band. Monochrome covers (no real hue) → null.
    const [h, s, l] = rgbToHsl(best[0], best[1], best[2]);
    if (s < 0.12) return null; // black-and-white / greyscale cover → no tint
    const ns = Math.min(0.95, Math.max(0.5, s * 1.15));
    const nl = Math.min(0.66, Math.max(0.5, l));
    return hslToRgb(h, ns, nl);
  } catch {
    return null; // tainted canvas / no context
  }
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  let s = 0;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): RGB {
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue = (t: number): number => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [
    Math.round(hue(h + 1 / 3) * 255),
    Math.round(hue(h) * 255),
    Math.round(hue(h - 1 / 3) * 255),
  ];
}
