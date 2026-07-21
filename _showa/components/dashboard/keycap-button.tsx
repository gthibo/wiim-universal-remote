"use client";

import type { CSSProperties } from "react";
import { DynIcon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

/**
 * SHOWA RE-SKIN: source/output selector key. The whole control is built AROUND
 * a single flat keycap PNG (public/keycap.png — top-lit so one tile reads right
 * in any grid position) rather than a CSS-styled box. Anatomy, top to bottom:
 *   • icon + label  (ABOVE the cap)
 *   • keycap.png    (the physical key)
 *   • indicator lamp(BELOW the cap)
 * The cap art is identical whether selected or not — per the mockup, selection
 * is carried entirely by (a) the lamp swapping led-off.png → led-on.png and
 * (b) the icon + label lighting to the rust signal accent. Clicks are visually
 * silent (no press transform); the lamp + label do the talking. While a switch
 * is in flight the lamp shows lit and pulses.
 */
const ICON_SHADOW: CSSProperties = {
  // Same engraved-glyph shadow used across now-playing-card, so the keycap
  // icons read as the same material as the transport glyphs.
  filter: "drop-shadow(0 2px 3px hsl(0 0% 0% / 0.85))",
};

export function KeycapButton({
  icon,
  label,
  active,
  busy,
  disabled,
  onClick,
  className,
}: {
  icon: string;
  label: string;
  active: boolean;
  busy: boolean;
  disabled?: boolean;
  onClick: () => void;
  className?: string;
}) {
  // The lamp reads "lit" both when this input is the current one AND while its
  // switch is in flight (anticipating activation); busy adds the pulse.
  const lit = active || busy;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || busy}
      aria-pressed={active}
      className={cn("focus-ring group flex flex-col items-center gap-2 bg-transparent disabled:cursor-default", className)}
    >
      {/* icon + label, above the cap */}
      <span
        className={cn(
          "flex max-w-full items-center gap-1.5 text-xs font-medium uppercase tracking-wide transition-colors",
          active
            ? "text-[hsl(var(--primary))]"
            : "text-[hsl(var(--faceplate)/0.55)] group-hover:text-[hsl(var(--faceplate)/0.85)]",
        )}
      >
        <DynIcon name={icon} className="size-4 shrink-0" style={ICON_SHADOW} />
        <span className="truncate">{label}</span>
      </span>

      {/* the physical keycap — a single flat, top-lit tile */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/keycap.png"
        alt=""
        draggable={false}
        className="pointer-events-none w-full select-none"
        style={{ filter: "drop-shadow(0 3px 5px hsl(0 0% 0% / 0.5))" }}
      />

      {/* indicator lamp, below the cap */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={lit ? "/led-on.png" : "/led-off.png"}
        alt=""
        draggable={false}
        className={cn("size-3.5 select-none", busy && "animate-pulse")}
      />
    </button>
  );
}
