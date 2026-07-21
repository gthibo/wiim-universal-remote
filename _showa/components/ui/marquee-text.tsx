"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Scrolling readout text — like an AVR's front-panel display handling a track
 * name too long for its window. Static (left-aligned, ellipsis-free) when the
 * text fits its container; only switches to a continuous leftward scroll when
 * it actually overflows, so short titles ("WHEN I'M GONE") never move.
 *
 * Re-measures on resize and on content change (`text` is also the effect key,
 * so a track change re-checks overflow with the new string). Pauses on hover
 * — a small, expected affordance, and genuinely useful for reading a long
 * title at your own pace. Respects prefers-reduced-motion (falls back to a
 * static, truncated line rather than animating).
 */
export function MarqueeText({
  text,
  className,
  speedPxPerSec = 40,
  holdFraction = 0.12,
  gapPx = 64,
}: {
  text: string;
  className?: string;
  /** Scroll speed in CSS pixels/second — tuned for a calm readout pace. */
  speedPxPerSec?: number;
  /**
   * Fraction of each loop spent paused at the start before scrolling begins.
   * Must match the "0%, X%" hold in tailwind.config.ts's `marquee` keyframe
   * (currently 12%) — they're two halves of the same number, kept here so
   * the duration math below stays correct if that keyframe ever changes.
   */
  holdFraction?: number;
  /** Gap between the end of the text and its looped repeat. */
  gapPx?: number;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const textRef = useRef<HTMLSpanElement | null>(null);
  const [overflowing, setOverflowing] = useState(false);
  const [distance, setDistance] = useState(0);
  const reduceMotion = useRef(false);

  useEffect(() => {
    reduceMotion.current =
      typeof window !== "undefined" &&
      !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useLayoutEffect(() => {
    const measure = () => {
      const containerW = containerRef.current?.clientWidth ?? 0;
      const textW = textRef.current?.scrollWidth ?? 0;
      const over = textW > containerW + 1; // +1: rounding slack
      setOverflowing(over);
      setDistance(textW + gapPx);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
    // Re-measure whenever the text itself changes (track change).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, gapPx]);

  // The keyframe holds at 0 for the first `holdFraction` of the loop, then
  // scrolls the full `distance` over the remaining (1 - holdFraction). So the
  // *scroll-only* time (distance / speed) is only (1 - holdFraction) of the
  // total loop duration — scale up to get the total to feed the animation.
  const scrollOnlyS = distance > 0 ? distance / speedPxPerSec : 0;
  const durationS = scrollOnlyS > 0 ? scrollOnlyS / (1 - holdFraction) : 0;
  const animate = overflowing && !reduceMotion.current;

  return (
    <div ref={containerRef} className={cn("group/marquee min-w-0 overflow-hidden", className)}>
      <div
        className={cn("flex w-max", animate && "animate-marquee group-hover/marquee:[animation-play-state:paused]")}
        style={
          animate
            ? ({
                "--marquee-distance": `-${distance}px`,
                "--marquee-duration": `${durationS}s`,
              } as React.CSSProperties)
            : undefined
        }
      >
        <span ref={textRef} className={cn("whitespace-nowrap", !overflowing && "truncate")}>
          {text}
        </span>
        {animate && (
          <span aria-hidden className="whitespace-nowrap" style={{ paddingLeft: gapPx }}>
            {text}
          </span>
        )}
      </div>
    </div>
  );
}
