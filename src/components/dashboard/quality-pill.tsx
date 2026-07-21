import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import type { AudioFormat } from "@/lib/wiim/types";

/**
 * Quality chip, colour-graded by tier so quality reads at a glance. Renders as
 * a single pill — "9216 kbps | 24-bit/192 kHz" — built from the structured
 * audio numbers when available, otherwise the raw quality string.
 *
 * SHOWA RE-SKIN: the "lossless" tier used a cool slate-grey (#e2e8f0/#94a3b8)
 * that clashed visibly with the warm walnut/rust palette in the first preview
 * screenshot. Swapped to a warm faceplate-cream metal instead. The "hires"
 * gold tier is left as-is — gold reads as a deliberate, recognizable
 * exception to the palette (the "precious metal" convention), and it already
 * sits comfortably in a warm world.
 *
 * SHOWA RE-SKIN (relocation pass): this pill no longer sits above the title.
 * The mockup keeps the top of the card clean and moves the bitrate/bit-depth/
 * sample-rate readout down into the stream-info band at the foot of the card,
 * beside the tier tag. That placement uses `tone="readout"` — a faceplate-cream
 * inset chip, tier-agnostic (always cream, never gold), slightly squared, with
 * a subtle inset so it reads as recessed into the dark band. The default
 * `tone="tier"` keeps the original gold/cream/neutral grading for any other use.
 */
export function QualityPill({
  quality,
  audio,
  className,
  tone = "tier",
}: {
  quality: string | null;
  audio?: AudioFormat | null;
  className?: string;
  tone?: "tier" | "readout";
}) {
  let label = (quality ?? "").trim();
  if (audio && (audio.bitRate || audio.bitDepth || audio.sampleRate)) {
    const left = audio.bitRate ? `${audio.bitRate} kbps` : null;
    const depth = audio.bitDepth ? `${audio.bitDepth}-bit` : null;
    const rate = audio.sampleRate
      ? `${(audio.sampleRate / 1000).toFixed(1).replace(/\.0$/, "")} kHz`
      : null;
    const right = [depth, rate].filter(Boolean).join("/");
    label = [left, right].filter(Boolean).join(" | ");
  }
  if (!label) return null;

  const tier = audio?.tier ?? null;
  const readout = tone === "readout";

  // Inline gradients (not Tailwind bg-gradient-*) so they render on iOS/iPad Safari.
  // SHOWA RE-SKIN: readout + lossless used to be hardcoded to the OLD cream
  // hex (#E8E1D3/#DCD3C2) directly, so they silently didn't follow the Round
  // 19 faceplate->taupe token swap (Greg flagged the readout chip's mismatch
  // in a later screenshot). Switched both to read the --faceplate/
  // --faceplate-dim tokens at render time so any future palette change
  // (e.g. the still-deferred #B19D8B retune) cascades here automatically.
  const style: CSSProperties | undefined = readout
    ? {
        backgroundImage: "linear-gradient(to right, hsl(var(--faceplate)), hsl(var(--faceplate-dim)))",
        color: "#1C1A17",
      }
    : tier === "hires"
      ? { backgroundImage: "linear-gradient(to right, #fde68a, #fbbf24)", color: "#451a03" }
      : tier === "lossless"
        ? {
            backgroundImage: "linear-gradient(to right, hsl(var(--faceplate)), hsl(var(--faceplate-dim)))",
            color: "#1C1A17",
          }
        : undefined;

  // Radius lives per-branch (not in the base) so the readout chip can be a
  // squared, recessed rectangle while the tier badges stay fully rounded.
  const cls = readout
    ? "rounded-md shadow-[inset_0_1px_2px_hsl(0_0%_0%/0.35)]"
    : tier === "hires"
      ? "rounded-full shadow-sm shadow-amber-500/20"
      : tier === "lossy"
        ? "rounded-full bg-white/10 text-muted-foreground"
        : tier === "lossless"
          ? "rounded-full"
          : "rounded-full bg-white/10 text-foreground/90";

  return (
    <span
      style={style}
      className={cn(
        "inline-flex items-center px-2 py-0.5 font-mono text-[11px] font-normal tabular-nums",
        cls,
        className,
      )}
    >
      {label}
    </span>
  );
}
