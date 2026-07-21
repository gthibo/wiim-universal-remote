"use client";

import { useEffect, useRef } from "react";
import { extractColor, type RGB } from "@/lib/client/use-album-color";

/**
 * A spinning vinyl record for the Now Playing "vinyl" view and the kiosk
 * display. The record itself is a public-domain (CC0) illustration
 * (`/vinyl-record.svg`, BenBois via OpenClipart); the album art (when present)
 * is composited as the centre label and rotates while playing, while physical
 * inputs like Phono show a plain cream label. Rotation is rAF-driven with eased
 * spin-up / spin-down (like a real turntable). Pass `sizeClass` to scale it.
 */
export function VinylDisc({
  artSrc,
  spinning,
  rgb,
  onColor,
  sizeClass = "size-44 sm:size-52",
}: {
  artSrc: string | null;
  spinning: boolean;
  rgb: string | null;
  onColor: (c: RGB | null) => void;
  sizeClass?: string;
}) {
  const discRef = useRef<HTMLDivElement | null>(null);
  const angle = useRef(0);
  const vel = useRef(0); // degrees per ms
  const rafId = useRef<number | null>(null);
  const lastT = useRef(0);
  const spinningRef = useRef(spinning);
  spinningRef.current = spinning;

  useEffect(() => {
    const MAX = 0.09; // deg/ms ≈ one revolution / 4s
    const TAU = 650; // ms — exponential ease for spin-up / spin-down
    const reduce =
      typeof window !== "undefined" &&
      !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const tick = (t: number) => {
      const dt = lastT.current ? Math.min(80, t - lastT.current) : 16;
      lastT.current = t;
      const target = spinningRef.current && !reduce ? MAX : 0;
      vel.current = target + (vel.current - target) * Math.exp(-dt / TAU);
      if (target > 0 && vel.current < MAX * 0.02) vel.current = MAX * 0.08; // kick off
      angle.current = (angle.current + vel.current * dt) % 360;
      const el = discRef.current;
      if (el) el.style.transform = `rotate(${angle.current}deg)`;
      if (target === 0 && vel.current < 0.0008) {
        rafId.current = null;
        lastT.current = 0;
        return; // fully stopped — idle until the next play/pause
      }
      rafId.current = requestAnimationFrame(tick);
    };

    if (rafId.current === null) {
      lastT.current = 0;
      rafId.current = requestAnimationFrame(tick);
    }
    return () => {
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }
    };
  }, [spinning]);

  return (
    <div className={`relative ${sizeClass}`}>
      {/* Coloured glow (kept off the spinning layer so it doesn't orbit) */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          boxShadow: rgb
            ? `0 14px 60px -12px rgba(${rgb}, 0.5)`
            : "0 14px 45px -16px rgba(0,0,0,0.7)",
        }}
      />

      {/* The record (CC0 asset) — rotation applied via rAF */}
      <div
        ref={discRef}
        className="absolute inset-0 will-change-transform"
        style={{
          backgroundImage: "url('/vinyl-record.svg')",
          backgroundSize: "contain",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        {/* Centre label — album art, or a cream label for physical inputs */}
        <div
          className="absolute left-1/2 top-1/2 size-[35%] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full"
          style={{ boxShadow: "0 0 0 1px rgba(0,0,0,0.35)" }}
        >
          {artSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={artSrc}
              alt=""
              draggable={false}
              className="size-full object-cover"
              onLoad={(e) => onColor(extractColor(e.currentTarget))}
            />
          ) : (
            <div
              className="size-full"
              style={{
                background:
                  "radial-gradient(circle at 50% 40%, #ece0c4 0%, #d3c197 72%, #bfa97f 100%)",
              }}
            />
          )}
        </div>

        {/* Spindle hole — dead centre, on top of the label */}
        <div className="absolute left-1/2 top-1/2 size-[3%] min-h-[5px] min-w-[5px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#08080a]" />
      </div>

      {/* Static reflection sheen (a real reflection doesn't spin) */}
      <div
        className="pointer-events-none absolute inset-0 rounded-full"
        style={{
          background:
            "radial-gradient(130% 100% at 28% 18%, rgba(255,255,255,0.10), transparent 46%)",
        }}
      />

      {/* SHOWA RE-SKIN: SVG tonearm removed — replaced by a photo tonearm
          (tonearm2.png) positioned in CubbyArt as an absolute sibling layer,
          outside the VinylDisc component so it doesn't spin with the record. */}
    </div>
  );
}
