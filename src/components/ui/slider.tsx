"use client";

import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@/lib/utils";

interface Props {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  onCommit?: (v: number) => void;
  disabled?: boolean;
  className?: string;
  /**
   * SHOWA RE-SKIN: visual variants for the now-playing mockup.
   * - `default` keeps the original chunky white-knob slider (still used by the
   *   EQ card and anywhere else not yet reskinned — leave it alone).
   * - `seek` and `volume` are the thin-track / small-filled-dot hardware
   *   sliders from the Lovart now-playing mockup. Seek wears the rust signal
   *   accent; volume wears faceplate-cream so the two sliders sharing the
   *   transport row don't both fight for the single accent colour.
   */
  variant?: "default" | "seek" | "volume";
  "aria-label"?: string;
}

export function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
  onCommit,
  disabled,
  className,
  variant = "default",
  ...rest
}: Props) {
  const thin = variant !== "default";

  // SHOWA RE-SKIN: thin variants now read as a RECESSED GROOVE rather than a
  // flat painted hairline — a dark inset shadow on the upper lip + a faint
  // light catch on the lower lip, so the line looks cut into the panel face.
  // (default keeps the original bg-white/10 flat track, untouched.)
  const trackStyle =
    variant === "default"
      ? undefined
      : {
          // SHOWA RE-SKIN (Round 20 fix): was hsl(var(--static) / 0.9) —
          // 90% opacity of the panel face colour, which made the track
          // nearly invisible and let panel content bleed through. Switched
          // to a solid hsl value slightly darker than --static so the groove
          // reads as cut into the panel without any transparency.
          background: "hsl(33 8% 6%)",
          boxShadow:
            "inset 0 1px 1.5px hsl(0 0% 0% / 0.7), inset 0 -1px 0 hsl(var(--faceplate) / 0.06)",
        };

  // `background` (not backgroundImage) so a flat colour or a gradient both work.
  const rangeBg =
    variant === "seek"
      ? "hsl(var(--primary))"
      : variant === "volume"
        ? "hsl(var(--faceplate) / 0.85)"
        : "linear-gradient(to right, hsl(var(--primary)), hsl(var(--accent)))";

  // SHOWA RE-SKIN: seek/volume thumbs are FLAT-TOP CYLINDRICAL CAPS with a
  // beveled rim, not flat filled dots and not smooth domes (per Greg's read
  // of the mockup: flat face + chamfered edge). Built from:
  //   • a flat-ish face: a near-vertical gradient, lightest at the top so the
  //     flat top catches even light, easing only slightly down the body.
  //   • a beveled rim: inset highlight top-left + inset shade bottom-right,
  //     tight (≈1px) so it reads as a chamfer ring, not a soft dome falloff.
  //   • a contact shadow: a small outward drop shadow below so the cap sits
  //     ON the groove rather than being painted into it.
  // Each keeps its own colour family (volume = faceplate cream, slightly
  // larger/brighter metal; seek = rust, a touch smaller + more saturated).
  const thumbCls =
    variant === "default"
      ? "block size-5 rounded-full border-2 border-primary bg-white shadow-lg shadow-primary/30 transition-transform focus-ring active:scale-110 disabled:opacity-50"
      : cn(
          "block rounded-full border-0 transition-transform focus-ring active:scale-105 disabled:opacity-50",
          variant === "volume" ? "size-4" : "size-3.5",
        );

  const thumbStyle =
    variant === "volume"
      ? {
          background:
            "linear-gradient(180deg, hsl(var(--faceplate)) 0%, hsl(var(--faceplate) / 0.92) 45%, hsl(var(--faceplate-dim) / 0.85) 100%)",
          boxShadow: [
            "inset 0 1px 0.5px hsl(0 0% 100% / 0.85)", // bevel highlight — top-left lit chamfer
            "inset 0 -1px 1px hsl(25 20% 30% / 0.55)", // bevel shade — bottom-right chamfer (hue aligned to the new taupe --faceplate family, was 33° for the old cream)
            "0 1px 3px hsl(0 0% 0% / 0.6)", // contact shadow under the cap
            "0 2px 5px hsl(0 0% 0% / 0.35)", // softer secondary contact falloff
          ].join(", "),
        }
      : variant === "seek"
        ? {
            background:
              "linear-gradient(180deg, hsl(var(--primary) / 1) 0%, hsl(var(--primary) / 0.95) 45%, hsl(var(--accent)) 100%)",
            boxShadow: [
              "inset 0 1px 0.5px hsl(20 90% 70% / 0.7)", // bevel highlight — lit rust chamfer
              "inset 0 -1px 1px hsl(0 0% 0% / 0.4)", // bevel shade — bottom chamfer
              "0 1px 3px hsl(0 0% 0% / 0.6)", // contact shadow under the cap
            ].join(", "),
          }
        : undefined;

  return (
    <SliderPrimitive.Root
      className={cn("relative flex h-6 w-full touch-none select-none items-center", className)}
      value={[value]}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      onValueChange={(v) => onChange(v[0]!)}
      onValueCommit={(v) => onCommit?.(v[0]!)}
      aria-label={rest["aria-label"]}
    >
      <SliderPrimitive.Track
        className={cn(
          "relative w-full grow overflow-hidden rounded-full",
          thin ? "h-[3px]" : "h-2 bg-white/10",
        )}
        style={trackStyle}
      >
        <SliderPrimitive.Range className="absolute h-full rounded-full" style={{ background: rangeBg }} />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className={thumbCls} style={thumbStyle} />
    </SliderPrimitive.Root>
  );
}
