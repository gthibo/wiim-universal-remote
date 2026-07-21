"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Volume1, Disc3, Mic2 } from "lucide-react";
import { VinylDisc } from "./vinyl-disc";
import { LyricsView } from "./lyrics-view";
import { QualityPill } from "./quality-pill";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import type { PlayerStatus, LyricLine } from "@/lib/wiim/types";
import type { RGB } from "@/lib/client/use-album-color";

/**
 * Full-screen "kiosk / wall-display" view — a clean, chrome-free now-playing
 * built around the spinning vinyl, for mounting a tablet on the wall. Keeps the
 * screen awake (Wake Lock), hides the cursor + chrome when idle, and exits on
 * Esc or the close button.
 */
export function KioskView({
  player,
  artSrc,
  rgb,
  isPlaying,
  sourceLabel,
  vol,
  muted,
  onColor,
  onSend,
  onVolume,
  onVolumeCommit,
  onExit,
  view,
  onView,
  canLyrics,
  lines,
  plain,
  lyricsLoading,
  position,
  onSeek,
}: {
  player: PlayerStatus;
  artSrc: string | null;
  rgb: string | null;
  isPlaying: boolean;
  sourceLabel: string;
  vol: number;
  muted: boolean;
  onColor: (c: RGB | null) => void;
  onSend: (body: Record<string, unknown>) => void;
  onVolume: (v: number) => void;
  onVolumeCommit: (v: number) => void;
  onExit: () => void;
  view: "vinyl" | "lyrics";
  onView: (v: "vinyl" | "lyrics") => void;
  canLyrics: boolean;
  lines: LyricLine[] | null;
  plain: string | null;
  lyricsLoading: boolean;
  position: number;
  onSeek: (t: number) => void;
}) {
  const [idle, setIdle] = useState(false);

  useEffect(() => {
    // Keep the screen awake for a wall display.
    type WakeSentinel = { release: () => Promise<void> };
    const nav = navigator as Navigator & {
      wakeLock?: { request: (type: "screen") => Promise<WakeSentinel> };
    };
    let lock: WakeSentinel | null = null;
    const req = async () => {
      try {
        lock = (await nav.wakeLock?.request("screen")) ?? null;
      } catch {
        /* unsupported / denied — fine */
      }
    };
    void req();
    const onVis = () => {
      if (document.visibilityState === "visible") void req();
    };
    document.addEventListener("visibilitychange", onVis);

    // Hide cursor + chrome after a few seconds of no input.
    let t: ReturnType<typeof setTimeout>;
    const wake = () => {
      setIdle(false);
      clearTimeout(t);
      t = setTimeout(() => setIdle(true), 3000);
    };
    wake();
    window.addEventListener("mousemove", wake);
    window.addEventListener("touchstart", wake);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onExit();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("mousemove", wake);
      window.removeEventListener("touchstart", wake);
      window.removeEventListener("keydown", onKey);
      clearTimeout(t);
      void lock?.release?.().catch(() => {});
    };
  }, [onExit]);

  const title = player.title?.trim() || sourceLabel;
  const VolIcon = muted || vol === 0 ? VolumeX : vol < 50 ? Volume1 : Volume2;

  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-[100] flex flex-col overflow-hidden text-white",
        idle && "cursor-none",
      )}
      style={{
        /* SHOWA RE-SKIN: walnut cabinet background — matches body in globals.css.
           backgroundColor is the base; backgroundImage layers the warm grade on
           top. The cabinetGrain SVG in layout.tsx is -z-10 behind the document
           and can't bleed through a portal — grain is re-declared as an inline
           sibling SVG below so it renders inside this stacking context. */
        backgroundImage:
          "radial-gradient(120% 80% at 18% -10%, hsl(var(--walnut) / 0.55), transparent 60%), " +
          "linear-gradient(180deg, hsl(var(--walnut) / 0.35), transparent 40%)",
        backgroundColor: "hsl(var(--walnut-dark))",
      }}
    >
      {/* SHOWA RE-SKIN: cabinet woodgrain — inline sibling re-declaration of
          the layout.tsx cabinetGrain filter. The original is `fixed -z-10` on
          <body> and is unreachable from inside a z-[100] portal stacking
          context. Identical feTurbulence params (0.006 0.25 / 5 oct / seed 3)
          and soft-light 0.72 so the kiosk reads as the same physical cabinet. */}
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full"
        style={{ mixBlendMode: "soft-light", opacity: 0.72 }}
      >
        <filter id="kioskGrain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.006 0.25"
            numOctaves={5}
            seed={3}
            result="n"
          />
          <feColorMatrix
            in="n"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0"
          />
        </filter>
        <rect width="100%" height="100%" filter="url(#kioskGrain)" />
      </svg>

      {rgb && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: `radial-gradient(80% 80% at 25% 32%, rgba(${rgb}, 0.3), transparent 60%)` }}
        />
      )}

      {/* SHOWA RE-SKIN: close button — bare glyph, no housing. Same visual
          language as shuffle/repeat on the main card transport row. */}
      <button
        onClick={onExit}
        aria-label="Exit fullscreen"
        className={cn(
          "focus-ring absolute right-5 top-5 z-10 grid size-11 place-items-center text-[hsl(var(--faceplate)/0.45)] transition hover:text-[hsl(var(--faceplate)/0.7)] active:translate-y-px",
          idle && "pointer-events-none opacity-0",
        )}
      >
        <X className="size-6" style={{ filter: "drop-shadow(0 2px 3px hsl(0 0% 0% / 0.85))" }} />
      </button>

      {/* SHOWA RE-SKIN: vinyl/lyrics toggle — bare glyphs, no housing pill.
          Active state brightens to near-full faceplate; inactive is dim with
          hover mid-step, matching the cubby icon row on the main card. */}
      {canLyrics && (
        <div
          className={cn(
            "absolute left-5 top-5 z-10 flex items-center gap-3 transition",
            idle && "pointer-events-none opacity-0",
          )}
        >
          <button
            onClick={() => onView("vinyl")}
            aria-label="Vinyl"
            aria-pressed={view === "vinyl"}
            className={cn(
              "focus-ring grid size-9 place-items-center transition",
              view === "vinyl"
                ? "text-[hsl(var(--faceplate)/0.9)]"
                : "text-[hsl(var(--faceplate)/0.45)] hover:text-[hsl(var(--faceplate)/0.7)]",
            )}
          >
            <Disc3 className="size-5" style={{ filter: "drop-shadow(0 2px 3px hsl(0 0% 0% / 0.85))" }} />
          </button>
          <button
            onClick={() => onView("lyrics")}
            aria-label="Lyrics"
            aria-pressed={view === "lyrics"}
            className={cn(
              "focus-ring grid size-9 place-items-center transition",
              view === "lyrics"
                ? "text-[hsl(var(--faceplate)/0.9)]"
                : "text-[hsl(var(--faceplate)/0.45)] hover:text-[hsl(var(--faceplate)/0.7)]",
            )}
          >
            <Mic2 className="size-5" style={{ filter: "drop-shadow(0 2px 3px hsl(0 0% 0% / 0.85))" }} />
          </button>
        </div>
      )}

      <div className="relative z-[1] flex flex-1 flex-col items-center justify-center gap-8 px-6 sm:flex-row sm:gap-16 sm:px-14">
        {view === "lyrics" && canLyrics ? (
          <LyricsView
            lines={lines}
            plain={plain}
            position={position}
            loading={lyricsLoading}
            onSeek={onSeek}
            large
            sizeClass="h-[60vh] w-full max-w-[600px]"
          />
        ) : (
          <VinylDisc
            artSrc={artSrc}
            spinning={isPlaying}
            rgb={rgb}
            onColor={onColor}
            sizeClass="size-[min(70vw,58vh)]"
          />
        )}

        <div className="flex w-full max-w-md flex-col items-center sm:items-start">
          <QualityPill quality={player.quality} audio={player.audio} tone="readout" className="mb-4" />
          {/* SHOWA RE-SKIN: Antonio display face + uppercase, matching the main
              card title. Artist/album shift from white opacity to faceplate
              tokens so they sit in the same warm material world as the cabinet. */}
          <h1 className="line-clamp-2 text-center font-display text-5xl font-bold uppercase leading-[0.95] tracking-tight text-foreground sm:text-left sm:text-6xl">
            {title}
          </h1>
          {player.artist && (
            <p className="mt-3 font-sans text-lg font-bold uppercase tracking-wide text-[hsl(var(--primary))]">
              {player.artist}
            </p>
          )}
          {player.album && (
            <p className="mt-1 font-mono text-sm text-[hsl(var(--faceplate)/0.5)]">{player.album}</p>
          )}

          {/* SHOWA RE-SKIN: transport matches the main card — bare faceplate
              glyphs for prev/next (fill-current, no stroke, drop-shadow),
              play-button.png PNG dome for play/pause. */}
          <div className="mt-10 flex items-center gap-8">
            <button
              onClick={() => onSend({ action: "prev" })}
              aria-label="Previous"
              className="focus-ring grid size-10 place-items-center text-[hsl(var(--faceplate)/0.75)] transition hover:text-[hsl(var(--faceplate))] active:translate-y-px"
            >
              <SkipBack
                className="size-8 fill-current"
                strokeWidth={0}
                style={{ filter: "drop-shadow(0 2px 3px hsl(0 0% 0% / 0.85))" }}
              />
            </button>
            <button
              onClick={() => onSend({ action: "toggle" })}
              aria-label={isPlaying ? "Pause" : "Play"}
              className="focus-ring relative grid size-[72px] shrink-0 place-items-center rounded-full transition active:translate-y-px active:brightness-90"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/play-button.png"
                alt=""
                draggable={false}
                className="absolute inset-0 size-full select-none"
                style={{ filter: "drop-shadow(0 8px 14px hsl(0 0% 0% / 0.55))" }}
              />
              <span className="relative z-10 text-[hsl(36_12%_14%)] [filter:drop-shadow(0_1px_0_hsl(40_20%_70%/0.4))]">
                {isPlaying ? (
                  <Pause className="size-8 fill-current" />
                ) : (
                  <Play className="size-8 translate-x-0.5 fill-current" />
                )}
              </span>
            </button>
            <button
              onClick={() => onSend({ action: "next" })}
              aria-label="Next"
              className="focus-ring grid size-10 place-items-center text-[hsl(var(--faceplate)/0.75)] transition hover:text-[hsl(var(--faceplate))] active:translate-y-px"
            >
              <SkipForward
                className="size-8 fill-current"
                strokeWidth={0}
                style={{ filter: "drop-shadow(0 2px 3px hsl(0 0% 0% / 0.85))" }}
              />
            </button>
          </div>
        </div>
      </div>

      <div
        className={cn(
          "relative z-[1] flex items-center gap-4 px-8 pb-7 transition",
          idle && "opacity-30",
        )}
      >
        {/* SHOWA RE-SKIN: source label in mono/faceplate, matching stream-info footer */}
        <span className="hidden font-mono text-xs uppercase tracking-wide text-[hsl(var(--faceplate)/0.55)] sm:block">{sourceLabel}</span>
        <div className="ml-auto flex w-full max-w-xs items-center gap-3">
          {/* SHOWA RE-SKIN: volume row — faceplate tokens, `volume` slider
              variant (thin groove + cream cylindrical cap), mono readout. */}
          <button
            onClick={() => onSend({ action: muted ? "unmute" : "mute" })}
            aria-label={muted ? "Unmute" : "Mute"}
            className="focus-ring grid size-9 shrink-0 place-items-center rounded-full text-[hsl(var(--faceplate)/0.6)] transition hover:text-[hsl(var(--faceplate))]"
          >
            <VolIcon className="size-5" style={{ filter: "drop-shadow(0 2px 3px hsl(0 0% 0% / 0.85))" }} />
          </button>
          <Slider
            value={vol}
            min={0}
            max={100}
            variant="volume"
            onChange={onVolume}
            onCommit={onVolumeCommit}
            aria-label="Volume"
            className="min-w-0 flex-1"
          />
          <span className="w-9 shrink-0 text-right font-mono text-xs tabular-nums text-[hsl(var(--faceplate)/0.6)]">{muted ? "—" : vol}</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
